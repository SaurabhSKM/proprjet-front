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
  usePoolSubstances,
  usePool,
  useRunOptimizer,
  useRun,
  useRuns,
  useDeleteRun,
  useBatchQuantities,
  useDiagnoseConstraints,
  useComputeBlend,
  useSaveManualRun,
  useRunDistillationDesign,
} from '@/api/optimizer'

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

// ── usePoolSubstances ─────────────────────────────────────────────────────────

describe('usePoolSubstances', () => {
  it('returns substance list from API', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: [
          { substance_id: 's1', nom: 'Jet A', substance_type: 'fuel' },
          { substance_id: 's2', nom: 'Hexane', substance_type: 'molecule' },
        ],
      },
    })

    const { result } = renderHook(() => usePoolSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].substance_id).toBe('s1')
    expect(client.get).toHaveBeenCalledWith('/optimizer/substances')
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => usePoolSubstances(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

// ── usePool ───────────────────────────────────────────────────────────────────

describe('usePool', () => {
  it('posts substance_ids and returns pool metadata with missing_data', async () => {
    const mockPoolData = {
      status: 'success',
      n_components: 2,
      data_completeness: {
        s1: { name: 'Jet A', has_density: true, has_fp: false, missing_fields: ['has_fp'] },
      },
      missing_data: { s1: ['has_fp'] },
    }

    vi.mocked(client.post).mockResolvedValue({ data: mockPoolData })

    const { result } = renderHook(() => usePool(['s1', 's2']), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith('/optimizer/pool', {
      substance_ids: ['s1', 's2'],
    })
    expect(result.current.data?.missing_data).toEqual({ s1: ['has_fp'] })
    expect(result.current.data?.data_completeness?.s1.missing_fields).toEqual(['has_fp'])
  })

  it('does not fetch when substanceIds is empty', () => {
    const { result } = renderHook(() => usePool([]), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(client.post).not.toHaveBeenCalled()
  })
})

// ── useRunOptimizer ───────────────────────────────────────────────────────────

describe('useRunOptimizer', () => {
  it('result uses result_name key (not name)', async () => {
    // Verify that the hook correctly handles result_name from the API response
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        run_id: 'run_abc123',
        results: [
          {
            result_id: 'res_1',
            result_name: 'Balanced',   // ← fixed key
            composition: { s1: 0.6, s2: 0.4 },
            computed_properties: {},
            objective_value: 0.0023,
            converged: true,
          },
        ],
        errors: [],
        missing_data: {},
      },
    })

    const { result } = renderHook(() => useRunOptimizer(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ substance_ids: ['s1', 's2'], scenario: 'Balanced' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const apiResult = result.current.data?.data.results[0]
    expect(apiResult).toHaveProperty('result_name', 'Balanced')
    expect(apiResult).not.toHaveProperty('name')
  })

  it('converged field is present and boolean in live run response', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        run_id: 'run_xyz',
        results: [
          {
            result_id: 'res_2',
            result_name: 'Auto-Balanced',
            composition: {},
            computed_properties: {},
            objective_value: 0.001,
            converged: true,  // ← was missing before fix
          },
        ],
        errors: [],
        missing_data: {},
      },
    })

    const { result } = renderHook(() => useRunOptimizer(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ substance_ids: ['s1'], scenario: 'Auto-Balanced' }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const apiResult = result.current.data?.data.results[0]
    expect(apiResult?.converged).toBeDefined()
    expect(typeof apiResult?.converged).toBe('boolean')
    expect(apiResult?.converged).toBe(true)
  })

  it('posts to /optimizer/run', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { run_id: 'r1', results: [], errors: [], missing_data: {} },
    })

    const { result } = renderHook(() => useRunOptimizer(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ substance_ids: ['s1'] }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.post).toHaveBeenCalledWith('/optimizer/run', { substance_ids: ['s1'] })
  })
})

