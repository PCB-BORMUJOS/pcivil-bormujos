'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'

interface ImageUploaderProps {
    parteId: string
    onUploadComplete: (newImage: any) => void
}

export function ImageUploader({ parteId, onUploadComplete }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFiles(e.dataTransfer.files)
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('File selected:', e.target.files)
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(e.target.files)
        }
    }

    const compressImage = (file: File, maxPx = 1920, quality = 0.8): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
                const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })

    const uploadFiles = async (files: FileList) => {
        setIsUploading(true)

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue

            try {
                const compressed = await compressImage(file)
                const formData = new FormData()
                formData.append('file', new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))

                const res = await fetch(`/api/partes/psi/${parteId}/imagenes`, {
                    method: 'POST',
                    body: formData
                })

                if (res.ok) {
                    onUploadComplete(await res.json())
                } else {
                    console.error('Upload failed with status:', res.status)
                }
            } catch (error) {
                console.error('Error subiendo imagen:', error)
            }
        }

        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="w-full">
            <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
        `}
            >
                <div className="flex flex-col items-center justify-center gap-2">
                    {isUploading ? (
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    ) : (
                        <Upload className="w-10 h-10 text-gray-400" />
                    )}
                    <p className="text-sm font-medium text-gray-700">
                        {isUploading ? 'Subiendo...' : 'Arrastra imágenes aquí o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP hasta 5MB</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                />
            </label>
        </div>
    )
}
