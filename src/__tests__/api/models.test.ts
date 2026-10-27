import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/api/client', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    delete: vi.fn(),
  },
}))

import client from '@/api/client'
import { useExecuteModel, useModels } from '@/api/models'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── useExecuteModel ───────────────────────────────────────────────────────────

describe('useExecuteModel', () => {
  it('posts with inputs key (not input_data)', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', output: { density: 782.3 } },
    })

    const { result } = renderHook(() => useExecuteModel(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ modelId: 'm_001', inputs: { T: 298.15, P: 101325 } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/models/m_001/model_execute',
      { inputs: { T: 298.15, P: 101325 } }
    )
  })

  it('post body does NOT use input_data key', async () => {
    vi.mocked(client.post).mockResolvedValue({ data: { status: 'success', output: {} } })

    const { result } = renderHook(() => useExecuteModel(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ modelId: 'm_002', inputs: { x: 1.0 } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const callArgs = vi.mocked(client.post).mock.calls[0]
    const body = callArgs[1] as Record<string, unknown>
    expect(body).toHaveProperty('inputs')
    expect(body).not.toHaveProperty('input_data')
  })

  it('returns mutation result on success', async () => {
    const mockOutput = { density: 782.3, viscosity: 1.45 }
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', output: mockOutput },
    })

    const { result } = renderHook(() => useExecuteModel(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ modelId: 'm_003', inputs: { T: 300 } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.data.output).toEqual(mockOutput)
  })

  it('constructs endpoint URL with modelId', async () => {
    vi.mocked(client.post).mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useExecuteModel(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ modelId: 'my_model_42', inputs: {} })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith('/models/my_model_42/model_execute', expect.any(Object))
  })
})

// ── useModels ─────────────────────────────────────────────────────────────────

describe('useModels', () => {
  it('returns model list from API', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: [
          { model_id: 'm_1', model_name: 'Density Model', description: 'Computes density' },
          { model_id: 'm_2', model_name: 'Viscosity Model', description: null },
        ],
      },
    })

    const { result } = renderHook(() => useModels(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].model_id).toBe('m_1')
    expect(client.get).toHaveBeenCalledWith('/models')
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useModels(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
