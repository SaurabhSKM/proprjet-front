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
  useGCxGCFamilies,
  useSubstanceGCxGCAnalyses,
  useGCxGCTable,
  useCreateGCxGCEntry,
  useUploadGCxGCFile,
  downloadGCxGCFile,
} from '@/api/gcxgc'

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

// ── useGCxGCFamilies ──────────────────────────────────────────────────────────

describe('useGCxGCFamilies', () => {
  const mockFamilies = [
    { family_id: 1, family_name: 'npara',     display_name: 'n-Paraffins',        general_formula: 'n-CnH2n+2', major_group: 'n' },
    { family_id: 2, family_name: 'isopara',   display_name: 'Isoparaffins',       general_formula: 'i-CnH2n+2', major_group: 'iso' },
    { family_id: 3, family_name: 'monoaroma', display_name: 'Monoaromatics',      general_formula: 'CnH2n-6',   major_group: 'arom' },
    { family_id: 4, family_name: 'cyclomonoaroma_h10', display_name: 'Cyclomonoaromatics', general_formula: 'CnH2n-10', major_group: 'arom' },
  ]

  it('returns families list from API', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockFamilies } })

    const { result } = renderHook(() => useGCxGCFamilies(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(4)
    expect(result.current.data?.[0].family_name).toBe('npara')
    expect(client.get).toHaveBeenCalledWith('/gcxgc/families')
  })

  it('each family has family_name, display_name, general_formula, major_group', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockFamilies } })

    const { result } = renderHook(() => useGCxGCFamilies(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const f = result.current.data![0]
    expect(f).toHaveProperty('family_id')
    expect(f).toHaveProperty('family_name', 'npara')
    expect(f).toHaveProperty('display_name', 'n-Paraffins')
    expect(f).toHaveProperty('general_formula', 'n-CnH2n+2')
    expect(f).toHaveProperty('major_group', 'n')
  })

  it('formula-variant families share display_name but have distinct family_name slugs', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockFamilies } })

    const { result } = renderHook(() => useGCxGCFamilies(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cyclo = result.current.data!.find(f => f.family_name === 'cyclomonoaroma_h10')
    expect(cyclo).toBeDefined()
    expect(cyclo!.display_name).toBe('Cyclomonoaromatics')
    expect(cyclo!.general_formula).toBe('CnH2n-10')
    // distinct slug, same display name as cyclomonoaroma (CnH2n-8)
    expect(cyclo!.family_name).not.toBe('cyclomonoaroma')
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useGCxGCFamilies(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

// ── useSubstanceGCxGCAnalyses ─────────────────────────────────────────────────

describe('useSubstanceGCxGCAnalyses', () => {
  const mockAnalyses = [
    {
      analysis_id:      'a_abc123',
      created_at:       '2024-03-15T10:00:00',
      data_source_type: 'GCxGC_Import',
      created_by:       'lab_user',
      source_metadata:  { filename: 'sample.xlsx' },
    },
    {
      analysis_id:      'a_def456',
      created_at:       '2024-01-02T09:00:00',
      data_source_type: 'Literature',
      created_by:       'user2',
      source_metadata:  null,
    },
  ]

  it('returns analyses for a substance', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockAnalyses } })

    const { result } = renderHook(() => useSubstanceGCxGCAnalyses('s_001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].analysis_id).toBe('a_abc123')
    expect(client.get).toHaveBeenCalledWith('/gcxgc/substances/s_001/analyses')
  })

  it('each analysis has analysis_id, created_at, data_source_type, created_by', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockAnalyses } })

    const { result } = renderHook(() => useSubstanceGCxGCAnalyses('s_001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const a = result.current.data![0]
    expect(a).toHaveProperty('analysis_id',      'a_abc123')
    expect(a).toHaveProperty('data_source_type', 'GCxGC_Import')
    expect(a).toHaveProperty('created_by',       'lab_user')
    expect(a).toHaveProperty('created_at',       '2024-03-15T10:00:00')
    expect(a).toHaveProperty('source_metadata',  { filename: 'sample.xlsx' })
  })

  it('source_metadata can be null', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: mockAnalyses } })

    const { result } = renderHook(() => useSubstanceGCxGCAnalyses('s_001'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![1].source_metadata).toBeNull()
  })

  it('does not fetch when substanceId is null', () => {
    const { result } = renderHook(() => useSubstanceGCxGCAnalyses(null), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(client.get).not.toHaveBeenCalled()
  })

  it('returns empty array when API returns null data', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: null } })

    const { result } = renderHook(() => useSubstanceGCxGCAnalyses('s_002'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

// ── useGCxGCTable ─────────────────────────────────────────────────────────────

describe('useGCxGCTable', () => {
  const make30Rows = () =>
    Array.from({ length: 30 }, (_, i) => ({
      carbon:     i + 1,
      npara:      i === 5 ? 12.5 : 0,
      isopara:    i === 6 ? 8.3  : 0,
      monoaroma:  i === 7 ? 4.1  : 0,
      total:      i === 5 ? 12.5 : i === 6 ? 8.3 : i === 7 ? 4.1 : 0,
    }))

  it('returns 30 rows (C1–C30)', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: make30Rows() } })

    const { result } = renderHook(() => useGCxGCTable('a_abc123'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(30)
    expect(client.get).toHaveBeenCalledWith('/gcxgc/analyses/a_abc123/table')
  })

  it('each row has carbon (1–30), family slug columns, and total', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: make30Rows() } })

    const { result } = renderHook(() => useGCxGCTable('a_abc123'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const rows = result.current.data!
    expect(rows[0]).toHaveProperty('carbon', 1)
    expect(rows[29]).toHaveProperty('carbon', 30)

    for (const row of rows) {
      expect(row).toHaveProperty('carbon')
      expect(row).toHaveProperty('total')
      expect(typeof row.carbon).toBe('number')
      expect(typeof row.total).toBe('number')
    }
  })

  it('zero-value bins are present as 0 (not absent)', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: make30Rows() } })

    const { result } = renderHook(() => useGCxGCTable('a_abc123'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // C1 has all zeros
    const c1 = result.current.data!.find(r => r.carbon === 1)!
    expect(c1.total).toBe(0)
    expect(c1.npara).toBe(0)
  })

  it('total equals sum of family values', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { data: make30Rows() } })

    const { result } = renderHook(() => useGCxGCTable('a_abc123'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const c6 = result.current.data!.find(r => r.carbon === 6)!
    expect(c6.total).toBeCloseTo(c6.npara + c6.isopara + c6.monoaroma, 4)
  })

  it('does not fetch when analysisId is null', () => {
    const { result } = renderHook(() => useGCxGCTable(null), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(client.get).not.toHaveBeenCalled()
  })
})

