// src/pages/substances/AnalysisCard.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  EditMetaSchema, type EditMetaFormValues,
  ConstantValueSchema, type ConstantValueFormInput, type ConstantValueFormValues,
  CompositionSchema, type CompositionFormValues,
} from '@/lib/schemas'
import {
  useConstants, useTextValues, useSeries,
  useAddConstant, useUpdateAnalysis,
  useUpdateConstantValue,
  useUpdateTextValue, useDeleteTextValue,
} from '@/api/analyses'
import { useGetCompositions, useAddComposition } from '@/api/substances'
import type { Analysis, ConstantValue, TextValue } from '@/types'
import Plot from 'react-plotly.js'
import { useChartColors } from '@/hooks/useChartColors'

// ─── Metadata edit form ───────────────────────────────────────────────────────

function EditMetaForm({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const updateMut = useUpdateAnalysis()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<EditMetaFormValues>({
    resolver: zodResolver(EditMetaSchema),
    defaultValues: { updated_by: '', project_id: '' },
  })

  const handleSave = handleSubmit((data: EditMetaFormValues) => {
    updateMut.mutate(
      { id: analysis.analysis_id, updated_by: data.updated_by, project_id: data.project_id || undefined },
      {
        onSuccess: onClose,
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed'
          setError('root', { message: msg })
        },
      },
    )
  })

  const fieldStyle: React.CSSProperties = { fontSize: 12, padding: '6px 10px' }
  const errStyle: React.CSSProperties   = { fontSize: 11, color: 'var(--danger)', marginTop: 2 }

  return (
    <div style={{
      padding: '12px 20px', background: 'var(--bg-elevated)',
      borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        Edit Analysis Metadata
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Updated by <span style={{ color: 'var(--danger)' }}>*</span>
          </div>
          <input {...register('updated_by')} placeholder="user_id or name" className="field" style={fieldStyle} />
          {errors.updated_by && <span style={errStyle}>{errors.updated_by.message}</span>}
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Project ID
          </div>
          <input {...register('project_id')} placeholder="optional" className="field" style={fieldStyle} />
        </div>
      </div>
      {errors.root && <span style={errStyle}>{errors.root.message}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={updateMut.isPending} className="btn btn-primary btn-sm">
          {updateMut.isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
      </div>
    </div>
  )
}

// ─── Inline-editable constant value row ──────────────────────────────────────

function ConstantValueRow({ c, analysisId }: { c: ConstantValue; analysisId: string }) {
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)

  const updateMut = useUpdateConstantValue(analysisId)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ConstantValueFormInput, unknown, ConstantValueFormValues>({
    resolver: zodResolver(ConstantValueSchema),
    defaultValues: { value: c.value, reported_unit: c.reported_unit ?? '', change_reason: '', updated_by: '' },
  })

  const handleSave = handleSubmit((data: ConstantValueFormValues) => {
    updateMut.mutate(
      { id: c.constant_id, value: data.value, change_reason: data.change_reason,
        updated_by: data.updated_by, reported_unit: data.reported_unit || undefined },
      {
        onSuccess: () => setEditing(false),
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed'
          setError('root', { message: msg })
        },
      },
    )
  })

  const handleCancel = () => {
    reset()
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{
        gridColumn: '1 / -1',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Edit: {c.property_id}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 1fr', gap: 6 }}>
          <input
            autoFocus
            type="number"
            {...register('value')}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            placeholder="value"
            className="field"
            style={{ fontSize: 12, padding: '5px 8px' }}
          />
          <input
            {...register('reported_unit')}
            placeholder="unit"
            className="field"
            style={{ fontSize: 12, padding: '5px 8px' }}
          />
          <input
            {...register('change_reason')}
            placeholder="change reason *"
            className="field"
            style={{ fontSize: 12, padding: '5px 8px' }}
          />
          <input
            {...register('updated_by')}
            placeholder="updated by *"
            className="field"
            style={{ fontSize: 12, padding: '5px 8px' }}
          />
        </div>
        {(errors.value || errors.change_reason || errors.updated_by || errors.root) && (
          <span style={{ fontSize: 11, color: 'var(--danger)' }}>
            {errors.value?.message ?? errors.change_reason?.message ?? errors.updated_by?.message ?? errors.root?.message}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            style={{
              background: 'var(--success-muted)', border: '1px solid var(--success)',
              borderRadius: 4, cursor: 'pointer', color: 'var(--success)',
              fontSize: 11, padding: '3px 10px', fontFamily: 'inherit',
            }}
          >
            {updateMut.isPending ? '…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 11, padding: '3px 10px', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="data-row"
      style={{ height: 36, cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        fontSize: 11, color: 'var(--text-muted)',
        width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {c.property_id}
      </span>
      <span className="num" style={{ marginLeft: 'auto' }}>{c.value}</span>
      {c.reported_unit && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.reported_unit}</span>
      )}
      {hovered && (
        <button
          onClick={() => setEditing(true)}
          title="Edit value"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 12, padding: '0 4px',
            lineHeight: 1, flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ✎
        </button>
      )}
    </div>
  )
}

// ─── Inline-editable text value row ──────────────────────────────────────────

function TextValueRow({ t, analysisId }: { t: TextValue; analysisId: string }) {
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(t.value)
  const [hovered, setHovered]   = useState(false)
  const [confirming, setConfirming] = useState(false)

  const updateMut = useUpdateTextValue(analysisId)
  const deleteMut = useDeleteTextValue(analysisId)

  const handleSave = () => {
    if (!draft.trim()) return
    updateMut.mutate(
      { id: t.text_val_id, value: draft.trim() },
      { onSuccess: () => setEditing(false) }
    )
  }

  const handleDelete = () => {
    if (confirming) {
      deleteMut.mutate(t.text_val_id)
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
        padding: '4px 8px', borderRadius: 4,
        background: hovered ? 'var(--bg-elevated)' : 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
    >
      <span style={{ color: 'var(--text-muted)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {t.property_id}
      </span>

      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="field"
            style={{ flex: 1, fontSize: 12, padding: '3px 8px' }}
          />
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            style={{
              background: 'var(--success-muted)', border: '1px solid var(--success)',
              borderRadius: 4, cursor: 'pointer', color: 'var(--success)',
              fontSize: 11, padding: '2px 8px', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {updateMut.isPending ? '…' : '✓'}
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(t.value) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.value}
          </span>
          <div
            style={{
              display: 'flex', gap: 4,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 150ms',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => { setEditing(true); setDraft(t.value) }}
              title="Edit"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 13, padding: '0 4px',
                transition: 'color 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ✎
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              title={confirming ? 'Click again to confirm' : 'Delete'}
              style={{
                background: confirming ? 'var(--danger-muted)' : 'none',
                border: confirming ? '1px solid var(--danger)' : 'none',
                borderRadius: confirming ? 3 : 0,
                cursor: 'pointer',
                color: confirming ? 'var(--danger)' : 'var(--text-muted)',
                fontSize: 12, padding: '0 4px',
                transition: 'color 120ms, background 120ms',
              }}
              onMouseEnter={e => { if (!confirming) (e.currentTarget.style.color = 'var(--danger)') }}
              onMouseLeave={e => { if (!confirming) (e.currentTarget.style.color = 'var(--text-muted)') }}
            >
              {deleteMut.isPending ? '…' : confirming ? 'confirm?' : '✕'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Composition section ──────────────────────────────────────────────────────

function CompositionSection({ analysisId }: { analysisId: string }) {
  const [showForm, setShowForm] = useState(false)

  const { data: components = [] } = useGetCompositions(analysisId)
  const addMut = useAddComposition()

  const total = components.reduce((s, c) => s + c.fraction, 0)

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<CompositionFormValues>({
    resolver: zodResolver(CompositionSchema),
    defaultValues: { composition_string: '', fraction_type: 'mass' },
  })

  const handleLink = handleSubmit((data: CompositionFormValues) => {
    addMut.mutate(
      { analysisId, composition_string: data.composition_string, fraction_type: data.fraction_type },
      {
        onSuccess: () => { reset(); setShowForm(false) },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Linking failed'
          setError('root', { message: msg })
        },
      },
    )
  })

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Composition ({components.length})
        </span>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: showForm ? 'var(--text-muted)' : 'var(--accent)',
            fontFamily: 'inherit', padding: 0, transition: 'color 150ms',
          }}
        >
          {showForm ? 'Cancel' : '+ Link components'}
        </button>
      </div>

      {/* Link form */}
      {showForm && (
        <div style={{
          marginBottom: 12, padding: '12px 14px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Composition string
            </div>
            <input
              {...register('composition_string')}
              placeholder="8/17/75 : 9706/9945/10106"
              className="field field-mono"
              style={{ fontSize: 12, padding: '7px 10px' }}
            />
            {errors.composition_string && (
              <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, display: 'block' }}>
                {errors.composition_string.message}
              </span>
            )}
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
              fractions/… : references/… &nbsp;·&nbsp; fracs {'>'} 1 treated as %
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                Fraction type
              </div>
              <select
                {...register('fraction_type')}
                className="field"
                style={{ fontSize: 12, padding: '7px 10px', width: 'auto' }}
              >
                <option value="mass">mass</option>
                <option value="volume">volume</option>
                <option value="mole">mole</option>
              </select>
            </div>
            <button
              onClick={handleLink}
              disabled={addMut.isPending}
              className="btn btn-primary btn-sm"
            >
              {addMut.isPending ? 'Linking…' : 'Link components'}
            </button>
          </div>
          {errors.root && (
            <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors.root.message}</span>
          )}
        </div>
      )}

      {/* Component list */}
      {components.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Summary fraction type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span className="badge badge-neutral">{components[0]?.fraction_type ?? 'mass'}</span>
            {Math.abs(total - 1) > 0.02 && (
              <span style={{ fontSize: 10, color: 'var(--warning)' }}>
                Σ = {(total * 100).toFixed(1)}% (expected 100%)
              </span>
            )}
          </div>
          {/* Stacked fraction bars */}
          <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 4 }}>
            {components.map((c, i) => {
              const hue = (i * 67 + 200) % 360
              return (
                <div
                  key={c.component_analysis_id}
                  title={`${c.component_name}: ${(c.fraction * 100).toFixed(1)}%`}
                  style={{
                    width: `${(c.fraction / Math.max(total, 1)) * 100}%`,
                    background: `hsl(${hue}, 60%, 55%)`,
                    transition: 'width 300ms ease',
                  }}
                />
              )
            })}
          </div>
          {/* Row list */}
          {components.map((c, i) => {
            const hue = (i * 67 + 200) % 360
            return (
              <div
                key={c.component_analysis_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 12,
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${hue}, 60%, 55%)`,
                }} />
                <span style={{
                  color: 'var(--text-primary)', flex: 1, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.component_name}
                </span>
                <div style={{ flexShrink: 0, width: 160, background: 'var(--border)', borderRadius: 2, height: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: `hsl(${hue}, 60%, 55%)`,
                    width: `${((c.fraction / Math.max(total, 1)) * 100).toFixed(1)}%`,
                  }} />
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 12, color: 'var(--text-primary)', width: 52, textAlign: 'right', flexShrink: 0,
                }}>
                  {(c.fraction * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      )}

      {components.length === 0 && !showForm && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          No components linked. Use '+ Link components' to add a composition.
        </p>
      )}
    </section>
  )
}

// ─── Main AnalysisCard ────────────────────────────────────────────────────────

export default function AnalysisCard({
  analysis,
  defaultOpen = false,
}: {
  analysis: Analysis
  defaultOpen?: boolean
}) {
  const [open, setOpen]         = useState(defaultOpen)
  const [editMeta, setEditMeta] = useState(false)

  const { data: constants = [] } = useConstants(open ? analysis.analysis_id : '')
  const { data: textVals  = [] } = useTextValues(open ? analysis.analysis_id : '')
  const { data: series    = [] } = useSeries(open ? analysis.analysis_id : '')

  const addConst = useAddConstant(analysis.analysis_id)
  const [showConstForm, setShowConstForm] = useState(false)
  const [constPid,  setConstPid]  = useState('')
  const [constVal,  setConstVal]  = useState('')
  const [constUnit, setConstUnit] = useState('')

  const handleAddConst = () => {
    addConst.mutate(
      { property_id: constPid, value: Number(constVal), reported_unit: constUnit || undefined },
      { onSuccess: () => { setShowConstForm(false); setConstPid(''); setConstVal(''); setConstUnit('') } }
    )
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Left: source type + id + date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {analysis.data_source_type.replace(/_/g, ' ')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                {analysis.analysis_id}
              </span>
              <span style={{ fontSize: 10, color: 'var(--border-hi)' }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {analysis.created_at ? new Date(analysis.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          {/* Right: actions + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {open && (
              <button
                onClick={e => { e.stopPropagation(); setEditMeta(v => !v) }}
                title="Edit metadata"
                style={{
                  background: editMeta ? 'var(--accent-muted)' : 'none',
                  border: editMeta ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 4, cursor: 'pointer', padding: '2px 8px',
                  color: editMeta ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 11, fontFamily: 'inherit',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  if (!editMeta) {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.borderColor = 'var(--border-mid)'
                  }
                }}
                onMouseLeave={e => {
                  if (!editMeta) {
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }
                }}
              >
                ✎ Edit
              </button>
            )}
            <span style={{
              fontSize: 14, color: 'var(--text-muted)',
              transition: 'transform 150ms',
              transform: open ? 'rotate(90deg)' : 'none',
              display: 'inline-block',
            }}>
              ›
            </span>
          </div>
        </button>

        {/* Edit metadata form (slides in below header, inside the surface background) */}
        {open && editMeta && (
          <EditMetaForm analysis={analysis} onClose={() => setEditMeta(false)} />
        )}
      </div>

      {/* ── Expanded body ──────────────────────────────────────────────── */}
      {open && (
        <div style={{
          padding: '16px 20px', background: 'var(--bg-base)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Scalar constants */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="section-label" style={{ margin: 0 }}>
                Scalar Values ({constants.length})
              </span>
              <button
                onClick={() => setShowConstForm(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--accent)', fontFamily: 'inherit', padding: 0,
                }}
              >
                + Add
              </button>
            </div>

            {showConstForm && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  placeholder="property_id" value={constPid}
                  onChange={e => setConstPid(e.target.value)}
                  className="field" style={{ width: 160, fontSize: 12, padding: '6px 10px' }}
                />
                <input
                  placeholder="value" type="number" value={constVal}
                  onChange={e => setConstVal(e.target.value)}
                  className="field" style={{ width: 100, fontSize: 12, padding: '6px 10px' }}
                />
                <input
                  placeholder="unit (opt)" value={constUnit}
                  onChange={e => setConstUnit(e.target.value)}
                  className="field" style={{ width: 90, fontSize: 12, padding: '6px 10px' }}
                />
                <button
                  onClick={handleAddConst}
                  disabled={!constPid || !constVal}
                  className="btn btn-primary btn-sm"
                >
                  {addConst.isPending ? '…' : 'Save'}
                </button>
              </div>
            )}

            {constants.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {constants.map(c => (
                  <ConstantValueRow key={c.constant_id} c={c} analysisId={analysis.analysis_id} />
                ))}
              </div>
            )}
          </section>

          {/* Text values — always render section with inline edit/delete */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span className="section-label" style={{ margin: 0 }}>
                Text Values ({textVals.length})
              </span>
            </div>
            {textVals.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>None recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {textVals.map(t => (
                  <TextValueRow key={t.text_val_id} t={t} analysisId={analysis.analysis_id} />
                ))}
              </div>
            )}
          </section>

          {/* Composition */}
          <CompositionSection analysisId={analysis.analysis_id} />

          {/* Series charts */}
          {series.length > 0 && (
            <section>
              <span className="section-label">Series ({series.length})</span>
              {series.map(s => (
                <SeriesChart key={s.series_id} series={s} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Series chart ─────────────────────────────────────────────────────────────

function SeriesChart({ series }: {
  series: {
    series_id: string; property_id: string; dependent_unit: string | null
    points: { independent_variables: Record<string, number> | null; dependent_value: number }[]
  }
}) {
  const C = useChartColors()

  if (!series.points?.length) return null

  const indepKey = Object.keys(series.points[0]?.independent_variables ?? {})[0] ?? 'x'
  const xs = series.points.map(p => p.independent_variables?.[indepKey] ?? 0)
  const ys = series.points.map(p => p.dependent_value)

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
        {series.property_id}
      </div>
      <Plot
        data={[{
          x: xs, y: ys, type: 'scatter', mode: 'lines+markers',
          line: { color: C.accent, width: 1.5 },
          marker: { color: C.accent, size: 4 },
        }]}
        layout={{
          height: 160,
          margin: { l: 45, r: 10, t: 5, b: 35 },
          paper_bgcolor: C.bg,
          plot_bgcolor:  C.surface,
          xaxis: {
            title: { text: indepKey, font: { color: C.textMuted, size: 10 } },
            color: C.textMuted, gridcolor: C.border,
            tickfont: { color: C.textSecondary, size: 10 },
            zeroline: false,
          },
          yaxis: {
            title: { text: series.dependent_unit ?? '', font: { color: C.textMuted, size: 10 } },
            color: C.textMuted, gridcolor: C.border,
            tickfont: { color: C.textSecondary, size: 10 },
            zeroline: false,
          },
          font: { family: 'JetBrains Mono, monospace', size: 10, color: C.textSecondary },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