// ── useRun ────────────────────────────────────────────────────────────────────

describe('useRun', () => {
  it('history response includes converged field on each result', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        data: {
          run_id: 'run_abc',
          run_name: 'Test Run',
          run_type: 'predefined',
          results: [
            {
              result_id: 'res_1',
              result_name: 'Balanced',
              composition: { s1: 1.0 },
              computed_properties: {},
              objective_value: 0.0,
              converged: true,       // ← must be present for history load
            },
          ],
        },
      },
    })

    const { result } = renderHook(() => useRun('run_abc'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const runResult = result.current.data?.results?.[0]
    expect(runResult).toHaveProperty('converged', true)
    expect(runResult).toHaveProperty('result_name', 'Balanced')
  })

  it('does not fetch when runId is null', () => {
    const { result } = renderHook(() => useRun(null), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(client.get).not.toHaveBeenCalled()
  })
})

// ── useRuns ───────────────────────────────────────────────────────────────────

describe('useRuns', () => {
  it('fetches run list from /optimizer/runs', async () => {
    const runs = [
      { run_id: 'r1', run_name: 'Test 1', created_at: '2025-01-01', n_results: 3 },
      { run_id: 'r2', run_name: 'Test 2', created_at: '2025-01-02', n_results: 1 },
    ]
    vi.mocked(client.get).mockResolvedValue({ data: { data: runs } })

    const { result } = renderHook(() => useRuns(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].run_id).toBe('r1')
    expect(client.get).toHaveBeenCalledWith(expect.stringContaining('/optimizer/runs'))
  })

  it('passes limit as query param', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: [] } })

    const { result } = renderHook(() => useRuns(undefined, 10), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'))
  })

  it('passes project_id as query param when provided', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: [] } })

    const { result } = renderHook(() => useRuns('proj_abc'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.get).toHaveBeenCalledWith(expect.stringContaining('project_id=proj_abc'))
  })

  it('returns empty array when API data is null', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useRuns(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

// ── useDeleteRun ──────────────────────────────────────────────────────────────

describe('useDeleteRun', () => {
  it('sends DELETE to /optimizer/runs/{runId}', async () => {
    vi.mocked(client.delete).mockResolvedValue({ data: { status: 'success' } })
    // Stub the GET for invalidation query
    vi.mocked(client.get).mockResolvedValue({ data: { data: [] } })

    const { result } = renderHook(() => useDeleteRun(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate('run_to_delete') })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.delete).toHaveBeenCalledWith('/optimizer/runs/run_to_delete')
  })

  it('reports error when API returns rejection', async () => {
    vi.mocked(client.delete).mockRejectedValue(new Error('404 Not Found'))

    const { result } = renderHook(() => useDeleteRun(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate('nonexistent_run') })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

// ── useBatchQuantities ────────────────────────────────────────────────────────

describe('useBatchQuantities', () => {
  it('posts composition + volume to /optimizer/blend/batch-quantities', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        blend_density_g_ml: 0.798,
        total_mass_g: 398.5,
        target_volume_ml: 500,
        components: [
          { substance_id: 's1', name: 'Hexane', mass_fraction: 0.6, mass_g: 239.1, volume_ml: 306.5 },
          { substance_id: 's2', name: 'Toluene', mass_fraction: 0.4, mass_g: 159.4, volume_ml: 181.7 },
        ],
      },
    })

    const { result } = renderHook(() => useBatchQuantities(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ composition: { s1: 0.6, s2: 0.4 }, target_volume_ml: 500 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/optimizer/blend/batch-quantities',
      { composition: { s1: 0.6, s2: 0.4 }, target_volume_ml: 500 }
    )
  })

  it('response includes per-component mass_g and volume_ml', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        blend_density_g_ml: 0.750,
        total_mass_g: 375,
        target_volume_ml: 500,
        components: [
          { substance_id: 's1', name: 'Iso-octane', mass_fraction: 1.0, mass_g: 375, volume_ml: 500 },
        ],
      },
    })

    const { result } = renderHook(() => useBatchQuantities(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ composition: { s1: 1.0 }, target_volume_ml: 500 }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const comp = result.current.data?.data.components[0]
    expect(comp).toHaveProperty('mass_g', 375)
    expect(comp).toHaveProperty('volume_ml', 500)
    expect(comp).toHaveProperty('mass_fraction', 1.0)
  })
})

