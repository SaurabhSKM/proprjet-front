// src/api/projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'

export interface Project {
  project_id: string
  project_name: string
  description: string | null
  project_year: number | null
  analysis_count: number
}

export interface ProjectAnalysis {
  analysis_id: string
  substance_id: string
  substance_name: string
  data_source_type: string
  created_at: string | null
  created_by: string
}

const projectKeys = {
  all:      ()  => ['projects'] as const,
  analyses: (id: string) => ['projects', id, 'analyses'] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all(),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: Project[] }>('/projects')
      return data.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useProjectAnalyses(projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.analyses(projectId ?? ''),
    queryFn: async () => {
      const { data } = await client.get<{ status: string; data: ProjectAnalysis[] }>(
        `/projects/${projectId}/analyses`
      )
      return data.data ?? []
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { project_name: string; description?: string; project_year?: number }) => {
      const { data } = await client.post<{ status: string; data: Project }>('/projects', payload)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all() }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ project_id, ...rest }: Partial<Project> & { project_id: string }) => {
      const { data } = await client.patch<{ status: string; data: Project }>(
        `/projects/${project_id}`,
        rest
      )
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all() }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (project_id: string) => client.delete(`/projects/${project_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all() }),
  })
}
