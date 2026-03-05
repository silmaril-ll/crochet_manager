import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './YarnPage.module.css'

// 直接显示原始值
const WEIGHT_LABEL = (w) => w || ''

function compressImage(file, maxKB = 300) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxPx = 800
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        let quality = 0.82
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size > maxKB * 1024 && quality > 0.3) {
              quality -= 0.1
              tryCompress()
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            }
          }, 'image/jpeg', quality)
        }
        tryCompress()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function YarnPage({ user }) {
  const [yarns, setYarns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingYarn, setEditingYarn] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('yarn')
        .select('*')
        .order('id', { ascending: false })
      if (data) setYarns(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, user])

  async function handleSave(formData) {
    if (editingYarn) {
      const { data } = await supabase
        .from('yarn')
        .update(formData)
        .eq('id', editingYarn.id)
        .select()
        .single()
      if (data) setYarns(prev => prev.map(y => y.id === editingYarn.id ? data : y))
    } else {
      const { data } = await supabase
        .from('yarn')
        .insert(formData)
        .select()
        .single()
      if (data) setYarns(prev => [data, ...prev])
    }
    setShowForm(false)
    setEditingYarn(null)
  }

  async function handleDelete(id) {
    if (!confirm('确认删除该线材？')) return
    // Also delete thumbnail from storage if exists
    const yarn = yarns.find(y => y.id === id)
    if (yarn?.thumbnail_path) {
      await supabase.storage.from('yarn-thumbnails').remove([yarn.thumbnail_path])
    }
    await supabase.from('yarn').delete().eq('id', id)
    setYarns(prev => prev.filter(y => y.id !== id))
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.pageTitle}>线材库存</h2>
        <span className={styles.count}>{yarns.length} 款</span>
      </div>

      {yarns.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🧵</span>
          <p>还没有线材记录</p>
        </div>
      ) : (
        <div className={styles.list}>
          {yarns.map(yarn => (
            <YarnCard
              key={yarn.id}
              yarn={yarn}
              onEdit={user ? () => { setEditingYarn(yarn); setShowForm(true) } : null}
              onDelete={user ? () => handleDelete(yarn.id) : null}
            />
          ))}
        </div>
      )}

      {user && (
        <button
          className={styles.fab}
          onClick={() => { setEditingYarn(null); setShowForm(true) }}
          title="添加线材"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {showForm && (
        <YarnFormSheet
          yarn={editingYarn}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingYarn(null) }}
        />
      )}
    </div>
  )
}

function YarnCard({ yarn, onEdit, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardThumb}>
        {yarn.thumbnail_url ? (
          <img src={yarn.thumbnail_url} alt={yarn.name} className={styles.cardImg} />
        ) : (
          <div className={styles.cardPlaceholder}>🧵</div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardName}>{yarn.name}</div>
        <div className={styles.cardMeta}>
          {yarn.brand && <span>{yarn.brand}</span>}
          {yarn.weight && <span>{WEIGHT_LABEL(yarn.weight)}</span>}
          {yarn.amount && <span>{yarn.amount}</span>}
        </div>
      </div>
      <div className={styles.cardActions}>
        {onEdit && <button className={styles.actionBtn} onClick={onEdit}>编辑</button>}
        {onDelete && <button className={`${styles.actionBtn} ${styles.danger}`} onClick={onDelete}>删除</button>}
      </div>
    </div>
  )
}

function YarnFormSheet({ yarn, onSave, onClose }) {
  useEffect(() => {
    const y = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, y)
    }
  }, [])

  const [form, setForm] = useState({
    name: yarn?.name || '',
    brand: yarn?.brand || '',
    weight: yarn?.weight || '',
    amount: yarn?.amount || '',
    thumbnail_url: yarn?.thumbnail_url || '',
    thumbnail_path: yarn?.thumbnail_path || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleThumbUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file, 300)
    const path = `yarn/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('yarn-thumbnails').upload(path, compressed)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('yarn-thumbnails').getPublicUrl(path)
      set('thumbnail_url', publicUrl)
      set('thumbnail_path', path)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      weight: form.weight || null,
      amount: form.amount.trim() || null,
      thumbnail_url: form.thumbnail_url || null,
      thumbnail_path: form.thumbnail_path || null,
    })
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.sheetTitle}>{yarn ? '编辑线材' : '添加线材'}</h2>

        {/* Thumbnail */}
        <div className={styles.thumbSection} onClick={() => fileRef.current.click()}>
          {form.thumbnail_url ? (
            <img src={form.thumbnail_url} alt="" className={styles.thumbPreview} />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <span>📷</span>
              <span>{uploading ? '上传中…' : '添加图片'}</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleThumbUpload} />
        </div>

        <div className={styles.fields}>
          <Field label="线材名称 *">
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="线材名称" autoFocus />
          </Field>
          <Field label="品牌">
            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="品牌名" />
          </Field>
          <div className={styles.row}>
            <Field label="粗细">
              <input
                list="weight-suggestions"
                value={form.weight}
                onChange={e => set('weight', e.target.value)}
                placeholder="如：2股线"
              />
              <datalist id="weight-suggestions">
                <option value="2股线" />
                <option value="4股线" />
                <option value="8股线" />
                <option value="手混线" />
                <option value="蕾丝线" />
                <option value="细线" />
                <option value="中粗线" />
              </datalist>
            </Field>
            <Field label="数量/重量">
              <input value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="200g / 2卷" />
            </Field>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>取消</button>
          <button className={styles.save} onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? '保存中…' : (yarn ? '保存' : '添加')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}
