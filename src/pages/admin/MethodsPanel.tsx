import { useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { useNavigate } from 'react-router-dom'
// Import DataReference alongside Method and UsageItem
import type { Method, UsageItem, DataReference } from '@/types' 

// --- Local API Hooks ---
function useAdminMethods(search = '') {
  // Tell React Query this returns an array of Methods
  return useQuery<Method[]>({
    queryKey: ['admin-methods', search],
    queryFn: async () => {
      const { data } = await client.get(`/methods${search ? `?search=${search}` : ''}`)
      return data.data || []
    }
  })
}

function useDeleteMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/methods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-methods'] })
  })
}

function useAllReferences() {
  // Tell React Query this returns an array of DataReferences
  return useQuery<DataReference[]>({
    queryKey: ['admin-references-dropdown'],
    queryFn: async () => {
      const { data } = await client.get('/references')
      return data.data || []
    }
  })
}

function MethodUsages({ methodId }: { methodId: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  // Type the usages data array
  const { data: usages = [], isLoading } = useQuery<UsageItem[]>({
    queryKey: ['method-usages', methodId],
    queryFn: async () => {
      const { data } = await client.get(`/methods/${methodId}/usages`)
      return data.data || []
    }
  })

  const { mutateAsync: unlink } = useMutation({
    mutationFn: (constantId: string) => client.delete(`/methods/usages/constants/${constantId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['method-usages', methodId] })
  })

  if (isLoading) return <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading usages...</div>
  if (usages.length === 0) return <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No substances are using this method. It is safe to delete.</div>

  return (
    <div style={{ padding: '12px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>Linked Substances ({usages.length})</h4>
      <table style={{ width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse' }}>
        <tbody>
          {/* Replaced 'any' with 'UsageItem' */}
          {usages.map((u: UsageItem) => (
            <tr key={u.constant_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 0' }}>
                <button onClick={() => navigate(`/substances/${u.substance_id}`)} className="btn-link" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', padding: 0 }}>
                  {u.substance_id}
                </button>
              </td>
              <td style={{ padding: '6px 0' }}>{u.property_name}</td>
              <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{u.value}</td>
              <td style={{ padding: '6px 0', textAlign: 'right' }}>
                <button onClick={async () => {
                  await unlink(u.constant_id!)
                  toast.success('Unlinked method from value')
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
export default function MethodsPanel() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  
  const { data: methods = [], isLoading } = useAdminMethods(search)
  const { data: allRefs = [] } = useAllReferences()
  const { mutateAsync: deleteMethod } = useDeleteMethod()

  const [modalOpen, setModalOpen] = useState(false)
  
  // Replaced 'any' with Partial<Method> and initialized with an empty object instead of null
  const [editingMethod, setEditingMethod] = useState<Partial<Method>>({})

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleOpenNew = () => {
    setEditingMethod({ method_name: '', standard_body: '', description: '', reference_id: '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingMethod.method_name) return toast.error('Method name is required')
    
    const payload = {
      ...editingMethod,
      reference_id: editingMethod.reference_id || null,
      standard_body: editingMethod.standard_body || null,
      description: editingMethod.description || null,
    }

    try {
      if (editingMethod.method_id) {
        await client.patch(`/methods/${editingMethod.method_id}`, payload) 
      } else {
        await client.post('/methods', payload)
      }
      toast.success(editingMethod.method_id ? 'Method updated' : 'Method created')
      qc.invalidateQueries({ queryKey: ['admin-methods'] })
      setModalOpen(false)
    } catch {
      // Removed unused (err) to avoid lint warnings
      toast.error('Failed to save method')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this method?')) return
    try {
      await deleteMethod(id)
      toast.success('Method deleted')
    } catch {
      // Removed unused (err) to avoid lint warnings
      toast.error('Failed to delete method')
    }
  }

  return (
    <div style={{ padding: '24px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <input 
          placeholder="Search methods..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="field" 
          style={{ width: 300, padding: '8px 12px' }} 
        />
        <button onClick={handleOpenNew} className="btn btn-primary">+ New Method</button>
      </div>

      {isLoading ? <p>Loading methods...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 8px' }}>Method Name</th>
              <th style={{ padding: '10px 8px' }}>Standard Body</th>
              <th style={{ padding: '10px 8px' }}>Reference Linked</th>
              <th style={{ padding: '10px 8px', width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Replaced 'any' with 'Method' */}
            {methods.map((m: Method) => (
              <Fragment key={m.method_id}>
                <tr style={{ borderBottom: expandedId === m.method_id ? 'none' : '1px solid var(--border)', background: expandedId === m.method_id ? 'var(--bg-muted)' : 'transparent' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{m.method_name}</td>
                  <td style={{ padding: '10px 8px' }}>{m.standard_body || '-'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {/* Replaced 'any' with 'DataReference' */}
                    {m.reference_id ? (allRefs.find((r: DataReference) => r.reference_id === m.reference_id)?.title || m.reference_id) : '-'}
                  </td>
                  <td style={{ padding: '10px 8px', display: 'flex', gap: 8 }}>
                    <button onClick={() => setExpandedId(expandedId === m.method_id ? null : m.method_id)} className="btn btn-sm btn-secondary">
                      {expandedId === m.method_id ? 'Hide Usages' : 'View Usages'}
                    </button>
                    <button onClick={() => { setEditingMethod(m); setModalOpen(true) }} className="btn btn-sm btn-secondary">Edit</button>
                    <button onClick={() => handleDelete(m.method_id)} className="btn btn-sm" style={{ color: 'var(--danger)' }}>Delete</button>
                  </td>
                </tr>
                {/* Expandable Sub-Row */}
                {expandedId === m.method_id && (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <MethodUsages methodId={m.method_id} />
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
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, zIndex: 9999, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{editingMethod.method_id ? 'Edit' : 'New'} Method</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div><div className="section-label">Method Name *</div><input value={editingMethod.method_name || ''} onChange={e => setEditingMethod({...editingMethod, method_name: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} /></div>
              <div><div className="section-label">Standard Body</div><input value={editingMethod.standard_body || ''} onChange={e => setEditingMethod({...editingMethod, standard_body: e.target.value})} className="field" style={{ width: '100%', padding: 8 }} placeholder="e.g. ASTM, ISO" /></div>
              
              <div>
                <div className="section-label">Base Reference</div>
                <select value={editingMethod.reference_id || ''} onChange={e => setEditingMethod({...editingMethod, reference_id: e.target.value})} className="field" style={{ width: '100%', padding: 8 }}>
                  <option value="">-- None --</option>
                  {/* Replaced 'any' with 'DataReference' */}
                  {allRefs.map((r: DataReference) => (
                    <option key={r.reference_id} value={r.reference_id}>{r.title || r.url || r.reference_id}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="section-label">Description</div>
                <textarea value={editingMethod.description || ''} onChange={e => setEditingMethod({...editingMethod, description: e.target.value})} className="field" style={{ width: '100%', padding: 8, height: 60 }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save Method</button>
            </div>
          </div>
        </>, document.body
      )}
    </div>
  )
}