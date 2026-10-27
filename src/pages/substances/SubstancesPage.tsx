// src/pages/substances/SubstancesPage.tsx
import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import {
  useSubstances, useCreateSubstance,
  useDeleteSubstance, useUploadSubstances,
  substanceKeys,
} from '@/api/substances'
import client from '@/api/client'
import { PropertyRadarChart, PropertyComparisonTable } from '@/components/charts/PropertyRadarChart'
import type { SubstanceProfile } from '@/components/charts/PropertyRadarChart'
import { useToast } from '@/components/ui/Toast'
import { SkeletonRows, EmptyState } from '@/components/ui/primitives'
import type { Substance, SubstanceType, SubstanceProperty } from '@/types'
import { CreateSubstanceSchema, type CreateSubstanceFormValues } from '@/lib/schemas'

const TYPE_COLORS: Record<SubstanceType, { color: string; bg: string }> = {
  fuel:             { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  molecule:         { color: 'var(--accent)',   bg: 'var(--accent-muted)' },
  solvent:          { color: 'var(--success)',  bg: 'var(--success-muted)' },
  pseudo_component: { color: '#818CF8',         bg: '#1E1B4B' },
}

function TypeBadge({ value }: { value: SubstanceType }) {
  const s = TYPE_COLORS[value] ?? { color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: s.color,
      background: s.bg,
    }}>
      {value.replace('_', ' ')}
    </span>
  )
}

