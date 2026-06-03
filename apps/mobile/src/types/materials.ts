export type Material = {
  createdAt: string;
  defaultUnit: string;
  farmId: string;
  id: string;
  isActive: boolean;
  name: string;
  note: string | null;
  updatedAt: string;
};

export type MaterialListResponse = {
  items: Material[];
};

export type MaterialInput = {
  defaultUnit: string;
  name: string;
  note?: string;
};
