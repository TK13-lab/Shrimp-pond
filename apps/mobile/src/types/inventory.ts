import { AppRole } from '../auth/auth.types';

export type InventoryBalance = {
  averagePrice: string;
  currentQuantity: string;
  farmId: string;
  id: string;
  materialId: string;
  materialName: string;
  totalValue: string;
  unit: string;
  updatedAt: string;
};

export type InventoryListResponse = {
  items: InventoryBalance[];
};

export type InventoryTransactionType = 'STOCK_IN' | 'STOCK_IN_VOID';

export type InventoryReferenceType =
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RECEIPT_VOID';

export type InventoryTransactionActor = {
  fullName: string;
  id: string;
  role: AppRole;
  username: string;
};

export type InventoryTransaction = {
  createdAt: string;
  createdBy: InventoryTransactionActor;
  createdById: string;
  farmId: string;
  id: string;
  materialId: string;
  materialName: string;
  quantityChange: string;
  referenceId: string;
  referenceType: InventoryReferenceType;
  totalAmount: string;
  transactionType: InventoryTransactionType;
  unit: string;
  unitPrice: string;
};

export type InventoryTransactionListResponse = {
  items: InventoryTransaction[];
};
