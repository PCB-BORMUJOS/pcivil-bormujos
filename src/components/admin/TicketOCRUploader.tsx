'use client'
import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle } from 'lucide-react'

interface TicketOCRUploaderProps {
  onDatosExtraidos: (datos: {
    fecha?: string
    hora?: string
    estacion?: string
    litros?: number
    precioLitro?: number
    importeFinal?: number
    concepto?: string
  }) => void
  onImagenUrl?: (url: string) => void
}

export default function TicketOCRUploader({ onDatosExtraidos, onImagenUrl }: TicketOCRUploaderProps) {
  const [estado, setEstado] = useState<'idle'|'procesando'|'ok'|'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const procesar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (JPG, PNG, HEIC)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setEstado('procesando')
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/admin/ocr-ticket', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success && data.datos) {
        onDatosExtraidos(data.datos)
        setEstado('ok')
      } else {
        setEstado('error')
        alert('No se pudieron extraer datos del ticket. Rellena el formulario manualmente.')
      }
    } catch {
      setEstado('error')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) procesar(file)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) procesar(f) }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${estado === 'ok' ? 'border-green-400 bg-green-50' :
            estado === 'error' ? 'border-red-300 bg-red-50' :
            estado === 'procesando' ? 'border-orange-300 bg-orange-50' :
            'border-slate-200 hover:border-orange-300'}`}
      >
        {estado === 'procesando' ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-orange-500" />
            <p className="text-sm text-orange-600 font-medium">Analizando ticket...</p>
          </div>
        ) : estado === 'ok' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={28} className="text-green-500" />
            <p className="text-sm text-green-700 font-medium">Datos extraídos correctamente</p>
            <p className="text-xs text-slate-500">Haz clic para cambiar el ticket</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-slate-300" />
            <p className="text-sm text-slate-500">Arrastra el ticket o haz clic para seleccionar</p>
            <p className="text-xs text-slate-400">Se rellenarán los datos automáticamente</p>
          </div>
        )}
      </div>
      {preview && estado === 'ok' && (
        <img src={preview} alt="Ticket" className="w-full max-h-32 object-contain rounded border border-slate-200" />
      )}
    </div>
  )
}
