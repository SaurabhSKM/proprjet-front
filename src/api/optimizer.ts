// src/api/optimizer.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  PoolSubstance, DataCompleteness, OptimizationRun,
  OptimizationResult, ComputedProperties, DistillationPoint, PvapPoint,
  ApiResponse,
} from '@/types'

// ── Key factories ─────────────────────────────────────────────────────────────
export const optimizerKeys = {
  substances: ()            => ['optimizer', 'substances'] as const,
  pool:       (ids: string[]) => ['optimizer', 'pool', ...ids.sort()] as const,
  runs:       ()            => ['optimizer', 'runs'] as const,
  run:        (id: string)  => ['optimizer', 'runs', id] as const,
  runConfig:  (id: string)  => ['optimizer', 'runs', id, 'config'] as const,
}

// ── Pool substances list ──────────────────────────────────────────────────────
export function usePoolSubstances(category?: string, search?: string) {
  return useQuery({
    queryKey: [...optimizerKeys.substances(), category, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      const qs = params.toString()
      const { data } = await client.get<ApiResponse<PoolSubstance[]>>(
        `/optimizer/substances${qs ? `?${qs}` : ''}`
      )
      return data.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

// ── Pool metadata (data completeness) ────────────────────────────────────────
export function usePool(substanceIds: string[]) {
  return useQuery({
    queryKey: optimizerKeys.pool(substanceIds),
    queryFn: async () => {
      const { data } = await client.post<{
        status: string
        n_components: number
        data_completeness: Record<string, DataCompleteness>
        missing_data: Record<string, string[]>
      }>('/optimizer/pool', { substance_ids: substanceIds })
      return data
    },
    enabled: substanceIds.length > 0,
    staleTime: 2 * 60_000,
  })
}

// ── Substance measured properties (for reference fuel comparison) ─────────────
export interface SubstanceProps {
  substance_id: string
  name: string
  density:  number | null
  fp:       number | null
  kv_p40:   number | null
  kv_m20:   number | null
  kv_m40:   number | null
  mw:       number | null
  lhv:      number | null
  frzp:     number | null
  surft_20: number | null
  cp_20:    number | null
  dist_t50: number | null
}

export function useSubstanceProps(id: string | null) {
  return useQuery<SubstanceProps>({
    queryKey: ['substanceProps', id],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<SubstanceProps>>(`/optimizer/substance-props/${id}`)
      return data.data as SubstanceProps
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

// ── Run optimizer ─────────────────────────────────────────────────────────────
export function useRunOptimizer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post<{
        status: string
        run_id: string
        results: OptimizationResult[]
        errors: string[]
        missing_data: Record<string, string[]>
      }>('/optimizer/run', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: optimizerKeys.runs() }),
  })
}

// ── List runs — 30s stale (others may be submitting) ─────────────────────────
export function useRuns(projectId?: string, limit = 50, offset = 0, runType?: string) {
  return useQuery({
    queryKey: [...optimizerKeys.runs(), projectId, limit, offset, runType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (projectId) params.set('project_id', projectId)
      params.set('limit', String(limit))
      if (offset) params.set('offset', String(offset))
      if (runType) params.set('run_type', runType)
      const { data } = await client.get<ApiResponse<OptimizationRun[]>>(
        `/optimizer/runs?${params}`
      )
      return data.data ?? []
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

// ── Get single run (polls while no results yet) ───────────────────────────────
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: optimizerKeys.run(runId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<OptimizationRun>>(
        `/optimizer/runs/${runId}`
      )
      return data.data!
    },
    enabled: !!runId,
    staleTime: 0,
    refetchInterval: (query) => {
      const run = query.state.data
      if (!run) return 2000
      const hasResults = (run.results?.length ?? 0) > 0
      return hasResults ? false : 2000
    },
  })
}

// ── Delete run ────────────────────────────────────────────────────────────────
export function useDeleteRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => client.delete(`/optimizer/runs/${runId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: optimizerKeys.runs() }),
  })
}

// ── Export run config ─────────────────────────────────────────────────────────
export function useRunConfig(runId: string | null) {
  return useQuery({
    queryKey: optimizerKeys.runConfig(runId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; config: Record<string, unknown> }>(
        `/optimizer/runs/${runId}/config`
      )
      return data.config
    },
    enabled: !!runId,
  })
}

// ── Compute properties for arbitrary blend ───────────────────────────────────
export function useComputeBlend() {
  return useMutation({
    mutationFn: (payload: { composition: Record<string, number>; fp_basis?: string }) =>
      client.post<{
        status: string
        composition: Record<string, number>
        properties: ComputedProperties
        carbon_profile: number[]
        missing_data: Record<string, string[]>
      }>('/optimizer/compute', payload),
  })
}

// ── Save manual run (compute + persist to DB) ─────────────────────────────────
export function useSaveManualRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      run_name: string
      composition: Record<string, number>
      fp_basis?: string
      run_eos?: boolean
      eos_step_size?: number
      mixing_behavior?: string
    }) =>
      client.post<{
        status: string
        run_id: string
        carbon_profile: number[]
        result: OptimizationResult
      }>('/optimizer/manual/run', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: optimizerKeys.runs() }),
  })
}

// ── GCxGC subfamily totals (from raw composition data) ───────────────────────
export function useGCxGCSubfamilyTotals() {
  return useMutation({
    mutationFn: (composition: Record<string, number>) =>
      client.post<{
        status: string
        totals: Record<string, number>   // {family_name: pct, gcxgc_coverage: pct}
      }>('/optimizer/blend/gcxgc-subfamily-totals', { composition }),
  })
}

// ── GCxGC table for a blend ───────────────────────────────────────────────────
export function useGCxGCTable() {
  return useMutation({
    mutationFn: (composition: Record<string, number>) =>
      client.post<{
        status: string
        table: Record<string, number | string>[]
        n_carbons: number
      }>('/optimizer/blend/gcxgc-table', { composition }),
  })
}

// ── Batch quantities ──────────────────────────────────────────────────────────
export function useBatchQuantities() {
  return useMutation({
    mutationFn: (payload: { composition: Record<string, number>; target_volume_ml: number }) =>
      client.post<{
        status: string
        blend_density_g_ml: number
        total_mass_g: number
        target_volume_ml: number
        components: {
          substance_id: string; name: string
          mass_fraction: number; mass_g: number; volume_ml: number | null
        }[]
      }>('/optimizer/blend/batch-quantities', payload),
  })
}

// ── Export DB row ─────────────────────────────────────────────────────────────
export function useExportRow() {
  return useMutation({
    mutationFn: (payload: {
      composition: Record<string, number>
      name: string; category: string; fp_basis?: string
    }) =>
      client.post<{ status: string; row: Record<string, unknown> }>(
        '/optimizer/blend/export-row', payload
      ),
  })
}

// ── EOS distillation — blend ──────────────────────────────────────────────────
export function useEosDistillation() {
  return useMutation({
    mutationFn: (payload: {
      composition: Record<string, number>
      step_size?: number; mixing_behavior?: string
    }) =>
      client.post<{
        status: string
        distillation_points: Record<string, number>
        curve: DistillationPoint[]
      }>('/optimizer/eos/distillation', payload),
  })
}

// ── EOS distillation — target spec ───────────────────────────────────────────
export function useEosDistillationTarget() {
  return useMutation({
    mutationFn: (payload: {
      target_families: Record<string, number>
      subfamily_shares: Record<string, number>
      carbon_dist: number[]
      step_size?: number; mixing_behavior?: string
    }) =>
      client.post<{
        status: string
        distillation_points: Record<string, number>
        curve: DistillationPoint[]
      }>('/optimizer/eos/distillation-target', payload),
  })
}

// ── EOS Pvap ─────────────────────────────────────────────────────────────────
export function useEosPvap() {
  return useMutation({
    mutationFn: (payload: {
      composition: Record<string, number>; mixing_behavior?: string
    }) =>
      client.post<{
        status: string
        pvap_points: Record<string, number>
        curve: PvapPoint[]
      }>('/optimizer/eos/pvap', payload),
  })
}

// ── Target viscosity preview ──────────────────────────────────────────────────
export function useTargetViscosity() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post<{
        status: string
        kv_p20_mm2s: number | null
        kv_m20_mm2s: number | null
        kv_m40_mm2s: number | null
      }>('/optimizer/target/viscosity', payload),
  })
}

// ── Target density (GCxGC Ridge) ──────────────────────────────────────────────
export function usePredictDensity() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post<{ status: string; density_g_ml: number }>(
        '/optimizer/predict-density', payload
      ),
  })
}

// ── Validate config ───────────────────────────────────────────────────────────
export function useValidateConfig() {
  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      client.post<{ status: string; valid: boolean; errors: string[] }>(
        '/optimizer/config/validate', { config }
      ),
  })
}

// ── Distillation Design ───────────────────────────────────────────────────────
export function useRunDistillationDesign() {
  return useMutation({
    mutationFn: (payload: {
      substance_ids: string[]
      dist_spec: Record<string, { target: number; lo?: number | null; hi?: number | null }>
      family_constraints?: Record<string, unknown>
      availability_limits?: Record<string, unknown>
      n_restarts?: number
      fp_basis?: string
    }) =>
      client.post<{
        status: string
        run_id: string
        results: import('@/types').OptimizationResult[]
        spec_status: Record<string, { achieved: number; met: boolean; lo: number | null; hi: number | null; target: number | null }>
        errors: string[]
        missing_data: Record<string, string[]>
      }>('/optimizer/run-distillation-design', payload),
  })
}

// ── Invalidate EOS cache ──────────────────────────────────────────────────────
export function useInvalidateEosCache() {
  return useMutation({
    mutationFn: () => client.post('/optimizer/eos/invalidate-cache'),
  })
}

// ── Constraint diagnostics ────────────────────────────────────────────────────
export interface DiagnoseIssue {
  type: 'availability' | 'family' | 'missing_data'
  severity: 'error' | 'warning'
  message: string
  detail?: Record<string, unknown>
}

export interface DiagnoseResult {
  feasible: boolean
  lp_errors: string[]
  issues: DiagnoseIssue[]
  pool_size: number
  family_ranges: Record<string, { pool_min: number; pool_max: number }>
}

export function useDiagnoseConstraints() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await client.post<{ status: string } & DiagnoseResult>(
        '/optimizer/diagnose',
        payload
      )
      return data as DiagnoseResult
    },
  })
}

// ── Run notes ─────────────────────────────────────────────────────────────────
export interface RunNote {
  note_id: string
  note_text: string
  created_at: string | null
  created_by: string | null
}

export function useRunNotes(runId: string | null) {
  return useQuery({
    queryKey: ['optimizer', 'runs', runId, 'notes'],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<RunNote[]>>(
        `/optimizer/runs/${runId}/notes`
      )
      return data.data ?? []
    },
    enabled: !!runId,
  })
}

export function useAddRunNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ runId, note_text }: { runId: string; note_text: string }) =>
      client.post<{ status: string; note_id: string }>(
        `/optimizer/runs/${runId}/notes`,
        { note_text }
      ),
    onSuccess: (_, { runId }) =>
      qc.invalidateQueries({ queryKey: ['optimizer', 'runs', runId, 'notes'] }),
  })
}

export function useDeleteRunNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, runId: _runId }: { noteId: string; runId: string }) =>
      client.delete(`/optimizer/notes/${noteId}`),
    onSuccess: (_, { runId }) =>
      qc.invalidateQueries({ queryKey: ['optimizer', 'runs', runId, 'notes'] }),
  })
}

// ── Per-substance data completeness ──────────────────────────────────────────
export function useSubstanceCompleteness(substanceId: string | null) {
  return useQuery({
    queryKey: ['optimizer', 'completeness', substanceId],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<DataCompleteness>>(
        `/optimizer/completeness/${substanceId}`
      )
      return data.data!
    },
    enabled: !!substanceId,
    staleTime: 5 * 60_000,
  })
}
