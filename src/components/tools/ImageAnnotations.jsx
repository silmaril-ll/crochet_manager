import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './ImageAnnotations.module.css'

const COLORS = [
  { id: 'yellow',   bg: '#FFF3B0', border: '#D4C060', label: '黄' },
  { id: 'coral',    bg: '#FFD4C4', border: '#D49080', label: '橙' },
  { id: 'mint',     bg: '#C4EDD8', border: '#70B890', label: '绿' },
  { id: 'lavender', bg: '#DDD4F0', border: '#A090C8', label: '紫' },
  { id: 'sky',      bg: '#C4DFF0', border: '#80AED0', label: '蓝' },
]

function getColor(id) {
  return COLORS.find(c => c.id === id) || COLORS[0]
}

export default function ImageAnnotations({ projectId, pageIndex, annotationMode, user }) {
  const [annotations, setAnnotations] = useState([])
  const [pending, setPending] = useState(null)      // { x, y } — click position
  const [pendingText, setPendingText] = useState('')
  const [pendingColor, setPendingColor] = useState('yellow')
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('image_annotations')
      .select('*')
      .eq('project_id', projectId)
      .eq('page_index', pageIndex)
      .order('created_at', { ascending: true })
    if (data) setAnnotations(data)
  }, [projectId, pageIndex])

  useEffect(() => { load() }, [load])

  // Close everything when annotation mode is toggled off
  useEffect(() => {
    if (!annotationMode) {
      setPending(null)
      setSelectedId(null)
    }
  }, [annotationMode])

  function handleOverlayPointer(e) {
    // Ignore taps on existing pins
    if (e.target.closest('[data-pin]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPending({ x, y })
    setSelectedId(null)
    setPendingText('')
    setPendingColor('yellow')
  }

  async function saveAnnotation() {
    if (!pendingText.trim() || !pending) return
    const color = getColor(pendingColor)
    const { data } = await supabase
      .from('image_annotations')
      .insert({
        project_id: projectId,
        page_index: pageIndex,
        x: pending.x,
        y: pending.y,
        text: pendingText.trim(),
        color: color.id,
      })
      .select()
      .single()
    if (data) setAnnotations(prev => [...prev, data])
    setPending(null)
    setPendingText('')
  }

  async function deleteAnnotation(id) {
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setSelectedId(null)
    await supabase.from('image_annotations').delete().eq('id', id)
  }

  return (
    <>
      {/* Transparent click overlay — only active in annotation mode */}
      {annotationMode && (
        <div
          className={styles.clickOverlay}
          onPointerDown={handleOverlayPointer}
        />
      )}

      {/* Annotation pins */}
      {annotations.map(a => {
        const color = getColor(a.color)
        const isSelected = selectedId === a.id
        return (
          <div
            key={a.id}
            data-pin="true"
            className={`${styles.pin} ${isSelected ? styles.pinSelected : ''}`}
            style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
            onPointerDown={e => {
              e.stopPropagation()
              setSelectedId(isSelected ? null : a.id)
              setPending(null)
            }}
          >
            <div className={styles.dot} style={{ background: color.bg, borderColor: color.border }} />
            <div
              className={styles.bubble}
              style={{ background: color.bg, borderColor: color.border }}
            >
              <span className={styles.bubbleText}>{a.text}</span>
              {isSelected && user && (
                <button
                  className={styles.deleteBtn}
                  onPointerDown={e => { e.stopPropagation(); deleteAnnotation(a.id) }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Pending position marker */}
      {pending && (
        <div
          className={styles.pendingDot}
          style={{ left: `${pending.x * 100}%`, top: `${pending.y * 100}%` }}
        />
      )}

      {/* Fixed input form — appears above the toolbar */}
      {pending && (
        <div className={styles.inputForm}>
          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button
                key={c.id}
                className={`${styles.colorChip} ${pendingColor === c.id ? styles.colorChipActive : ''}`}
                style={{ background: c.bg, borderColor: c.border }}
                onClick={() => setPendingColor(c.id)}
              />
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.textInput}
              value={pendingText}
              onChange={e => setPendingText(e.target.value)}
              placeholder="输入注释内容…"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveAnnotation() }}
            />
            <button
              className={styles.saveBtn}
              onClick={saveAnnotation}
              disabled={!pendingText.trim()}
            >保存</button>
            <button
              className={styles.cancelBtn}
              onClick={() => setPending(null)}
            >✕</button>
          </div>
        </div>
      )}
    </>
  )
}
