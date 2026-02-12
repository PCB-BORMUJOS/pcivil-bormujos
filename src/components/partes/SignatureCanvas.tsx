'use client'
import { useRef, useState, useEffect } from 'react'

interface SignatureCanvasProps {
    onSave: (dataUrl: string) => void
    initialSignature?: string
    label?: string
}

export default function SignatureCanvas({
    onSave,
    initialSignature,
    label = 'Firma'
}: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    useEffect(() => {
        if (initialSignature && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            const img = new Image()
            img.onload = () => {
                ctx?.drawImage(img, 0, 0, 400, 150)
                setHasSignature(true)
            }
            img.src = initialSignature
        }
    }, [initialSignature])

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        if ('touches' in e) {
            // Use first touch point (Apple Pencil or finger)
            const touch = e.touches[0]
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            }
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            }
        }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        setIsDrawing(true)
        setHasSignature(true)

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000'

        const { x, y } = getCoordinates(e)

        ctx.beginPath()
        ctx.moveTo(x, y)

        // Also draw a dot in case it's a tap
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(e)

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false)
            // Auto-save when user finishes drawing
            setTimeout(() => {
                save()
            }, 300)
        }
    }

    const clear = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
        onSave('') // Notify parent that signature was cleared
    }

    const save = () => {
        const canvas = canvasRef.current
        if (!canvas || !hasSignature) return

        const dataUrl = canvas.toDataURL('image/png')
        onSave(dataUrl)
    }

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
                {label}
            </label>
            <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden w-full max-w-md">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair w-full h-auto touch-none"
                    style={{ touchAction: 'none' }}
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={clear}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                >
                    Limpiar
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={!hasSignature}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                    Guardar Firma
                </button>
            </div>
            {hasSignature && (
                <p className="text-xs text-green-600 font-medium">✓ Firma capturada (Recuerde guardar)</p>
            )}
        </div>
    )
}
