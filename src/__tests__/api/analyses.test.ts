import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/api/client', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    delete: vi.fn(),
    patch:  vi.fn(),
  },
}))

import client from '@/api/client'
import {
  useSeries,
  useConstants,
  useAnalysesForSubstance,
} from '@/api/analyses'

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

// ── useSeries ─────────────────────────────────────────────────────────────────

describe('useSeries', () => {
  it('each series includes a points array', async () => {
    const mockSeries = [
      {
        series_id: 'ds_aaa',
        analysis_id: 'a_001',
        property_id: 'p_density',
        dependent_unit: 'kg/m3',
        series_constraints: null,
        points: [
          {
            point_id: 'pt_1',
            series_id: 'ds_aaa',
            independent_variables: { T: 298.15 },
            dependent_value: 780.5,
            uncertainty: null,
          },
          {
            point_id: 'pt_2',
            series_id: 'ds_aaa',
            independent_variables: { T: 323.15 },
            dependent_value: 762.1,
            uncertainty: 0.5,
          },
        ],
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockSeries } })

    const { result } = renderHook(() => useSeries('a_001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    const series = result.current.data![0]
    expect(series).toHaveProperty('points')
    expect(Array.isArray(series.points)).toBe(true)
    expect(series.points).toHaveLength(2)
  })

  it('points have correct shape with independent_variables and dependent_value', async () => {
    const mockSeries = [
      {
        series_id: 'ds_bbb',
        analysis_id: 'a_002',
        property_id: 'p_viscosity',
        dependent_unit: 'mPa.s',
        series_constraints: null,
        points: [
          {
            point_id: 'pt_10',
            series_id: 'ds_bbb',
            independent_variables: { T: 293.15, P: 101325 },
            dependent_value: 1.002,
            uncertainty: 0.01,
          },
        ],
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockSeries } })

    const { result } = renderHook(() => useSeries('a_002'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const pt = result.current.data![0].points[0]
    expect(pt).toHaveProperty('point_id', 'pt_10')
    expect(pt).toHaveProperty('series_id', 'ds_bbb')
    expect(pt.independent_variables).toEqual({ T: 293.15, P: 101325 })
    expect(pt).toHaveProperty('dependent_value', 1.002)
    expect(pt).toHaveProperty('uncertainty', 0.01)
  })

  it('returns empty array for analysis with no series', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useSeries('a_empty'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('series key is points not data_points', async () => {
    const mockSeries = [
      {
        series_id: 'ds_ccc',
        analysis_id: 'a_003',
        property_id: 'p_bp',
        dependent_unit: 'K',
        series_constraints: null,
        points: [],  // empty but present
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockSeries } })

    const { result } = renderHook(() => useSeries('a_003'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const series = result.current.data![0]
    expect(series).toHaveProperty('points')
    expect(series).not.toHaveProperty('data_points')
  })

  it('does not fetch when analysisId is empty', () => {
    const { result } = renderHook(() => useSeries(''), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(client.get).not.toHaveBeenCalled()
  })
})

// ── useConstants ──────────────────────────────────────────────────────────────

describe('useConstants', () => {
  it('returns constant values array', async () => {
    const mockConstants = [
      { constant_id: 'c_1', analysis_id: 'a_001', property_id: 'p_mw', value: 114.23, reported_unit: 'g/mol', method: null },
      { constant_id: 'c_2', analysis_id: 'a_001', property_id: 'p_bp', value: 398.8, reported_unit: 'K', method: 'ASTM_D86' },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockConstants } })

    const { result } = renderHook(() => useConstants('a_001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0]).toHaveProperty('property_id', 'p_mw')
    expect(result.current.data?.[1]).toHaveProperty('method', 'ASTM_D86')
  })

  it('returns empty array when no constants', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useConstants('a_empty'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

// ── useAnalysesForSubstance ───────────────────────────────────────────────────

describe('useAnalysesForSubstance', () => {
  it('includes source_metadata field in each analysis', async () => {
    const mockAnalyses = [
      {
        analysis_id: 'a_001',
        substance_id: 's_abc',
        project_id: 'p_1',
        data_source_type: 'Manual_Entry',
        created_at: '2024-03-10T09:00:00',
        created_by: 'user1',
        updated_at: null,
        updated_by: null,
        source_metadata: { operator: 'lab_A', instrument: 'GC-500' },
      },
    ]

    vi.mocked(client.get).mockResolvedValue({ data: { data: mockAnalyses } })

    const { result } = renderHook(() => useAnalysesForSubstance('Jet A'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const analysis = result.current.data?.[0]
    expect(analysis).toHaveProperty('source_metadata')
    expect(analysis?.source_metadata).toEqual({ operator: 'lab_A', instrument: 'GC-500' })
  })

  it('created_at is present and can be null', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: [
          { analysis_id: 'a_002', created_at: null, data_source_type: 'Bulk_CSV_Import' },
        ],
      },
    })

    const { result } = renderHook(() => useAnalysesForSubstance('Hexane'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].created_at).toBeNull()
  })
})
