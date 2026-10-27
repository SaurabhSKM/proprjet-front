// src/api/models.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { Model, ModelIO, ApiResponse, CreateModelPayload } from '@/types'

export const modelKeys = {
  all:    ()           => ['models'] as const,
  detail: (id: string) => ['models', id] as const,
  io:     (id: string) => ['models', id, 'io'] as const,
}

export function useModels() {
  return useQuery({
    queryKey: modelKeys.all(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<Model[]>>('/models')
      return data.data ?? []
    },
  })
}

export function useModelIO(modelId: string) {
  return useQuery({
    queryKey: modelKeys.io(modelId),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<ModelIO>>(`/models/${modelId}/io`)
      return data.data!
    },
    enabled: !!modelId,
  })
}

export function useCreateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateModelPayload) =>
      client.post<ApiResponse<Model>>('/models/model_create', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: modelKeys.all() }),
  })
}

export function useExecuteModel() {
  return useMutation({
    mutationFn: ({ modelId, inputs }: { modelId: string; inputs: Record<string, unknown> }) =>
      client.post(`/models/${modelId}/model_execute`, { inputs }),
  })
}

export function useAddModelOutput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, payload }: {
      modelId: string
      payload: { property_id: string; output_unit?: string; notes?: string }
    }) => client.post(`/models/${modelId}/outputs`, payload),
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: modelKeys.io(modelId) }),
  })
}

export function useDeleteModelOutput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, propertyId }: { modelId: string; propertyId: string }) =>
      client.delete(`/models/${modelId}/outputs/${propertyId}`),
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: modelKeys.io(modelId) }),
  })
}

export function useAddModelInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, payload }: {
      modelId: string
      payload: { input_name: string; input_unit?: string; is_required?: boolean }
    }) => client.post(`/models/${modelId}/inputs`, payload),
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: modelKeys.io(modelId) }),
  })
}

export function useDeleteModelInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, inputName }: { modelId: string; inputName: string }) =>
      client.delete(`/models/${modelId}/inputs/${inputName}`),
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: modelKeys.io(modelId) }),
  })
}

// Added to src/api/models.ts

export interface ModelArtifactMeta {
  artifact_id: string
  artifact_name: string
  artifact_type: string
  size_bytes: number
  created_at: string | null
}

export const artifactKeys = {
  list: (modelId: string) => ['models', modelId, 'artifacts'] as const,
}

export function useModelArtifacts(modelId: string | null) {
  return useQuery({
    queryKey: artifactKeys.list(modelId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<ModelArtifactMeta[]>>(`/models/${modelId}/artifacts`)
      return data.data ?? []
    },
    enabled: !!modelId,
  })
}

// src/api/models.ts — useUploadModelArtifact, corrected
export function useUploadModelArtifact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, artifactName, artifactType, file }: {
      modelId: string; artifactName: string; artifactType: string; file: File
    }) => {
      const formData = new FormData()
      formData.append('artifact_name', artifactName)
      formData.append('artifact_type', artifactType)
      formData.append('file', file)

      return client.post(`/models/${modelId}/artifacts`, formData, {
        // Clears the instance-level 'application/json' default for this
        // request only, so axios/the browser can generate the correct
        // multipart boundary instead. Setting to undefined removes the
        // header on merge rather than sending the literal string "undefined".
        headers: { 'Content-Type': undefined },
      })
    },
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: artifactKeys.list(modelId) }),
  })
}

export function useDeleteModelArtifact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, artifactName }: { modelId: string; artifactName: string }) =>
      client.delete(`/models/${modelId}/artifacts/${artifactName}`),
    onSuccess: (_, { modelId }) => qc.invalidateQueries({ queryKey: artifactKeys.list(modelId) }),
  })
}

export function useDeleteModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (modelId: string) => {
      const res = await client.delete<ApiResponse<null>>(`/models/${modelId}`)
      return res.data
    },
    onSuccess: (_, deletedModelId) => {
      // Invalidate the main list to refresh the table/UI
      queryClient.invalidateQueries({ queryKey: modelKeys.all() })
      // Optionally remove the specific model from cache
      queryClient.removeQueries({ queryKey: modelKeys.detail(deletedModelId) })
    },
  })
}