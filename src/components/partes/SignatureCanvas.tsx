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
    const [hasSignature, setHasSignature] = useState(false)

    // Refs for state that changes frequently or during events to avoid re-binding listeners
    const isDrawingRef = useRef(false)
    const onSaveRef = useRef(onSave)

    // Update onSaveRef when prop changes
    useEffect(() => {
        onSaveRef.current = onSave
    }, [onSave])

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

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        if ('touches' in e && (e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
            const touch = (e as TouchEvent).touches[0]
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            }
        } else if ('clientX' in e) {
            return {
                x: ((e as MouseEvent).clientX - rect.left) * scaleX,
                y: ((e as MouseEvent).clientY - rect.top) * scaleY
            }
        }
        return { x: 0, y: 0 }
    }

    // Helper to save current canvas state
    const saveCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const dataUrl = canvas.toDataURL('image/png')
        if (onSaveRef.current) {
            onSaveRef.current(dataUrl)
        }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
        // Prevent default only if cancelable to avoid scrolling
        if (e.cancelable && e.type !== 'mousedown') e.preventDefault()

        isDrawingRef.current = true
        setHasSignature(true)

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000'

        const { x, y } = getCoordinates(e as any)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const draw = (e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
        // Prevent default for scroll safety
        if (e.cancelable && e.type !== 'mousemove') e.preventDefault()

        if (!isDrawingRef.current) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { x, y } = getCoordinates(e as any)

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        if (isDrawingRef.current) {
            isDrawingRef.current = false
            // Auto-save
            setTimeout(() => {
                saveCanvas()
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
        if (onSaveRef.current) {
            onSaveRef.current('')
        }
    }

    // Native event listeners for touch (passive: false)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const handleTouchStart = (e: TouchEvent) => startDrawing(e)
        const handleTouchMove = (e: TouchEvent) => draw(e)
        const handleTouchEnd = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault()
            stopDrawing()
        }

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('touchmove', handleTouchMove)
            canvas.removeEventListener('touchend', handleTouchEnd)
        }
    }, []) // Empty dependencies = listeners bind ONCE and never detach during life of component

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
                    onClick={saveCanvas}
                    disabled={!hasSignature}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                    Guardar
                </button>
            </div>
            {hasSignature && (
                <p className="text-xs text-green-600 font-medium">✓ Firma guardada automáticamente</p>
            )}
        </div>
    )
}
