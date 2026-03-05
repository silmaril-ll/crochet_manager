import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import ReadingLine from './ReadingLine'
import styles from './PatternViewer.module.css'

function compressImage(file, maxKB = 500) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxPx = 1800
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        let quality = 0.85
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

export default function PatternViewer({ projectId, user }) {
  const [images, setImages] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [showReadingLine, setShowReadingLine] = useState(false)
  const fileRef = useRef()

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from('pattern_files')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (data) {
      setImages(data.filter(f => f.file_type === 'image'))
      setPdfs(data.filter(f => f.file_type === 'pdf'))
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { loadFiles() }, [loadFiles])

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    for (const file of files) {
      const isPdf = file.type === 'application/pdf'
      let uploadFile = file

      if (!isPdf) {
        uploadFile = await compressImage(file)
      }

      const ext = isPdf ? 'pdf' : 'jpg'
      const path = `${projectId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('patterns')
        .upload(path, uploadFile)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('patterns')
          .getPublicUrl(path)

        await supabase.from('pattern_files').insert({
          project_id: projectId,
          url: publicUrl,
          storage_path: path,
          file_type: isPdf ? 'pdf' : 'image',
          sort_order: Date.now(),
        })
      }
    }

    await loadFiles()
    setUploading(false)
    e.target.value = ''
  }

  async function handleDelete(file) {
    await supabase.storage.from('patterns').remove([file.storage_path])
    await supabase.from('pattern_files').delete().eq('id', file.id)
    await loadFiles()
    setActiveImg(0)
  }

  if (loading) return <div className={styles.empty}>加载中…</div>

  return (
    <div className={styles.viewer}>
      {/* PDF list */}
      {pdfs.length > 0 && (
        <div className={styles.pdfList}>
          {pdfs.map(pdf => (
            <div key={pdf.id} className={styles.pdfItem}>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
                📄 {pdf.url.split('/').pop()}
              </a>
              {user && (
                <button className={styles.removeBtn} onClick={() => handleDelete(pdf)}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image viewer */}
      <div className={styles.imageArea}>
        {images.length > 0 ? (
          <>
            <div className={styles.mainImg}>
              <img
                key={images[activeImg]?.id}
                src={images[activeImg]?.url}
                alt="图解"
                className={styles.patternImg}
              />
              {showReadingLine && (
                <ReadingLine projectId={projectId} />
              )}
            </div>

            {/* Controls */}
            <div className={styles.controls}>
              <button
                className={`${styles.controlBtn} ${showReadingLine ? styles.active : ''}`}
                onClick={() => setShowReadingLine(v => !v)}
                title="阅读辅助线"
              >
                阅读线
              </button>
              {user && (
                <button className={styles.controlBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
                  {uploading ? '上传中…' : '+ 上传'}
                </button>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className={styles.thumbRow}>
                {images.map((img, i) => (
                  <div key={img.id} className={styles.thumbWrap}>
                    <img
                      src={img.url}
                      alt=""
                      className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                      onClick={() => setActiveImg(i)}
                    />
                    {user && (
                      <button className={styles.thumbDelete} onClick={() => handleDelete(img)}>×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <span>暂无图解</span>
            {user && (
              <button className={styles.uploadBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? '上传中…' : '上传图解或 PDF'}
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className={styles.fileInput}
        onChange={handleUpload}
      />
    </div>
  )
}
