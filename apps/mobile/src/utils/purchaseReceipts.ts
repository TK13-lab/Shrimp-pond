import {
  PurchaseReceiptStatus,
  PurchaseReceiptSummary
} from '../types/purchaseReceipts';

export const RECEIPT_STATUS_LABELS: Record<PurchaseReceiptStatus, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị trả lại',
  VOIDED: 'Đã hủy'
};

export function formatReceiptMoney(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return '0 đ';
  }

  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function formatReceiptDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

export function formatReceiptDateTime(value: string | null): string {
  if (!value) {
    return 'Chưa có';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

export function getReceiptStatusColors(status: PurchaseReceiptStatus): {
  backgroundColor: string;
  textColor: string;
} {
  switch (status) {
    case 'DRAFT':
      return {
        backgroundColor: '#e2e8f0',
        textColor: '#334155'
      };
    case 'SUBMITTED':
      return {
        backgroundColor: '#fef3c7',
        textColor: '#92400e'
      };
    case 'APPROVED':
      return {
        backgroundColor: '#d1fae5',
        textColor: '#065f46'
      };
    case 'REJECTED':
      return {
        backgroundColor: '#fee2e2',
        textColor: '#991b1b'
      };
    case 'VOIDED':
      return {
        backgroundColor: '#ede9fe',
        textColor: '#5b21b6'
      };
  }
}

export function buildReceiptSubtitle(receipt: PurchaseReceiptSummary): string {
  return [
    `Ngày nhập: ${formatReceiptDate(receipt.receiptDate)}`,
    `Tổng: ${formatReceiptMoney(receipt.totalAmount)}`
  ].join(' · ');
}
