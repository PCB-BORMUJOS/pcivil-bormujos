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

    const isDrawingRef = useRef(false)
    const onSaveRef = useRef(onSave)

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

    const saveCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        onSaveRef.current(canvas.toDataURL('image/png'))
    }

    const clear = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
        onSaveRef.current('')
    }

    // PointerEvent API — covers mouse, touch, and Apple Pencil in one flow
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const getPos = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            }
        }

        const handlePointerDown = (e: PointerEvent) => {
            e.preventDefault()
            canvas.setPointerCapture(e.pointerId)
            isDrawingRef.current = true
            setHasSignature(true)

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.lineWidth = e.pointerType === 'pen' ? Math.max(1, e.pressure * 3) : 2
            ctx.lineCap = 'round'
            ctx.strokeStyle = '#000'

            const { x, y } = getPos(e)
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x, y)
            ctx.stroke()
        }

        const handlePointerMove = (e: PointerEvent) => {
            e.preventDefault()
            if (!isDrawingRef.current) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            if (e.pointerType === 'pen' && e.pressure > 0) {
                ctx.lineWidth = Math.max(1, e.pressure * 3)
            }

            const { x, y } = getPos(e)
            ctx.lineTo(x, y)
            ctx.stroke()
        }

        const handlePointerUp = () => {
            if (isDrawingRef.current) {
                isDrawingRef.current = false
                setTimeout(() => saveCanvas(), 300)
            }
        }

        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false })
        canvas.addEventListener('pointermove', handlePointerMove, { passive: false })
        canvas.addEventListener('pointerup', handlePointerUp)
        canvas.addEventListener('pointercancel', handlePointerUp)

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown)
            canvas.removeEventListener('pointermove', handlePointerMove)
            canvas.removeEventListener('pointerup', handlePointerUp)
            canvas.removeEventListener('pointercancel', handlePointerUp)
        }
    }, [])

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
