// src/pages/models/ModelsPage.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useModels, useModelIO, useCreateModel,
  useExecuteModel, useAddModelInput, useAddModelOutput,
  useDeleteModelInput, useDeleteModelOutput,
  useModelArtifacts, useUploadModelArtifact, useDeleteModelArtifact,
  useDeleteModel
} from '@/api/models'
import { useClassifications } from '@/api/classifications'
import { useToast } from '@/components/ui/Toast'
import { ModelSchema, type ModelFormValues } from '@/lib/schemas'
import { Controller } from 'react-hook-form'

const NEW_MODEL_OPTION = '__new__'
const ARTIFACT_TYPES = ['pytorch_state_dict', 'numpy_npz', 'other']

export default function ModelsPage() {
  const { data: models = [], isLoading } = useModels()
  const { data: classifications = [] } = useClassifications('model')
  const createMut = useCreateModel()
  const toast     = useToast()

  const [selected, setSelected]     = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ModelFormValues>({
    resolver: zodResolver(ModelSchema),
    defaultValues: {
      model_name: '',
      executable_command: '',
      baseline_uncertainty: null,
      uncertainty_type: null,
      classification_ids: [],
    },
  })

  const deleteMut = useDeleteModel()
  const handleDelete = (e: React.MouseEvent, modelId: string, modelName: string) => {
    e.stopPropagation() // Prevents the row from being selected when clicking delete
    if (window.confirm(`Are you sure you want to delete the model "${modelName}"?\nThis action cannot be undone.`)) {
      deleteMut.mutate(modelId, {
        onSuccess: () => {
          toast.success(`Model "${modelName}" deleted.`)
          if (selected === modelId) setSelected('') // Clear selection if the deleted model was open
        },
        onError: () => toast.error(`Failed to delete "${modelName}".`)
      })
    }
  }

  const handleCreate = handleSubmit((data: ModelFormValues) => {
    createMut.mutate(
      {
        model_name: data.model_name,
        executable_command: data.executable_command || null,
        baseline_uncertainty: data.baseline_uncertainty ?? null,
        uncertainty_type: data.uncertainty_type || null,
        classification_ids: data.classification_ids ?? [],
        // model_id intentionally omitted — backend auto-generates it
      },
      {
        onSuccess: () => {
          toast.success(`Model "${data.model_name}" created`)
          setShowCreate(false)
          reset()
        },
        onError: () => toast.error('Failed to create model'),
      },
    )
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Models</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowUpload(v => !v); setShowCreate(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'inherit', padding: 0 }}
            >
              ⬆ Upload
            </button>
            <button
              onClick={() => { setShowCreate(v => !v); setShowUpload(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'inherit', padding: 0 }}
            >
              + New
            </button>
          </div>
        </div>

        {showUpload && (
          <UploadModelPanel
            models={models}
            onDone={() => setShowUpload(false)}
          />
        )}

        {showCreate && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* model_id removed — backend auto-generates m_<uuid> */}

            <div>
              <div style={fieldLabelStyle}>Model Name</div>
              <input
                {...register('model_name')}
                placeholder="My Model"
                className="field"
                style={{ fontSize: 13, padding: '7px 10px' }}
              />
              {errors.model_name && (
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors.model_name?.message}</span>
              )}
            </div>

            <div>
              <div style={fieldLabelStyle}>Executable Command (optional)</div>
              <input
                {...register('executable_command')}
                placeholder="./run.sh"
                className="field"
                style={{ fontSize: 13, padding: '7px 10px' }}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Baseline Uncertainty (optional)</div>
              <input
                type="number"
                step="any"
                {...register('baseline_uncertainty', { valueAsNumber: true })}
                placeholder="0.05"
                className="field"
                style={{ fontSize: 13, padding: '7px 10px' }}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Uncertainty Type (optional)</div>
              <select
                {...register('uncertainty_type')}
                className="field"
                style={{ fontSize: 13, padding: '7px 10px' }}
              >
                <option value="">— none —</option>
                <option value="absolute">Absolute</option>
                <option value="relative">Relative</option>
                <option value="stddev">Std. deviation</option>
              </select>
            </div>

            <div>
              <div style={fieldLabelStyle}>Classifications</div>
              <Controller
                control={control}
                name="classification_ids"
                render={({ field }) => (
                  <select
                    multiple
                    value={field.value ?? []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (o) => o.value)
                      field.onChange(values)
                    }}
                    className="field"
                    style={{ fontSize: 13, padding: '7px 10px', minHeight: 90 }}
                  >
                    {classifications.map((c) => (
                      <option key={c.classification_id} value={c.classification_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Ctrl/Cmd-click to select multiple
              </span>
            </div>

            <button
              onClick={handleCreate}
              disabled={createMut.isPending}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              {createMut.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        )}

        {/* ── list rendering ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {isLoading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 12px' }}>Loading…</p>
          )}
          
          {models.map(m => (
            <div
              key={m.model_id}
              style={{
                display: 'flex', alignItems: 'center', marginBottom: 2,
                background: selected === m.model_id ? 'var(--accent-muted)' : 'transparent',
                borderRadius: 5,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => {
                if (selected !== m.model_id) e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onMouseLeave={e => {
                if (selected !== m.model_id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <button
                onClick={() => setSelected(m.model_id)}
                style={{
                  flex: 1, textAlign: 'left',
                  padding: '12px 14px', 
                  background: 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  color: selected === m.model_id ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                <div style={{ fontWeight: 600, color: selected === m.model_id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {m.model_name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'JetBrains Mono, ui-monospace, monospace', marginTop: 3 }}>
                  {m.model_id}
                </div>
              </button>

              <button
                onClick={(e) => handleDelete(e, m.model_id, m.model_name)}
                disabled={deleteMut.isPending}
                title="Delete Model"
                style={{
                  background: 'transparent', border: 'none', color: 'var(--danger)',
                  padding: '12px', cursor: 'pointer', opacity: 0.4, fontSize: 12,
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
              >
                ✕
              </button>
            </div>
          ))}
          
          {!isLoading && models.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 12px', textAlign: 'center' }}>
              No models yet.
            </p>
          )}
        </div>
      </div>

      {/* ── Detail ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selected
          ? <ModelDetail modelId={selected} />
          : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⬢</div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Select a model to view details</p>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

const fieldLabelStyle = {
  fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em',
  textTransform: 'uppercase' as const, marginBottom: 4,
}

// ── Upload Model panel — dropdown of existing models + "create new" ────────
function UploadModelPanel({ models, onDone }: { models: { model_id: string; model_name: string }[]; onDone: () => void }) {
  const createMut = useCreateModel()
  const uploadMut = useUploadModelArtifact()
  const toast = useToast()

  const [targetModelId, setTargetModelId] = useState(NEW_MODEL_OPTION)
  const [newModelId, setNewModelId]       = useState('')
  const [newModelName, setNewModelName]   = useState('')
  const [newModelCmd, setNewModelCmd]     = useState('')

  // Changed to empty string to show placeholder, but defaults to checking type
  const [artifactName, setArtifactName] = useState('checkpoint')
  const [artifactType, setArtifactType] = useState(ARTIFACT_TYPES[0])
  const [file, setFile]                 = useState<File | null>(null)

  const isNew = targetModelId === NEW_MODEL_OPTION
  const canSubmit = !!file && !!artifactName && !!artifactType &&
    (isNew ? !!newModelId && !!newModelName : !!targetModelId)

  const handleSubmit = async () => {
    if (!file) return
    try {
      let modelId = targetModelId

      if (isNew) {
        const res = await createMut.mutateAsync({
          model_id: newModelId,
          model_name: newModelName,
          executable_command: newModelCmd || null,
          baseline_uncertainty: null,
          uncertainty_type: null,
        })
        modelId = (res.data as { model_id?: string })?.model_id ?? newModelId
      }

      await uploadMut.mutateAsync({ modelId, artifactName, artifactType, file })
      toast.success(`Uploaded "${artifactName}" to ${modelId}`)
      onDone()
    } catch {
      toast.error(isNew ? 'Failed to create model or upload artifact' : 'Failed to upload artifact')
    }
  }

  const isPending = createMut.isPending || uploadMut.isPending

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Target model
        </div>
        <select
          value={targetModelId}
          onChange={e => setTargetModelId(e.target.value)}
          className="field"
          style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
        >
          <option value={NEW_MODEL_OPTION}>+ Create new model…</option>
          {models.map(m => (
            <option key={m.model_id} value={m.model_id}>{m.model_name} ({m.model_id})</option>
          ))}
        </select>
      </div>

      {isNew && (
        <>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              model_id
            </div>
            <input
              value={newModelId} onChange={e => setNewModelId(e.target.value)}
              placeholder="m_my_model" className="field" style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              model_name
            </div>
            <input
              value={newModelName} onChange={e => setNewModelName(e.target.value)}
              placeholder="My Model" className="field" style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              command (optional)
            </div>
            <input
              value={newModelCmd} onChange={e => setNewModelCmd(e.target.value)}
              placeholder="./run.sh" className="field" style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: '1 1 60%' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            artifact_name
          </div>
          <input
            value={artifactName} onChange={e => setArtifactName(e.target.value)}
            // 👇 Dynamic placeholder based on selected dropdown
            placeholder={artifactType === 'numpy_npz' ? 'norm_stats' : 'checkpoint'} 
            className="field" style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
          />
        </div>
        <div style={{ flex: '1 1 40%' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            artifact_type
          </div>
          <select
            value={artifactType} 
            onChange={e => {
              const newType = e.target.value;
              setArtifactType(newType);
              
              // 👇 Smart auto-fill functionality based on type selection
              if (newType === 'numpy_npz' && (!artifactName || artifactName === 'checkpoint')) {
                setArtifactName('norm_stats');
              } else if (newType !== 'numpy_npz' && (!artifactName || artifactName === 'norm_stats')) {
                setArtifactName('checkpoint');
              }
            }}
            className="field" style={{ fontSize: 13, padding: '7px 10px', width: '100%' }}
          >
            {ARTIFACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          file
        </div>
        <input
          id="artifact-file-input"
          type="file"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
        <label
          htmlFor="artifact-file-input"
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', cursor: 'pointer', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          📎 {file ? file.name : 'Choose file…'}
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="btn btn-primary btn-sm"
        style={{ width: '100%' }}
      >
        {isPending ? 'Uploading…' : 'Submit'}
      </button>
    </div>
  )
}

function ModelDetail({ modelId }: { modelId: string }) {
  const { data: io }   = useModelIO(modelId)
  const { data: artifacts = [] } = useModelArtifacts(modelId)
  const executeMut     = useExecuteModel()
  const addInputMut    = useAddModelInput()
  const addOutputMut   = useAddModelOutput()
  const delInputMut    = useDeleteModelInput()
  const delOutputMut   = useDeleteModelOutput()
  const delArtifactMut = useDeleteModelArtifact()
  const toast          = useToast()

  const [execInputs, setExecInputs] = useState<Record<string, string>>({})
  const [execResult, setExecResult] = useState<unknown>(null)
  const [newInputName, setNewInputName] = useState('')
  const [newInputUnit, setNewInputUnit] = useState('')
  const [newInputReq, setNewInputReq]   = useState(true)
  const [newOutputPid, setNewOutputPid]   = useState('')
  const [newOutputUnit, setNewOutputUnit] = useState('')

  const handleExecute = () => {
    const parsed = Object.fromEntries(
      Object.entries(execInputs).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
    )
    executeMut.mutate(
      { modelId, inputs: parsed },
      {
        onSuccess: res => { setExecResult(res.data); toast.success('Model executed') },
        onError: () => toast.error('Execution failed'),
      }
    )
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 6, fontSize: 13,
  }

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{ padding: '28px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <h2 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 26, fontWeight: 400,
          color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.01em',
        }}>
          {modelId}
        </h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {(io?.inputs.length ?? 0)} inputs · {(io?.outputs.length ?? 0)} outputs · {artifacts.length} artifacts
        </span>
      </div>

      {/* Artifacts — full width, above the I/O grid */}
      <section style={{ marginBottom: 36 }}>
        <span className="section-label">Artifacts ({artifacts.length})</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
          {artifacts.map(a => (
            <div key={a.artifact_id} style={rowStyle}>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', flex: 1 }}>
                {a.artifact_name}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.artifact_type}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatBytes(a.size_bytes)}</span>
              <button
                onClick={() => delArtifactMut.mutate({ modelId, artifactName: a.artifact_name }, {
                  onSuccess: () => toast.success('Artifact removed'),
                  onError: () => toast.error('Failed to remove artifact'),
                })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)', padding: '0 2px', transition: 'color 150ms', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >×</button>
            </div>
          ))}
          {artifacts.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No artifacts uploaded yet.</p>
          )}
        </div>
      </section>

      {/* 2-column layout: I/O config left, Execute right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

        {/* Inputs */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="section-label" style={{ margin: 0 }}>
              Inputs ({io?.inputs.length ?? 0})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {io?.inputs.map(inp => (
              <div key={inp.input_name} style={rowStyle}>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inp.input_name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{inp.input_unit ?? '—'}</span>
                {inp.is_required && (
                  <span style={{ fontSize: 10, color: 'var(--warning)' }}>req</span>
                )}
                <button
                  onClick={() => delInputMut.mutate({ modelId, inputName: inp.input_name }, {
                    onSuccess: () => toast.success('Input removed'),
                  })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)', padding: '0 2px', transition: 'color 150ms', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="input_name" value={newInputName} onChange={e => setNewInputName(e.target.value)}
              className="field" style={{ flex: '2 1 120px', fontSize: 13, padding: '7px 10px' }} />
            <input placeholder="unit" value={newInputUnit} onChange={e => setNewInputUnit(e.target.value)}
              className="field" style={{ flex: '1 1 80px', fontSize: 13, padding: '7px 10px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={newInputReq} onChange={e => setNewInputReq(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              required
            </label>
            <button
              onClick={() => addInputMut.mutate(
                { modelId, payload: { input_name: newInputName, input_unit: newInputUnit || undefined, is_required: newInputReq } },
                { onSuccess: () => { toast.success('Input added'); setNewInputName(''); setNewInputUnit('') } }
              )}
              disabled={!newInputName}
              className="btn btn-secondary btn-sm"
            >
              Add
            </button>
          </div>
        </section>

        {/* Outputs */}
        <section>
          <span className="section-label">Outputs ({io?.outputs.length ?? 0})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {io?.outputs.map(out => (
              <div key={out.property_id} style={rowStyle}>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: 'var(--success)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {out.property_id}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{out.output_unit ?? '—'}</span>
                {out.notes && <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{out.notes}</span>}
                <button
                  onClick={() => delOutputMut.mutate({ modelId, propertyId: out.property_id }, {
                    onSuccess: () => toast.success('Output removed'),
                  })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)', padding: '0 2px', transition: 'color 150ms', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="property_id" value={newOutputPid} onChange={e => setNewOutputPid(e.target.value)}
              className="field" style={{ flex: '2 1 120px', fontSize: 13, padding: '7px 10px' }} />
            <input placeholder="unit" value={newOutputUnit} onChange={e => setNewOutputUnit(e.target.value)}
              className="field" style={{ flex: '1 1 80px', fontSize: 13, padding: '7px 10px' }} />
            <button
              onClick={() => addOutputMut.mutate(
                { modelId, payload: { property_id: newOutputPid, output_unit: newOutputUnit || undefined } },
                { onSuccess: () => { toast.success('Output added'); setNewOutputPid(''); setNewOutputUnit('') } }
              )}
              disabled={!newOutputPid}
              className="btn btn-secondary btn-sm"
            >
              Add
            </button>
          </div>
        </section>
      </div>

      {/* Execute — full width below */}
      <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
        <span className="section-label">Execute Model</span>
        {io?.inputs.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>No inputs defined yet.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
          {io?.inputs.map(inp => (
            <div key={inp.input_name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, ui-monospace, monospace', flexShrink: 0 }}>
                {inp.input_name}
              </span>
              <input
                value={execInputs[inp.input_name] ?? ''}
                onChange={e => setExecInputs(prev => ({ ...prev, [inp.input_name]: e.target.value }))}
                placeholder={inp.input_unit ?? 'value'}
                className="field"
                style={{ fontSize: 13, padding: '7px 10px' }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleExecute}
          disabled={executeMut.isPending || !io?.inputs.length}
          className="btn btn-primary"
        >
          {executeMut.isPending ? 'Executing…' : '▶ Execute'}
        </button>
        {execResult != null && (
          <pre style={{
            marginTop: 20, padding: '16px 20px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontSize: 13, color: 'var(--success)',
            overflowX: 'auto', maxHeight: 240,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            lineHeight: 1.6,
          }}>
            {JSON.stringify(execResult, null, 2)}
          </pre>
        )}
      </section>
    </div>
  )
}