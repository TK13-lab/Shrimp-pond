import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';

type ErrorPayload = {
  error: {
    code: string;
    message: string | string[];
  };
  message: string | string[];
  path: string | null;
  statusCode: number;
  timestamp: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = this.buildHttpExceptionPayload(
        exception,
        status,
        request?.originalUrl ?? request?.url ?? null
      );

      response.status(status).json(payload);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unexpected non-error exception', String(exception));
    }

    const payload: ErrorPayload = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
      },
      path: request?.originalUrl ?? request?.url ?? null,
      timestamp: new Date().toISOString()
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private buildHttpExceptionPayload(
    exception: HttpException,
    status: number,
    path: string | null
  ): ErrorPayload {
    const response = exception.getResponse();
    const message = this.extractMessage(response, status);
    const code = this.extractCode(response, status);

    return {
      statusCode: status,
      message,
      error: {
        code,
        message
      },
      path,
      timestamp: new Date().toISOString()
    };
  }

  private extractMessage(
    response: string | object,
    status: number
  ): string | string[] {
    if (typeof response === 'string') {
      return this.translateCommonMessage(response, status);
    }

    if (!response || Array.isArray(response)) {
      return this.getDefaultStatusMessage(status);
    }

    const candidate = response as {
      message?: string | string[];
    };

    if (Array.isArray(candidate.message)) {
      return candidate.message.map((message) =>
        this.translateCommonMessage(message, status)
      );
    }

    if (typeof candidate.message === 'string') {
      return this.translateCommonMessage(candidate.message, status);
    }

    return this.getDefaultStatusMessage(status);
  }

  private extractCode(response: string | object, status: number): string {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const candidate = response as {
        error?: string | { code?: string };
      };

      if (candidate.error && typeof candidate.error === 'object') {
        const code = candidate.error.code;

        if (typeof code === 'string' && code.trim()) {
          return code.trim();
        }
      }
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return `HTTP_${status}`;
    }
  }

  private translateCommonMessage(message: string, status: number): string {
    const normalized = message.trim();

    if (!normalized) {
      return this.getDefaultStatusMessage(status);
    }

    if (/^property\s+.+\s+should not exist$/i.test(normalized)) {
      const fieldName =
        /^property\s+(.+)\s+should not exist$/i.exec(normalized)?.[1] ?? '';

      return fieldName
        ? `Trường ${fieldName} không được phép gửi lên`
        : 'Có trường không hợp lệ trong dữ liệu gửi lên';
    }

    switch (normalized) {
      case 'Bad Request':
      case 'Bad Request Exception':
        return 'Yêu cầu không hợp lệ';
      case 'Unauthorized':
        return 'Bạn cần đăng nhập để tiếp tục';
      case 'Forbidden':
      case 'Forbidden resource':
        return 'Bạn không có quyền thực hiện thao tác này';
      case 'Not Found':
        return 'Không tìm thấy dữ liệu';
      case 'Conflict':
        return 'Dữ liệu đang xung đột với trạng thái hiện tại';
      case 'Internal server error':
        return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
      default:
        return normalized;
    }
  }

  private getDefaultStatusMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Yêu cầu không hợp lệ';
      case HttpStatus.UNAUTHORIZED:
        return 'Bạn cần đăng nhập để tiếp tục';
      case HttpStatus.FORBIDDEN:
        return 'Bạn không có quyền thực hiện thao tác này';
      case HttpStatus.NOT_FOUND:
        return 'Không tìm thấy dữ liệu';
      case HttpStatus.CONFLICT:
        return 'Dữ liệu đang xung đột với trạng thái hiện tại';
      default:
        return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
    }
  }
}
