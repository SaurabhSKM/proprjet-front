import { useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import  client  from '@/api/client' // Adjust import based on your axios/fetch client
import { useToast } from '@/components/ui/Toast'
import { useNavigate } from 'react-router-dom'
import type { DataReference, UsageItem } from '@/types' 
// --- Local API Hooks (Move to @/api/references if you prefer) ---
function useAdminReferences(search = '') {
  return useQuery({
    queryKey: ['admin-references', search],
    queryFn: async () => {
      const { data } = await client.get(`/references${search ? `?search=${search}` : ''}`)
      return data.data || []
    }
  })
}

function useCreateOrUpdateReference() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<DataReference>) => {
      if (payload.reference_id) {
        return client.patch(`/references/${payload.reference_id}`, payload)
      }
      return client.post('/references', payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-references'] })
  })
}

function useDeleteReference() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/references/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-references'] })
  })
}

function ReferenceUsages({ referenceId }: { referenceId: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const { data: usages = [], isLoading } = useQuery({
    queryKey: ['reference-usages', referenceId],
    queryFn: async () => {
      const { data } = await client.get(`/references/${referenceId}/usages`)
      return data.data || []
    }
  })

  const { mutateAsync: unlink } = useMutation({
    mutationFn: (usage: UsageItem) => client.delete(`/references/${usage.kind}s/${usage.value_id}/references/${referenceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reference-usages', referenceId] })
  })

  if (isLoading) return <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading usages...</div>
  if (usages.length === 0) return <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No data is using this reference. It is safe to delete.</div>

  return (
    <div style={{ padding: '12px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>Linked Substances ({usages.length})</h4>
      <table style={{ width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse' }}>
        <tbody>
          {usages.map((u: UsageItem) => (
            <tr key={u.value_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 0' }}>
                <button onClick={() => navigate(`/substances/${u.substance_id}`)} className="btn-link" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', padding: 0 }}>
                  {u.substance_id}
                </button>
              </td>
              <td style={{ padding: '6px 0' }}>{u.property_name}</td>
              <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{u.value}</td>
              <td style={{ padding: '6px 0', textAlign: 'right' }}>
                <button onClick={async () => {
                  await unlink(u)
                  toast.success('Unlinked reference from value')
                }} className="btn btn-sm" style={{ padding: '2px 6px', fontSize: 10 }}>Unlink</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Component ---
export default function ReferencesPanel() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const { data: references = [], isLoading } = useAdminReferences(search)
  const { mutateAsync: saveRef } = useCreateOrUpdateReference()
  const { mutateAsync: deleteRef } = useDeleteReference()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRef, setEditingRef] = useState<Partial<DataReference>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleOpenNew = () => {
    setEditingRef({ 
      reference_type: 'citation', 
      title: '', 
      authors: '', 
      year: undefined, // <-- Changed from '' to undefined
      source: '', 
      url: '', 
      doi: '', 
      notes: '', 
      confidentiality: '', 
      type: '', 
      journal: '', 
      issue: '' 
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      await saveRef(editingRef)
      toast.success(editingRef.reference_id ? 'Reference updated' : 'Reference created')
      setModalOpen(false)
    } catch (err) {
      console.error('Save reference failed:', err) // <-- Linter is happy because 'err' is used!
      toast.error('Failed to save reference')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reference?')) return
    try {
      await deleteRef(id)
      toast.success('Reference deleted')
    } catch (err) {
      console.error('Delete reference failed:', err) // <-- Used here too
      toast.error('Failed to delete reference')
    }
  }

  return (
    <div style={{ padding: '24px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <input 
          placeholder="Search references..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="field" 
          style={{ width: 300, padding: '8px 12px' }} 
        />
        <button onClick={handleOpenNew} className="btn btn-primary">+ New Reference</button>
      </div>

      {isLoading ? <p>Loading references...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 8px' }}>Title / URL</th>
              <th style={{ padding: '10px 8px' }}>Type</th>
              <th style={{ padding: '10px 8px' }}>Year</th>
              <th style={{ padding: '10px 8px' }}>Journal/Source</th>
              <th style={{ padding: '10px 8px', width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {references.map((r: DataReference) => (
              <Fragment key={r.reference_id}>
                <tr style={{ borderBottom: expandedId === r.reference_id ? 'none' : '1px solid var(--border)', background: expandedId === r.reference_id ? 'var(--bg-muted)' : 'transparent' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{r.title || r.url || r.reference_id}</td>
                  <td style={{ padding: '10px 8px' }}>{r.type || r.reference_type}</td>
                  <td style={{ padding: '10px 8px' }}>{r.year}</td>
                  <td style={{ padding: '10px 8px' }}>{r.journal || r.source}</td>
                  <td style={{ padding: '10px 8px', display: 'flex', gap: 8 }}>
                    <button onClick={() => setExpandedId(expandedId === r.reference_id ? null : r.reference_id)} className="btn btn-sm btn-secondary">
                      {expandedId === r.reference_id ? 'Hide Usages' : 'View Usages'}
                    </button>
                    <button onClick={() => { setEditingRef(r); setModalOpen(true) }} className="btn btn-sm btn-secondary">Edit</button>
                    <button onClick={() => handleDelete(r.reference_id)} className="btn btn-sm" style={{ color: 'var(--danger)' }}>Delete</button>
                  </td>
                </tr>
                {/* Expandable Sub-Row */}
                {expandedId === r.reference_id && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <ReferenceUsages referenceId={r.reference_id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.1)' }} onClick={() => setModalOpen(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, zIndex: 9999, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{editingRef.reference_id ? 'Edit' : 'New'} Reference</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><div className="section-label">Title</div><input value={editingRef.title || ''} onChange={e => setEditingRef({...editingRef, title: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">URL</div><input value={editingRef.url || ''} onChange={e => setEditingRef({...editingRef, url: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">Authors</div><input value={editingRef.authors || ''} onChange={e => setEditingRef({...editingRef, authors: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div>
                <div className="section-label">Year</div>
                <input 
                    type="number" 
                    value={editingRef.year || ''} 
                    onChange={e => setEditingRef({
                    ...editingRef, 
                    year: e.target.value ? Number(e.target.value) : undefined 
                    })} 
                    className="field" 
                    style={{ width: '100%', padding: 8 }} 
                />
                </div>              
                <div><div className="section-label">Reference Type</div><input value={editingRef.reference_type || ''} onChange={e => setEditingRef({...editingRef, reference_type: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">Document Type</div><input value={editingRef.type || ''} onChange={e => setEditingRef({...editingRef, type: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} placeholder="e.g. Article, Report" /></div>
              
              <div><div className="section-label">Journal</div><input value={editingRef.journal || ''} onChange={e => setEditingRef({...editingRef, journal: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">Issue</div><input value={editingRef.issue || ''} onChange={e => setEditingRef({...editingRef, issue: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              
              <div><div className="section-label">DOI</div><input value={editingRef.doi || ''} onChange={e => setEditingRef({...editingRef, doi: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">Confidentiality</div><input value={editingRef.confidentiality || ''} onChange={e => setEditingRef({...editingRef, confidentiality: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} placeholder="e.g. Public, Internal" /></div>
            </div>
            
            <div className="section-label">Notes</div>
            <textarea value={editingRef.notes || ''} onChange={e => setEditingRef({...editingRef, notes: e.target.value})} className="field" style={{ width: '100%', padding: 8, height: 80, marginBottom: 20 }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save Reference</button>
            </div>
          </div>
        </>, document.body
      )}
    </div>
  )
}