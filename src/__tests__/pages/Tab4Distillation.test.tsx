/**
 * Tab4Distillation.test.tsx
 * ==========================
 * User-flow tests for the Distillation Design tab.
 *
 * All API hooks and sub-components are mocked. Focus: spec editor renders
 * correctly, clicking "▶ Find Blend" triggers the right mutation, and the
 * spec_status result (✓ MET / ✗ MISS) is displayed after a run.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock heavy sub-components ─────────────────────────────────────────────────
vi.mock('@/components/charts/DistillationChart', () => ({
  DistillationChart: () => null,
}))
vi.mock('@/components/tables/PropertyTable', () => ({ PropertyTable: () => null }))
vi.mock('@/components/ui/CollapsiblePanel', () => ({
  CollapsiblePanel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

// ── Mock API hooks ────────────────────────────────────────────────────────────
const mockDesignRun = vi.fn()

vi.mock('@/api/optimizer', () => ({
  useRunDistillationDesign: () => ({
    mutate: mockDesignRun,
    isPending: false,
  }),
  useRuns: () => ({ data: [], isLoading: false }),
  useRun: () => ({ data: null, isFetching: false }),
  useDeleteRun: () => ({ mutate: vi.fn() }),
}))

// ── Mock optimizer store ──────────────────────────────────────────────────────
const mockDistSpec: Record<string, { target: number; lo: number | null; hi: number | null; enabled: boolean }> = {
  T50: { target: 180, lo: null, hi: null, enabled: true },
}

vi.mock('@/store/optimizerStore', () => ({
  useOptimizerStore: () => ({
    selectedIds: ['s_jet_a', 's_toluene'],
    distSpec: mockDistSpec,
    setDistSpec: vi.fn(),
    fpBasis: 'vol',
    availabilityLimits: {},
    setLastRunComposition: vi.fn(),
    lastRunComposition: {},
  }),
}))

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

import Tab4Distillation from '@/pages/optimizer/Tab4Distillation'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Tab4Distillation — user flow', () => {
  it('renders the "▶ Find Blend" run button', () => {
    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /find blend/i })).toBeDefined()
  })

  it('renders spec point checkboxes for all SPEC_POINTS', () => {
    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    // Each spec point label is rendered as a <span> next to a checkbox
    for (const pt of ['IBP', 'T10', 'T20', 'T50', 'T70', 'T90', 'FBP']) {
      expect(screen.getByText(pt)).toBeDefined()
    }
  })

  it('clicking "▶ Find Blend" calls the design mutation', async () => {
    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /find blend/i }))
    expect(mockDesignRun).toHaveBeenCalled()
  })

  it('design mutation is called with substance_ids and dist_spec', async () => {
    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /find blend/i }))
    expect(mockDesignRun).toHaveBeenCalledWith(
      expect.objectContaining({
        substance_ids: ['s_jet_a', 's_toluene'],
        dist_spec: expect.objectContaining({
          T50: expect.objectContaining({ target: 180 }),
        }),
      }),
      expect.any(Object),
    )
  })

  it('shows ✓ MET for a met spec point after a run', async () => {
    mockDesignRun.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        data: {
          status: 'success',
          run_id: 'r1',
          results: [{
            result_id: 'x',
            composition: { s_jet_a: 0.8, s_toluene: 0.2 },
            computed_properties: {},
            converged: true,
            objective_value: 0.001,
          }],
          spec_status: {
            T50: { achieved: 178.5, met: true, lo: null, hi: null, target: 180 },
          },
          errors: [],
          missing_data: {},
        },
      })
    })

    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /find blend/i }))

    await waitFor(() => {
      expect(screen.getByText('✓ MET')).toBeDefined()
    })
  })

  it('shows ✗ MISS for a spec point that was not met', async () => {
    mockDesignRun.mockImplementation((_payload, options) => {
      options?.onSuccess?.({
        data: {
          status: 'success',
          run_id: 'r2',
          results: [{
            result_id: 'y',
            composition: {},
            computed_properties: {},
            converged: false,
            objective_value: 5.0,
          }],
          spec_status: {
            T50: { achieved: 220.0, met: false, lo: null, hi: null, target: 180 },
          },
          errors: [],
          missing_data: {},
        },
      })
    })

    render(<Tab4Distillation />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /find blend/i }))

    await waitFor(() => {
      expect(screen.getByText('✗ MISS')).toBeDefined()
    })
  })
})
