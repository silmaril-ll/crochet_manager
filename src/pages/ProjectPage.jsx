import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PatternViewer from '../components/tools/PatternViewer'
import CounterPanel from '../components/tools/CounterPanel'
import NotesPanel from '../components/tools/NotesPanel'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import styles from './ProjectPage.module.css'

const TOOLS = [
  { id: 'pattern', label: '图解', icon: '📄' },
  { id: 'counter', label: '计数', icon: '🔢' },
  { id: 'notes', label: '备注', icon: '📝' },
]

export default function ProjectPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTool, setActiveTool] = useState('pattern')
  const [showEdit, setShowEdit] = useState(false)

  const loadProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (!error && data) {
      setProject(data)
      // record last_opened
      supabase.from('projects').update({ last_opened: new Date().toISOString() }).eq('id', id)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  async function handleEdit(formData) {
    const updates = {
      name: formData.name,
      tags: formData.tags,
      start_date: formData.start_date || null,
      hook_size: formData.hook_size || null,
      yarn_weight: formData.yarn_weight || null,
      status: formData.status,
    }
    if (formData.status === 'completed' && !project.completed) {
      updates.completed = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) {
      setProject(data)
      setShowEdit(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className={styles.notFound}>
        <p>找不到该项目</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 5L7.5 10l5 5"/>
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{project.name}</h1>
          {project.tags?.length > 0 && (
            <div className={styles.tags}>
              {project.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          )}
        </div>
        {user && (
          <button className={styles.editBtn} onClick={() => setShowEdit(true)}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3.5l3 3L7 17H4v-3L13.5 3.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tool Tabs */}
      <div className={styles.toolTabs}>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`${styles.toolTab} ${activeTool === tool.id ? styles.active : ''}`}
            onClick={() => setActiveTool(tool.id)}
          >
            <span className={styles.toolIcon}>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool Content */}
      <div className={styles.content}>
        {activeTool === 'pattern' && (
          <PatternViewer projectId={id} user={user} />
        )}
        {activeTool === 'counter' && (
          <CounterPanel projectId={id} user={user} />
        )}
        {activeTool === 'notes' && (
          <NotesPanel projectId={id} user={user} />
        )}
      </div>

      {showEdit && (
        <ProjectFormModal
          project={project}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
