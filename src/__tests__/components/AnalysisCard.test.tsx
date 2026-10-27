import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Heavy dependencies mocked to keep tests fast and DOM-clean
vi.mock('react-plotly.js', () => ({
  default: () => React.createElement('div', { 'data-testid': 'plotly-chart' }),
}))

vi.mock('@/hooks/useChartColors', () => ({
  useChartColors: () => ({
    isDark: true, bg: '#0D1117', surface: '#161B22', border: '#30363D',
    borderMid: '#484F58', textPrimary: '#E6EDF3', textSecondary: '#8B949E',
    textMuted: '#6E7681', accent: '#0EA5E9', accentMuted: '#075985',
    success: '#3FB950', warning: '#D29922', danger: '#F85149',
    heatscale: [[0, '#0D1117'], [1, '#BAE6FD']] as [number, string][],
  }),
}))

vi.mock('@/api/analyses', () => ({
  useConstants:      vi.fn(() => ({ data: [] })),
  useTextValues:     vi.fn(() => ({ data: [] })),
  useSeries:         vi.fn(() => ({ data: [] })),
  useAddConstant:    vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateAnalysis: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateTextValue: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTextValue: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteSeries:   vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/api/substances', () => ({
  useGetCompositions: vi.fn(() => ({ data: [] })),
  useAddComposition:  vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

import AnalysisCard from '@/pages/substances/AnalysisCard'
import type { Analysis } from '@/types'

function makeAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    analysis_id:      'a_test001',
    substance_id:     's_abc',
    data_source_type: 'Manual_Entry',
    created_at:       '2024-06-15T08:30:00',
    created_by:       'user1',
    updated_at:       null,
    updated_by:       null,
    source_metadata:  null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AnalysisCard header', () => {
  it('renders the source type in the header', () => {
    render(<AnalysisCard analysis={makeAnalysis()} />)
    // underscores replaced with spaces
    expect(screen.getByText('Manual Entry')).toBeDefined()
  })

  it('renders the analysis_id in the header', () => {
    render(<AnalysisCard analysis={makeAnalysis()} />)
    expect(screen.getByText('a_test001')).toBeDefined()
  })

  it('renders the formatted date when created_at is set', () => {
    render(<AnalysisCard analysis={makeAnalysis({ created_at: '2024-06-15T08:30:00' })} />)
    // The component calls toLocaleDateString() — format varies by locale but will not be '—'
    const dateEl = screen.queryByText('—')
    expect(dateEl).toBeNull()
  })

  it('renders — when created_at is null', () => {
    render(<AnalysisCard analysis={makeAnalysis({ created_at: null })} />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('analysis_id and date are rendered separately (not merged)', () => {
    render(<AnalysisCard analysis={makeAnalysis({ created_at: '2024-01-01T00:00:00' })} />)

    // analysis_id should be its own text node
    const idEl = screen.getByText('a_test001')
    expect(idEl).toBeDefined()

    // The separator dot is its own element
    expect(screen.getByText('·')).toBeDefined()
  })

  it('Edit button is NOT visible when card is collapsed', () => {
    render(<AnalysisCard analysis={makeAnalysis()} defaultOpen={false} />)
    expect(screen.queryByText('✎ Edit')).toBeNull()
  })

  it('Edit button IS visible when card is open', () => {
    render(<AnalysisCard analysis={makeAnalysis()} defaultOpen={true} />)
    expect(screen.getByText('✎ Edit')).toBeDefined()
  })

  it('clicking the header toggles open state and shows Edit button', () => {
    render(<AnalysisCard analysis={makeAnalysis()} defaultOpen={false} />)

    expect(screen.queryByText('✎ Edit')).toBeNull()

    const header = screen.getByRole('button', { name: /Manual Entry/i })
    fireEvent.click(header)

    expect(screen.getByText('✎ Edit')).toBeDefined()
  })
})

describe('AnalysisCard Bulk CSV Import source type', () => {
  it('renders Bulk CSV Import with underscores removed', () => {
    render(<AnalysisCard analysis={makeAnalysis({ data_source_type: 'Bulk_CSV_Import' })} />)
    expect(screen.getByText('Bulk CSV Import')).toBeDefined()
  })
})
