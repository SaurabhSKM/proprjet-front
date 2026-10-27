// src/api/gcxgc.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'

export interface GCxGCFamily {
  family_id: number
  family_name: string
  display_name: string
  general_formula: string
  major_group: string
}

export interface GCxGCAnalysis {
  analysis_id: string
  created_at: string | null
  data_source_type: string
  created_by: string
  source_metadata: Record<string, unknown> | null
}

export interface GCxGCTableRow {
  carbon: number
  total: number
  [family_slug: string]: number
}

export interface DetectedFamily {
  slug: string | null
  display_name: string
  formula: string
  major_group?: string
  warning?: string
}

export interface UploadResult {
  analysis_id: string
  detected_families: DetectedFamily[]
  row_count: number
}

export interface CreateEntryPayload {
  rows: { family_slug: string; carbon_count: number; value: number }[]
  data_source_type: string
  created_by: string
  source_metadata?: Record<string, unknown>
  analysis_id?: string  // reuse an existing analysis instead of creating a new one
}

// ── Key factories ─────────────────────────────────────────────────────────────
export const gcxgcKeys = {
  families:          ()               => ['gcxgc', 'families']              as const,
  analyses:          (sid: string)    => ['gcxgc', 'analyses', sid]         as const,
  table:             (aid: string)    => ['gcxgc', 'table', aid]            as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useGCxGCFamilies() {
  return useQuery({
    queryKey: gcxgcKeys.families(),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: GCxGCFamily[] }>('/gcxgc/families')
      return data.data ?? []
    },
    staleTime: 10 * 60_000,
  })
}

export function useSubstanceGCxGCAnalyses(substanceId: string | null) {
  return useQuery({
    queryKey: gcxgcKeys.analyses(substanceId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: GCxGCAnalysis[] }>(
        `/gcxgc/substances/${substanceId}/analyses`
      )
      return data.data ?? []
    },
    enabled: !!substanceId,
    staleTime: 30_000,
  })
}

export function useGCxGCTable(analysisId: string | null) {
  return useQuery({
    queryKey: gcxgcKeys.table(analysisId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: GCxGCTableRow[] }>(
        `/gcxgc/analyses/${analysisId}/table`
      )
      return data.data ?? []
    },
    enabled: !!analysisId,
    staleTime: 60_000,
  })
}

export function useCreateGCxGCEntry(substanceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateEntryPayload) => {
      const { data } = await client.post<{ status: string; data: { analysis_id: string } }>(
        `/gcxgc/substances/${substanceId}/entry`,
        payload
      )
      return data.data
    },
    onSuccess: () => {
      if (substanceId) qc.invalidateQueries({ queryKey: gcxgcKeys.analyses(substanceId) })
    },
  })
}

export function useUploadGCxGCFile(substanceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await client.post<{ status: string; data: UploadResult }>(
        `/gcxgc/substances/${substanceId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data.data
    },
    onSuccess: () => {
      if (substanceId) qc.invalidateQueries({ queryKey: gcxgcKeys.analyses(substanceId) })
    },
  })
}

// ── Completeness ──────────────────────────────────────────────────────────────
export interface SubstanceCompleteness {
  substance_id: string
  name: string
  substance_type: string
  has_density: boolean
  has_fp: boolean
  has_mw: boolean
  has_kv_p40: boolean
  has_kv_m20: boolean
  has_kv_m40: boolean
  has_gcxgc: boolean
  has_lhv: boolean
  has_frzp: boolean
  has_surft: boolean
  has_cp: boolean
  has_dist: boolean
  has_eos: boolean
  missing_fields: string[]
}

export function useCompletenessData() {
  return useQuery({
    queryKey: ['optimizer', 'completeness'],
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: SubstanceCompleteness[] }>(
        '/optimizer/completeness'
      )
      return data.data ?? []
    },
    staleTime: 2 * 60_000,
  })
}

// ── Isomer Mappings ───────────────────────────────────────────────────────────
export interface IsomerMapping {
  mapping_id: number
  bin_id: number
  family_name: string
  display_name: string
  general_formula: string
  carbon_count: number
  substance_id: string
  substance_name: string
  substance_type: string
  default_molar_fraction: number | null
}

export interface GCxGCBin {
  bin_id: number
  family_id: number
  family_name: string
  display_name: string
  general_formula: string
  carbon_count: number
}

export const isomerKeys = {
  all:  () => ['gcxgc', 'isomers'] as const,
  bins: () => ['gcxgc', 'bins']    as const,
}

export function useIsomerMappings() {
  return useQuery({
    queryKey: isomerKeys.all(),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: IsomerMapping[] }>(
        '/gcxgc/isomer-mappings'
      )
      return data.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useGCxGCBins() {
  return useQuery({
    queryKey: isomerKeys.bins(),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: GCxGCBin[] }>('/gcxgc/bins')
      return data.data ?? []
    },
    staleTime: 10 * 60_000,
  })
}

export function useCreateIsomerMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { bin_id: number; substance_id: string; default_molar_fraction?: number | null }) => {
      const { data } = await client.post<{ status: string; data: { mapping_id: number } }>(
        '/gcxgc/isomer-mappings', payload
      )
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: isomerKeys.all() }),
  })
}

export function useUpdateIsomerMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mappingId, fraction }: { mappingId: number; fraction: number | null }) => {
      await client.patch(`/gcxgc/isomer-mappings/${mappingId}`, { default_molar_fraction: fraction })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: isomerKeys.all() }),
  })
}

export function useDeleteIsomerMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mappingId: number) => {
      await client.delete(`/gcxgc/isomer-mappings/${mappingId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: isomerKeys.all() }),
  })
}

// ── Target auto-fill ──────────────────────────────────────────────────────────
export interface GCxGCTargets {
  family_totals: { npara: number; isopara: number; cyclopara: number; arom: number }
  carbon_dist: number[]   // 20 values C6-C25
  substance_name?: string
  analysis_id?: string
  detected_families?: DetectedFamily[]
  row_count?: number
}

export function useSubstanceGCxGCTargets() {
  return useMutation({
    mutationFn: async (substanceId: string) => {
      const { data } = await client.get<{ status: string; data: GCxGCTargets }>(
        `/gcxgc/substances/${substanceId}/targets`
      )
      return data.data
    },
  })
}

export function useParseGCxGCTargets() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await client.post<{ status: string; data: GCxGCTargets }>(
        '/gcxgc/parse-targets',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data.data
    },
  })
}

export function downloadGCxGCFile(analysisId: string, fmt: 'csv' | 'xlsx') {
  client
    .get(`/gcxgc/analyses/${analysisId}/download?format=${fmt}`, { responseType: 'blob' })
    .then(res => {
      const ext  = fmt === 'xlsx' ? 'xlsx' : 'csv'
      const mime = fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      const blob = new Blob([res.data as BlobPart], { type: mime })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `gcxgc_${analysisId}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    })
}
