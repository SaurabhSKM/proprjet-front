// src/api/values.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import { substanceKeys } from './substances'

export function useDeleteConstant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (constantId: string) =>
      client.delete<{ status: string; message: string }>(`/constants/${constantId}`),
    onSuccess: () => {
      // Properties may have changed — invalidate all substance property queries
      qc.invalidateQueries({ queryKey: substanceKeys.all() })
    },
  })
}
