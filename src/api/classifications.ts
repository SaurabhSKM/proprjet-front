// src/api/classifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { Classification, AddClassificationPayload, Substance, ApiResponse } from '@/types'

export const classificationKeys = {
  all:        ()             => ['classifications'] as const,
  substances: (name: string) => ['classifications', name, 'substances'] as const,
}

// src/api/classifications.ts (wherever useClassifications lives)
export function useClassifications(entityType?: string) {
  return useQuery({
    queryKey: ['classifications', entityType ?? 'all'],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Classification[]>>('/classification/', {
        params: entityType ? { entity_type: entityType } : undefined,
      })
      return data.data ?? []
    },
  })
}
export function useSubstancesByClassification(ancestorName: string) {
  return useQuery({
    queryKey: classificationKeys.substances(ancestorName),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Substance[]>>(
        `/classification/${ancestorName}/substances`
      )
      return data.data ?? []
    },
    enabled: !!ancestorName,
  })
}

export function useAddClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddClassificationPayload) =>
      client.post('/classification/', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: classificationKeys.all() }),
  })
}

export function useAddSubstanceClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, classificationIds }: { name: string; classificationIds: string[] }) =>
      client.post(`/classification/substances/${name}`, { classifications: classificationIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: classificationKeys.all() }),
  })
}

export function useSearchByClassifications() {
  return useMutation({
    mutationFn: (classificationIds: string[]) =>
      client.post<ApiResponse<Substance[]>>('/classification/substances/search', {
        classifications: classificationIds,
      }),
  })
}

export function useRemoveClassificationLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, parentId }: { childId: string; parentId: string }) =>
      client.delete(`/classification/${childId}/parents/${parentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: classificationKeys.all() }),
  })
}


export function useLinkClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, parentId }: { childId: string; parentId: string }) =>
      client.post(`/classification/${childId}/parents/${parentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: classificationKeys.all() }),
  })
}