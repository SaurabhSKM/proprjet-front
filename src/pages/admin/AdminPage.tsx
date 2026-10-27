// src/pages/admin/AdminPage.tsx
import { useRef, useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  useDbStatus, 
  useInjectPseudoLibrary,
  useInjectDatabaseClean,
  useExportDatabaseClean, downloadExportResponse,
} from '@/api/admin'
import {
  useProperties, usePropertyGroups,
  useCreateProperty, useDeleteProperty,
  usePropertyCatalog,
} from '@/api/properties'
import type { PropertyCatalogEntry } from '@/api/properties'
import { useUnits, useCreateUnit, useConvertUnit } from '@/api/units'
import {
  useCompletenessData,
  useIsomerMappings, useGCxGCBins,
  useCreateIsomerMapping, useUpdateIsomerMapping, useDeleteIsomerMapping,
} from '@/api/gcxgc'
import { usePoolSubstances } from '@/api/optimizer'
import {
  CreatePropertySchema, type CreatePropertyFormValues,
  CreateUnitSchema,     type CreateUnitFormValues,
} from '@/lib/schemas'
import type { InjectionResult,GcxgcWarning } from '@/types'
import { useToast } from '@/components/ui/Toast'

function extractMsg(e: unknown): string {
  return (e as { response?: { data?: { message?: string; errors?: string[] } } })
    ?.response?.data?.message
    ?? (e as { response?: { data?: { errors?: string[] } } })
    ?.response?.data?.errors?.[0]
    ?? 'Operation failed'
}

import ReferencesPanel from './ReferencesPanel' 
import MethodsPanel from './MethodsPanel'

