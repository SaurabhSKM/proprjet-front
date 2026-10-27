// src/api/substances.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Substance, SubstanceDetail,
  TimelineEvent, LeafComposition, ApiResponse,
} from '@/types'

export const substanceKeys = {
  all:        ()         => ['substances'] as const,
  list:       ()         => [...substanceKeys.all(), 'list'] as const,
  detail:     (name: string) => [...substanceKeys.all(), name] as const,
  properties: (name: string) => [...substanceKeys.detail(name), 'properties'] as const,
  timeline:   (name: string) => [...substanceKeys.detail(name), 'timeline'] as const,
  leaves:     (name: string) => [...substanceKeys.detail(name), 'leaves'] as const,
}

type RawSubstance = Omit<Substance, 'substance_type'> & { type?: string; substance_type?: string }

function normalizeSubstance<T extends RawSubstance>(raw: T): T & { substance_type: string } {
  return { ...raw, substance_type: (raw.substance_type ?? raw.type ?? '') as string }
}

export function useSubstances() {
  return useQuery({
    queryKey: substanceKeys.list(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<RawSubstance[]>>('/substances/list_substances')
      return (data.data ?? []).map(normalizeSubstance) as Substance[]
    },
  })
}

export function useSubstance(name: string) {
  return useQuery({
    queryKey: substanceKeys.detail(name),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<RawSubstance>>(`/substances/${name}`)
      return normalizeSubstance(data.data!) as SubstanceDetail
    },
    enabled: !!name,
  })
}

export function useSubstanceProperties(name: string) {
  return useQuery({
    queryKey: substanceKeys.properties(name),
    queryFn: async () => {
      const { data } = await client.get<{
        status: string
        substance?: string
        analyses?: Record<string, {
          data_source: string
          properties: {
            id?: string              
            constant_id?: string
            property_id?: string       // <-- 1. Added explicit property_id
            property_name?: string     // <-- 2. Added explicit property_name
            property?: string          // <-- Legacy fallback
            value: unknown
            value_qualifier?: string | null
            unit: string | null
            type: string
            method_id?: string | null  
            method_name?: string | null
          }[]
        }>
      }>(`/substances/${name}/properties`)

      const analysesList = []
      
      for (const [analysisId, analysisData] of Object.entries(data.analyses ?? {})) {
        const numericProps = (analysisData.properties ?? [])
          .filter(p => p.type === 'numeric')
          .map(p => {
            // 3. Fallback logic: If the backend still only sends 'property', 
            // check if it looks like an ID (starts with 'p_') or a display name.
            const rawId = p.property_id ?? (p.property?.startsWith('p_') ? p.property : undefined)
            const rawName = p.property_name ?? (p.property?.startsWith('p_') ? undefined : p.property)

            return {
              value_id: p.id ?? p.constant_id ?? `${analysisId}_${rawId ?? p.property}`,
              // 4. Safely assign the correct raw database ID (e.g., 'p_dens_gcxgc')
              property_id: rawId ?? p.property ?? '', 
              property_name: rawName ?? p.property ?? '',
              value: Number(p.value),
              value_qualifier: p.value_qualifier ?? null,
              unit: p.unit ?? null,
              method_id: p.method_id ?? null,
              method_name: p.method_name ?? null,
            }
          })

        if (numericProps.length > 0) {
          analysesList.push({
            analysis_id: analysisId,
            data_source: analysisData.data_source,
            properties: numericProps,
          })
        }
      }
      
      return analysesList
    },
    enabled: !!name,
  })
}

export function useSubstanceTimeline(name: string) {
  return useQuery({
    queryKey: substanceKeys.timeline(name),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<TimelineEvent[]>>(
        `/substances/${name}/timeline`
      )
      return data.data ?? []
    },
    enabled: !!name,
  })
}

export function useSubstanceLeaves(name: string) {
  return useQuery({
    queryKey: substanceKeys.leaves(name),
    queryFn: async () => {
      const { data } = await client.get<{
        status: string
        substance?: string
        analyses?: Record<string, { data_source: string; components: { component: string; absolute_fraction: number; fraction_type: string; node_type: string }[] }>
      }>(`/substances/${name}/leaves`)

      // Backend returns { analyses: { [analysisId]: { data_source, components: [{component, absolute_fraction, fraction_type, node_type}] } } }
      // Flatten all analyses' components and deduplicate by substance name
      const deduped: Record<string, LeafComposition> = {}
      for (const { components } of Object.values(data.analyses ?? {})) {
        for (const c of components ?? []) {
          if (deduped[c.component]) {
            deduped[c.component].fraction += c.absolute_fraction
          } else {
            deduped[c.component] = {
              substance_id: c.component,  // backend has no UUID; use name for navigation (routes by nom)
              nom: c.component,
              fraction: c.absolute_fraction,
              fraction_type: c.fraction_type,
            }
          }
        }
      }
      return Object.values(deduped)
    },
    enabled: !!name,
  })
}

export function useCreateSubstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { nom: string; substance_type: string; is_breakable?: boolean }) =>
      client.post<ApiResponse<Substance>>('/substances/create_substance', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: substanceKeys.list() }),
  })
}

export function useDeleteSubstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (substanceId: string) =>
      client.delete<{ status: string; message: string; mode: 'deleted' | 'archived' }>(`/substances/${substanceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: substanceKeys.list() }),
  })
}

export const compositionKeys = {
  forAnalysis: (id: string) => ['compositions', 'analysis', id] as const,
}

type CompositionComponent = {
  component_name: string
  component_analysis_id: string
  fraction: number
  fraction_type: string
}

export function useGetCompositions(analysisId: string, enabled = true) {
  return useQuery({
    queryKey: compositionKeys.forAnalysis(analysisId),
    queryFn: async () => {
      const { data } = await client.get<{
        status: string
        analyses?: Record<string, { parent_substance_name: string; data_source: string; components: CompositionComponent[] }>
      }>(`/substances/analyses/${analysisId}/getcompositions`)
      return data.analyses?.[analysisId]?.components ?? []
    },
    enabled: !!analysisId && enabled,
  })
}

export function useAddComposition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ analysisId, composition_string, fraction_type }: {
      analysisId: string
      composition_string: string
      fraction_type: 'mass' | 'volume' | 'mole'
    }) =>
      client.post<{ status: string; data: unknown[] }>(
        `/substances/analyses/${analysisId}/addcomposition`,
        { composition_string, fraction_type }
      ),
    onSuccess: (_, { analysisId }) =>
      qc.invalidateQueries({ queryKey: compositionKeys.forAnalysis(analysisId) }),
  })
}

export function useUploadSubstances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return client.post('/substances/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: substanceKeys.list() }),
  })
}

export function useUpdateSubstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ substanceId, payload }: {
      substanceId: string
      payload: Partial<{ nom: string; substance_type: string; is_breakable: boolean }>
    }) =>
      client.patch<ApiResponse<Substance>>(`/substances/${substanceId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: substanceKeys.list() })
    },
  })
}

export interface SubstanceClassification {
  classification_id: string
  name: string
  entity_type: string
  role: string | null
}

export function useSubstanceClassifications(substanceName: string) {
  return useQuery({
    queryKey: [...substanceKeys.detail(substanceName), 'classifications'],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<SubstanceClassification[]>>(
        `/substances/${substanceName}/classifications`
      )
      return data.data ?? []
    },
    enabled: !!substanceName,
  })
}
