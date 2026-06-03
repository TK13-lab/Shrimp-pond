export type PurchaseReceiptStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'SUBMITTED'
  | 'VOIDED';

export type ReceiptActor = {
  fullName: string;
  id: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  username: string;
};

export type PurchaseReceiptItem = {
  createdAt: string;
  id: string;
  lineTotal: string;
  materialId: string | null;
  materialName: string;
  quantity: string;
  receiptId: string;
  unit: string;
  unitPrice: string;
};

export type PurchaseReceiptSummary = {
  approvedAt: string | null;
  approvedBy: ReceiptActor | null;
  approvedById: string | null;
  createdAt: string;
  createdBy: ReceiptActor;
  createdById: string;
  farmId: string;
  id: string;
  itemCount: number;
  receiptCode: string;
  receiptDate: string;
  rejectReason: string | null;
  rejectedAt: string | null;
  status: PurchaseReceiptStatus;
  submittedAt: string | null;
  submittedBy: ReceiptActor | null;
  submittedById: string | null;
  supplierName: string | null;
  totalAmount: string;
  updatedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
};

export type PurchaseReceiptDetail = PurchaseReceiptSummary & {
  clientRequestId: string | null;
  items: PurchaseReceiptItem[];
  note: string | null;
};

export type PurchaseReceiptListResponse = {
  items: PurchaseReceiptSummary[];
};

export type CreatePurchaseReceiptItemInput = {
  materialId?: string | null;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type CreatePurchaseReceiptInput = {
  clientRequestId: string;
  items: CreatePurchaseReceiptItemInput[];
  note?: string;
  receiptDate: string;
  supplierName?: string;
};
