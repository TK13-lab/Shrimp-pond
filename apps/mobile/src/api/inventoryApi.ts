import { InventoryListResponse } from '../types/inventory';

import { requestJson } from './httpClient';

type ListInventoryParams = {
  materialId?: string;
  search?: string;
};

export function listInventory(
  params: ListInventoryParams = {}
): Promise<InventoryListResponse> {
  const query = new URLSearchParams();

  if (params.materialId?.trim()) {
    query.set('materialId', params.materialId.trim());
  }

  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }

  const suffix = query.toString();

  return requestJson<InventoryListResponse>(
    suffix ? `/inventory?${suffix}` : '/inventory',
    {
      method: 'GET',
      auth: true
    }
  );
}
