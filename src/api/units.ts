// src/api/units.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { Unit, UnitConversion, ConvertPayload, ConvertResult, ApiResponse } from '@/types'

export const unitKeys = {
  all: () => ['units'] as const,
}

export function useUnits() {
  return useQuery({
    queryKey: unitKeys.all(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Unit[]>>('/units/')
      return data.data ?? []
    },
  })
}

export function useCreateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Unit) => client.post('/units/', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: unitKeys.all() }),
  })
}

export function useAddConversion() {
  return useMutation({
    mutationFn: (payload: UnitConversion) => client.post('/units/conversions', payload),
  })
}

export function useConvertUnit() {
  return useMutation({
    mutationFn: (payload: ConvertPayload) =>
      client.post<ApiResponse<ConvertResult>>('/units/convert', payload),
  })
}
