import { MaterialInput, MaterialListResponse } from '../types/materials';

import { requestJson } from './httpClient';

type ListMaterialsParams = {
  active?: boolean;
  search?: string;
};

export function listMaterials(
  params: ListMaterialsParams = {}
): Promise<MaterialListResponse> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.active !== undefined) {
    query.set('active', String(params.active));
  }

  const suffix = query.toString();

  return requestJson<MaterialListResponse>(
    suffix ? `/materials?${suffix}` : '/materials',
    {
      method: 'GET',
      auth: true
    }
  );
}

export function createMaterial(input: MaterialInput) {
  return requestJson('/materials', {
    method: 'POST',
    auth: true,
    body: {
      name: input.name.trim(),
      defaultUnit: input.defaultUnit.trim(),
      note: input.note?.trim() ?? ''
    }
  });
}

export function updateMaterial(materialId: string, input: MaterialInput) {
  return requestJson(`/materials/${materialId}`, {
    method: 'PATCH',
    auth: true,
    body: {
      name: input.name.trim(),
      defaultUnit: input.defaultUnit.trim(),
      note: input.note?.trim() ?? ''
    }
  });
}

export function disableMaterial(materialId: string) {
  return requestJson(`/materials/${materialId}/disable`, {
    method: 'PATCH',
    auth: true
  });
}
