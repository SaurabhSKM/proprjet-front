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
import {
  useInjectPseudoLibrary,
  useInjectDatabaseClean,
} from '@/api/admin'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

function makeFile(name: string): File {
  return new File(['col1,col2\n1,2'], name, { type: 'text/csv' })
}

// New backend envelope: { status, data: { rows_processed, rows_failed, errors, gcxgc_warnings? } }
const SUCCESS_RESPONSE = {
  data: {
    status: 'success',
    data: { rows_processed: 5, rows_failed: 0, errors: [] },
  },
}

const PARTIAL_RESPONSE = {
  data: {
    status: 'success',
    data: { rows_processed: 3, rows_failed: 2, errors: ['Row 4: bad value', 'Row 5: unknown family'] },
  },
}

const WARNINGS_RESPONSE = {
  data: {
    status: 'success',
    data: {
      rows_processed: 10,
      rows_failed: 0,
      errors: [],
      gcxgc_warnings: [
        { name: 'Jet-A', gcxgc_total: 98.5 },
        { name: 'Fuel-B', gcxgc_total: 102.1 },
      ],
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── useInjectPseudoLibrary ────────────────────────────────────────────────────

describe('useInjectPseudoLibrary', () => {
  it('sends single file with category as query param', async () => {
    vi.mocked(client.post).mockResolvedValue(SUCCESS_RESPONSE)

    const { result } = renderHook(() => useInjectPseudoLibrary(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ file: makeFile('fuels.csv'), category: 'fuels' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/admin/pseudo-library',
      expect.any(FormData),
      expect.objectContaining({ params: { category: 'fuels' } })
    )
  })

  it('FormData contains file key', async () => {
    vi.mocked(client.post).mockResolvedValue(SUCCESS_RESPONSE)

    const { result } = renderHook(() => useInjectPseudoLibrary(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ file: makeFile('solvents.csv'), category: 'solvents' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const formData = vi.mocked(client.post).mock.calls[0][1] as FormData
    expect(formData.get('file')).toBeInstanceOf(File)
  })

  it('response data has rows_processed and rows_failed fields', async () => {
    vi.mocked(client.post).mockResolvedValue(SUCCESS_RESPONSE)

    const { result } = renderHook(() => useInjectPseudoLibrary(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ file: makeFile('fuels.csv'), category: 'fuel' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const payload = result.current.data?.data.data
    expect(payload?.rows_processed).toBe(5)
    expect(payload?.rows_failed).toBe(0)
    expect(Array.isArray(payload?.errors)).toBe(true)
  })

  it('response data.errors contains messages when rows fail', async () => {
    vi.mocked(client.post).mockResolvedValue(PARTIAL_RESPONSE)

    const { result } = renderHook(() => useInjectPseudoLibrary(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ file: makeFile('fuels.csv'), category: 'fuel' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const payload = result.current.data?.data.data
    expect(payload?.rows_failed).toBe(2)
    expect(payload?.errors).toHaveLength(2)
    expect(payload?.errors?.[0]).toContain('Row 4')
  })

  it('response data.gcxgc_warnings is present when backend reports imbalance', async () => {
    vi.mocked(client.post).mockResolvedValue(WARNINGS_RESPONSE)

    const { result } = renderHook(() => useInjectPseudoLibrary(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ file: makeFile('fuels.csv'), category: 'fuel' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const warnings = result.current.data?.data.data?.gcxgc_warnings
    expect(warnings).toBeDefined()
    expect(warnings).toHaveLength(2)
    expect(warnings![0].name).toBe('Jet-A')
    expect(typeof warnings![0].gcxgc_total).toBe('number')
  })
})


// ── useInjectDatabaseClean ───────────────────────────────────────────────────

describe('useInjectDatabaseClean', () => {
  it('posts file to /admin/database-clean', async () => {
    vi.mocked(client.post).mockResolvedValue(WARNINGS_RESPONSE)

    const { result } = renderHook(() => useInjectDatabaseClean(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate(makeFile('database_clean.xlsx'))
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/admin/database-clean',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
  })

  it('gcxgc_warnings are accessible in response', async () => {
    vi.mocked(client.post).mockResolvedValue(WARNINGS_RESPONSE)

    const { result } = renderHook(() => useInjectDatabaseClean(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate(makeFile('database_clean.xlsx'))
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const warnings = result.current.data?.data.data?.gcxgc_warnings
    expect(warnings).toHaveLength(2)
    expect(warnings![1].gcxgc_total).toBeCloseTo(102.1)
  })
})
