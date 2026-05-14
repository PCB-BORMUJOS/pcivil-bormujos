'use client'
import { useState, useId } from 'react'
import { Upload, FileText, Eye } from 'lucide-react'

interface DocumentUploaderProps {
  label: string
  onUpload: (url: string) => void
  currentUrl?: string
  folder?: string
  apiEndpoint?: string
  extraFields?: Record<string, string>  // campos adicionales para el FormData (ej: movimientoId)
  compact?: boolean                      // modo compacto para usar dentro de tablas
}

export default function DocumentUploader({
  label, onUpload, currentUrl, folder = 'Documentos FRI',
  apiEndpoint, extraFields = {}, compact = false
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const reactId = useId()
  const inputId = `upload-${label.replace(/\s/g, '-')}-${reactId.replace(/:/g, '')}`

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo no puede superar 20 MB')
      return
    }

    setUploading(true)
    setMensaje(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', `${label}-${Date.now()}.pdf`)
      formData.append('folder', folder)
      // Campos adicionales (ej: movimientoId para nombrar correctamente en Drive)
      for (const [key, value] of Object.entries(extraFields)) {
        formData.append(key, value)
      }

      const endpoint = apiEndpoint || '/api/partes/psi/drive-upload'
      const response = await fetch(endpoint, { method: 'POST', body: formData })

      if (!response.ok) throw new Error('Error al subir')

      const data = await response.json()
      onUpload(data.webViewLink)

      if (data.reduccionPct > 0) {
        setMensaje(`Subido · comprimido ${data.reduccionPct}%`)
        setTimeout(() => setMensaje(null), 4000)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir el documento. Comprueba que es un PDF válido.')
    } finally {
      setUploading(false)
      // Limpiar el input para permitir subir el mismo fichero otra vez
      e.target.value = ''
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <input type="file" accept="application/pdf" onChange={handleFileSelect}
          disabled={uploading} className="hidden" id={inputId} />
        <label htmlFor={inputId}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
            currentUrl ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' :
            'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
          }`}
          title={currentUrl ? 'Reemplazar justificante PDF' : 'Subir justificante PDF'}>
          {uploading ? (
            <span className="animate-pulse">Subiendo...</span>
          ) : currentUrl ? (
            <><FileText size={12} />PDF</>
          ) : (
            <><Upload size={12} />PDF</>
          )}
        </label>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            className="p-1 text-blue-600 hover:text-blue-800" title="Ver justificante">
            <Eye size={14} />
          </a>
        )}
        {mensaje && <span className="text-[10px] text-green-600 font-medium">{mensaje}</span>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input type="file" accept="application/pdf" onChange={handleFileSelect}
        disabled={uploading} className="hidden" id={inputId} />
      <div className="flex items-center gap-3">
        <label htmlFor={inputId}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
            uploading ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
            'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
          }`}>
          <Upload size={14} />
          {uploading ? 'Subiendo y comprimiendo...' : currentUrl ? 'Cambiar PDF' : 'Subir PDF'}
        </label>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Eye size={14} />Ver justificante
          </a>
        )}
      </div>
      {mensaje && <p className="text-xs text-green-600 font-medium">{mensaje}</p>}
      <p className="text-xs text-slate-400">Solo PDF · máx. 20 MB · se comprime automáticamente</p>
    </div>
  )
}
