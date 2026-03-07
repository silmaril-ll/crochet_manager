import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PatternViewer from '../components/tools/PatternViewer'
import MiniCounter from '../components/tools/MiniCounter'
import CounterPanel from '../components/tools/CounterPanel'
import NotesPanel from '../components/tools/NotesPanel'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import { useToast, Toast } from '../components/ui/Toast'
import styles from './ProjectPage.module.css'

const MAX_COUNTERS = 3

const IconCounter = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3"/>
    <path d="M9 12h6M12 9v6"/>
  </svg>
)
const IconNotes = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="14 3 14 9 20 9"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
)
const IconReadingLine = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="3" y1="14" x2="21" y2="14"/>
    <line x1="3" y1="6" x2="21" y2="6" strokeOpacity="0.35"/>
    <line x1="3" y1="18" x2="21" y2="18" strokeOpacity="0.35"/>
  </svg>
)
const IconAnnotate = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="2"/>
    <path d="M12 2C7.03 2 3 6.03 3 11c0 3.1 1.53 5.83 3.88 7.5L6 22l4-2h2c4.97 0 9-4.03 9-9S16.97 2 12 2z"/>
  </svg>
)
const IconUpload = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

export default function ProjectPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  // ── Shared counter state (drives both MiniCounter + CounterPanel) ──
  const [counters, setCounters] = useState([])
  const [countersReady, setCountersReady] = useState(false)

  // ── Pattern viewer state ──
  const [activeDrawer, setActiveDrawer] = useState(null)
  const [showReadingLine, setShowReadingLine] = useState(false)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [imageCount, setImageCount] = useState(0)
  const [uploading, setUploading] = useState(false)

  const patternRef = useRef()
  const { toastMessage, showError } = useToast()

  // ── Project ──
  const loadProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects').select('*').eq('id', id).single()
    if (!error && data) {
      setProject(data)
      supabase.from('projects').update({ last_opened: new Date().toISOString() }).eq('id', id)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  // ── Counters: load + auto-init defaults ──
  const loadCounters = useCallback(async () => {
    const { data } = await supabase
      .from('counters').select('*').eq('project_id', id)
      .order('created_at', { ascending: true })

    if (data && data.length === 0) {
      const { data: created } = await supabase
        .from('counters')
        .insert([
          { project_id: id, name: '行', count: 0 },
          { project_id: id, name: '针', count: 0 },
        ])
        .select()
      setCounters(created || [])
    } else {
      setCounters(data || [])
    }
    setCountersReady(true)
  }, [id])

  useEffect(() => { loadCounters() }, [loadCounters])

  // ── Counter operations (optimistic update + DB write) ──
  async function updateCount(counterId, delta) {
    const counter = counters.find(c => c.id === counterId)
    if (!counter) return
    const newCount = Math.max(0, counter.count + delta)
    setCounters(prev => prev.map(c => c.id === counterId ? { ...c, count: newCount } : c))
    const { error } = await supabase.from('counters').update({ count: newCount }).eq('id', counterId)
    if (error) showError('保存失败，请检查网络连接')
  }

  async function resetCounter(counterId) {
    setCounters(prev => prev.map(c => c.id === counterId ? { ...c, count: 0 } : c))
    const { error } = await supabase.from('counters').update({ count: 0 }).eq('id', counterId)
    if (error) showError('保存失败，请检查网络连接')
  }

  async function addCounter(name) {
    if (counters.length >= MAX_COUNTERS) return
    const { data, error } = await supabase
      .from('counters')
      .insert({ project_id: id, name: name || `计数器 ${counters.length + 1}`, count: 0 })
      .select().single()
    if (error) { showError('添加失败，请重试'); return }
    if (data) setCounters(prev => [...prev, data])
  }

  async function deleteCounter(counterId) {
    if (!confirm('删除该计数器？')) return
    setCounters(prev => prev.filter(c => c.id !== counterId))
    const { error } = await supabase.from('counters').delete().eq('id', counterId)
    if (error) showError('删除失败，请重试')
  }

  async function renameCounter(counterId, name) {
    if (!name.trim()) return
    setCounters(prev => prev.map(c => c.id === counterId ? { ...c, name: name.trim() } : c))
    const { error } = await supabase.from('counters').update({ name: name.trim() }).eq('id', counterId)
    if (error) showError('保存失败，请重试')
  }

  // ── Project edit ──
  async function handleEdit(formData) {
    const updates = {
      name: formData.name, tags: formData.tags,
      start_date: formData.start_date || null, end_date: formData.end_date || null,
      hook_size: formData.hook_size || null, yarn_weight: formData.yarn_weight || null,
      status: formData.status,
    }
    if (formData.status === 'completed' && !project.completed) {
      updates.completed = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('projects').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    setProject(data)
    setShowEdit(false)
  }

  function toggleDrawer(name) {
    setActiveDrawer(prev => prev === name ? null : name)
  }
  function prevImg() { setActiveImg(i => Math.max(0, i - 1)) }
  function nextImg() { setActiveImg(i => Math.min(imageCount - 1, i + 1)) }

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>
  if (!project) return (
    <div className={styles.notFound}>
      <p>找不到该项目</p>
      <button onClick={() => navigate('/')}>返回首页</button>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* Compact project header */}
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

      {/* Content: MiniCounter bar + pattern viewer */}
      <div className={styles.content}>
        {countersReady && (
          <MiniCounter
            counters={counters}
            onIncrement={id => updateCount(id, 1)}
            onDecrement={id => updateCount(id, -1)}
            onReset={resetCounter}
            onRename={renameCounter}
            user={user}
          />
        )}
        <div className={styles.patternArea}>
          <PatternViewer
            ref={patternRef}
            projectId={id}
            user={user}
            showReadingLine={showReadingLine}
            annotationMode={annotationMode}
            activeImg={activeImg}
            onActiveImgChange={setActiveImg}
            onImagesLoaded={setImageCount}
            onUploadingChange={setUploading}
            onUploadError={() => showError('上传失败，请重试')}
          />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolBtn} ${activeDrawer === 'counter' ? styles.toolBtnActive : ''}`}
            onClick={() => toggleDrawer('counter')}
          >
            <span className={styles.toolBtnIcon}>{IconCounter}</span>
            <span className={styles.toolBtnLabel}>计数</span>
          </button>
          <button
            className={`${styles.toolBtn} ${activeDrawer === 'notes' ? styles.toolBtnActive : ''}`}
            onClick={() => toggleDrawer('notes')}
          >
            <span className={styles.toolBtnIcon}>{IconNotes}</span>
            <span className={styles.toolBtnLabel}>备注</span>
          </button>
          <button
            className={`${styles.toolBtn} ${showReadingLine ? styles.toolBtnActive : ''}`}
            onClick={() => setShowReadingLine(v => !v)}
          >
            <span className={styles.toolBtnIcon}>{IconReadingLine}</span>
            <span className={styles.toolBtnLabel}>阅读线</span>
          </button>
          <button
            className={`${styles.toolBtn} ${annotationMode ? styles.toolBtnActive : ''}`}
            onClick={() => setAnnotationMode(v => !v)}
          >
            <span className={styles.toolBtnIcon}>{IconAnnotate}</span>
            <span className={styles.toolBtnLabel}>注释</span>
          </button>
        </div>

        <div className={styles.navGroup}>
          {imageCount > 1 && (
            <>
              <button className={styles.navBtn} onClick={prevImg} disabled={activeImg === 0}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.5 5L7.5 10l5 5"/>
                </svg>
              </button>
              <span className={styles.navIndicator}>{activeImg + 1}/{imageCount}</span>
              <button className={styles.navBtn} onClick={nextImg} disabled={activeImg === imageCount - 1}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.5 5l5 5-5 5"/>
                </svg>
              </button>
            </>
          )}
          {user && (
            <button
              className={`${styles.uploadBtn} ${uploading ? styles.uploadBtnBusy : ''}`}
              onClick={() => patternRef.current?.triggerUpload()}
              disabled={uploading}
              title="上传图解"
            >
              {uploading ? <span className={styles.uploadSpinner} /> : IconUpload}
            </button>
          )}
        </div>
      </div>

      {annotationMode && (
        <div className={styles.annotationHint}>
          点击图解任意位置添加注释 · 再次点击「注释」退出
        </div>
      )}

      {/* Drawer backdrop */}
      <div
        className={`${styles.backdrop} ${activeDrawer ? styles.backdropVisible : ''}`}
        onClick={() => setActiveDrawer(null)}
      />

      {/* Bottom sheet drawer */}
      <div className={`${styles.drawer} ${activeDrawer ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHandle} />
        <div className={styles.drawerTitle}>
          {activeDrawer === 'counter' ? '计数器' : activeDrawer === 'notes' ? '备注' : ''}
        </div>
        <div className={styles.drawerContent}>
          <div style={{ display: activeDrawer === 'counter' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <CounterPanel
              counters={counters}
              onIncrement={id => updateCount(id, 1)}
              onDecrement={id => updateCount(id, -1)}
              onReset={resetCounter}
              onAdd={addCounter}
              onDelete={deleteCounter}
              onRename={renameCounter}
              maxCounters={MAX_COUNTERS}
              user={user}
            />
          </div>
          <div style={{ display: activeDrawer === 'notes' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <NotesPanel projectId={id} user={user} />
          </div>
        </div>
      </div>

      {showEdit && (
        <ProjectFormModal project={project} onSave={handleEdit} onClose={() => setShowEdit(false)} />
      )}

      <Toast message={toastMessage} />
    </div>
  )
}
