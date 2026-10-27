import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { ApiResponse } from '@/types'

import type { DataReference } from '@/types'

export type ValueKind = 'constant' | 'series' | 'text'

const KIND_TO_ROUTE: Record<ValueKind, string> = { constant: 'constants', series: 'series', text: 'text' }

export const referenceKeys = {
  all: () => ['references'] as const,
  forValue: (kind: ValueKind, id: string) => ['references', kind, id] as const,
}

export function useReferences(search?: string) {
  return useQuery({
    queryKey: [...referenceKeys.all(), search ?? ''],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<DataReference[]>>('/references', { params: { search } })
      return data.data ?? []
    },
  })
}

export function useReferencesForValue(kind: ValueKind, valueId: string | null) {
  return useQuery({
    queryKey: referenceKeys.forValue(kind, valueId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<DataReference[]>>(`/references/${KIND_TO_ROUTE[kind]}/${valueId}/references`)
      return data.data ?? []
    },
    enabled: !!valueId,
  })
}

export function useCreateReference() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<DataReference, 'reference_id' | 'created_at'>) =>
      client.post<{ status: string; reference_id: string }>('/references', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: referenceKeys.all() }),
  })
}

export function useLinkReference(kind: ValueKind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ valueId, referenceId }: { valueId: string; referenceId: string }) =>
      client.post(`/references/${KIND_TO_ROUTE[kind]}/${valueId}/references`, { reference_id: referenceId }),
    onSuccess: (_, { valueId }) => qc.invalidateQueries({ queryKey: referenceKeys.forValue(kind, valueId) }),
  })
}

export function useUnlinkReference(kind: ValueKind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ valueId, referenceId }: { valueId: string; referenceId: string }) =>
      client.delete(`/references/${KIND_TO_ROUTE[kind]}/${valueId}/references/${referenceId}`),
    onSuccess: (_, { valueId }) => qc.invalidateQueries({ queryKey: referenceKeys.forValue(kind, valueId) }),
  })
}