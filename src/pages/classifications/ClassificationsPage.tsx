// src/pages/classifications/ClassificationsPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useClassifications, useSubstancesByClassification,
  useAddClassification,  
  useLinkClassification, useRemoveClassificationLink, 
  useSearchByClassifications
} from '@/api/classifications'
import type { Classification, Substance } from '@/types'
import { ClassificationSchema, type ClassificationFormValues } from '@/lib/schemas'

function buildTree(items: Classification[]): Classification[] {
  const map: Record<string, Classification> = {}
  const roots: Classification[] = []
  items.forEach(i => { map[i.classification_id] = { ...i, children: [] } })
  items.forEach(i => {
    if (i.parent_id && map[i.parent_id]) {
      map[i.parent_id].children!.push(map[i.classification_id])
    } else {
      roots.push(map[i.classification_id])
    }
  })
  return roots
}

function TreeNode({
  node, depth = 0, selected, onSelect,
}: {
  node: Classification
  depth?: number
  selected: string
  onSelect: (id: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [hovered, setHovered]   = useState(false)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isSelected  = selected === node.classification_id

  return (
    <div>
      <div
        onClick={() => {
          onSelect(node.classification_id, node.name)
          if (hasChildren) setExpanded(v => !v)
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          paddingLeft: `${depth * 16 + 10}px`,
          paddingRight: 10, paddingTop: 8, paddingBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: 5, cursor: 'pointer',
          background: isSelected ? 'var(--accent-muted)' : hovered ? 'var(--bg-elevated)' : 'transparent',
          color: isSelected ? 'var(--accent)' : hovered ? 'var(--text-secondary)' : 'var(--text-muted)',
          fontSize: 13, transition: 'all 150ms',
        }}
      >
        {hasChildren ? (
          <span style={{ fontSize: 11, width: 14, textAlign: 'center', flexShrink: 0 }}>
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--border-hi)', flexShrink: 0, letterSpacing: '0.05em' }}>
          {node.role}{node.entity_type === 'model' ? ' · model' : ''}
        </span>
      </div>
      {hasChildren && expanded && node.children!.map(child => (
        <TreeNode
          key={child.classification_id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function LinkManagerPanel({ node, allClassifications }: {
  node: Classification
  allClassifications: Classification[]
}) {
  const linkMut = useLinkClassification()
  const unlinkMut = useRemoveClassificationLink()
  const [newParentId, setNewParentId] = useState('')

  const currentParent = allClassifications.find(c => c.classification_id === node.parent_id)

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Parent: {currentParent?.name ?? '— root —'}
      </span>
      {currentParent && (
        <button
          onClick={() => unlinkMut.mutate({ childId: node.classification_id, parentId: currentParent.classification_id })}
          disabled={unlinkMut.isPending}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11 }}
        >
          {unlinkMut.isPending ? 'Removing…' : 'Detach from parent'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={newParentId}
          onChange={e => setNewParentId(e.target.value)}
          className="field"
          style={{ fontSize: 12, flex: 1 }}
        >
          <option value="">Select new parent…</option>
          {allClassifications
            .filter(c => c.classification_id !== node.classification_id)
            .map(c => (
              <option key={c.classification_id} value={c.classification_id}>{c.name}</option>
            ))}
        </select>
        <button
          onClick={() => newParentId && linkMut.mutate({ childId: node.classification_id, parentId: newParentId })}
          disabled={!newParentId || linkMut.isPending}
          className="btn btn-primary btn-sm"
        >
          Link
        </button>
      </div>
    </div>
  )
}

// ── MultiClassificationSearch Component ───────────────────────────────────────────
function MultiClassificationSearch({
  classifications,
  onSearchResults,
}: {
  classifications: Classification[]
  onSearchResults: (substances: Substance[], selectedNames: string[]) => void
}) {
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const searchMut = useSearchByClassifications()

  const handleSearch = () => {
    if (selectedNames.length === 0) return
    searchMut.mutate(selectedNames, {
      onSuccess: (res) => {
        const list: Substance[] = res.data?.data ?? []
        onSearchResults(list, selectedNames)
      },
    })
  }

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Search across classifications
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Ctrl/Cmd-click to select multiple
        </span>
      </div>
      
      <select
        multiple
        value={selectedNames}
        onChange={e => setSelectedNames(Array.from(e.target.selectedOptions, o => o.value))}
        className="field"
        style={{ fontSize: 12, height: 90, width: '100%', marginTop: 8 }}
      >
        {classifications.map(c => (
          <option key={c.classification_id} value={c.name}>
            {c.name} ({c.role})
          </option>
        ))}
      </select>
      
      <button
        onClick={handleSearch}
        disabled={selectedNames.length === 0 || searchMut.isPending}
        className="btn btn-primary btn-sm"
        style={{ marginTop: 8, width: '100%' }}
      >
        {searchMut.isPending ? 'Searching…' : `Search (${selectedNames.length} selected)`}
      </button>

      {searchMut.isSuccess && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
          {searchMut.data?.data?.data?.length ?? 0} substances found
        </p>
      )}
    </div>
  )
}

export default function ClassificationsPage() {
  const navigate = useNavigate()
  const { data: classifications = [] } = useClassifications()
  const addClassif = useAddClassification()

  // Single Selection State (Tree)
  const [selected, setSelected] = useState('')
  const [selName, setSelName] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Multi-Search State
  const [multiResults, setMultiResults] = useState<Substance[] | null>(null)
  const [activeSearchTags, setActiveSearchTags] = useState<string[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClassificationFormValues>({
    resolver: zodResolver(ClassificationSchema),
    defaultValues: { name: '', role: 'category', entity_type: 'substance' },
  })

  const { data: singleSubstances = [] } = useSubstancesByClassification(selName)
  const tree = useMemo(() => buildTree(classifications), [classifications])

  // Select node from Tree -> Clears multi-search mode
  const handleSelect = (id: string, name: string) => {
    setSelected(id)
    setSelName(name)
    setMultiResults(null)
    setActiveSearchTags([])
  }

  // Receive Multi-Search results -> Clears single selection
  const handleMultiSearchResults = (results: Substance[], tags: string[]) => {
    setMultiResults(results)
    setActiveSearchTags(tags)
    setSelected('')
    setSelName('')
  }

  const handleClearMultiSearch = () => {
    setMultiResults(null)
    setActiveSearchTags([])
  }

  const handleAdd = handleSubmit((data: ClassificationFormValues) => {
    addClassif.mutate(
      {
        name: data.name,
        entity_type: data.entity_type,
        role: data.role,
        parent_id: selected || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          reset()
        },
      },
    )
  })

  // Determine which substances to display
  const isMultiSearchMode = multiResults !== null
  const displayedSubstances = isMultiSearchMode ? multiResults : singleSubstances

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left Sidebar: Tree + Multi-Search ─────────────────────────── */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-body)',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Classifications
          </span>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--accent)',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            + New
          </button>
        </div>

        {/* Add Classification Form */}
        {showForm && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {selected ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Creating under: <strong>{selName}</strong>
              </p>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Creating as a root node — select a node first to nest under it.
              </p>
            )}
            <input
              autoFocus
              placeholder="Name"
              {...register('name')}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="field"
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
            {errors.name && (
              <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors.name.message}</span>
            )}
            <select {...register('role')} className="field" style={{ fontSize: 13, padding: '7px 10px' }}>
              <option value="category">Category</option>
              <option value="tag">Tag</option>
              <option value="sub_category">Sub Category</option>
              <option value="origin">Origin</option>
            </select>
            <select {...register('entity_type')} className="field" style={{ fontSize: 13, padding: '7px 10px' }}>
              <option value="substance">Substance</option>
              <option value="model">Model</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={addClassif.isPending}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              {addClassif.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        )}

        {/* Classification Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {classifications.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 12px', textAlign: 'center' }}>
              No classifications yet.
            </p>
          )}
          {tree.map(node => (
            <TreeNode
              key={node.classification_id}
              node={node}
              selected={selected}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Docked Multi-Classification Search */}
        <MultiClassificationSearch
          classifications={classifications}
          onSearchResults={handleMultiSearchResults}
        />
      </div>

      {/* ── Right Panel: Substance Results ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header Area */}
        <div
          style={{
            padding: '20px 36px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 16,
          }}
        >
          {isMultiSearchMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 24,
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Multi-Classification Results
                </h1>
                <span className="badge badge-neutral" style={{ fontSize: 12, padding: '4px 10px' }}>
                  {displayedSubstances.length} substance{displayedSubstances.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearMultiSearch}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  ✕ Clear Search
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeSearchTags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--accent-muted)',
                      color: 'var(--accent)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : selName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
              <h1
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 26,
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {selName}
              </h1>
              {displayedSubstances.length > 0 && (
                <span className="badge badge-neutral" style={{ fontSize: 12, padding: '4px 10px' }}>
                  {displayedSubstances.length} substance{displayedSubstances.length !== 1 ? 's' : ''}
                </span>
              )}
              <LinkManagerPanel
                node={classifications.find(c => c.classification_id === selected)!}
                allClassifications={classifications}
              />
            </div>
          ) : (
            <h1 style={{ fontSize: 20, color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>
              Select a classification or perform a search
            </h1>
          )}
        </div>

        {/* Results Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px' }}>
          {(selName || isMultiSearchMode) && displayedSubstances.length === 0 && (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              No substances match the current classification criteria.
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {displayedSubstances.map(s => (
              <button
                key={s.substance_id}
                onClick={() => navigate(`/substances/${s.nom}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 7,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-mid)'
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.nom}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      marginTop: 3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.substance_id}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {s.substance_type?.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
