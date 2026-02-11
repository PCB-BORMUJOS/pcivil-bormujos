'use client'

import React, { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
    label: string
    onChange: (base64: string | null) => void
    initialValue?: string | null
    disabled?: boolean
}

export function SignaturePad({ label, onChange, initialValue, disabled = false }: SignaturePadProps) {
    const sigPad = useRef<SignatureCanvas>(null as unknown as SignatureCanvas)
    const [isEmpty, setIsEmpty] = useState(true)

    // Cargar valor inicial si existe
    useEffect(() => {
        if (initialValue && sigPad.current) {
            sigPad.current.fromDataURL(initialValue)
            setIsEmpty(false)
        }
    }, [initialValue])

    const handleEnd = () => {
        if (sigPad.current) {
            if (sigPad.current.isEmpty()) {
                setIsEmpty(true)
                onChange(null)
            } else {
                setIsEmpty(false)
                // Usar formato PNG con transparencia
                const data = sigPad.current.toDataURL('image/png')
                onChange(data)
            }
        }
    }

    const clear = () => {
        if (sigPad.current) {
            sigPad.current.clear()
            setIsEmpty(true)
            onChange(null)
        }
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 uppercase">{label}</span>
                {!disabled && !isEmpty && (
                    <button
                        type="button"
                        onClick={clear}
                        className="text-xs text-red-500 flex items-center gap-1 hover:text-red-700 font-medium"
                    >
                        <Eraser size={14} /> Borrar
                    </button>
                )}
            </div>
            <div className={`border rounded-lg overflow-hidden bg-white relative ${disabled ? 'bg-gray-100' : 'border-gray-300 shadow-sm'}`}>
                {disabled && <div className="absolute inset-0 z-10 bg-gray-100/50 cursor-not-allowed" />}
                <SignatureCanvas
                    ref={sigPad}
                    penColor="black"
                    canvasProps={{
                        className: 'w-full h-32 cursor-crosshair',
                        style: { width: '100%', height: '128px' }
                    }}
                    onEnd={handleEnd}
                />
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 pointer-events-none select-none">
                    Firma aquí
                </div>
            </div>
        </div>
    )
}
