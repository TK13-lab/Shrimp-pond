import { BadRequestException, ValidationError } from '@nestjs/common';

const FIELD_LABELS: Record<string, string> = {
  active: 'trạng thái hoạt động',
  clientRequestId: 'mã yêu cầu',
  defaultUnit: 'đơn vị tính mặc định',
  from: 'ngày bắt đầu',
  items: 'danh sách vật tư',
  materialId: 'mã vật tư',
  materialName: 'tên vật tư',
  name: 'tên',
  note: 'ghi chú',
  password: 'mật khẩu',
  quantity: 'số lượng',
  reason: 'lý do',
  receiptDate: 'ngày nhập',
  referenceId: 'mã tham chiếu',
  referenceType: 'loại tham chiếu',
  refreshToken: 'refresh token',
  search: 'từ khóa tìm kiếm',
  status: 'trạng thái',
  supplierName: 'nhà cung cấp',
  to: 'ngày kết thúc',
  transactionType: 'loại giao dịch',
  unit: 'đơn vị tính',
  unitPrice: 'đơn giá',
  username: 'tên đăng nhập'
};

export function createValidationException(
  errors: ValidationError[]
): BadRequestException {
  const messages = dedupeMessages(collectValidationMessages(errors));
  const normalizedMessages =
    messages.length > 0 ? messages : ['Dữ liệu gửi lên không hợp lệ'];

  return new BadRequestException({
    statusCode: 400,
    message: normalizedMessages,
    error: {
      code: 'VALIDATION_ERROR',
      message: normalizedMessages
    }
  });
}

function collectValidationMessages(
  errors: ValidationError[],
  parentPath: string[] = []
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = [...parentPath, error.property];
    const constraintMessages = translateConstraints(error, path);

    if (constraintMessages.length > 0) {
      messages.push(...constraintMessages);
    }

    if (error.children && error.children.length > 0) {
      messages.push(...collectValidationMessages(error.children, path));
    }
  }

  return messages;
}

function translateConstraints(
  error: ValidationError,
  path: string[]
): string[] {
  if (!error.constraints) {
    return [];
  }

  const entries = Object.entries(error.constraints);
  const availableTypes = new Set(entries.map(([type]) => type));

  return entries
    .filter(([type]) => !shouldSkipConstraint(type, availableTypes, error))
    .map(([type, defaultMessage]) =>
      translateConstraint(type, defaultMessage, path)
    );
}

function shouldSkipConstraint(
  type: string,
  availableTypes: Set<string>,
  error: ValidationError
): boolean {
  if (type === 'isString' && availableTypes.has('isNotEmpty')) {
    return true;
  }

  if (type === 'isArray' && availableTypes.has('arrayMinSize')) {
    return true;
  }

  if (type === 'nestedValidation' && (error.children?.length ?? 0) > 0) {
    return true;
  }

  return false;
}

function translateConstraint(
  type: string,
  defaultMessage: string,
  path: string[]
): string {
  const fieldLabel = formatFieldLabel(path);

  switch (type) {
    case 'whitelistValidation':
      return `Trường ${fieldLabel} không được phép gửi lên`;
    case 'isNotEmpty':
      return `${fieldLabel} không được để trống`;
    case 'isString':
      return `${fieldLabel} phải là chuỗi ký tự`;
    case 'isUUID':
      return `${fieldLabel} phải là UUID hợp lệ`;
    case 'isDateString':
      return `${fieldLabel} phải theo định dạng ngày hợp lệ YYYY-MM-DD`;
    case 'isEnum': {
      const allowedValues = extractAllowedValues(defaultMessage);

      return allowedValues
        ? `${fieldLabel} phải thuộc một trong các giá trị: ${allowedValues}`
        : `${fieldLabel} không hợp lệ`;
    }
    case 'maxLength': {
      const length = extractFirstNumber(defaultMessage);

      return length
        ? `${fieldLabel} không được vượt quá ${length} ký tự`
        : `${fieldLabel} quá dài`;
    }
    case 'isBoolean':
      return `${fieldLabel} phải là giá trị true hoặc false`;
    case 'isArray':
      return `${fieldLabel} phải là danh sách`;
    case 'arrayMinSize': {
      const minimum = extractFirstNumber(defaultMessage);

      return minimum
        ? `${fieldLabel} phải có ít nhất ${minimum} phần tử`
        : `${fieldLabel} chưa đủ phần tử`;
    }
    case 'isNumber':
      return `${fieldLabel} phải là số hợp lệ`;
    case 'min': {
      const minimum = extractFirstNumber(defaultMessage);

      return minimum
        ? `${fieldLabel} phải lớn hơn hoặc bằng ${minimum}`
        : `${fieldLabel} không hợp lệ`;
    }
    default:
      return `${fieldLabel} không hợp lệ`;
  }
}

function formatFieldLabel(path: string[]): string {
  if (path.length === 0) {
    return 'dữ liệu';
  }

  if (path[0] === 'items') {
    if (path.length === 1) {
      return FIELD_LABELS.items;
    }

    if (isNumericPathSegment(path[1])) {
      const itemIndex = Number(path[1]) + 1;

      if (path.length >= 3) {
        return `dòng vật tư ${itemIndex} - ${resolveFieldLabel(path[2])}`;
      }

      return `dòng vật tư ${itemIndex}`;
    }
  }

  return path
    .map((segment) =>
      isNumericPathSegment(segment)
        ? `mục ${Number(segment) + 1}`
        : resolveFieldLabel(segment)
    )
    .join(' / ');
}

function resolveFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function extractAllowedValues(message: string): string | null {
  const marker = 'following values:';
  const markerIndex = message.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return message.slice(markerIndex + marker.length).trim() || null;
}

function extractFirstNumber(message: string): string | null {
  return message.match(/-?\d+(?:\.\d+)?/)?.[0] ?? null;
}

function isNumericPathSegment(value: string): boolean {
  return /^\d+$/.test(value);
}

function dedupeMessages(messages: string[]): string[] {
  return Array.from(new Set(messages));
}
