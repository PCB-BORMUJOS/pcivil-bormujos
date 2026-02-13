'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

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

    const uploadFiles = async (files: FileList) => {
        console.log('Uploading files:', files)
        setIsUploading(true)

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue

            const formData = new FormData()
            formData.append('file', file)

            try {
                console.log(`Uploading ${file.name} to /api/partes/psi/${parteId}/imagenes`)
                const res = await fetch(`/api/partes/psi/${parteId}/imagenes`, {
                    method: 'POST',
                    body: formData
                })

                if (res.ok) {
                    const newImage = await res.json()
                    console.log('Upload success:', newImage)
                    onUploadComplete(newImage)
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
