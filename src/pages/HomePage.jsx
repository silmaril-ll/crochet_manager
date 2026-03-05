import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProjectGrid from '../components/projects/ProjectGrid'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import styles from './HomePage.module.css'

export default function HomePage({ user }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created')
  const [showForm, setShowForm] = useState(false)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created', { ascending: false })

    if (!error && data) {
      // Batch-load first pattern image per project for card thumbnails
      const ids = data.map(p => p.id)
      const { data: files } = await supabase
        .from('pattern_files')
        .select('project_id, url')
        .in('project_id', ids)
        .eq('file_type', 'image')
        .order('sort_order', { ascending: true })

      const thumbMap = {}
      for (const f of files || []) {
        if (!thumbMap[f.project_id]) thumbMap[f.project_id] = f.url
      }
      setProjects(data.map(p => ({
        ...p,
        thumbnail_url: thumbMap[p.id] || p.thumbnail_url || null,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const filteredProjects = projects
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh-CN')
      if (sortBy === 'opened') return (b.last_opened || b.created) > (a.last_opened || a.created) ? 1 : -1
      return b.created > a.created ? 1 : -1
    })

  async function handleCreate(formData) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: formData.name,
        tags: formData.tags,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        hook_size: formData.hook_size || null,
        yarn_weight: formData.yarn_weight || null,
        status: 'in-progress',
        created: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    setProjects(prev => [data, ...prev])
    setShowForm(false)
    navigate(`/project/${data.id}`)
  }

  async function handleDelete(id) {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8.5" cy="8.5" r="5.5"/>
            <path d="M15 15l-3-3" strokeLinecap="round"/>
          </svg>
          <input
            className={styles.search}
            placeholder="搜索项目名称或标签…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.sort}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="created">创建时间</option>
          <option value="opened">最近打开</option>
          <option value="name">名称</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>
          {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <ProjectGrid
          projects={filteredProjects}
          onOpen={id => navigate(`/project/${id}`)}
          onDelete={user ? handleDelete : null}
          emptyMessage={search ? '没有匹配的项目' : '还没有项目，点击 + 开始第一个吧'}
        />
      )}

      {user && (
        <button className={styles.fab} onClick={() => setShowForm(true)} title="新建项目">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {showForm && (
        <ProjectFormModal
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