// ── useDiagnoseConstraints ────────────────────────────────────────────────────

describe('useDiagnoseConstraints', () => {
  it('posts to /optimizer/diagnose and returns DiagnoseResult shape', async () => {
    const mockResult = {
      status: 'success',
      feasible: false,
      lp_errors: ['Family npara: pool range [0, 30] cannot satisfy target [35, 60]'],
      issues: [
        { type: 'family', severity: 'error', message: 'n-Paraffins target infeasible', detail: {} },
      ],
      pool_size: 5,
      family_ranges: { npara: { pool_min: 0, pool_max: 30 } },
    }

    vi.mocked(client.post).mockResolvedValue({ data: mockResult })

    const { result } = renderHook(() => useDiagnoseConstraints(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        substance_ids: ['s1', 's2'],
        targets: { target_n: 40 },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith('/optimizer/diagnose', expect.objectContaining({
      substance_ids: ['s1', 's2'],
    }))

    const data = result.current.data
    expect(data?.feasible).toBe(false)
    expect(data?.lp_errors).toHaveLength(1)
    expect(data?.issues[0].type).toBe('family')
    expect(data?.issues[0].severity).toBe('error')
    expect(data?.pool_size).toBe(5)
    expect(data?.family_ranges.npara.pool_max).toBe(30)
  })

  it('reports feasible=true when constraints are satisfiable', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        feasible: true,
        lp_errors: [],
        issues: [],
        pool_size: 8,
        family_ranges: {},
      },
    })

    const { result } = renderHook(() => useDiagnoseConstraints(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ substance_ids: ['s1', 's2', 's3'] }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.feasible).toBe(true)
    expect(result.current.data?.lp_errors).toHaveLength(0)
  })
})

// ── useComputeBlend ───────────────────────────────────────────────────────────

describe('useComputeBlend', () => {
  it('posts composition to /optimizer/compute and returns properties', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        composition: { s1: 0.8, s2: 0.2 },
        properties: { density_sv_g_ml: 0.812, flash_point: 44.0 },
        carbon_profile: [0, 0.1, 0.3, 0.4, 0.2],
        missing_data: {},
      },
    })

    const { result } = renderHook(() => useComputeBlend(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({ composition: { s1: 0.8, s2: 0.2 }, fp_basis: 'vol' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith('/optimizer/compute', {
      composition: { s1: 0.8, s2: 0.2 },
      fp_basis: 'vol',
    })
    expect(result.current.data?.data.properties.density_sv_g_ml).toBe(0.812)
    expect(result.current.data?.data.missing_data).toEqual({})
  })

  it('surfaces missing_data when a substance has incomplete properties', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'partial',
        composition: { s1: 1.0 },
        properties: { density: null },
        carbon_profile: [],
        missing_data: { s1: ['density', 'flash_point'] },
      },
    })

    const { result } = renderHook(() => useComputeBlend(), { wrapper: makeWrapper() })
    act(() => { result.current.mutate({ composition: { s1: 1.0 } }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.missing_data.s1).toContain('density')
  })
})

// ── useSaveManualRun ──────────────────────────────────────────────────────────

