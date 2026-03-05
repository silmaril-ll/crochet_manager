import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PatternViewer from '../components/tools/PatternViewer'
import CounterPanel from '../components/tools/CounterPanel'
import NotesPanel from '../components/tools/NotesPanel'
import ProjectFormModal from '../components/projects/ProjectFormModal'
import styles from './ProjectPage.module.css'

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

  const [activeDrawer, setActiveDrawer] = useState(null) // 'counter' | 'notes' | null
  const [showReadingLine, setShowReadingLine] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [imageCount, setImageCount] = useState(0)
  const [uploading, setUploading] = useState(false)

  const patternRef = useRef()

  const loadProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (!error && data) {
      setProject(data)
      supabase.from('projects').update({ last_opened: new Date().toISOString() }).eq('id', id)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  function toggleDrawer(name) {
    setActiveDrawer(prev => prev === name ? null : name)
  }

  function prevImg() { setActiveImg(i => Math.max(0, i - 1)) }
  function nextImg() { setActiveImg(i => Math.min(imageCount - 1, i + 1)) }

  async function handleEdit(formData) {
    const updates = {
      name: formData.name,
      tags: formData.tags,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
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
    if (error) throw new Error(error.message)
    setProject(data)
    setShowEdit(false)
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

      {/* Pattern viewer */}
      <div className={styles.content}>
        <PatternViewer
          ref={patternRef}
          projectId={id}
          user={user}
          showReadingLine={showReadingLine}
          activeImg={activeImg}
          onActiveImgChange={setActiveImg}
          onImagesLoaded={setImageCount}
          onUploadingChange={setUploading}
        />
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
            <CounterPanel projectId={id} user={user} />
          </div>
          <div style={{ display: activeDrawer === 'notes' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
            <NotesPanel projectId={id} user={user} />
          </div>
        </div>
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