// ── useCreateGCxGCEntry ───────────────────────────────────────────────────────

describe('useCreateGCxGCEntry', () => {
  it('posts entry payload and returns analysis_id', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: { analysis_id: 'a_new001' } },
    })

    const { result } = renderHook(() => useCreateGCxGCEntry('s_001'), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        rows: [
          { family_slug: 'npara',  carbon_count: 8, value: 15.3 },
          { family_slug: 'isopara', carbon_count: 9, value: 7.8 },
        ],
        data_source_type: 'GCxGC_Manual',
        created_by:       'test_user',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/gcxgc/substances/s_001/entry',
      expect.objectContaining({
        data_source_type: 'GCxGC_Manual',
        created_by:       'test_user',
        rows: expect.arrayContaining([
          { family_slug: 'npara', carbon_count: 8, value: 15.3 },
        ]),
      })
    )
    expect(result.current.data?.analysis_id).toBe('a_new001')
  })

  it('zero-value rows should be filtered client-side before posting', async () => {
    // The page filters v > 0 before calling mutate, so the hook itself just forwards rows.
    // Verify the hook posts whatever rows it receives.
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: { analysis_id: 'a_new002' } },
    })

    const { result } = renderHook(() => useCreateGCxGCEntry('s_002'), { wrapper: makeWrapper() })

    const nonZeroRows = [{ family_slug: 'monoaroma', carbon_count: 10, value: 5.0 }]

    act(() => {
      result.current.mutate({
        rows: nonZeroRows,
        data_source_type: 'GCxGC_Manual',
        created_by:       'user',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const posted = vi.mocked(client.post).mock.calls[0][1] as { rows: unknown[] }
    expect(posted.rows).toHaveLength(1)
  })

  it('posts to correct URL for the given substance', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: { analysis_id: 'a_xyz' } },
    })

    const { result } = renderHook(() => useCreateGCxGCEntry('substance_abc'), { wrapper: makeWrapper() })

    act(() => {
      result.current.mutate({
        rows: [{ family_slug: 'npara', carbon_count: 7, value: 2.5 }],
        data_source_type: 'Lab',
        created_by: 'user',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/gcxgc/substances/substance_abc/entry',
      expect.anything()
    )
  })

  it('is idle when substanceId is null', () => {
    const { result } = renderHook(() => useCreateGCxGCEntry(null), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
  })
})

