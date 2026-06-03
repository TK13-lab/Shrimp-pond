import {
  CreatePurchaseReceiptInput,
  PurchaseReceiptDetail
} from '../types/purchaseReceipts';

import { requestJson } from './httpClient';

export function createPurchaseReceipt(input: CreatePurchaseReceiptInput) {
  return requestJson<PurchaseReceiptDetail>('/purchase-receipts', {
    method: 'POST',
    auth: true,
    headers: {
      'X-Idempotency-Key': input.clientRequestId
    },
    body: {
      clientRequestId: input.clientRequestId,
      receiptDate: input.receiptDate,
      supplierName: input.supplierName?.trim() ?? '',
      note: input.note?.trim() ?? '',
      items: input.items.map((item) => {
        const materialId = item.materialId?.trim();

        return {
          ...(materialId
            ? {
                materialId
              }
            : {}),
          materialName: item.materialName.trim(),
          quantity: item.quantity,
          unit: item.unit.trim(),
          unitPrice: item.unitPrice
        };
      })
    }
  });
}

export function submitPurchaseReceipt(receiptId: string) {
  return requestJson<PurchaseReceiptDetail>(`/purchase-receipts/${receiptId}/submit`, {
    method: 'PATCH',
    auth: true
  });
}