describe('useSaveManualRun', () => {
  it('posts to /optimizer/manual/run and returns run_id + result', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        run_id: 'run_abc123',
        result: {
          result_id: 'res_001',
          result_name: 'My Blend',
          composition: { s1: 0.8, s2: 0.2 },
          computed_properties: { density_sv_g_ml: 0.812 },
          converged: true,
          objective_value: 0.0,
        },
      },
    })

    const { result } = renderHook(() => useSaveManualRun(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        run_name: 'My Blend',
        composition: { s1: 0.8, s2: 0.2 },
        fp_basis: 'vol',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.post).toHaveBeenCalledWith(
      '/optimizer/manual/run',
      expect.objectContaining({ run_name: 'My Blend' }),
    )
    expect(result.current.data?.data.run_id).toBe('run_abc123')
    expect(result.current.data?.data.result.computed_properties.density_sv_g_ml).toBe(0.812)
  })

  it('includes run_eos flag when EOS is requested', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', run_id: 'r1', result: {} },
    })

    const { result } = renderHook(() => useSaveManualRun(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        run_name: 'EOS Blend',
        composition: { s1: 1.0 },
        fp_basis: 'vol',
        run_eos: true,
        eos_step_size: 0.025,
        mixing_behavior: 'Ideal',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.post).toHaveBeenCalledWith(
      '/optimizer/manual/run',
      expect.objectContaining({ run_eos: true, mixing_behavior: 'Ideal' }),
    )
  })

  it('invalidates runs query on success', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', run_id: 'r2', result: {} },
    })
    vi.mocked(client.get).mockResolvedValue({ data: { data: [] } })

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useSaveManualRun(), { wrapper })

    act(() => { result.current.mutate({ run_name: 'Inv', composition: { s1: 1.0 }, fp_basis: 'vol' }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

// ── useRunDistillationDesign ──────────────────────────────────────────────────

describe('useRunDistillationDesign', () => {
  it('posts spec and gets converged result with spec_status', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        run_id: 'run_dist_01',
        results: [
          {
            result_id: 'res_d1',
            result_name: 'Design',
            composition: { s1: 0.7, s2: 0.3 },
            computed_properties: {},
            converged: true,
            objective_value: 0.002,
          },
        ],
        spec_status: {
          T50: { achieved: 178.5, met: true, lo: 170.0, hi: 190.0, target: 180.0 },
        },
        errors: [],
        missing_data: {},
      },
    })

    const { result } = renderHook(() => useRunDistillationDesign(), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        substance_ids: ['s1', 's2'],
        dist_spec: { T50: { target: 180.0, lo: 170.0, hi: 190.0 } },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = result.current.data?.data
    expect(data?.run_id).toBe('run_dist_01')
    expect(data?.results[0].converged).toBe(true)
    expect(data?.spec_status.T50.met).toBe(true)
    expect(data?.spec_status.T50.achieved).toBeCloseTo(178.5, 1)
  })

  it('reports spec not met when target is outside achievable range', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: {
        status: 'success',
        run_id: 'r2',
        results: [
          {
            result_id: 'r',
            result_name: 'D',
            composition: {},
            computed_properties: {},
            converged: false,
            objective_value: 9.9,
          },
        ],
        spec_status: {
          T50: { achieved: 210.0, met: false, lo: 160.0, hi: 170.0, target: 165.0 },
        },
        errors: ['T50 target unreachable with current pool'],
        missing_data: {},
      },
    })

    const { result } = renderHook(() => useRunDistillationDesign(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ substance_ids: ['s1'], dist_spec: { T50: { target: 165.0 } } }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.spec_status.T50.met).toBe(false)
    expect(result.current.data?.data.errors.length).toBeGreaterThan(0)
  })

  it('posts to /optimizer/run-distillation-design', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', run_id: 'r3', results: [], spec_status: {}, errors: [], missing_data: {} },
    })

    const { result } = renderHook(() => useRunDistillationDesign(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate({ substance_ids: ['s1'], dist_spec: { T50: { target: 180 } } }) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.post).toHaveBeenCalledWith(
      '/optimizer/run-distillation-design',
      expect.objectContaining({ substance_ids: ['s1'] }),
    )
  })
})
