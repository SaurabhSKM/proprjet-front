// src/api/analyses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Analysis, ConstantValue, TextValue, SeriesWithPoints,
  CreateAnalysisPayload, AddConstantPayload, AddSeriesPayload,
  AddPointsPayload, ApiResponse,
} from '@/types'

export const analysisKeys = {
  all:        ()           => ['analyses'] as const,
  detail:     (id: string) => ['analyses', id] as const,
  substance:  (name: string) => ['analyses', 'substance', name] as const,
  constants:  (id: string) => ['analyses', id, 'constants'] as const,
  text:       (id: string) => ['analyses', id, 'text'] as const,
  series:     (id: string) => ['analyses', id, 'series'] as const,
}

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: analysisKeys.detail(id),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Analysis>>(`/analyses/${id}`)
      return data.data!
    },
    enabled: !!id,
  })
}

export function useAnalysesForSubstance(name: string) {
  return useQuery({
    queryKey: analysisKeys.substance(name),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Analysis[]>>(
        `/analyses/substance/${name}`
      )
      return data.data ?? []
    },
    enabled: !!name,
  })
}

export function useConstants(analysisId: string) {
  return useQuery({
    queryKey: analysisKeys.constants(analysisId),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<ConstantValue[]>>(
        `/analyses/${analysisId}/constants`
      )
      return data.data ?? []
    },
    enabled: !!analysisId,
  })
}

export function useTextValues(analysisId: string) {
  return useQuery({
    queryKey: analysisKeys.text(analysisId),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<TextValue[]>>(
        `/analyses/${analysisId}/text`
      )
      return data.data ?? []
    },
    enabled: !!analysisId,
  })
}

export function useSeries(analysisId: string) {
  return useQuery({
    queryKey: analysisKeys.series(analysisId),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<SeriesWithPoints[]>>(
        `/analyses/${analysisId}/series`
      )
      return data.data ?? []
    },
    enabled: !!analysisId,
  })
}

export function useCreateAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAnalysisPayload) =>
      client.post<{ status: string; analysis_id: string }>('/analyses/', payload),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: analysisKeys.substance(vars.substance_id) }),
  })
}

export function useDeleteAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/analyses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: analysisKeys.all() }),
  })
}

export function useAddConstant(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddConstantPayload) =>
      client.post(`/analyses/${analysisId}/constants`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: analysisKeys.constants(analysisId) }),
  })
}

export function useAddSeries(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddSeriesPayload) =>
      client.post(`/analyses/${analysisId}/series`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: analysisKeys.series(analysisId) }),
  })
}

export function useAddPoints(seriesId: string, analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddPointsPayload) =>
      client.post(`/series/${seriesId}/points`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: analysisKeys.series(analysisId) }),
  })
}

export function useDeleteSeries(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => client.delete(`/series/${seriesId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: analysisKeys.series(analysisId) }),
  })
}

export function useUpdateAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string
      updated_by: string
      project_id?: string | null
      source_metadata?: Record<string, unknown> | null
      created_at?: string
    }) => client.patch(`/analyses/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: analysisKeys.detail(id) })
      qc.invalidateQueries({ queryKey: analysisKeys.all() })
    },
  })
}

export function useUpdateConstantValue(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value, change_reason, updated_by, reported_unit }: {
      id: string
      value: number
      change_reason: string
      updated_by: string
      reported_unit?: string
    }) =>
      client.patch(`/constants/${id}`, { value, change_reason, updated_by, reported_unit }),
    onSuccess: () => qc.invalidateQueries({ queryKey: analysisKeys.constants(analysisId) }),
  })
}

export function useUpdateTextValue(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      client.patch(`/text/${id}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: analysisKeys.text(analysisId) }),
  })
}

export function useDeleteTextValue(analysisId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/text/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: analysisKeys.text(analysisId) }),
  })
}
