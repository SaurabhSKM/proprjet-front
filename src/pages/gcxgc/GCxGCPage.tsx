// src/pages/gcxgc/GCxGCPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel'
import { useSubstances } from '@/api/substances'
import {
  useGCxGCFamilies,
  useSubstanceGCxGCAnalyses,
  useGCxGCTable,
  useCreateGCxGCEntry,
  useUploadGCxGCFile,
  useCompletenessData,
  downloadGCxGCFile,
  type GCxGCFamily,
  type UploadResult,
} from '@/api/gcxgc'

const GROUP_LABELS: Record<string, string> = {
  n: 'n-Paraffins', iso: 'Isoparaffins', cyclo: 'Cycloparaffins', arom: 'Aromatics',
}

const GROUP_ORDER = ['n', 'iso', 'cyclo', 'arom']

type Mode = 'view' | 'enter' | 'upload'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FamilyChip({
  family, visible, onToggle,
}: { family: GCxGCFamily; visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={family.general_formula ?? undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 4, fontSize: 10,
        border: `1px solid ${visible ? 'var(--accent)' : 'var(--border)'}`,
        background: visible ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
        color: visible ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer', transition: 'all 120ms ease', whiteSpace: 'nowrap',
      }}
    >
      {family.display_name ?? family.family_name}
      {family.general_formula && (
        <span style={{ fontSize: 9, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>
          {family.general_formula}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function GcxgcTotalBadge({ total }: { total: number }) {
  const ok  = total >= 99 && total <= 101
  const bad = total < 90 || total > 110
  const color = ok ? 'var(--success, #3db87a)' : bad ? 'var(--danger)' : 'var(--warning, #f5a742)'
  return (
    <span style={{
      fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
      color, background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {!ok && '⚠ '}Σ {total.toFixed(3)} %m
    </span>
  )
}

function ViewTable({
  rows,
  cols,
  familyBySlug,
}: {
  rows: Record<string, number>[]
  cols: string[]
  familyBySlug: Record<string, GCxGCFamily>
}) {
  if (!rows.length) return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 16 }}>No data</p>
  )

  const thStyle: React.CSSProperties = {
    position: 'sticky', top: 0,
    background: 'var(--bg-surface)', zIndex: 2,
    padding: '6px 10px', textAlign: 'right',
    fontSize: 10, color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace',
  }
  const tdStyle: React.CSSProperties = {
    padding: '4px 10px', textAlign: 'right',
    fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  }

  const grandTotal   = rows.reduce((s, r) => s + (r.total ?? 0), 0)
  const familyTotals = cols.map(c => rows.reduce((s, r) => s + (r[c] ?? 0), 0))
  const totalOk  = grandTotal >= 99 && grandTotal <= 101
  const totalBad = grandTotal < 90 || grandTotal > 110
  const totalColor = totalOk
    ? 'var(--success, #3db87a)'
    : totalBad ? 'var(--danger)' : 'var(--warning, #f5a742)'

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, background: 'var(--bg-surface)' }}>
              Carbon
            </th>
            {cols.map(slug => {
              const f = familyBySlug[slug]
              return (
                <th key={slug} style={thStyle}>
                  <div>{f?.display_name ?? slug}</div>
                  {f?.general_formula && (
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{f.general_formula}</div>
                  )}
                </th>
              )
            })}
            <th style={{ ...thStyle, color: 'var(--text-primary)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.carbon} style={{ transition: 'background 80ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td style={{ ...tdStyle, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-surface)', fontWeight: 600, color: 'var(--text-muted)' }}>
                C{row.carbon}
              </td>
              {cols.map(slug => (
                <td key={slug} style={tdStyle}>
                  {row[slug] ? row[slug] : '—'}
                </td>
              ))}
              <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                {row.total ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <td style={{
              ...tdStyle, textAlign: 'left', position: 'sticky', left: 0,
              background: 'var(--bg-elevated)', fontWeight: 700,
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-muted)', borderBottom: 'none',
            }}>
              Σ Total
            </td>
            {familyTotals.map((ft, i) => (
              <td key={cols[i]} style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: 'none' }}>
                {ft.toFixed(3)}
              </td>
            ))}
            <td style={{
              ...tdStyle, fontWeight: 700, borderBottom: 'none',
              color: totalColor,
            }}>
              {grandTotal.toFixed(3)}{!totalOk && ' ⚠'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EntryTable({
  entryCols,
  entryData,
  onCellChange,
}: {
  entryCols: GCxGCFamily[]
  entryData: Record<string, Record<number, string>>
  onCellChange: (slug: string, carbon: number, val: string) => void
}) {
  const thStyle: React.CSSProperties = {
    position: 'sticky', top: 0,
    background: 'var(--bg-surface)', zIndex: 2,
    padding: '6px 8px', textAlign: 'right',
    fontSize: 10, color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '3px 4px', textAlign: 'right',
    borderBottom: '1px solid var(--border)',
  }

  const totals = Array.from({ length: 30 }, (_, i) => {
    const carbon = i + 1
    return entryCols.reduce((sum, f) => {
      const v = parseFloat(entryData[f.family_name]?.[carbon] ?? '0') || 0
      return sum + v
    }, 0)
  })

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, zIndex: 3, background: 'var(--bg-surface)' }}>
              Carbon
            </th>
            {entryCols.map(f => (
              <th key={f.family_name} style={thStyle}>
                <div>{f.display_name ?? f.family_name}</div>
                {f.general_formula && (
                  <div style={{ fontSize: 9, opacity: 0.6, fontFamily: 'JetBrains Mono, monospace' }}>
                    {f.general_formula}
                  </div>
                )}
              </th>
            ))}
            <th style={{ ...thStyle, color: 'var(--text-primary)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 30 }, (_, i) => {
            const carbon = i + 1
            return (
              <tr key={carbon}>
                <td style={{
                  ...tdStyle, textAlign: 'left',
                  position: 'sticky', left: 0, background: 'var(--bg-surface)',
                  padding: '3px 8px', fontWeight: 600,
                  color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
                }}>
                  C{carbon}
                </td>
                {entryCols.map(f => (
                  <td key={f.family_name} style={tdStyle}>
                    <input
                      type="number" min={0} step={0.0001}
                      value={entryData[f.family_name]?.[carbon] ?? ''}
                      placeholder="0"
                      onChange={e => onCellChange(f.family_name, carbon, e.target.value)}
                      className="field"
                      style={{
                        width: 80, textAlign: 'right', fontSize: 11,
                        padding: '2px 6px', fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </td>
                ))}
                <td style={{
                  ...tdStyle, padding: '3px 10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: totals[i] > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: 500,
                }}>
                  {totals[i] > 0 ? totals[i] : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function GCxGCPage() {
  const [leftOpen,            setLeftOpen]            = useState(true)
  const [substanceSearch,     setSubstanceSearch]     = useState('')
  const [gcxgcOnly,           setGcxgcOnly]           = useState(false)
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null)
  const [selectedAnalysisId,  setSelectedAnalysisId]  = useState<string | null>(null)
  const [mode,                setMode]                = useState<Mode>('view')
  const [visibleFamilies,     setVisibleFamilies]     = useState<Set<string>>(new Set())
  const [familiesInited,      setFamiliesInited]      = useState(false)

  // Entry mode
  const [entryData, setEntryData] = useState<Record<string, Record<number, string>>>({})
  const [entrySourceType, setEntrySourceType] = useState('GCxGC_Manual')
  const [entryCreatedBy,  setEntryCreatedBy]  = useState('')

  // Upload mode
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [uploadFile,       setUploadFile]       = useState<File | null>(null)
  const [uploadSourceType, setUploadSourceType] = useState('GCxGC_Import')
  const [uploadCreatedBy,  setUploadCreatedBy]  = useState('')
  const [uploadResult,     setUploadResult]     = useState<UploadResult | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  const substanceListRef = useRef<HTMLDivElement>(null)

  // Represents an in-progress "fill GCxGC for the analysis I was just working
  // on" session, started by arriving here from NewAnalysisPage's confirmation
  // link. Cleared the moment the user picks a different substance, or once
  // the linked submit succeeds.
  const [linkedSession, setLinkedSession] = useState<{ substanceId: string; analysisId: string } | null>(null)
  const [linkedSessionInited, setLinkedSessionInited] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: allSubstances = [] }  = useSubstances()
  const { data: families      = [] }  = useGCxGCFamilies()
  const { data: completeness  = [] }  = useCompletenessData()
  const { data: analyses      = [], isLoading: analysesLoading } =
    useSubstanceGCxGCAnalyses(selectedSubstanceId)
  const { data: tableRows = [], isLoading: tableLoading } =
    useGCxGCTable(mode === 'view' ? selectedAnalysisId : null)

  const createMut = useCreateGCxGCEntry(selectedSubstanceId)
  const uploadMut = useUploadGCxGCFile(selectedSubstanceId)

  // ── Init visible families once ────────────────────────────────────────────
  useEffect(() => {
    if (families.length > 0 && !familiesInited) {
      setVisibleFamilies(new Set(families.map(f => f.family_name)))
      setFamiliesInited(true)
    }
  }, [families, familiesInited])

  useEffect(() => {
    if (linkedSessionInited || allSubstances.length === 0) return

    const paramSubstanceId = searchParams.get('substance_id')
    const paramAnalysisId = searchParams.get('analysis_id')

    if (paramSubstanceId) {
      setSelectedSubstanceId(paramSubstanceId)
      setMode('enter') // default to manual entry; user can still switch to Upload
      if (paramAnalysisId) {
        setLinkedSession({ substanceId: paramSubstanceId, analysisId: paramAnalysisId })
      }
      // Clear the URL params so a page refresh doesn't silently re-trigger
      // this — the session lives in component state from here on.
      setSearchParams({}, { replace: true })
    }

    setLinkedSessionInited(true)
  }, [allSubstances, linkedSessionInited, searchParams, setSearchParams])

  useEffect(() => {
    if (!linkedSession || linkedSession.substanceId !== selectedSubstanceId) return
    const el = substanceListRef.current?.querySelector<HTMLButtonElement>(
      `[data-substance-id="${linkedSession.substanceId}"]`
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [linkedSession, selectedSubstanceId])
  
  // ── Derived ───────────────────────────────────────────────────────────────
  const gcxgcSubstanceIds = new Set(
    completeness.filter(c => c.has_gcxgc).map(c => c.substance_id)
  )

  const filteredSubstances = allSubstances.filter(s => {
    if (gcxgcOnly && !gcxgcSubstanceIds.has(s.substance_id)) return false
    if (substanceSearch) {
      const q = substanceSearch.toLowerCase()
      return (s.nom ?? '').toLowerCase().includes(q) || s.substance_id.toLowerCase().includes(q)
    }
    return true
  })

  const familyBySlug: Record<string, GCxGCFamily> =
    Object.fromEntries(families.map(f => [f.family_name, f]))

  const familyGroups = families.reduce<Record<string, GCxGCFamily[]>>((acc, f) => {
    const g = f.major_group ?? 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(f)
    return acc
  }, {})

  // Columns for VIEW table (keys in first row, minus carbon/total, filtered by visibility)
  const viewCols = tableRows.length > 0
    ? Object.keys(tableRows[0]).filter(k => k !== 'carbon' && k !== 'total' && visibleFamilies.has(k))
    : []

  // Columns for ENTRY table
  const entryCols = families.filter(f => visibleFamilies.has(f.family_name))

  // ── Handlers ─────────────────────────────────────────────────────────────
  const selectSubstance = (sid: string) => {
    if (sid === selectedSubstanceId) return
    // Picking any substance other than the one the linked session was for
    // means the user is done with that input — close it out, same as a
    // "close the last analysis event" per your description.
    if (linkedSession && sid !== linkedSession.substanceId) {
      setLinkedSession(null)
    }
    setSelectedSubstanceId(sid)
    setSelectedAnalysisId(null)
    setMode('view')
  }

  const toggleFamily = (slug: string) => {
    setVisibleFamilies(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const handleCellChange = (slug: string, carbon: number, val: string) => {
    setEntryData(prev => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? {}), [carbon]: val },
    }))
  }

  const handleEntrySubmit = () => {
    const rows: { family_slug: string; carbon_count: number; value: number }[] = []
    for (const [slug, carbons] of Object.entries(entryData)) {
      for (const [carbon, val] of Object.entries(carbons)) {
        const v = parseFloat(val)
        if (v > 0) rows.push({ family_slug: slug, carbon_count: parseInt(carbon), value: v })
      }
    }
    if (!rows.length) return

    const isLinked = linkedSession && linkedSession.substanceId === selectedSubstanceId

    createMut.mutate(
      {
        rows,
        data_source_type: entrySourceType,
        created_by: entryCreatedBy,
        ...(isLinked ? { analysis_id: linkedSession!.analysisId } : {}),
      },
      {
        onSuccess: res => {
          setSelectedAnalysisId(res.analysis_id)
          setMode('view')
          setEntryData({})
          if (isLinked) setLinkedSession(null) // session complete
        },
      }
    )
  }

  const handleUploadSubmit = () => {
    if (!uploadFile || !selectedSubstanceId) return
    const isLinked = linkedSession && linkedSession.substanceId === selectedSubstanceId

    const fd = new FormData()
    fd.append('file', uploadFile)
    fd.append('data_source_type', uploadSourceType)
    fd.append('created_by', uploadCreatedBy)
    if (isLinked) fd.append('analysis_id', linkedSession!.analysisId)

    uploadMut.mutate(fd, {
      onSuccess: result => {
        setUploadResult(result)
        setSelectedAnalysisId(result.analysis_id)
        setMode('view')
        setUploadFile(null)
        if (isLinked) setLinkedSession(null) // session complete
      },
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const groupsToRender = GROUP_ORDER.filter(g => familyGroups[g])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <CollapsiblePanel open={leftOpen} onToggle={() => setLeftOpen(v => !v)} width={280}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Substance search */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                Substance
              </p>
              <button
                onClick={() => setGcxgcOnly(v => !v)}
                title="Show only substances with GCxGC data"
                style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${gcxgcOnly ? 'var(--accent)' : 'var(--border)'}`,
                  background: gcxgcOnly ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color: gcxgcOnly ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'all 120ms ease', whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                }}
              >
                GCxGC only
              </button>
            </div>
            <input
              className="field"
              placeholder="Search…"
              value={substanceSearch}
              onChange={e => setSubstanceSearch(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '5px 8px' }}
            />
          </div>

          {/* Substance list */}
          <div ref={substanceListRef} style={{ flex: 1, overflowY: 'auto', borderBottom: '1px solid var(--border)' }}>
            {filteredSubstances.map(s => (
              <button
                key={s.substance_id}
                data-substance-id={s.substance_id}
                onClick={() => selectSubstance(s.substance_id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 12px',
                  background: selectedSubstanceId === s.substance_id ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: selectedSubstanceId === s.substance_id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: selectedSubstanceId === s.substance_id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12, cursor: 'pointer', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  transition: 'all 100ms',
                }}
                onMouseEnter={e => {
                  if (selectedSubstanceId !== s.substance_id)
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={e => {
                  if (selectedSubstanceId !== s.substance_id)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.nom || s.substance_id}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.substance_id}
                </div>
              </button>
            ))}
          </div>

          {/* Analysis list */}
          {selectedSubstanceId && (
            <div style={{ borderBottom: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ padding: '8px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                  Analysis
                </p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-xs"
                    onClick={() => { setMode('enter'); setSelectedAnalysisId(null) }}
                    style={{ fontSize: 10, padding: '2px 8px' }}
                  >
                    + New
                  </button>
                  <button
                    className="btn btn-xs"
                    onClick={() => { setMode('upload'); setUploadResult(null); setUploadFile(null) }}
                    style={{ fontSize: 10, padding: '2px 8px' }}
                  >
                    ↑ Upload
                  </button>
                </div>
              </div>
              {analysesLoading && (
                <div style={{ padding: '8px 12px' }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                </div>
              )}
              {!analysesLoading && analyses.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 12px 8px' }}>
                  No GCxGC data yet
                </p>
              )}
              {analyses.map(a => (
                <button
                  key={a.analysis_id}
                  onClick={() => { setSelectedAnalysisId(a.analysis_id); setMode('view') }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '5px 12px',
                    background: selectedAnalysisId === a.analysis_id ? 'var(--bg-elevated)' : 'transparent',
                    borderLeft: selectedAnalysisId === a.analysis_id ? '2px solid var(--accent)' : '2px solid transparent',
                    color: selectedAnalysisId === a.analysis_id ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontSize: 11, cursor: 'pointer', border: 'none',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : a.analysis_id}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.data_source_type}</div>
                </button>
              ))}
            </div>
          )}

          {/* Family visibility chips */}
          <div style={{ padding: '10px 12px', overflowY: 'auto', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                Families
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-xs"
                  onClick={() => setVisibleFamilies(new Set(families.map(f => f.family_name)))}
                  style={{ fontSize: 9, padding: '1px 6px', color: 'var(--text-muted)' }}
                >
                  All
                </button>
                <button
                  className="btn btn-xs"
                  onClick={() => setVisibleFamilies(new Set())}
                  style={{ fontSize: 9, padding: '1px 6px', color: 'var(--text-muted)' }}
                >
                  None
                </button>
              </div>
            </div>
            {groupsToRender.map(g => (
              <div key={g} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '0 0 4px', letterSpacing: '0.1em' }}>
                  {GROUP_LABELS[g] ?? g}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {familyGroups[g].map(f => (
                    <FamilyChip
                      key={f.family_name}
                      family={f}
                      visible={visibleFamilies.has(f.family_name)}
                      onToggle={() => toggleFamily(f.family_name)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </CollapsiblePanel>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {linkedSession && linkedSession.substanceId === selectedSubstanceId && (
          <div style={{
            padding: '8px 24px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>
              Filling GCxGC data for analysis{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{linkedSession.analysisId}</span>
              {' '}— data submitted below will attach to this analysis.
            </span>
            <button
              onClick={() => setLinkedSession(null)}
              className="btn btn-xs btn-secondary"
              style={{ fontSize: 10 }}
            >
              ✕ Stop linking
            </button>
          </div>
        )}   
        {/* Mode tabs */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 0,
          height: 44, flexShrink: 0,
        }}>
          {(['view', 'enter', 'upload'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m !== 'view' && !selectedSubstanceId}
              style={{
                padding: '0 16px', height: '100%',
                fontSize: 12, fontWeight: mode === m ? 600 : 400,
                color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 150ms',
                textTransform: 'capitalize',
                opacity: (m !== 'view' && !selectedSubstanceId) ? 0.4 : 1,
              }}
            >
              {m === 'enter' ? 'Enter Data' : m === 'upload' ? 'Upload File' : 'View'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ── VIEW mode ─────────────────────────────────────────── */}
          {mode === 'view' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!selectedSubstanceId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Select a substance to view GCxGC data
                  </p>
                </div>
              ) : !selectedAnalysisId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No GCxGC analysis selected
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setMode('enter')} style={{ fontSize: 12 }}>
                      + Enter Data
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setMode('upload'); setUploadResult(null) }} style={{ fontSize: 12 }}>
                      ↑ Upload File
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div style={{
                    padding: '10px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {selectedAnalysisId}
                      </span>
                      {!tableLoading && tableRows.length > 0 && (
                        <GcxgcTotalBadge
                          total={(tableRows as unknown as Record<string, number>[]).reduce((s, r) => s + (r.total ?? 0), 0)}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => downloadGCxGCFile(selectedAnalysisId, 'csv')}
                      >
                        ↓ CSV
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => downloadGCxGCFile(selectedAnalysisId, 'xlsx')}
                      >
                        ↓ Excel
                      </button>
                    </div>
                  </div>
                  {/* Table */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {tableLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div className="spinner" />
                      </div>
                    ) : viewCols.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          No visible families — toggle chips to show columns
                        </p>
                      </div>
                    ) : (
                      <ViewTable
                        rows={tableRows as unknown as Record<string, number>[]}
                        cols={viewCols}
                        familyBySlug={familyBySlug}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ENTER mode ────────────────────────────────────────── */}
          {mode === 'enter' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Form row */}
              <div style={{
                padding: '10px 24px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Source type</label>
                  <input
                    className="field" value={entrySourceType}
                    onChange={e => setEntrySourceType(e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', width: 160 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Created by</label>
                  <input
                    className="field" value={entryCreatedBy}
                    onChange={e => setEntryCreatedBy(e.target.value)}
                    placeholder="Your name"
                    style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleEntrySubmit}
                  disabled={createMut.isPending || !entryCreatedBy}
                  style={{ marginLeft: 'auto', fontSize: 12 }}
                >
                  {createMut.isPending ? 'Saving…' : 'Submit'}
                </button>
                {createMut.isError && (
                  <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                    Error saving — check console
                  </span>
                )}
              </div>
              {/* Entry table */}
              {entryCols.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Enable at least one family in the left panel
                  </p>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <EntryTable
                    entryCols={entryCols}
                    entryData={entryData}
                    onCellChange={handleCellChange}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD mode ───────────────────────────────────────── */}
          {mode === 'upload' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* File picker */}
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    File
                  </p>
                  <div
                    style={{
                      border: '1px dashed var(--border-mid)', borderRadius: 6,
                      padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const f = e.dataTransfer.files[0]
                      if (f) setUploadFile(f)
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background  = 'color-mix(in srgb, var(--accent) 4%, transparent)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-mid)'
                      e.currentTarget.style.background  = 'transparent'
                    }}
                  >
                    {uploadFile ? (
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                          {uploadFile.name}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB · click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                          Drag & drop or click to pick file
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          .csv or .xlsx — row 0: display names, row 1: formulas, rows 2+: C1–C30 data
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) setUploadFile(f)
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', width: 100 }}>Source type</label>
                    <input
                      className="field" value={uploadSourceType}
                      onChange={e => setUploadSourceType(e.target.value)}
                      style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', width: 100 }}>Created by</label>
                    <input
                      className="field" value={uploadCreatedBy}
                      onChange={e => setUploadCreatedBy(e.target.value)}
                      placeholder="Your name"
                      style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
                    />
                  </div>
                </div>

                {/* Import button */}
                <button
                  className="btn btn-primary"
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploadMut.isPending || !uploadCreatedBy}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {uploadMut.isPending ? 'Importing…' : 'Import'}
                </button>

                {uploadMut.isError && (
                  <p style={{ fontSize: 12, color: 'var(--danger)' }}>
                    Import failed — check file format
                  </p>
                )}

                {/* Post-upload result */}
                {uploadResult && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Imported {uploadResult.row_count} rows · analysis {uploadResult.analysis_id}
                    </p>
                    <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Detected families
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {uploadResult.detected_families.map((fam, i) => (
                        <span
                          key={i}
                          title={fam.formula}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 4, fontSize: 10,
                            border: `1px solid ${fam.warning ? 'var(--warning, #f5a742)' : 'var(--border)'}`,
                            color: fam.warning ? 'var(--warning, #f5a742)' : 'var(--text-secondary)',
                            background: fam.warning
                              ? 'color-mix(in srgb, #f5a742 10%, transparent)'
                              : 'var(--bg-elevated)',
                          }}
                        >
                          {fam.display_name}
                          {fam.warning && <span style={{ fontSize: 9 }}>⚠</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
