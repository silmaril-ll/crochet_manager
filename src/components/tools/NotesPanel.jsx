import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './NotesPanel.module.css'

export default function NotesPanel({ projectId, user }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function addNote() {
    if (!newContent.trim()) return
    const { data } = await supabase
      .from('notes')
      .insert({ project_id: projectId, content: newContent.trim() })
      .select()
      .single()
    if (data) {
      setNotes(prev => [data, ...prev])
      setNewContent('')
      setAdding(false)
    }
  }

  async function saveEdit(id) {
    await supabase.from('notes').update({ content: editContent }).eq('id', id)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent } : n))
    setEditingId(null)
  }

  async function deleteNote(id) {
    if (!confirm('删除该备注？')) return
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  if (loading) return <div className={styles.loading}>加载中…</div>

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {notes.length === 0 && !adding && (
          <div className={styles.empty}>
            <span>暂无备注</span>
            {user && <span className={styles.hint}>点击下方添加备注</span>}
          </div>
        )}

        {notes.map(note => (
          <div key={note.id} className={styles.note}>
            {editingId === note.id ? (
              <>
                <textarea
                  className={styles.editArea}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  autoFocus
                  rows={3}
                />
                <div className={styles.editActions}>
                  <button className={styles.saveBtn} onClick={() => saveEdit(note.id)}>保存</button>
                  <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>取消</button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.noteContent}>{note.content}</p>
                <div className={styles.noteMeta}>
                  <span>{new Date(note.created_at).toLocaleDateString('zh-CN')}</span>
                  {user && (
                    <div className={styles.noteActions}>
                      <button onClick={() => { setEditingId(note.id); setEditContent(note.content) }}>编辑</button>
                      <button onClick={() => deleteNote(note.id)}>删除</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {user && (
        <div className={styles.addSection}>
          {adding ? (
            <div className={styles.addForm}>
              <textarea
                className={styles.addArea}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="写下备注…"
                autoFocus
                rows={3}
              />
              <div className={styles.addActions}>
                <button className={styles.saveBtn} onClick={addNote} disabled={!newContent.trim()}>添加</button>
                <button className={styles.cancelBtn} onClick={() => { setAdding(false); setNewContent('') }}>取消</button>
              </div>
            </div>
          ) : (
            <button className={styles.addBtn} onClick={() => setAdding(true)}>
              + 添加备注
            </button>
          )}
        </div>
      )}
    </div>
  )
}
