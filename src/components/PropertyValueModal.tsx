import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMethodsForProperty, useCreateMethod } from '@/api/methods'
import { useReferencesForValue, useReferences, useCreateReference, type ValueKind } from '@/api/references'
import { useToast } from '@/components/ui/Toast'
import type { DataReference } from '@/types'

interface PropertyValueModalProps {
  kind: ValueKind
  valueId: string
  propertyId: string
  propertyName: string
  currentValue?: number | string
  currentUnit?: string | null
  currentMethodId?: string | null
  onClose: () => void
  onSaveValue?: (updates: { value?: number; reported_unit?: string; method_id?: string; change_reason?: string; reference_ids?: string[] }) => void
}

export default function PropertyValueModal({
  kind, valueId, propertyId, propertyName,
  currentValue, currentUnit, currentMethodId, onClose, onSaveValue,
}: PropertyValueModalProps) {
  const toast = useToast()
  const { data: validMethods = [] } = useMethodsForProperty(propertyId)
  const createMethod = useCreateMethod()

  const { data: linkedRefs = [] } = useReferencesForValue(kind, valueId)
  const { data: allRefs = [] } = useReferences()
  const createReference = useCreateReference()

  const [editValue, setEditValue] = useState(String(currentValue ?? ''))
  const [editUnit, setEditUnit] = useState(currentUnit ?? '')
  const [methodId, setMethodId] = useState(currentMethodId ?? '')
  const [changeReason, setChangeReason] = useState('')

  const [newMethodName, setNewMethodName] = useState('')
  const [showNewMethod, setShowNewMethod] = useState(false)
  
  const [stagedNewMethod, setStagedNewMethod] = useState<string | null>(null)

  const [refPickMode, setRefPickMode] = useState<'existing' | 'new'>('existing')
  const [pickedRefId, setPickedRefId] = useState('')
  
  // UPDATED: Added new attributes to the initial form state
  const [newRef, setNewRef] = useState({ 
    reference_type: 'citation', 
    title: '', authors: '', year: '', source: '', url: '', doi: '', notes: '',
    confidentiality: '', type: '', journal: '', issue: ''
  })

  const [localRefs, setLocalRefs] = useState<DataReference[]>([])

  useEffect(() => {
    setLocalRefs(linkedRefs)
  }, [linkedRefs])

  const handleStageMethod = () => {
    if (!newMethodName) return
    
    setStagedNewMethod(newMethodName)
    setMethodId('__STAGED_NEW__')
    
    setShowNewMethod(false)
    setNewMethodName('')
    toast.info(`Method "${newMethodName}" staged (will be created on save)`)
  }

  const handleLinkExistingRef = () => {
    if (!pickedRefId) return
    const ref = allRefs.find(r => r.reference_id === pickedRefId)
    if (ref && !localRefs.some(r => r.reference_id === ref.reference_id)) {
      setLocalRefs([...localRefs, ref])
    }
    setPickedRefId('')
  }

  const handleCreateAndStageRef = async () => {
    if (!newRef.title && !newRef.url) {
      toast.error('Provide at least a title or URL')
      return
    }

    // Explicitly define payload type to satisfy the mutation
    const payload: Omit<DataReference, 'reference_id' | 'created_at'> = {
      ...newRef,
      year: newRef.year ? Number(newRef.year) : null,
    }

    const res = await createReference.mutateAsync(payload)
    const newId = (res.data as { reference_id: string }).reference_id
    
    setLocalRefs([
      ...localRefs, 
      { 
        ...payload, // Pass the already-typed payload directly
        reference_id: newId 
      }
    ])
    
    // UPDATED: Reset state including new fields
    setNewRef({ 
      reference_type: 'citation', 
      title: '', authors: '', year: '', source: '', url: '', doi: '', notes: '',
      confidentiality: '', type: '', journal: '', issue: ''
    })
    
    toast.success('Reference created (will link on save)')
  }

  const handleUnlink = (refId: string) => {
    setLocalRefs(localRefs.filter(r => r.reference_id !== refId))
  }

  const handleSave = async () => {
    if (kind === 'constant' && !changeReason.trim()) {
      toast.error('A change reason is required to update a measured value')
      return
    }

    let finalMethodId = methodId

    if (finalMethodId === '__STAGED_NEW__' && stagedNewMethod) {
      try {
        const res = await createMethod.mutateAsync({ method_name: stagedNewMethod, property_id: propertyId })
        finalMethodId = (res.data as { method_id: string }).method_id
      } catch {
        toast.error('Failed to create the new method on the server.')
        return 
      }
    }

    onSaveValue?.({
      value: editValue !== '' ? Number(editValue) : undefined,
      reported_unit: editUnit || undefined,
      method_id: finalMethodId || undefined,
      change_reason: changeReason || undefined,
      reference_ids: localRefs.map(r => r.reference_id)
    })
  }

  const modalContent = (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={onClose} />
      <div
        onClick={e => e.stopPropagation()}
        style={{ 
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 560, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-surface)', 
          border: '1px solid var(--border)', borderRadius: 8, padding: 28, zIndex: 9999,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, fontWeight: 400, margin: 0 }}>{propertyName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>✕</button>
        </div>

        {onSaveValue && (
          <section style={{ marginBottom: 24 }}>
            <div className="section-label">Value</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={editValue} onChange={e => setEditValue(e.target.value)} type="number" className="field" style={{ flex: 1, fontSize: 13, padding: '7px 10px' }} placeholder="value" />
              <input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="field" style={{ width: 100, fontSize: 13, padding: '7px 10px' }} placeholder="unit" />
            </div>
            {kind === 'constant' && (
              <input
                value={changeReason} onChange={e => setChangeReason(e.target.value)}
                className="field" style={{ width: '100%', fontSize: 13, padding: '7px 10px', marginTop: 8 }}
                placeholder="Reason for this change (required)"
              />
            )}
          </section>
        )}

        <section style={{ marginBottom: 24 }}>
          <div className="section-label">Method</div>
          <select 
            value={methodId} 
            onChange={e => {
              setMethodId(e.target.value)
              if (e.target.value !== '__STAGED_NEW__') {
                setStagedNewMethod(null)
              }
            }} 
            className="field" 
            style={{ width: '100%', fontSize: 13, padding: '7px 10px', marginTop: 8 }}
          >
            <option value="">— none —</option>
            
            {validMethods.map(m => (
              <option key={m.method_id} value={m.method_id}>
                {m.method_name}{m.standard_body ? ` (${m.standard_body})` : ''}
              </option>
            ))}
            
            {stagedNewMethod && (
              <option value="__STAGED_NEW__">
                {stagedNewMethod} (Staged - New)
              </option>
            )}
            
          </select>
          {!showNewMethod ? (
            <button onClick={() => setShowNewMethod(true)} className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}>+ New method</button>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={newMethodName} onChange={e => setNewMethodName(e.target.value)} placeholder="Method name" className="field" style={{ flex: 1, fontSize: 12, padding: '6px 8px' }} />
              <button onClick={handleStageMethod} className="btn btn-primary btn-sm">Stage</button>
            </div>
          )}
        </section>

        <section>
          <div className="section-label">References ({localRefs.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, marginBottom: 12 }}>
            {localRefs.map(r => (
              <div key={r.reference_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 5, fontSize: 12 }}>
                <span style={{ flex: 1 }}>{r.title || r.url || r.reference_id} {r.year ? `(${r.year})` : ''}</span>
                <button
                  onClick={() => handleUnlink(r.reference_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >✕</button>
              </div>
            ))}
            {localRefs.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No references linked.</p>}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={() => setRefPickMode('existing')} className={`btn btn-sm ${refPickMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}>Existing</button>
            <button onClick={() => setRefPickMode('new')} className={`btn btn-sm ${refPickMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}>New</button>
          </div>

          {refPickMode === 'existing' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={pickedRefId} onChange={e => setPickedRefId(e.target.value)} className="field" style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}>
                <option value="">— select —</option>
                {allRefs.map(r => <option key={r.reference_id} value={r.reference_id}>{r.title || r.url || r.reference_id}</option>)}
              </select>
              <button onClick={handleLinkExistingRef} className="btn btn-primary btn-sm">Stage Link</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input placeholder="Title" value={newRef.title} onChange={e => setNewRef(p => ({ ...p, title: e.target.value }))} className="field" style={{ fontSize: 12, padding: '6px 8px' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input placeholder="Authors" value={newRef.authors} onChange={e => setNewRef(p => ({ ...p, authors: e.target.value }))} className="field" style={{ flex: 1, fontSize: 12, padding: '6px 8px' }} />
                <input placeholder="Year" value={newRef.year} onChange={e => setNewRef(p => ({ ...p, year: e.target.value }))} className="field" style={{ width: 80, fontSize: 12, padding: '6px 8px' }} />
              </div>
              <input placeholder="URL" value={newRef.url} onChange={e => setNewRef(p => ({ ...p, url: e.target.value }))} className="field" style={{ fontSize: 12, padding: '6px 8px' }} />
              <button onClick={handleCreateAndStageRef} className="btn btn-primary btn-sm">Create & Stage</button>
            </div>
          )}
        </section>

        {onSaveValue && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} className="btn btn-primary">Save changes</button>
          </div>
        )}
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}