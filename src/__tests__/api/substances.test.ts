import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
  useSubstances,
  useSubstanceTimeline,
} from '@/api/substances'

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

// ── useSubstances ─────────────────────────────────────────────────────────────

describe('useSubstances', () => {
  it('normalises substance_type from type key', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: [
          { substance_id: 's1', nom: 'Jet A', type: 'fuel' },
          { substance_id: 's2', nom: 'Hexane', substance_type: 'molecule' },
        ],
      },
    })

    const { result } = renderHook(() => useSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    // Item with only 'type' key gets normalised: substance_type is populated from type
    expect(result.current.data?.[0].substance_type).toBe('fuel')
    // Item with 'substance_type' keeps its value
    expect(result.current.data?.[1].substance_type).toBe('molecule')
  })

  it('prefers substance_type over type when both present', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: [
          { substance_id: 's1', nom: 'Test', type: 'old', substance_type: 'new' },
        ],
      },
    })

    const { result } = renderHook(() => useSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.[0].substance_type).toBe('new')
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('calls /substances/list_substances', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: [] } })

    const { result } = renderHook(() => useSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.get).toHaveBeenCalledWith('/substances/list_substances')
  })
})

// ── useSubstanceTimeline ──────────────────────────────────────────────────────

describe('useSubstanceTimeline', () => {
  it('returns timeline events with created_at field (not date_recorded)', async () => {
    const mockEvents = [
      {
        analysis_id: 'a_001',
        created_at: '2024-01-15T10:30:00',
        data_source_type: 'Bulk_CSV_Import',
        project_id: 'p_abc',
        source_metadata: { import_batch: 'Initial_Upload' },
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockEvents } })

    const { result } = renderHook(() => useSubstanceTimeline('Jet A'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    const event = result.current.data?.[0]
    expect(event).toHaveProperty('created_at', '2024-01-15T10:30:00')
    expect(event).not.toHaveProperty('date_recorded')
  })

  it('timeline event has source_metadata field', async () => {
    const mockEvents = [
      {
        analysis_id: 'a_002',
        created_at: null,
        data_source_type: 'Manual_Entry',
        project_id: null,
        source_metadata: { operator: 'lab1', method: 'GC-MS' },
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockEvents } })

    const { result } = renderHook(() => useSubstanceTimeline('Hexane'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const event = result.current.data?.[0]
    expect(event?.source_metadata).toEqual({ operator: 'lab1', method: 'GC-MS' })
  })

  it('created_at can be null without error', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: { data: [{ analysis_id: 'a_003', created_at: null, data_source_type: 'Manual' }] },
    })

    const { result } = renderHook(() => useSubstanceTimeline('Ethanol'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].created_at).toBeNull()
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useSubstanceTimeline('Unknown'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('does not fetch when name is empty', () => {
    const { result } = renderHook(() => useSubstanceTimeline(''), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(client.get).not.toHaveBeenCalled()
  })
})