const ADMIN_TABS = [
  { to: '/admin',                label: 'Injection',    end: true  },
  { to: '/admin/status',         label: 'Status',       end: false },
  { to: '/admin/properties',     label: 'Properties',   end: false },
  { to: '/admin/catalog',        label: 'Catalog',      end: false },
  { to: '/admin/units',          label: 'Units',        end: false },
  { to: '/admin/references',     label: 'References',   end: false }, // <-- New
  { to: '/admin/methods',        label: 'Methods',      end: false }, // <-- New
  { to: '/admin/completeness',   label: 'Completeness', end: false },
  { to: '/admin/isomers',        label: 'Isomers',      end: false },
]
function AdminNav() {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 36px', flexShrink: 0 }}>
      {ADMIN_TABS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            padding: '13px 20px',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.03em',
            borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1,
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'all 150ms',
          })}
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FileCard — must live outside InjectionPanel to avoid remount on re-renders
// ─────────────────────────────────────────────────────────────────────────────
function FileCard({
  title, desc, accept, onFile, loading, error, result, children,
}: {
  title: string
  desc: string
  accept: string
  onFile: (f: File) => void
  loading: boolean
  error?: string
  result?: InjectionResult // Replace 'any' with 'InjectionResult' if you have the type imported
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLInputElement>(null)
  
  // Replaced 'confirming' boolean with a state that holds the selected file
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [gcxgcExpanded, setGcxgcExpanded] = useState(false)

  const handleMainClick = () => {
    if (pendingFile) {
      // Step 2: User clicked confirm
      onFile(pendingFile)
      setPendingFile(null)
    } else {
      // Step 1: Open file explorer
      ref.current?.click()
    }
  }

  const handleCancel = () => {
    setPendingFile(null)
    if (ref.current) ref.current.value = ''
  }

  const gcxgcWarnings = result?.gcxgc_warnings ?? []

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8, padding: 24,
      background: 'var(--bg-surface)',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.6 }}>{desc}</p>
      {children}
      
      <input
        type="file" accept={accept} ref={ref} style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) { 
            // Hold the file in state instead of uploading immediately
            setPendingFile(f) 
            e.target.value = '' 
          }
        }}
      />

      {/* Dynamic button rendering based on whether a file is pending confirmation */}
      {pendingFile ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleMainClick}
            disabled={loading}
            className="btn btn-sm"
            style={{
              flex: 1,
              background: 'var(--warning-muted, #f5a74222)',
              border: '1px solid var(--warning, #f5a742)',
              color: 'var(--warning, #f5a742)',
              transition: 'all 150ms',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}
          >
            {loading ? 'Uploading…' : `⚠ Confirm: ${pendingFile.name}`}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="btn btn-sm"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={handleMainClick}
          disabled={loading}
          className="btn btn-sm"
          style={{
            width: '100%',
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: '#fff',
            transition: 'all 150ms',
          }}
        >
          {loading ? 'Uploading…' : '↑ Upload file'}
        </button>
      )}

      {/* Result & Error rendering remains unchanged */}
      {result && (
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--success)' }}>
          ✓ {result.rows_processed != null ? `${result.rows_processed} rows imported` : result.message ?? 'Injection complete'}
          {result.rows_failed ? ` · ${result.rows_failed} failed` : ''}
        </p>
      )}
      
      {result?.errors && result.errors.length > 0 && (
        <div style={{ marginTop: 6, maxHeight: 80, overflowY: 'auto' }}>
          {result.errors.map((err: string, i: number) => (
            <p key={i} style={{ margin: '2px 0', fontSize: 10, color: 'var(--danger)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
              {err}
            </p>
          ))}
        </div>
      )}
      
      {gcxgcWarnings.length > 0 && (
        <div style={{ marginTop: 8, border: '1px solid var(--warning, #f5a742)', borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => setGcxgcExpanded(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', background: 'var(--warning-muted, #f5a74218)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--warning, #f5a742)', fontWeight: 600 }}>
              ⚠ GCxGC composition ≠ 100% &nbsp;·&nbsp; {gcxgcWarnings.length} substance{gcxgcWarnings.length > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 10, color: 'var(--warning, #f5a742)', opacity: 0.8 }}>
              {gcxgcExpanded ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {gcxgcExpanded && (
            <div style={{ maxHeight: 160, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {gcxgcWarnings.map((w: GcxgcWarning, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {w.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 600,
                    color: w.gcxgc_total < 90 || w.gcxgc_total > 110 ? 'var(--danger)' : 'var(--warning, #f5a742)',
                  }}>
                    {w.gcxgc_total.toFixed(3)} %m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {error && <p style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

function ExportCard({
  onExport, loading, error,
}: {
  onExport: () => void
  loading: boolean
  error?: string
}) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8, padding: 24,
      background: 'var(--bg-surface)',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
        Full Database Export
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.6 }}>
        Download the entire property database back out as database_clean.xlsx, ready to re-upload.
      </p>
      {/* spacer to align the button with FileCard's, which sits below a warning line */}
      <p style={{ fontSize: 11, margin: '0 0 16px', visibility: 'hidden' }}>placeholder</p>

      <button
        onClick={onExport}
        disabled={loading}
        className="btn btn-sm"
        style={{
          width: '100%',
          background: 'var(--accent)',
          border: '1px solid var(--accent)',
          color: '#fff',
        }}
      >
        {loading ? 'Exporting…' : '↓ Download .xlsx'}
      </button>

      {error && <p style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function StatusPanel() {
  const { data, isLoading, isError } = useDbStatus()

  if (isLoading) return <div style={{ padding: '28px 40px', fontSize: 14, color: 'var(--text-muted)' }}>Loading…</div>
  if (isError || !data) return <div style={{ padding: '28px 40px', fontSize: 14, color: 'var(--danger)' }}>Failed to load status.</div>

  const statCards = [
    { label: 'Substances',      value: data.substances,       accent: true },
    { label: 'Analyses',        value: data.analyses,          accent: true },
    { label: 'Constant Values', value: data.constant_values,   accent: false },
    { label: 'Text Values',     value: data.text_values,       accent: false },
    { label: 'Data Series',     value: data.data_series,       accent: false },
    { label: 'Data Points',     value: data.data_points,       accent: false },
    { label: 'GCxGC Bins',      value: data.gcxgc_bins,        accent: false },
    { label: 'GCxGC Comps',     value: data.gcxgc_compositions,accent: false },
    { label: 'ML Artifacts',    value: data.ml_model_artifacts,accent: false },
    { label: 'Chem. Families',  value: data.chemical_families, accent: false },
  ]

  return (
    <div style={{ padding: '28px 40px' }}>
      {/* Stat grid */}
      <section style={{ marginBottom: 36 }}>
        <span className="section-label">Database Overview</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {statCards.map(({ label, value, accent }) => (
            <div key={label} style={{
              padding: '18px 20px',
              background: 'var(--bg-surface)',
              border: `1px solid ${accent ? 'var(--border-mid)' : 'var(--border)'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: accent ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', lineHeight: 1 }}>
                {value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <span className="section-label">Substances by Type</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(data.substances_by_type).map(([type, count]) => (
            <div key={type} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '10px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 6, fontSize: 14,
            }}>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', width: 160 }}>
                {type.replace('_', ' ')}
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'var(--accent)', borderRadius: 3,
                  width: `${((count / data.substances) * 100).toFixed(1)}%`,
                }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 700, color: 'var(--text-primary)', width: 48, textAlign: 'right' }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {Object.keys(data.gcxgc_bins_per_family).length > 0 && (
        <section>
          <span className="section-label">GCxGC Bins per Family</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {Object.entries(data.gcxgc_bins_per_family).map(([family, count]) => (
              <div key={family} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>{family}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION TAB
// ─────────────────────────────────────────────────────────────────────────────
function InjectionPanel() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const pseudoMut = useInjectPseudoLibrary()
  const cleanMut  = useInjectDatabaseClean()
  const [pseudoCategory, setPseudoCategory] = useState('fuel')

  const [pseudoResult, setPseudoResult] = useState<InjectionResult | undefined>(undefined)
  const [cleanResult,  setCleanResult]  = useState<InjectionResult | undefined>(undefined)

  const exportMut = useExportDatabaseClean()

  const handleExport = () => {
    exportMut.mutate(undefined, {
      onSuccess: (res) => {
        downloadExportResponse(res)
        toast.success('Database exported')
      },
      onError: (e) => toast.error(extractMsg(e)),
    })
  }

  const makeCallbacks = (
    setResult: (r: InjectionResult | undefined) => void,
    label: string,
  ) => ({
    onSuccess: (res: { data: { data?: InjectionResult } }) => {
      // Coerce to undefined if data is missing, rather than an empty object
      const r = res.data.data ?? undefined 
      setResult(r)
      
      const rows = r?.rows_processed
      toast.success(
        rows != null
          ? `${label}: ${rows} rows imported${r?.rows_failed ? ` · ${r.rows_failed} failed` : ''}`
          : `${label} injected successfully`
      )

      queryClient.invalidateQueries({ queryKey: ['properties', 'catalog'] })
    },
    onError: (e: unknown) => {
      // 3. Clear state using 'undefined'
      setResult(undefined)
      toast.error(extractMsg(e))
    },
  })

  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <FileCard
          title="Pseudo-component Library"
          desc="Upload a single-category pseudo-component Excel file."
          accept=".xlsx"
          onFile={f => pseudoMut.mutate({ file: f, category: pseudoCategory }, makeCallbacks(setPseudoResult, 'Pseudo-library'))}
          loading={pseudoMut.isPending}
          result={pseudoResult}
          error={pseudoMut.error ? extractMsg(pseudoMut.error) : undefined}
        >
          <select
            value={pseudoCategory}
            onChange={e => setPseudoCategory(e.target.value)}
            className="field"
            style={{ marginBottom: 12, fontSize: 12, padding: '6px 10px' }}
          >
            <option value="fuel">Fuel</option>
            <option value="solvent">Solvent</option>
            <option value="molecule">Molecule</option>
          </select>
        </FileCard>
        <FileCard
          title="Full Database (database_clean.xlsx)"
          desc="Upload the complete 501-column database with GCxGC, all property series, and multi-method measurements."
          accept=".xlsx"
          onFile={f => cleanMut.mutate(f, makeCallbacks(setCleanResult, 'Database injection'))}
          loading={cleanMut.isPending}
          result={cleanResult}
          error={cleanMut.error ? extractMsg(cleanMut.error) : undefined}
        />
        <ExportCard
          onExport={handleExport}
          loading={exportMut.isPending}
          error={exportMut.error ? extractMsg(exportMut.error) : undefined}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES TAB
// ─────────────────────────────────────────────────────────────────────────────
function PropertiesPanel() {
  const toast = useToast()
  const { data: groups = [] }     = usePropertyGroups()
  const { data: properties = [] } = useProperties()
  const createProp = useCreateProperty()
  const deleteProp = useDeleteProperty()

  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePropertyFormValues>({
    resolver: zodResolver(CreatePropertySchema),
    defaultValues: { property_id: '', property_name: '', standard_unit: '', group_id: '' },
  })

  const grouped = groups.map(g => ({
    ...g,
    properties: properties.filter(p => p.group_id === g.id),
  }))

  const handleCreate = handleSubmit((data: CreatePropertyFormValues) => {
    createProp.mutate(
      { property_id: data.property_id, group_id: data.group_id,
        property_name: data.property_name, standard_unit: data.standard_unit || null },
      {
        onSuccess: () => { setShowForm(false); reset(); toast.success(`"${data.property_id}" created`) },
        onError: (e) => toast.error(extractMsg(e)),
      },
    )
  })

  const fieldStyle: React.CSSProperties = { fontSize: 12, padding: '6px 10px' }
  const errStyle: React.CSSProperties   = { fontSize: 11, color: 'var(--danger)', marginTop: 2 }

  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            Properties
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
              {properties.length} total
            </span>
          </h2>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn btn-primary btn-sm"
        >
          + Add Property
        </button>
      </div>

      {showForm && (
        <div style={{
          marginBottom: 20, padding: 16,
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--bg-surface)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {([
            { label: 'property_id',   name: 'property_id'   as const, ph: 'p_my_prop' },
            { label: 'property_name', name: 'property_name' as const, ph: 'My Property' },
            { label: 'standard_unit', name: 'standard_unit' as const, ph: 'g/mL (optional)' },
          ]).map(({ label, name, ph }) => (
            <div key={name}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                {label}
              </div>
              <input {...register(name)} placeholder={ph} className="field" style={fieldStyle} />
              {errors[name] && <span style={errStyle}>{errors[name]?.message}</span>}
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              group
            </div>
            <select {...register('group_id')} className="field" style={fieldStyle}>
              <option value="">— select group —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowForm(false); reset() }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleCreate} disabled={createProp.isPending} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              {createProp.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {grouped.map(g => (
          <div key={g.id}>
            <span className="section-label">{g.name}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.properties.map(p => (
                <div key={p.property_id} className="data-row">
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', width: 176, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.property_id}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.property_name}</span>
                  {p.standard_unit && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 12 }}>{p.standard_unit}</span>
                  )}
                  <button
                    onClick={() => {
                      if (!confirm(`Delete "${p.property_id}"?`)) return
                      deleteProp.mutate(p.property_id, {
                        onSuccess: () => toast.success(`"${p.property_id}" deleted`),
                        onError: (e) => toast.error(extractMsg(e)),
                      })
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', marginLeft: p.standard_unit ? 8 : 'auto', padding: '0 4px', transition: 'color 150ms', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UNITS TAB
// ─────────────────────────────────────────────────────────────────────────────
function UnitsPanel() {
  const toast = useToast()
  const { data: units = [] } = useUnits()
  const [showForm, setShowForm] = useState(false)
  const createUnit = useCreateUnit()

  const { register: regUnit, handleSubmit: submitUnit, reset: resetUnit,
          formState: { errors: unitErrors } } = useForm<CreateUnitFormValues>({
    resolver: zodResolver(CreateUnitSchema),
    defaultValues: { unit_id: '', symbol: '', display_name: '', quantity: '', si_base: false },
  })

  const handleCreate = submitUnit((data: CreateUnitFormValues) => {
    createUnit.mutate(
      { unit_id: data.unit_id, symbol: data.symbol, display_name: data.display_name,
        quantity: data.quantity, si_base: data.si_base },
      {
        onSuccess: () => { setShowForm(false); resetUnit(); toast.success('Unit created') },
        onError: (e) => toast.error(extractMsg(e)),
      },
    )
  })

  const grouped = units.reduce<Record<string, typeof units>>((acc, u) => {
    ;(acc[u.quantity] ??= []).push(u)
    return acc
  }, {})

  const convertMut = useConvertUnit()
  const [cvFrom, setCvFrom]     = useState('')
  const [cvTo, setCvTo]         = useState('')
  const [cvVal, setCvVal]       = useState('')
  const [cvResult, setCvResult] = useState<{ result: number; from_unit: string; to_unit: string } | null>(null)

  const fieldStyle: React.CSSProperties = { fontSize: 12, padding: '6px 10px' }

  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
          Units
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
            {units.length} total
          </span>
        </h2>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm">
          + Add Unit
        </button>
      </div>

      {showForm && (
        <div style={{
          marginBottom: 20, padding: 16,
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--bg-surface)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {([
            { label: 'unit_id',      name: 'unit_id'      as const, ph: 'kg_m3' },
            { label: 'symbol',       name: 'symbol'       as const, ph: 'kg/m³' },
            { label: 'display_name', name: 'display_name' as const, ph: 'Kilograms per cubic metre' },
            { label: 'quantity',     name: 'quantity'     as const, ph: 'density' },
          ]).map(({ label, name, ph }) => (
            <div key={name}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                {label}
              </div>
              <input {...regUnit(name)} placeholder={ph} className="field" style={fieldStyle} />
              {unitErrors[name] && (
                <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{unitErrors[name]?.message}</span>
              )}
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="si" {...regUnit('si_base')} style={{ accentColor: 'var(--accent)' }} />
            <label htmlFor="si" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>SI base unit</label>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowForm(false); resetUnit() }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleCreate} disabled={createUnit.isPending} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              {createUnit.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Unit converter */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8, padding: 16,
        background: 'var(--bg-surface)', marginBottom: 24,
      }}>
        <span className="section-label">Unit Converter</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Value
            </div>
            <input type="number" value={cvVal} onChange={e => setCvVal(e.target.value)}
              className="field" style={{ width: 96, ...fieldStyle }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              From
            </div>
            <select value={cvFrom} onChange={e => setCvFrom(e.target.value)}
              className="field" style={{ width: 128, ...fieldStyle }}>
              <option value="">— select —</option>
              {units.map(u => <option key={u.unit_id} value={u.symbol}>{u.symbol}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              To
            </div>
            <select value={cvTo} onChange={e => setCvTo(e.target.value)}
              className="field" style={{ width: 128, ...fieldStyle }}>
              <option value="">— select —</option>
              {units.map(u => <option key={u.unit_id} value={u.symbol}>{u.symbol}</option>)}
            </select>
          </div>
          <button
            onClick={() => convertMut.mutate(
              { value: Number(cvVal), from_symbol: cvFrom, to_symbol: cvTo },
              { onSuccess: res => setCvResult(res.data.data ?? null) }
            )}
            disabled={!cvVal || !cvFrom || !cvTo || convertMut.isPending}
            className="btn btn-primary btn-sm"
          >
            Convert
          </button>
          {cvResult && (
            <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--text-primary)' }}>
              = <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{cvResult.result.toFixed(6)}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{cvResult.to_unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unit list grouped by quantity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(grouped).map(([q, unitList]) => (
          <div key={q}>
            <span className="section-label">{q}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unitList.map(u => (
                <div key={u.unit_id} className="data-row">
                  <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', width: 96 }}>
                    {u.symbol}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.display_name}</span>
                  {u.si_base && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, color: 'var(--success)',
                      background: 'var(--success-muted)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      SI
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                    {u.unit_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETENESS PANEL
// ─────────────────────────────────────────────────────────────────────────────
const COMP_PROPS = [
  { key: 'has_density', label: 'ρ',      title: 'Density' },
  { key: 'has_fp',      label: 'FP',     title: 'Flash Point' },
  { key: 'has_mw',      label: 'MW',     title: 'Molecular Weight' },
  { key: 'has_kv_p40',  label: 'KV+40',  title: 'KV at +40°C' },
  { key: 'has_kv_m20',  label: 'KV-20',  title: 'KV at -20°C' },
  { key: 'has_kv_m40',  label: 'KV-40',  title: 'KV at -40°C' },
  { key: 'has_gcxgc',   label: 'GCxGC',  title: 'GCxGC Composition' },
  { key: 'has_lhv',     label: 'LHV',    title: 'Lower Heating Value' },
  { key: 'has_frzp',    label: 'Frzp',   title: 'Freeze Point' },
  { key: 'has_surft',   label: 'σ',      title: 'Surface Tension' },
  { key: 'has_cp',      label: 'Cp',     title: 'Heat Capacity' },
  { key: 'has_dist',    label: 'Dist',   title: 'Distillation' },
  { key: 'has_eos',     label: 'EOS',    title: 'EOS Properties (Tc, Pc, ω)' },
] as const

function CompletenessPanel() {
  const { data = [], isLoading, isError } = useCompletenessData()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let rows = data
    if (typeFilter !== 'all') rows = rows.filter(s => s.substance_type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(s => s.name.toLowerCase().includes(q))
    }
    return rows
  }, [data, typeFilter, search])

  const types = useMemo(() => {
    const set = new Set(data.map(s => s.substance_type))
    return Array.from(set).sort()
  }, [data])

  if (isLoading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
  if (isError)   return <div style={{ padding: 40, color: 'var(--danger)', fontSize: 13 }}>Failed to load completeness data.</div>

  const coverage = COMP_PROPS.map(p => {
    const total = filtered.length
    const has   = filtered.filter(s => s[p.key as keyof typeof s]).length
    return { ...p, pct: total ? Math.round((has / total) * 100) : 0 }
  })

  const CELL = 26
  const COL  = 52

  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
          Data Completeness
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{data.length} substances</span>
        </h2>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter…" className="field"
          style={{ fontSize: 12, padding: '6px 10px', width: 160 }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="field" style={{ fontSize: 12, padding: '6px 10px' }}>
          <option value="all">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 500, minWidth: 180 }}>
                Substance
              </th>
              {COMP_PROPS.map(p => (
                <th key={p.key} title={p.title} style={{ padding: '4px 2px', textAlign: 'center', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 500, width: COL }}>
                  {p.label}
                </th>
              ))}
              <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 500, width: 64 }}>
                Score
              </th>
            </tr>
            {/* Coverage summary row */}
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <td style={{ padding: '5px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                COVERAGE
              </td>
              {coverage.map(c => (
                <td key={c.key} style={{ textAlign: 'center', padding: '4px 2px', width: COL }}>
                  <span style={{
                    fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: c.pct >= 80 ? 'var(--success)' : c.pct >= 50 ? 'var(--warning, #f5a742)' : 'var(--danger)',
                    fontWeight: 700,
                  }}>
                    {c.pct}%
                  </span>
                </td>
              ))}
              <td />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, ri) => {
              const score = COMP_PROPS.filter(p => s[p.key as keyof typeof s]).length
              return (
                <tr
                  key={s.substance_id}
                  style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : 'var(--bg-elevated)')}
                >
                  <td style={{ padding: '5px 12px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                    <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.substance_type}</span>
                  </td>
                  {COMP_PROPS.map(p => {
                    const has = s[p.key as keyof typeof s] as boolean
                    return (
                      <td key={p.key} style={{ textAlign: 'center', padding: 4, width: COL }}>
                        <div title={has ? p.title : `Missing: ${p.title}`} style={{
                          width: CELL, height: CELL,
                          borderRadius: 4,
                          background: has ? '#3db87a22' : '#e0525222',
                          border: `1px solid ${has ? '#3db87a55' : '#e0525255'}`,
                          margin: '0 auto',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10,
                          color: has ? '#3db87a' : '#e05252',
                        }}>
                          {has ? '✓' : '✗'}
                        </div>
                      </td>
                    )
                  })}
                  <td style={{ padding: '5px 12px', textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      fontSize: 11,
                      color: score >= 10 ? '#3db87a' : score >= 7 ? 'var(--accent)' : 'var(--danger)',
                      fontWeight: 600,
                    }}>
                      {score}/{COMP_PROPS.length}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          No substances match the current filter.
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// ISOMER MAPPING EDITOR
// ─────────────────────────────────────────────────────────────────────────────
function IsomersPanel() {
  const toast = useToast()
  const { data: mappings = [], isLoading } = useIsomerMappings()
  const { data: bins = [] }                = useGCxGCBins()
  const { data: substances = [] }          = usePoolSubstances()
  const createMut  = useCreateIsomerMapping()
  const updateMut  = useUpdateIsomerMapping()
  const deleteMut  = useDeleteIsomerMapping()

  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState<number | null>(null)
  const [editFrac, setEditFrac]     = useState('')
  const [newBinId, setNewBinId]     = useState('')
  const [newSubId, setNewSubId]     = useState('')
  const [newFrac, setNewFrac]       = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return mappings.filter(m =>
      !q || m.substance_name.toLowerCase().includes(q) || m.family_name.toLowerCase().includes(q)
    )
  }, [mappings, search])

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {}
    for (const m of filtered) {
      const key = m.display_name || m.family_name
      ;(g[key] ??= []).push(m)
    }
    return g
  }, [filtered])

  const handleCreate = () => {
    if (!newBinId || !newSubId) return
    createMut.mutate(
      { bin_id: Number(newBinId), substance_id: newSubId, default_molar_fraction: newFrac ? Number(newFrac) : null },
      {
        onSuccess: () => { setShowForm(false); setNewBinId(''); setNewSubId(''); setNewFrac(''); toast.success('Mapping created') },
        onError: (e) => toast.error(extractMsg(e)),
      }
    )
  }

  const handleUpdate = (mappingId: number) => {
    updateMut.mutate(
      { mappingId, fraction: editFrac ? Number(editFrac) : null },
      {
        onSuccess: () => { setEditId(null); toast.success('Fraction updated') },
        onError: (e) => toast.error(extractMsg(e)),
      }
    )
  }

  const fieldStyle: React.CSSProperties = { fontSize: 12, padding: '6px 10px' }

  return (
    <div style={{ padding: '28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0, flex: 1 }}>
          Isomer Mappings
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{mappings.length} total</span>
        </h2>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter…" className="field"
          style={{ fontSize: 12, padding: '6px 10px', width: 180 }}
        />
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm">
          + Add Mapping
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-surface)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>GCxGC Bin</div>
            <select value={newBinId} onChange={e => setNewBinId(e.target.value)} className="field" style={fieldStyle}>
              <option value="">— select bin —</option>
              {bins.map(b => (
                <option key={b.bin_id} value={b.bin_id}>
                  {b.display_name || b.family_name} C{b.carbon_count}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Pseudo-molecule</div>
            <select value={newSubId} onChange={e => setNewSubId(e.target.value)} className="field" style={fieldStyle}>
              <option value="">— select substance —</option>
              {substances.map(s => (
                <option key={s.substance_id} value={s.substance_id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Molar Fraction (optional)</div>
            <input
              type="number" step="0.0001" min="0" max="1"
              value={newFrac} onChange={e => setNewFrac(e.target.value)}
              placeholder="e.g. 0.5 — omit for single mapping"
              className="field" style={fieldStyle}
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newBinId || !newSubId || createMut.isPending}
              className="btn btn-primary btn-sm" style={{ flex: 1 }}
            >
              {createMut.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
          {createMut.isError && (
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 11, color: 'var(--danger)' }}>
              {extractMsg(createMut.error)}
            </p>
          )}
        </div>
      )}

      {isLoading && <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}

      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([family, rows]) => (
            <div key={family}>
              <span className="section-label">
                {family}
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>
                  {rows[0]?.general_formula}
                </span>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rows.map(m => (
                  <div key={m.mapping_id} className="data-row">
                    <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', width: 56, fontSize: 12 }}>
                      C{m.carbon_count}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, flex: 1 }}>{m.substance_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.substance_type}</span>

                    {editId === m.mapping_id ? (
                      <>
                        <input
                          type="number" step="0.0001" min="0" max="1"
                          value={editFrac}
                          onChange={e => setEditFrac(e.target.value)}
                          placeholder="fraction"
                          className="field"
                          style={{ fontSize: 11, padding: '3px 7px', width: 100 }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(m.mapping_id)}
                          disabled={updateMut.isPending}
                          className="btn btn-primary btn-sm"
                          style={{ marginLeft: 6, padding: '3px 10px', fontSize: 11 }}
                        >Save</button>
                        <button
                          onClick={() => setEditId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: 4, padding: '3px 10px', fontSize: 11 }}
                        >×</button>
                      </>
                    ) : (
                      <span
                        title="Click to edit fraction"
                        onClick={() => { setEditId(m.mapping_id); setEditFrac(m.default_molar_fraction != null ? String(m.default_molar_fraction) : '') }}
                        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: m.default_molar_fraction != null ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', minWidth: 64, textAlign: 'right' }}
                      >
                        {m.default_molar_fraction != null ? m.default_molar_fraction.toFixed(4) : '—'}
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (!confirm(`Delete mapping for ${m.substance_name} (bin C${m.carbon_count})?`)) return
                        deleteMut.mutate(m.mapping_id, {
                          onSuccess: () => toast.success('Mapping deleted'),
                          onError: (e) => toast.error(extractMsg(e)),
                        })
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', marginLeft: 8, padding: '0 4px', transition: 'color 150ms', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              No isomer mappings found. Use "+ Add Mapping" to create the first one.
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY CATALOG PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ValueChip({ label, count, sub, color }: { label: string; count: number; sub: number; color: string }) {
  if (count === 0) return null
  return (
    <span
      title={`${count} record${count !== 1 ? 's' : ''} across ${sub} substance${sub !== 1 ? 's' : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 10,
        fontSize: 10, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        background: `${color}1a`, color, border: `1px solid ${color}40`,
      }}
    >
      {label} <strong style={{ fontWeight: 700 }}>{count}</strong>
      <span style={{ opacity: 0.7 }}>/ {sub}s</span>
    </span>
  )
}

function CatalogRow({ entry, expanded, onToggle }: {
  entry: PropertyCatalogEntry
  expanded: boolean
  onToggle: () => void
}) {
  const hasData = entry.constant_count > 0 || entry.text_count > 0 || entry.series_count > 0

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderTop: '1px solid var(--border)',
          cursor: 'pointer',
          background: expanded ? 'var(--bg-elevated)' : 'transparent',
          transition: 'background 100ms',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
      >
        <td style={{ padding: '7px 10px', width: 16, color: 'var(--text-muted)', fontSize: 10 }}>
          {expanded ? '▾' : '▸'}
        </td>
        <td style={{ padding: '7px 0', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {entry.property_id}
        </td>
        <td style={{ padding: '7px 16px', fontSize: 12, color: 'var(--text-primary)' }}>
          {entry.property_name}
        </td>
        <td style={{ padding: '7px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          {entry.standard_unit ?? '—'}
        </td>
        <td style={{ padding: '7px 16px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.method ?? '—'}
        </td>
        <td style={{ padding: '7px 16px' }}>
          {hasData ? (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <ValueChip label="const" count={entry.constant_count} sub={entry.constant_substances} color="var(--accent)" />
              <ValueChip label="series" count={entry.series_count} sub={entry.series_substances} color="var(--success)" />
              <ValueChip label="text" count={entry.text_count} sub={entry.text_substances} color="var(--warning)" />
            </div>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>no data</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--bg-elevated)' }}>
          <td />
          <td colSpan={5} style={{ padding: '0 0 12px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '10px 16px 10px 0' }}>
              <DetailCard
                title="Constant Values"
                color="var(--accent)"
                rows={[
                  { label: 'Records', value: entry.constant_count },
                  { label: 'Substances', value: entry.constant_substances },
                ]}
              />
              <DetailCard
                title="Data Series"
                color="var(--success)"
                rows={[
                  { label: 'Series', value: entry.series_count },
                  { label: 'Total points', value: entry.series_points },
                  { label: 'Substances', value: entry.series_substances },
                ]}
              />
              <DetailCard
                title="Text Values"
                color="var(--warning)"
                rows={[
                  { label: 'Records', value: entry.text_count },
                  { label: 'Substances', value: entry.text_substances },
                ]}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailCard({ title, color, rows }: { title: string; color: string; rows: { label: string; value: number }[] }) {
  return (
    <div style={{
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
      padding: '8px 12px',
      background: `${color}08`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: r.value > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: r.value > 0 ? 600 : 400 }}>
            {r.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function PropertyCatalogPanel() {
  const { data = [], isLoading, isError } = usePropertyCatalog()
  const [search, setSearch]       = useState('')
  const [groupFilter, setGroup]   = useState('all')
  const [expandedId, setExpanded] = useState<string | null>(null)

  const groups = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name: string }[] = []
    for (const e of data) {
      const k = e.group_id ?? '__none__'
      if (!seen.has(k)) { seen.add(k); out.push({ id: k, name: e.group_name ?? 'Ungrouped' }) }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(e => {
      if (groupFilter !== 'all' && (e.group_id ?? '__none__') !== groupFilter) return false
      if (q && !e.property_id.toLowerCase().includes(q) && !e.property_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, search, groupFilter])

  const byGroup = useMemo(() => {
    const map = new Map<string, { name: string; entries: PropertyCatalogEntry[] }>()
    for (const e of filtered) {
      const k = e.group_id ?? '__none__'
      if (!map.has(k)) map.set(k, { name: e.group_name ?? 'Ungrouped', entries: [] })
      map.get(k)!.entries.push(e)
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name))
  }, [filtered])

  if (isLoading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
  if (isError)   return <div style={{ padding: 40, color: 'var(--danger)',     fontSize: 13 }}>Failed to load property catalog.</div>

  const totalWithData = data.filter(e => e.constant_count > 0 || e.text_count > 0 || e.series_count > 0).length

  return (
    <div style={{ padding: '24px 36px' }}>
      {/* Header + stats */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Property Catalog</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {data.length} properties · {groups.length} groups · {totalWithData} with stored data
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ID or name…"
            className="field"
            style={{ width: 220, fontSize: 12, padding: '5px 10px' }}
          />
          <select
            value={groupFilter}
            onChange={e => setGroup(e.target.value)}
            className="field"
            style={{ fontSize: 12, padding: '5px 8px' }}
          >
            <option value="all">All groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Constant values', color: 'var(--accent)' },
          { label: 'Data series', color: 'var(--success)' },
          { label: 'Text values', color: 'var(--warning)' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          · counts show <em>records / substance coverage</em> · click row for detail
        </span>
      </div>

      {/* Table per group */}
      {byGroup.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No properties match your filters.
        </div>
      ) : byGroup.map(([groupKey, { name, entries }]) => (
        <div key={groupKey} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--text-muted)', padding: '6px 0', borderBottom: '1px solid var(--border)',
            marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{name}</span>
            <span style={{ fontWeight: 400, letterSpacing: 0 }}>{entries.length} properties</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: 200 }} />
              <col />
              <col style={{ width: 80 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 320 }} />
            </colgroup>
            <tbody>
              {entries.map(e => (
                <CatalogRow
                  key={e.property_id}
                  entry={e}
                  expanded={expandedId === e.property_id}
                  onToggle={() => setExpanded(expandedId === e.property_id ? null : e.property_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  // const { isAdmin } = useAuth()
  // if (!isAdmin) return <Navigate to="/" replace />  // re-enable after Keycloak roles are configured

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ flexShrink: 0, padding: '22px 36px' }}>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Data injection · property dictionary · units</p>
      </div>
      <AdminNav />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route index                  element={<InjectionPanel />} />
          <Route path="status"          element={<StatusPanel />} />
          <Route path="properties"      element={<PropertiesPanel />} />
          <Route path="catalog"         element={<PropertyCatalogPanel />} />
          <Route path="units"           element={<UnitsPanel />} />
          <Route path="references"      element={<ReferencesPanel />} />
          <Route path="methods"         element={<MethodsPanel />} />
          <Route path="completeness"    element={<CompletenessPanel />} />
          <Route path="isomers"         element={<IsomersPanel />} />
        </Routes>
      </div>
    </div>
  )
}
