// src/api/properties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { PropertyGroup, PropertyDefinition, ApiResponse } from '@/types'

export interface PropertyCatalogEntry {
  property_id: string
  property_name: string
  group_id: string | null
  group_name: string | null
  standard_unit: string | null
  method: string | null
  constant_count: number
  constant_substances: number
  text_count: number
  text_substances: number
  series_count: number
  series_points: number
  series_substances: number
}

export const propertyKeys = {
  groups: () => ['properties', 'groups'] as const,
  all:    () => ['properties'] as const,
}

export function usePropertyGroups() {
  return useQuery({
    queryKey: propertyKeys.groups(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<PropertyGroup[]>>('/properties/groups')
      return data.data ?? []
    },
  })
}

export function useProperties() {
  return useQuery({
    queryKey: propertyKeys.all(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<PropertyDefinition[]>>('/properties/')
      return data.data ?? []
    },
  })
}

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PropertyDefinition) => client.post('/properties/', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all() }),
  })
}

export function useUpdateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<PropertyDefinition> & { id: string }) =>
      client.patch(`/properties/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all() }),
  })
}

export function useDeleteProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/properties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all() }),
  })
}

export function usePropertyCatalog() {
  return useQuery({
    queryKey: ['properties', 'catalog'],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<PropertyCatalogEntry[]>>('/properties/catalog')
      return data.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreatePropertyGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      client.post('/properties/groups', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.groups() }),
  })
}
