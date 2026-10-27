// src/pages/projects/ProjectsPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useProjects, useProjectAnalyses,
  useCreateProject, useUpdateProject, useDeleteProject,
} from '@/api/projects'
import type { Project } from '@/api/projects'
import { SkeletonRows, EmptyState } from '@/components/ui/primitives'
import { ProjectSchema, type ProjectFormInput, type ProjectFormValues } from '@/lib/schemas'

// ── Inline form for create / edit ─────────────────────────────────────────────
function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Partial<Project>
  onSubmit: (v: ProjectFormValues) => void
  onCancel: () => void
  isPending: boolean
}) {
  const isEdit = !!initial?.project_id
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormInput, unknown, ProjectFormValues>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      project_name: initial?.project_name ?? '',
      description:  initial?.description  ?? '',
      project_year: initial?.project_year ?? undefined,
    },
  })

  const errStyle: React.CSSProperties = { fontSize: 11, color: 'var(--danger)', marginTop: 2 }

  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-mid)',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Name *</label>
          <input
            className="field"
            {...register('project_name')}
            placeholder="Project name"
            style={{ fontSize: 13 }}
            autoFocus
          />
          {errors.project_name && <span style={errStyle}>{errors.project_name.message}</span>}
        </div>
        <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Year</label>
          <input
            className="field"
            type="number"
            {...register('project_year')}
            placeholder="2024"
            style={{ fontSize: 13 }}
          />
          {errors.project_year && <span style={errStyle}>{errors.project_year.message as string}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Description</label>
        <textarea
          className="field"
          {...register('description')}
          placeholder="Optional description…"
          rows={2}
          style={{ fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={onCancel} style={{ color: 'var(--text-muted)' }}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={handleSubmit(onSubmit)}
        >
          {isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ── Analyses panel for a selected project ─────────────────────────────────────
function ProjectAnalysesPanel({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const { data: analyses = [], isLoading } = useProjectAnalyses(projectId)

  if (isLoading) return <SkeletonRows rows={4} height={36} />

  if (analyses.length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
      No analyses linked to this project.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
      {analyses.map(a => (
        <div
          key={a.analysis_id}
          className="data-row"
          style={{ padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => navigate(`/analyses/${a.analysis_id}`)}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{
            fontSize: 13,
            color: 'var(--accent)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            flex: 1,
          }}>
            {a.substance_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.data_source_type}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>
            {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', marginLeft: 10 }}>
            {a.analysis_id.slice(0, 10)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  expanded,
  onExpand,
  onEdit,
  onDelete,
}: {
  project: Project
  expanded: boolean
  onExpand: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
          background: expanded ? 'var(--bg-elevated)' : 'transparent',
          transition: 'background 120ms',
        }}
        onClick={onExpand}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          transition: 'transform 150ms',
          transform: expanded ? 'rotate(90deg)' : 'none',
          flexShrink: 0,
        }}>▶</span>

        {/* Name + year */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.project_name}
          </div>
          {project.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description}
            </div>
          )}
        </div>

        {/* Year chip */}
        {project.project_year && (
          <span style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            color: 'var(--text-muted)',
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            borderRadius: 4,
            flexShrink: 0,
          }}>
            {project.project_year}
          </span>
        )}

        {/* Analysis count */}
        <span style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          minWidth: 60,
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {project.analysis_count} {project.analysis_count === 1 ? 'analysis' : 'analyses'}
        </span>

        {/* Actions */}
        <div
          style={{ display: 'flex', gap: 4, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="btn btn-icon btn-sm"
            title="Edit"
            onClick={onEdit}
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
          >
            ✎
          </button>
          <button
            className="btn btn-icon btn-sm"
            title="Delete"
            onClick={onDelete}
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e05252')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded analyses */}
      {expanded && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <ProjectAnalysesPanel projectId={project.project_id} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()
  const createMut = useCreateProject()
  const updateMut = useUpdateProject()
  const deleteMut = useDeleteProject()

  const [showCreate, setShowCreate]   = useState(false)
  const [editingId,  setEditingId]    = useState<string | null>(null)
  const [expandedId, setExpandedId]  = useState<string | null>(null)
  const [search,     setSearch]      = useState('')

  const filtered = projects.filter(p =>
    !search ||
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.project_year ?? '').includes(search)
  )

  function handleCreate(values: ProjectFormValues) {
    createMut.mutate(
      { project_name: values.project_name, description: values.description, project_year: values.project_year ?? undefined },
      { onSuccess: () => setShowCreate(false) },
    )
  }

  function handleUpdate(project_id: string, values: ProjectFormValues) {
    updateMut.mutate(
      { project_id, project_name: values.project_name, description: values.description, project_year: values.project_year ?? undefined },
      { onSuccess: () => setEditingId(null) },
    )
  }

  function handleDelete(project_id: string, name: string) {
    if (!confirm(`Delete project "${name}"? Its analyses will be unlinked.`)) return
    deleteMut.mutate(project_id)
    if (expandedId === project_id) setExpandedId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 32, fontWeight: 400,
            color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em',
          }}>
            Projects
          </h1>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowCreate(v => !v); setEditingId(null) }}
          >
            {showCreate ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div style={{ marginTop: 16 }}>
            <ProjectForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              isPending={createMut.isPending}
            />
          </div>
        )}

        {/* Search */}
        <div style={{ marginTop: 16 }}>
          <input
            className="field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name, description, or year…"
            style={{ width: '100%', maxWidth: 360, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 36px 36px' }}>
        {isLoading && <SkeletonRows rows={6} height={60} />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="◇"
            title="No projects"
            description="Create a project to group analyses by study or campaign."
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(project => (
            editingId === project.project_id ? (
              <div key={project.project_id} style={{ border: '1px solid var(--border-mid)', borderRadius: 8, overflow: 'hidden' }}>
                <ProjectForm
                  initial={project}
                  onSubmit={v => handleUpdate(project.project_id, v)}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMut.isPending}
                />
              </div>
            ) : (
              <ProjectCard
                key={project.project_id}
                project={project}
                expanded={expandedId === project.project_id}
                onExpand={() => setExpandedId(id => id === project.project_id ? null : project.project_id)}
                onEdit={() => { setEditingId(project.project_id); setShowCreate(false) }}
                onDelete={() => handleDelete(project.project_id, project.project_name)}
              />
            )
          ))}
        </div>
      </div>
    </div>
  )
}
