import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock API hooks
vi.mock('@/api/optimizer', () => ({
  usePoolSubstances: vi.fn(),
  usePool: vi.fn(),
}))

// Mock Zustand store
vi.mock('@/store/optimizerStore', () => ({
  useOptimizerStore: vi.fn(),
}))

import { usePoolSubstances, usePool } from '@/api/optimizer'
import { useOptimizerStore } from '@/store/optimizerStore'
import PoolSidebar from '@/pages/optimizer/PoolSidebar'

const mockStoreBase = {
  selectedIds: [],
  availabilityLimits: {},
  toggleSubstance: vi.fn(),
  setAvailability: vi.fn(),
}

const mockSubstances = [
  { substance_id: 's1', nom: 'Jet A', substance_type: 'fuel' },
  { substance_id: 's2', nom: 'Hexane', substance_type: 'molecule' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usePoolSubstances).mockReturnValue({ data: mockSubstances } as ReturnType<typeof usePoolSubstances>)
  vi.mocked(usePool).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof usePool>)

  vi.mocked(useOptimizerStore).mockReturnValue(mockStoreBase as ReturnType<typeof useOptimizerStore>)
})

describe('PoolSidebar', () => {
  it('renders substance names from the API', () => {
    render(<PoolSidebar />)

    expect(screen.getByText('Jet A')).toBeDefined()
    expect(screen.getByText('Hexane')).toBeDefined()
  })

  it('shows selected count', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1'],
    } as ReturnType<typeof useOptimizerStore>)

    render(<PoolSidebar />)

    // Header shows bare count number (no "selected" label)
    expect(screen.getByText('1')).toBeDefined()
  })

  it('shows 0 selected when nothing chosen', () => {
    render(<PoolSidebar />)
    expect(screen.getByText('0')).toBeDefined()
  })

  it('shows ⚠ missing button when substance is selected and has missing fields', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1'],
    } as ReturnType<typeof useOptimizerStore>)

    vi.mocked(usePool).mockReturnValue({
      data: {
        status: 'success',
        n_components: 1,
        data_completeness: {
          s1: {
            name: 'Jet A',
            has_density: true,
            has_fp: false,
            has_mw: true,
            has_kv_p40: false,
            has_kv_m20: false,
            has_kv_m40: false,
            has_gcxgc: false,
            has_lhv: false,
            has_frzp: false,
            has_surft: false,
            has_cp: false,
            has_dist: false,
            missing_fields: ['has_fp', 'has_kv_p40'],
          },
        },
        missing_data: { s1: ['has_fp', 'has_kv_p40'] },
      },
    } as unknown as ReturnType<typeof usePool>)

    render(<PoolSidebar />)

    // Missing button shows just ⚠ (no "missing" label)
    expect(screen.getByText('⚠')).toBeDefined()
  })

  it('clicking ⚠ missing button expands the missing fields panel', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1'],
    } as ReturnType<typeof useOptimizerStore>)

    vi.mocked(usePool).mockReturnValue({
      data: {
        status: 'success',
        n_components: 1,
        data_completeness: {
          s1: {
            name: 'Jet A',
            has_density: true,
            has_fp: false,
            has_mw: true,
            has_kv_p40: false,
            has_kv_m20: false,
            has_kv_m40: false,
            has_gcxgc: false,
            has_lhv: false,
            has_frzp: false,
            has_surft: false,
            has_cp: false,
            has_dist: false,
            missing_fields: ['has_fp'],
          },
        },
        missing_data: { s1: ['has_fp'] },
      },
    } as unknown as ReturnType<typeof usePool>)

    render(<PoolSidebar />)

    const missingBtn = screen.getByText('⚠')
    fireEvent.click(missingBtn)

    // The panel renders the FIELD_LABELS value for has_fp
    expect(screen.getByText('Flash Point')).toBeDefined()
  })

  it('missing fields panel lists human-readable field labels', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1'],
    } as ReturnType<typeof useOptimizerStore>)

    vi.mocked(usePool).mockReturnValue({
      data: {
        status: 'success',
        n_components: 1,
        data_completeness: {
          s1: {
            name: 'Jet A',
            has_density: false,
            has_fp: false,
            has_mw: false,
            has_kv_p40: false,
            has_kv_m20: false,
            has_kv_m40: false,
            has_gcxgc: false,
            has_lhv: false,
            has_frzp: false,
            has_surft: false,
            has_cp: false,
            has_dist: false,
            missing_fields: ['has_density', 'has_fp', 'has_mw'],
          },
        },
        missing_data: { s1: ['has_density', 'has_fp', 'has_mw'] },
      },
    } as unknown as ReturnType<typeof usePool>)

    render(<PoolSidebar />)

    fireEvent.click(screen.getByText('⚠'))

    expect(screen.getByText('Density')).toBeDefined()
    expect(screen.getByText('Flash Point')).toBeDefined()
    expect(screen.getByText('Molecular Weight')).toBeDefined()
  })

  it('second click on ⚠ missing collapses the panel', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1'],
    } as ReturnType<typeof useOptimizerStore>)

    vi.mocked(usePool).mockReturnValue({
      data: {
        status: 'success',
        n_components: 1,
        data_completeness: {
          s1: {
            name: 'Jet A',
            has_density: false,
            has_fp: false,
            has_mw: true,
            has_kv_p40: true,
            has_kv_m20: true,
            has_kv_m40: true,
            has_gcxgc: true,
            has_lhv: true,
            has_frzp: true,
            has_surft: true,
            has_cp: true,
            has_dist: true,
            missing_fields: ['has_density', 'has_fp'],
          },
        },
        missing_data: { s1: ['has_density', 'has_fp'] },
      },
    } as unknown as ReturnType<typeof usePool>)

    render(<PoolSidebar />)

    const btn = screen.getByText('⚠')
    fireEvent.click(btn)

    // Panel is open — Flash Point visible
    expect(screen.getByText('Flash Point')).toBeDefined()

    fireEvent.click(btn)

    // Panel collapsed — Flash Point gone
    expect(screen.queryByText('Flash Point')).toBeNull()
  })

  it('bottom summary shows substance names with incomplete data', () => {
    vi.mocked(useOptimizerStore).mockReturnValue({
      ...mockStoreBase,
      selectedIds: ['s1', 's2'],
    } as ReturnType<typeof useOptimizerStore>)

    vi.mocked(usePool).mockReturnValue({
      data: {
        status: 'success',
        n_components: 2,
        data_completeness: {},
        missing_data: {
          s1: ['has_fp'],
          s2: ['has_density', 'has_mw'],
        },
      },
    } as unknown as ReturnType<typeof usePool>)

    render(<PoolSidebar />)

    // Names appear in both the list and summary — getAllByText asserts at least one exists
    expect(screen.getAllByText('Jet A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hexane').length).toBeGreaterThan(0)
    // Bottom summary shows per-substance missing counts as "{n}✕"
    expect(screen.getByText('1✕')).toBeDefined()
    expect(screen.getByText('2✕')).toBeDefined()
  })
})
