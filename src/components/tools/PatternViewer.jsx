import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadToCloudinary } from '../../lib/cloudinary'
import ReadingLine from './ReadingLine'
import ImageAnnotations from './ImageAnnotations'
import styles from './PatternViewer.module.css'

function compressImage(file, maxKB = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxPx = 2400
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        let quality = 0.88
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size > maxKB * 1024 && quality > 0.4) {
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

const PatternViewer = forwardRef(function PatternViewer(
  {
    projectId, user,
    showReadingLine,
    activeImg, onActiveImgChange, onImagesLoaded, onUploadingChange,
    annotationMode,
  },
  ref
) {
  const [images, setImages] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileRef.current?.click(),
  }))

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from('pattern_files')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (data) {
      const imgs = data.filter(f => f.file_type === 'image')
      const pdfList = data.filter(f => f.file_type === 'pdf')
      setImages(imgs)
      setPdfs(pdfList)
      onImagesLoaded?.(imgs.length)
    }
    setLoading(false)
  }, [projectId, onImagesLoaded])

  useEffect(() => { loadFiles() }, [loadFiles])

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    onUploadingChange?.(true)

    const isFirstImage = images.length === 0

    for (const file of files) {
      const isPdf = file.type === 'application/pdf'
      try {
        const uploadFile = isPdf ? file : await compressImage(file)
        const { secureUrl, publicId } = await uploadToCloudinary(uploadFile)

        await supabase.from('pattern_files').insert({
          project_id: projectId,
          url: secureUrl,
          storage_path: publicId,  // Cloudinary public_id (for future server-side deletion)
          file_type: isPdf ? 'pdf' : 'image',
          sort_order: Date.now(),
        })

        // Keep project thumbnail in sync with first uploaded image
        if (isFirstImage && !isPdf) {
          await supabase.from('projects')
            .update({ thumbnail_url: secureUrl })
            .eq('id', projectId)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    await loadFiles()
    onUploadingChange?.(false)
    e.target.value = ''
  }

  async function handleDelete(file) {
    // Remove from DB only; Cloudinary deletion requires server-side API secret
    await supabase.from('pattern_files').delete().eq('id', file.id)
    onActiveImgChange?.(0)
    await loadFiles()
  }

  if (loading) return <div className={styles.empty}>加载中…</div>

  const currentImg = images[activeImg] ?? images[0]

  return (
    <div className={styles.viewer}>
      {/* PDF list */}
      {pdfs.length > 0 && (
        <div className={styles.pdfList}>
          {pdfs.map(pdf => (
            <div key={pdf.id} className={styles.pdfItem}>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
                📄 {decodeURIComponent(pdf.url.split('/').pop().split('?')[0])}
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
          <div className={styles.mainImg}>
            {/* imgWrapper: position:relative anchor for all overlays */}
            <div className={styles.imgWrapper}>
              <img
                key={currentImg?.id}
                src={currentImg?.url}
                alt="图解"
                className={styles.patternImg}
              />
              {showReadingLine && <ReadingLine projectId={projectId} />}
              <ImageAnnotations
                projectId={projectId}
                pageIndex={activeImg}
                annotationMode={annotationMode}
                user={user}
              />
            </div>
            {user && currentImg && (
              <button className={styles.deleteImgBtn} onClick={() => handleDelete(currentImg)}>
                删除此图
              </button>
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <span>暂无图解</span>
            <span className={styles.emptyHint}>点击下方上传按钮添加</span>
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
})

export default PatternViewer
