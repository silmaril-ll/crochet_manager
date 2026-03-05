import { useState } from 'react'
import styles from './ProjectFormModal.module.css'

export default function ProjectFormModal({ project, onSave, onClose }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    tags: (project?.tags || []).join(', '),
    start_date: project?.start_date || '',
    hook_size: project?.hook_size || '',
    yarn_weight: project?.yarn_weight || '',
    status: project?.status || 'in-progress',
  })
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.title}>{project ? '编辑项目' : '新建项目'}</h2>

        <div className={styles.fields}>
          <Field label="项目名称 *">
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="我的钩针作品"
              autoFocus
            />
          </Field>
          <Field label="标签（用逗号分隔）">
            <input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="披肩, 玩偶, 毛毯"
            />
          </Field>
          <div className={styles.row}>
            <Field label="起始日期">
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </Field>
            <Field label="钩针尺寸（mm）">
              <input value={form.hook_size} onChange={e => set('hook_size', e.target.value)} placeholder="3.5" />
            </Field>
          </div>
          <Field label="线材粗细">
            <select value={form.yarn_weight} onChange={e => set('yarn_weight', e.target.value)}>
              <option value="">选择粗细</option>
              <option value="lace">蕾丝</option>
              <option value="fingering">极细</option>
              <option value="sport">细</option>
              <option value="dk">中细</option>
              <option value="worsted">中粗</option>
              <option value="bulky">粗</option>
              <option value="super-bulky">超粗</option>
            </select>
          </Field>
          {project && (
            <Field label="状态">
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="in-progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="paused">暂停中</option>
              </select>
            </Field>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>取消</button>
          <button
            className={styles.save}
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
          >
            {saving ? '保存中…' : (project ? '保存' : '创建')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  )
}
