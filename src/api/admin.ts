// src/api/admin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosResponse } from 'axios'
import client from './client'
import type { DbStatus, ApiResponse, InjectionResult } from '@/types'

export const adminKeys = {
  status: () => ['admin', 'status'] as const,
}

export function useDbStatus() {
  return useQuery({
    queryKey: adminKeys.status(),
    queryFn: async () => {
      const { data } = await client.get<ApiResponse<DbStatus>>('/admin/status')
      return data.data!
    },
  })
}


export function useInjectPseudoLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => {
      const form = new FormData()
      form.append('file', file)
      return client.post<ApiResponse<InjectionResult>>('/admin/pseudo-library', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { category },
      })
    },
    onSuccess: async () => {
      await client.post('/optimizer/eos/invalidate-cache')
      qc.invalidateQueries({ queryKey: adminKeys.status() })
    },
  })
}


export function useInjectDatabaseClean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return client.post<ApiResponse<InjectionResult>>('/admin/database-clean', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.status() }),
  })
}

/**
 * Downloads the full property database as an .xlsx file (same layout the
 * /admin/database-clean injection endpoint reads back in). Returns the raw
 * axios response so callers can read both the blob body and the
 * Content-Disposition header for the server-suggested filename.
 */
export function useExportDatabaseClean() {
  return useMutation({
    mutationFn: () =>
      client.get<Blob>('/admin/database-clean/export', {
        responseType: 'blob',
      }),
  })
}

/** Triggers a browser download of an export mutation's response. */
export function downloadExportResponse(
  res: AxiosResponse<Blob>,
  fallbackName = `database_clean_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`,
) {
  const disposition = res.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? fallbackName

  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}