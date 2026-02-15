'use client'
import { useState } from 'react'

interface DocumentUploaderProps {
  label: string
  onUpload: (url: string) => void
  currentUrl?: string
  folder?: string
  apiEndpoint?: string
}

export default function DocumentUploader({ label, onUpload, currentUrl, folder = 'Documentos FRI', apiEndpoint }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar 10MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', `${label}-${Date.now()}.pdf`)
      formData.append('folder', folder || 'Documentos FRI')

      const endpoint = apiEndpoint || '/api/partes/psi/drive-upload'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Error al subir')

      const data = await response.json()
      onUpload(data.webViewLink)
      alert('✅ Documento subido a Google Drive')
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al subir el documento')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id={`upload-${label.replace(/\s/g, '-')}`}
      />
      <label
        htmlFor={`upload-${label.replace(/\s/g, '-')}`}
        className={`text-xs cursor-pointer ${uploading ? 'text-gray-400' : 'text-orange-600 hover:text-orange-700'
          }`}
      >
        {uploading ? '⏳ Subiendo...' : currentUrl ? '✅ Ver/Cambiar' : '📎 Adjuntar'}
      </label>
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-xs text-blue-600 hover:underline"
        >
          Ver en Drive
        </a>
      )}
    </div>
  )
}
