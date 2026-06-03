import {
  CreatePurchaseReceiptInput,
  PurchaseReceiptDetail,
  PurchaseReceiptListResponse,
  PurchaseReceiptStatus
} from '../types/purchaseReceipts';

import { requestJson } from './httpClient';

type ListPurchaseReceiptsParams = {
  from?: string;
  status?: PurchaseReceiptStatus;
  to?: string;
};

export function listPurchaseReceipts(
  params: ListPurchaseReceiptsParams = {}
) {
  const query = new URLSearchParams();

  if (params.status) {
    query.set('status', params.status);
  }

  if (params.from?.trim()) {
    query.set('from', params.from.trim());
  }

  if (params.to?.trim()) {
    query.set('to', params.to.trim());
  }

  const suffix = query.toString();

  return requestJson<PurchaseReceiptListResponse>(
    suffix ? `/purchase-receipts?${suffix}` : '/purchase-receipts',
    {
      method: 'GET',
      auth: true
    }
  );
}

export function getPurchaseReceipt(receiptId: string) {
  return requestJson<PurchaseReceiptDetail>(`/purchase-receipts/${receiptId}`, {
    method: 'GET',
    auth: true
  });
}

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
