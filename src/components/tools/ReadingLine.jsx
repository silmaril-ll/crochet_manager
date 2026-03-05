import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './ReadingLine.module.css'

export default function ReadingLine({ projectId }) {
  const [pos, setPos] = useState(40) // percentage from top
  const [thickness, setThickness] = useState(40) // pixels
  const [dragging, setDragging] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const containerRef = useRef()
  const saveTimeout = useRef()

  useEffect(() => {
    supabase
      .from('reading_lines')
      .select('*')
      .eq('project_id', projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPos(data.y_position)
          setThickness(data.thickness)
        }
      })
  }, [projectId])

  const savePosition = useCallback((y, t) => {
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('reading_lines')
        .select('id')
        .eq('project_id', projectId)
        .single()
      if (data) {
        supabase.from('reading_lines').update({ y_position: y, thickness: t }).eq('project_id', projectId)
      } else {
        supabase.from('reading_lines').insert({ project_id: projectId, y_position: y, thickness: t })
      }
    }, 600)
  }, [projectId])

  function onPointerDown(e) {
    if (!editMode) return
    e.preventDefault()
    setDragging(true)
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragging || !editMode) return
    const rect = containerRef.current.getBoundingClientRect()
    const raw = ((e.clientY - rect.top) / rect.height) * 100
    const clamped = Math.max(5, Math.min(95, raw))
    setPos(clamped)
    savePosition(clamped, thickness)
  }

  function onPointerUp() {
    setDragging(false)
  }

  function adjustThickness(delta) {
    const next = Math.max(20, Math.min(200, thickness + delta))
    setThickness(next)
    savePosition(pos, next)
  }

  const halfPx = thickness / 2
  const posStyle = `calc(${pos}% - ${halfPx}px)`

  return (
    <div
      ref={containerRef}
      className={`${styles.overlay} ${editMode ? styles.editable : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Top mask */}
      <div className={styles.mask} style={{ top: 0, height: `calc(${pos}% - ${halfPx}px)` }} />

      {/* Reading window (transparent) */}
      <div
        className={`${styles.window} ${editMode ? styles.windowEdit : ''}`}
        style={{ top: posStyle, height: `${thickness}px` }}
      />

      {/* Bottom mask */}
      <div className={styles.mask} style={{ top: `calc(${pos}% + ${halfPx}px)`, bottom: 0 }} />

      {/* Controls */}
      <div className={styles.controls} onClick={e => e.stopPropagation()}>
        <button
          className={`${styles.btn} ${editMode ? styles.btnActive : ''}`}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? '锁定' : '调整'}
        </button>
        {editMode && (
          <>
            <button className={styles.btn} onPointerDown={e => e.stopPropagation()} onClick={() => adjustThickness(-10)}>窄</button>
            <button className={styles.btn} onPointerDown={e => e.stopPropagation()} onClick={() => adjustThickness(10)}>宽</button>
          </>
        )}
      </div>
    </div>
  )
}
