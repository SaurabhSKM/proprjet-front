import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { ApiResponse } from '@/types'

export interface MethodDef {
  method_id: string
  method_name: string
  standard_body: string | null
  description: string | null
}

export const methodKeys = {
  all: () => ['methods'] as const,
  forProperty: (propertyId: string) => ['methods', 'property', propertyId] as const,
}

export function useMethods(search?: string) {
  return useQuery({
    queryKey: [...methodKeys.all(), search ?? ''],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<MethodDef[]>>('/methods', { params: { search } })
      return data.data ?? []
    },
  })
}

export function useMethodsForProperty(propertyId: string | null) {
  return useQuery({
    queryKey: methodKeys.forProperty(propertyId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<MethodDef[]>>(`/methods/properties/${propertyId}`)
      return data.data ?? []
    },
    enabled: !!propertyId,
  })
}

export function useCreateMethod() {
  const qc = useQueryClient()
  return useMutation({
    // 1. Add property_id?: string to the payload interface
    mutationFn: (payload: { method_name: string; property_id?: string; standard_body?: string; description?: string }) =>
      client.post<{ status: string; method_id: string }>('/methods', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: methodKeys.all() }),
  })
}

export function useLinkMethodToProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, methodId }: { propertyId: string; methodId: string }) =>
      client.post(`/methods/properties/${propertyId}`, { method_id: methodId }),
    onSuccess: (_, { propertyId }) => qc.invalidateQueries({ queryKey: methodKeys.forProperty(propertyId) }),
  })
}