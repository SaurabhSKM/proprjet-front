/**
 * Tab2Manual.test.tsx
 * ====================
 * User-flow tests for the Manual Blend Evaluator tab.
 *
 * All API hooks and sub-components are mocked so tests run in jsdom without
 * a backend. Focus: does clicking the right button trigger the right mutation?
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock heavy child components (charts, tables, etc.) ────────────────────────
vi.mock('@/components/charts/CarbonProfileChart', () => ({ CarbonProfileChart: () => null }))
vi.mock('@/components/charts/FamilyPieChart', () => ({ FamilyPieChart: () => null }))
vi.mock('@/components/charts/GCxGCHeatmap', () => ({ SubfamilyTable: () => null }))
vi.mock('@/components/charts/FamilyCarbonProfileChart', () => ({ FamilyCarbonProfileChart: () => null }))
vi.mock('@/components/charts/DistillationChart', () => ({
  DistillationChart: () => null,
  PvapChart: () => null,
}))
vi.mock('@/components/tables/PropertyTable', () => ({ PropertyTable: () => null }))
vi.mock('@/components/ui/FuelSpecChecker', () => ({ FuelSpecChecker: () => null }))
vi.mock('@/components/ui/CollapsiblePanel', () => ({
  CollapsiblePanel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

// ── Mock API hooks ────────────────────────────────────────────────────────────
const mockComputeBlend = vi.fn()
const mockSaveManualRun = vi.fn()

vi.mock('@/api/optimizer', () => ({
  useComputeBlend: () => ({
    mutate: mockComputeBlend,
    isPending: false,
    isSuccess: false,
  }),
  useSaveManualRun: () => ({
    mutate: mockSaveManualRun,
    isPending: false,
    isSuccess: false,
  }),
  useRuns: () => ({ data: [], isLoading: false }),
  useRun: () => ({ data: null, isFetching: false }),
  useDeleteRun: () => ({ mutate: vi.fn() }),
  usePoolSubstances: () => ({ data: [], isLoading: false }),
  useGCxGCSubfamilyTotals: () => ({ mutate: vi.fn(), isPending: false }),
  useGCxGCTable: () => ({ mutate: vi.fn(), isPending: false }),
  useBatchQuantities: () => ({ mutate: vi.fn(), isPending: false }),
  useEosDistillation: () => ({ mutate: vi.fn(), isPending: false }),
  useEosPvap: () => ({ mutate: vi.fn(), isPending: false }),
}))

// ── Mock optimizer store ──────────────────────────────────────────────────────
vi.mock('@/store/optimizerStore', () => ({
  useOptimizerStore: () => ({
    manualComposition: { s_jet_a: 80, s_toluene: 20 },
    fpBasis: 'vol',
    eosStepSize: 0.025,
    eosMixingBehavior: 'Ideal',
    setManualComposition: vi.fn(),
    setManualFraction: vi.fn(),
    setFpBasis: vi.fn(),
    setEosStepSize: vi.fn(),
    setEosMixingBehavior: vi.fn(),
    selectedIds: ['s_jet_a', 's_toluene'],
    distSpec: {},
    setDistSpec: vi.fn(),
    lastRunComposition: {},
    setLastRunComposition: vi.fn(),
    availabilityLimits: {},
  }),
}))

// ── Test wrapper ──────────────────────────────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

import Tab2Manual from '@/pages/optimizer/Tab2Manual'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Tab2Manual — user flow', () => {
  it('renders Compute and Compute & Save buttons', () => {
    render(<Tab2Manual />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: 'Compute' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Compute & Save' })).toBeDefined()
  })

  it('clicking Compute calls the compute mutation', async () => {
    render(<Tab2Manual />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: 'Compute' }))
    expect(mockComputeBlend).toHaveBeenCalled()
  })

  it('clicking Compute & Save calls the save-run mutation', async () => {
    render(<Tab2Manual />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: 'Compute & Save' }))
    expect(mockSaveManualRun).toHaveBeenCalled()
  })

  it('clicking Compute & Save passes composition and fp_basis', async () => {
    render(<Tab2Manual />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: 'Compute & Save' }))
    expect(mockSaveManualRun).toHaveBeenCalledWith(
      expect.objectContaining({
        composition: expect.any(Object),
        fp_basis: 'vol',
      }),
      expect.any(Object),
    )
  })

  it('History button toggles the history panel', async () => {
    // Override runs mock with a saved run so the panel has content to show
    vi.mock('@/api/optimizer', () => ({
      useComputeBlend: () => ({ mutate: mockComputeBlend, isPending: false }),
      useSaveManualRun: () => ({ mutate: mockSaveManualRun, isPending: false }),
      useRuns: () => ({
        data: [{ run_id: 'r1', run_name: 'My Saved Blend', created_at: '2026-01-01T00:00:00', n_results: 1 }],
        isLoading: false,
      }),
      useRun: () => ({ data: null, isFetching: false }),
      useDeleteRun: () => ({ mutate: vi.fn() }),
      usePoolSubstances: () => ({ data: [], isLoading: false }),
      useGCxGCSubfamilyTotals: () => ({ mutate: vi.fn(), isPending: false }),
      useGCxGCTable: () => ({ mutate: vi.fn(), isPending: false }),
      useBatchQuantities: () => ({ mutate: vi.fn(), isPending: false }),
      useEosDistillation: () => ({ mutate: vi.fn(), isPending: false }),
      useEosPvap: () => ({ mutate: vi.fn(), isPending: false }),
    }))

    render(<Tab2Manual />, { wrapper: makeWrapper() })
    const historyBtn = screen.getByRole('button', { name: /history/i })
    fireEvent.click(historyBtn)
    // History panel should now be visible
    expect(screen.getByText('My Saved Blend')).toBeDefined()
  })
})
