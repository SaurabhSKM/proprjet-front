// src/api/similarity.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import client from './client'
import type { ApiResponse } from '@/types'

export interface SimilarSubstance {
  substance_id: string
  name: string
  cosine_distance: number
  similarity_score: number
}

export interface SimilarityModel {
  model_id: string
  model_name: string
  label: string
  architecture: string
  mode: string
  needs_scalars: boolean
}

export function useAvailableSimilarityModels() {
  return useQuery({
    queryKey: ['similarity', 'available-models'],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<SimilarityModel[]>>('/models/similarity/available-models')
      return data.data ?? []
    },
  })
}

export function useSimilarSubstances(substanceId: string | null, modelId: string, k = 10) {
  return useQuery({
    queryKey: ['similarity', modelId, substanceId, k],
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<SimilarSubstance[]>>(
        `/models/similarity/${modelId}/${substanceId}`, { params: { k } }
      )
      return data.data ?? []
    },
    enabled: !!substanceId && !!modelId,
  })
}

export function useEmbedAllSubstances(modelId: string) {
  return useMutation({
    mutationFn: () => client.post<ApiResponse<{ embedded: number; skipped: number; total_substances: number }>>(
      `/models/similarity/${modelId}/embed-all`
    ),
  })
}