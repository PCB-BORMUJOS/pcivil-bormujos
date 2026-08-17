'use client'

import { useEffect, useState } from 'react'
import { X, Download, ExternalLink, Loader2, FileWarning } from 'lucide-react'

/**
 * Visor de documentos a pantalla completa. Usa el visor nativo del navegador,
 * que ya trae búsqueda, zoom, selección de texto e impresión, y funciona con
 * lector de pantalla si el PDF está bien generado.
 *
 * Si el navegador no sabe mostrarlo (algunos móviles), se ofrece descarga y
 * apertura en pestaña aparte en lugar de dejar un marco en blanco.
 */
export default function VisorPdf({
    url, titulo, nombreArchivo, esImagen, alCerrar,
}: {
    url: string
    titulo: string
    nombreArchivo: string
    esImagen: boolean
    alCerrar: () => void
}) {
    const [cargando, setCargando] = useState(true)
    const [fallo, setFallo] = useState(false)

    // Cerrar con Escape, y bloquear el desplazamiento del fondo mientras está abierto.
    useEffect(() => {
        const alPulsar = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar() }
        document.addEventListener('keydown', alPulsar)
        const overflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', alPulsar)
            document.body.style.overflow = overflow
        }
    }, [alCerrar])

    // Si en 12 segundos no ha cargado, se ofrece la alternativa.
    useEffect(() => {
        if (!cargando) return
        const t = setTimeout(() => setFallo(true), 12000)
        return () => clearTimeout(t)
    }, [cargando])

    return (
        <div
            className="fixed inset-0 z-[1400] bg-slate-900/90 flex flex-col"
            role="dialog" aria-modal="true" aria-label={`Documento: ${titulo}`}
        >
            <header className="flex items-center justify-between gap-4 px-5 py-3 bg-slate-900 text-white flex-shrink-0">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate">{titulo}</h2>
                    <p className="text-[11px] text-slate-400 truncate">{nombreArchivo}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                        href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                    >
                        <ExternalLink size={13} /> Abrir aparte
                    </a>
                    <a
                        href={url} download={nombreArchivo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                    >
                        <Download size={13} /> Descargar
                    </a>
                    <button
                        onClick={alCerrar} aria-label="Cerrar documento"
                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 relative bg-slate-800">
                {cargando && !fallo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                        <Loader2 className="animate-spin" size={30} />
                        <p className="text-sm">Abriendo el documento…</p>
                    </div>
                )}

                {fallo && cargando ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                        <FileWarning size={36} className="text-amber-400" />
                        <p className="text-white font-semibold">Este navegador no puede mostrar el documento aquí</p>
                        <p className="text-slate-400 text-sm max-w-sm">
                            Suele pasar en algunos móviles. Ábrelo en una pestaña aparte o descárgalo.
                        </p>
                        <div className="flex gap-2 mt-2">
                            <a href={url} target="_blank" rel="noopener noreferrer"
                               className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                                Abrir aparte
                            </a>
                            <a href={url} download={nombreArchivo}
                               className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold">
                                Descargar
                            </a>
                        </div>
                    </div>
                ) : esImagen ? (
                    <div className="absolute inset-0 overflow-auto flex items-center justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url} alt={titulo}
                            onLoad={() => setCargando(false)}
                            onError={() => setFallo(true)}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                ) : (
                    <iframe
                        src={url}
                        title={titulo}
                        onLoad={() => setCargando(false)}
                        className="w-full h-full border-0"
                    />
                )}
            </div>
        </div>
    )
}