export default function SubstancesPage() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const { data: substances = [], isLoading } = useSubstances()
  const createMut  = useCreateSubstance()
  const deleteMut  = useDeleteSubstance()
  const uploadMut  = useUploadSubstances()

  const [search, setSearch]         = useState('')
  const [typeFilter, setType]       = useState<SubstanceType | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate,
          formState: { errors: createErrors } } = useForm<CreateSubstanceFormValues>({
    resolver: zodResolver(CreateSubstanceSchema),
    defaultValues: { nom: '', substance_type: 'fuel' },
  })

  // ── Compare modal state ──────────────────────────────────────────────────
  const [showCompare, setShowCompare]   = useState(false)
  const [compareSearch, setCompareSearch] = useState('')
  // keyed by substance_id; value is the nom used in API calls
  const [compareIds, setCompareIds]     = useState<string[]>([])

  // Build nom lookup once substances are loaded
  const nomById = useMemo(
    () => Object.fromEntries(substances.map(s => [s.substance_id, s.nom])),
    [substances]
  )

  const compareQueries = useQueries({
    queries: compareIds.map(id => {
      const nom = nomById[id] ?? id
      return {
        // reuse the same cache key as useSubstanceProperties(nom)
        queryKey: substanceKeys.properties(nom),
        queryFn: async (): Promise<SubstanceProperty[]> => {
          const { data } = await client.get<{
            status: string
            analyses?: Record<string, { data_source: string; properties: { property: string; value: unknown; unit: string | null; type: string }[] }>
          }>(`/substances/${encodeURIComponent(nom)}/properties`)
          const byProp: Record<string, SubstanceProperty> = {}
          for (const [analysisId, analysisData] of Object.entries(data.analyses ?? {})) {
            for (const p of analysisData.properties ?? []) {
              if (p.type !== 'numeric') continue
              if (!byProp[p.property]) {
                byProp[p.property] = { property_id: p.property, property_name: p.property, standard_unit: p.unit ?? null, group: '', values: [] }
              }
              byProp[p.property].values.push({ analysis_id: analysisId, constant_id: '', value: Number(p.value), value_qualifier: null, reported_unit: p.unit ?? null, method: null, created_at: analysisData.data_source })
            }
          }
          return Object.values(byProp)
        },
        enabled: showCompare && !!nom,
        staleTime: 5 * 60_000,
      }
    }),
  })

  const profiles: SubstanceProfile[] = compareIds.map((id, i) => ({
    id,
    name: nomById[id] ?? id,
    properties: compareQueries[i]?.data ?? [],
  }))

  const compareFiltered = useMemo(() =>
    substances.filter(s =>
      !compareSearch ||
      s.nom.toLowerCase().includes(compareSearch.toLowerCase()) ||
      s.substance_id.toLowerCase().includes(compareSearch.toLowerCase())
    ),
  [substances, compareSearch])

  const filtered = useMemo(() => substances.filter(s => {
    const matchSearch = s.nom.toLowerCase().includes(search.toLowerCase()) ||
                        s.substance_id.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'all' || s.substance_type === typeFilter
    return matchSearch && matchType
  }), [substances, search, typeFilter])

  const colDefs: ColDef<Substance>[] = [
    {
      field: 'nom',
      headerName: 'Name',
      flex: 2,
      cellRenderer: (p: ICellRendererParams<Substance>) => (
        <button
          onClick={() => navigate(`/substances/${p.data?.nom}`)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)', fontSize: 13,
            textDecoration: 'none', textAlign: 'left', padding: 0,
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        >
          {p.value}
        </button>
      ),
    },
    {
      field: 'substance_type',
      headerName: 'Type',
      width: 160,
      cellRenderer: (p: ICellRendererParams<Substance>) => (
        <TypeBadge value={p.value as SubstanceType} />
      ),
    },
    {
      field: 'substance_id',
      headerName: 'ID',
      flex: 1,
      cellStyle: { color: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
    },
    {
      field: 'is_breakable',
      headerName: 'Breakable',
      width: 110,
      cellRenderer: (p: ICellRendererParams<Substance>) => (
        <span style={{ color: p.value ? 'var(--success)' : 'var(--text-muted)' }}>
          {p.value ? '✓' : '—'}
        </span>
      ),
    },
    {
      headerName: '',
      width: 52,
      cellRenderer: (p: ICellRendererParams<Substance>) => (
        <button
          onClick={e => {
            e.stopPropagation()
            if (confirm(`Delete "${p.data?.nom}"?`))
              deleteMut.mutate(p.data!.substance_id, {
              onSuccess: (res) => {
                const archived = res.data.mode === 'archived'
                toast.success(
                  archived
                    ? `"${p.data?.nom}" archived — it has historical data, so it's hidden but not deleted`
                    : `"${p.data?.nom}" deleted`
                )
              },
              onError: () => toast.error('Delete failed'),
            })
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, padding: '0 4px',
            fontFamily: 'inherit', lineHeight: 1,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >×</button>
      ),
    },
  ]

  const handleCreate = handleCreateSubmit((data: CreateSubstanceFormValues) => {
    createMut.mutate(
      { nom: data.nom, substance_type: data.substance_type, is_breakable: false },
      {
        onSuccess: () => { setShowCreate(false); resetCreate(); toast.success(`"${data.nom}" created`) },
        onError:   () => toast.error('Failed to create substance'),
      },
    )
  })

  const FILTER_TABS: (SubstanceType | 'all')[] = ['all', 'fuel', 'molecule', 'solvent', 'pseudo_component']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 36px' }}>
        <div>
          <h1 className="page-title">Substances</h1>
          <p className="page-subtitle">{substances.length} total · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="file" accept=".xlsx,.csv" ref={fileRef} style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              uploadMut.mutate(file, {
                onSuccess: () => toast.success('File uploaded successfully'),
                onError:   () => toast.error('Upload failed'),
              })
              e.target.value = ''
            }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            {uploadMut.isPending ? 'Uploading…' : '↑ Upload'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setShowCompare(true); setCompareSearch('') }}
          >
            ⟗ Compare
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate(true)}
          >
            + New
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 36px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="field"
          style={{ maxWidth: 320, fontSize: 13, padding: '7px 12px' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTER_TABS.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 150ms ease',
                background: typeFilter === t ? 'var(--accent-muted)' : 'transparent',
                color:      typeFilter === t ? 'var(--accent)'       : 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              {t === 'all' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div
        className="ag-theme-quartz-dark"
        style={{ flex: 1, padding: '0 36px 20px', overflow: 'hidden' }}
      >
        <AgGridReact
          theme="legacy"
          rowData={filtered}
          columnDefs={colDefs}
          loading={isLoading}
          loadingOverlayComponent={() => <SkeletonRows rows={8} height={46} />}
          noRowsOverlayComponent={() => (
            <EmptyState
              icon="⬡"
              title={search ? 'No matches' : 'No substances'}
              description={search ? `Nothing matched "${search}"` : 'Create or upload substances to get started.'}
            />
          )}
          rowHeight={46}
          headerHeight={38}
          suppressCellFocus
          animateRows
        />
      </div>

      {/* ── Compare modal ──────────────────────────────────────────────── */}
      {showCompare && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowCompare(false) }}
        >
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-mid)',
            borderRadius: 10,
            width: 'min(960px, 95vw)',
            maxHeight: '90vh',
            display: 'flex',
            overflow: 'hidden',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
          }}>
            {/* Left — substance picker */}
            <div style={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Select substances
                </div>
                <input
                  className="field"
                  value={compareSearch}
                  onChange={e => setCompareSearch(e.target.value)}
                  placeholder="Search…"
                  style={{ fontSize: 12, padding: '5px 8px', width: '100%' }}
                  autoFocus
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                  {compareIds.length} / 6 selected
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {compareFiltered.map(s => {
                  const checked = compareIds.includes(s.substance_id)
                  const disabled = !checked && compareIds.length >= 6
                  return (
                    <label
                      key={s.substance_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.45 : 1,
                        background: checked ? 'var(--bg-elevated)' : 'transparent',
                        borderLeft: checked ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => { if (!disabled && !checked) e.currentTarget.style.background = 'var(--bg-surface)' }}
                      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          setCompareIds(ids =>
                            ids.includes(s.substance_id)
                              ? ids.filter(x => x !== s.substance_id)
                              : [...ids, s.substance_id]
                          )
                        }}
                        style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.nom}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Right — chart + table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Property Comparison
                </span>
                <button
                  onClick={() => setShowCompare(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {compareIds.length < 2 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 28, color: 'var(--text-muted)' }}>⟗</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select at least 2 substances to compare</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {compareQueries.some(q => q.isLoading) && (
                      <SkeletonRows rows={4} height={36} />
                    )}
                    {!compareQueries.some(q => q.isLoading) && (
                      <>
                        <PropertyRadarChart profiles={profiles} />
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                            Property Values
                          </div>
                          <PropertyComparisonTable profiles={profiles} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-mid)',
            borderRadius: 10,
            padding: 24,
            width: 360,
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
              New Substance
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="section-label">Name</label>
                <input
                  autoFocus
                  {...registerCreate('nom')}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="field"
                />
                {createErrors.nom && (
                  <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, display: 'block' }}>
                    {createErrors.nom.message}
                  </span>
                )}
              </div>
              <div>
                <label className="section-label">Type</label>
                <select {...registerCreate('substance_type')} className="field">
                  <option value="fuel">Fuel</option>
                  <option value="molecule">Molecule</option>
                  <option value="solvent">Solvent</option>
                  <option value="pseudo_component">Pseudo Component</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { setShowCreate(false); resetCreate() }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={createMut.isPending}
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