// ── useUploadGCxGCFile ────────────────────────────────────────────────────────

describe('useUploadGCxGCFile', () => {
  const mockUploadResult = {
    analysis_id:  'a_upload01',
    row_count:    45,
    detected_families: [
      { slug: 'npara',    display_name: 'n-Paraffins',   formula: 'n-CnH2n+2', major_group: 'n' },
      { slug: 'isopara',  display_name: 'Isoparaffins',  formula: 'i-CnH2n+2', major_group: 'iso' },
      { slug: null,       display_name: 'Unknown Col',   formula: 'CnH???',    warning: "Unknown formula 'CnH???' — column skipped" },
    ],
  }

  it('posts FormData and returns upload result', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: mockUploadResult },
    })

    const { result } = renderHook(() => useUploadGCxGCFile('s_001'), { wrapper: makeWrapper() })

    const fd = new FormData()
    fd.append('file', new Blob(['col1,col2'], { type: 'text/csv' }), 'test.csv')
    fd.append('data_source_type', 'GCxGC_Import')
    fd.append('created_by', 'tester')

    act(() => { result.current.mutate(fd) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(client.post).toHaveBeenCalledWith(
      '/gcxgc/substances/s_001/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  })

  it('upload result has analysis_id, row_count, detected_families', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: mockUploadResult },
    })

    const { result } = renderHook(() => useUploadGCxGCFile('s_001'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(new FormData()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const res = result.current.data!
    expect(res).toHaveProperty('analysis_id',      'a_upload01')
    expect(res).toHaveProperty('row_count',        45)
    expect(res).toHaveProperty('detected_families')
    expect(res.detected_families).toHaveLength(3)
  })

  it('unknown formula families have warning field and null slug', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: mockUploadResult },
    })

    const { result } = renderHook(() => useUploadGCxGCFile('s_001'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(new FormData()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const unknownFam = result.current.data!.detected_families.find(f => f.slug === null)
    expect(unknownFam).toBeDefined()
    expect(unknownFam!.warning).toMatch(/Unknown formula/)
    expect(unknownFam!.slug).toBeNull()
  })

  it('known families have a non-null slug', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { status: 'success', data: mockUploadResult },
    })

    const { result } = renderHook(() => useUploadGCxGCFile('s_001'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(new FormData()) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const known = result.current.data!.detected_families.filter(f => f.slug !== null)
    expect(known).toHaveLength(2)
    expect(known[0].slug).toBe('npara')
    expect(known[1].slug).toBe('isopara')
  })
})

// ── downloadGCxGCFile ─────────────────────────────────────────────────────────

describe('downloadGCxGCFile', () => {
  beforeEach(() => {
    // jsdom doesn't support URL.createObjectURL — stub it
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement)
  })

  it('calls GET /gcxgc/analyses/{id}/download?format=csv for CSV', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: new Blob(['col1,col2']) })

    downloadGCxGCFile('a_test01', 'csv')

    await waitFor(() => expect(client.get).toHaveBeenCalled())

    expect(client.get).toHaveBeenCalledWith(
      '/gcxgc/analyses/a_test01/download?format=csv',
      { responseType: 'blob' }
    )
  })

  it('calls GET /gcxgc/analyses/{id}/download?format=xlsx for Excel', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: new Blob([]) })

    downloadGCxGCFile('a_test01', 'xlsx')

    await waitFor(() => expect(client.get).toHaveBeenCalled())

    expect(client.get).toHaveBeenCalledWith(
      '/gcxgc/analyses/a_test01/download?format=xlsx',
      { responseType: 'blob' }
    )
  })
})
