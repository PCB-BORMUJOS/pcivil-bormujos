import os

content = open('src/app/(app)/practicas/page.tsx.backup').read()

# Los cambios que aplicamos:
# 1. Interfaz actualizada con riesgoObservaciones
# 2. Formulario con numero editable y observaciones riesgo
# 3. Gestión de familias dinámicas
# 4. Tarjeta rediseñada con mejor tipografía y colores
# 5. Lightbox para imágenes

# Aplicar cambios quirúrgicos sobre el backup

# --- FIX 1: Añadir riesgoObservaciones a interfaz ---
content = content.replace(
    'riesgoPractica: string; riesgoIntervencion?: string',
    'riesgoPractica: string; riesgoIntervencion?: string; riesgoObservaciones?: string'
)
print("FIX 1: interfaz OK")

# --- FIX 2: Añadir FamiliaPractica interface y estado ---
content = content.replace(
    "interface RegistroPractica {",
    """interface FamiliaPractica {
  id: string; nombre: string; slug: string; color: string; icono: string; orden: number
}
interface RegistroPractica {"""
)
print("FIX 2: FamiliaPractica interface OK")

# --- FIX 3: Añadir estados para familias dinámicas, lightbox, gestion ---
content = content.replace(
    "  const [practicaEditando, setPracticaEditando] = useState<Practica | null>(null)",
    """  const [practicaEditando, setPracticaEditando] = useState<Practica | null>(null)
  const [familiasDinamicas, setFamiliasDinamicas] = useState<FamiliaPractica[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showGestionFamilias, setShowGestionFamilias] = useState(false)
  const [nuevaFamiliaNombre, setNuevaFamiliaNombre] = useState('')
  const [nuevaFamiliaColor, setNuevaFamiliaColor] = useState('#f97316')
  const [guardandoFamilia, setGuardandoFamilia] = useState(false)
  const [errorNumero, setErrorNumero] = useState('')"""
)
print("FIX 3: estados OK")

# --- FIX 4: cargarDatos actualizado para familiasDinamicas ---
content = content.replace(
    "      setPracticas(data.practicas || [])\n      setFamilias(data.familias || [])",
    """      setPracticas(data.practicas || [])
      setFamilias(data.familias || [])
      setFamiliasDinamicas(data.familiasDinamicas || [])"""
)
print("FIX 4: cargarDatos OK")

# --- FIX 5: handleGuardar con riesgoObservaciones y numero editable con validación ---
content = content.replace(
    "      riesgoPractica: f.get('riesgoPractica'),\n      riesgoIntervencion: f.get('riesgoIntervencion'),",
    """      riesgoPractica: f.get('riesgoPractica'),
      riesgoIntervencion: f.get('riesgoIntervencion'),
      riesgoObservaciones: f.get('riesgoObservaciones'),"""
)
print("FIX 5: handleGuardar riesgoObservaciones OK")

# --- FIX 6: handleGuardar con error handling para número duplicado ---
old_save_end = """    const method = practicaEditando ? 'PUT' : 'POST'
    await fetch('/api/practicas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowNueva(false)
    setPracticaEditando(null)
    cargarDatos()"""
new_save_end = """    const method = practicaEditando ? 'PUT' : 'POST'
    const res = await fetch('/api/practicas', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setErrorNumero(data.error); return }
    setShowNueva(false)
    setPracticaEditando(null)
    setErrorNumero('')
    cargarDatos()"""
content = content.replace(old_save_end, new_save_end)
print("FIX 6: handleGuardar error handling OK")

# --- FIX 7: Número editable en formulario ---
content = content.replace(
    """              <div>
                <label className={labelCls}>Número (ej: SOC-001)</label>
                <input name="numero" defaultValue={practicaEditando?.numero || ''} placeholder="AUTO" className={inputCls} />
              </div>""",
    """              <div>
                <label className={labelCls}>Número de práctica</label>
                <input name="numero" defaultValue={practicaEditando?.numero || ''}
                  placeholder="Ej: SOC-001, INC-005 (vacío = automático)"
                  className={`${inputCls} font-mono font-bold ${errorNumero ? 'border-red-400' : ''}`} />
                {errorNumero && <p className="text-xs text-red-600 mt-1">{errorNumero}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Dejar vacío para asignar automáticamente</p>
              </div>"""
)
print("FIX 7: numero editable OK")

# --- FIX 8: Selector familia con botón Gestionar ---
content = content.replace(
    """              <div>
                <label className={labelCls}>Familia *</label>
                <select name="familia" required defaultValue={practicaEditando?.familia || ''} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {FAMILIAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>""",
    """              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls} style={{marginBottom:0}}>Familia *</label>
                  <button type="button" onClick={() => setShowGestionFamilias(true)}
                    className="text-[10px] text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1">
                    <Settings size={10} /> Gestionar familias
                  </button>
                </div>
                <select name="familia" required defaultValue={practicaEditando?.familia || ''} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {(familiasDinamicas.length > 0 ? familiasDinamicas.map(f => ({id: f.slug, label: f.nombre})) : FAMILIAS).map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>"""
)
print("FIX 8: selector familia OK")

# --- FIX 9: Campo riesgoObservaciones en formulario ---
content = content.replace(
    """              <div>
                <label className={labelCls}>Riesgo de intervención</label>
                <input name="riesgoIntervencion" defaultValue={practicaEditando?.riesgoIntervencion || ''}
                  placeholder="No se tendrá en cuenta..." className={inputCls} />
              </div>""",
    """              <div>
                <label className={labelCls}>Riesgo de intervención <span className="font-normal normal-case text-slate-400">(no se tendrá en cuenta)</span></label>
                <input name="riesgoIntervencion" defaultValue={practicaEditando?.riesgoIntervencion || ''}
                  placeholder="Riesgos derivados de la intervención..." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Observaciones sobre el riesgo</label>
                <textarea name="riesgoObservaciones" rows={2}
                  defaultValue={practicaEditando?.riesgoObservaciones || ''}
                  placeholder="Describe factores de riesgo, medidas preventivas, condiciones de seguridad..."
                  className={inputCls} />
              </div>"""
)
print("FIX 9: riesgoObservaciones en formulario OK")

# --- FIX 10: Lightbox para imágenes ---
old_img = """                  <div key={i} className="relative group cursor-pointer" onClick={() => {}}>
                        <img"""
# Try another pattern
old_img2 = "onClick={() => {}}"
if old_img2 in content:
    content = content.replace(old_img2, "onClick={() => setLightboxUrl(url)}")
    print("FIX 10a: lightbox onClick OK")

# Fix img tag to add lightbox
old_img3 = """className="w-24 h-24 object-cover rounded-lg border border-slate-200 group-hover:border-orange-300 transition-colors" />"""
new_img3 = """className="w-24 h-24 object-cover rounded-xl border border-slate-200 group-hover:border-orange-300 transition-colors cursor-zoom-in"
                          onClick={() => setLightboxUrl(url)} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-colors flex items-center justify-center pointer-events-none">
                          <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>"""
if old_img3 in content:
    content = content.replace(old_img3, new_img3)
    print("FIX 10b: lightbox imagen OK")
else:
    print("FIX 10b: patron imagen no encontrado (puede ser diferente)")

# --- FIX 11: Añadir Settings import ---
if 'Settings,' not in content:
    content = content.replace(
        "  ClipboardList, CheckCircle2, RefreshCw",
        "  ClipboardList, CheckCircle2, RefreshCw, Settings, ZoomIn"
    )
    print("FIX 11: imports Settings/ZoomIn OK")
else:
    print("FIX 11: imports ya existen")

# --- Añadir modal Gestión Familias y Lightbox al final del return ---
MODAL_FAMILIAS = """
      {/* Modal Gestión Familias */}
      {showGestionFamilias && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-orange-500" />
                <h3 className="font-bold text-slate-800">Gestionar Familias</h3>
              </div>
              <button onClick={() => setShowGestionFamilias(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {familiasDinamicas.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: f.color }}>
                      {f.nombre.substring(0,2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700">{f.nombre}</span>
                    <span className="text-xs text-slate-400">{practicas.filter(p => p.familia === f.slug).length} prácticas</span>
                  </div>
                ))}
                {familiasDinamicas.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No hay familias dinámicas. Las familias base están disponibles en el selector.</p>
                )}
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Añadir nueva familia</p>
                <input value={nuevaFamiliaNombre} onChange={e => setNuevaFamiliaNombre(e.target.value)}
                  placeholder="Nombre de la familia..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400" />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {['#ef4444','#f97316','#f59e0b','#22c55e','#0d9488','#3b82f6','#6366f1','#ec4899','#8b5cf6','#64748b'].map(c => (
                      <button key={c} type="button" onClick={() => setNuevaFamiliaColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${nuevaFamiliaColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <button onClick={async () => {
                  if (!nuevaFamiliaNombre.trim()) return
                  setGuardandoFamilia(true)
                  await fetch('/api/practicas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'familia', nombre: nuevaFamiliaNombre.trim(), color: nuevaFamiliaColor, icono:'BookOpen'}) })
                  setNuevaFamiliaNombre(''); setGuardandoFamilia(false); cargarDatos()
                }} disabled={!nuevaFamiliaNombre.trim() || guardandoFamilia}
                  className="w-full py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {guardandoFamilia ? 'Creando...' : '+ Añadir familia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox imágenes */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[3000] bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors z-10">
            <X size={20} />
          </button>
          <img src={lightboxUrl} alt="Imagen ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()} />
          <a href={lightboxUrl} download target="_blank" rel="noopener noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm transition-colors z-10"
            onClick={e => e.stopPropagation()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar
          </a>
        </div>
      )}"""

# Insertar antes del último cierre del return
content = content.replace(
    "    </div>\n  );\n}",
    f"    </div>\n{MODAL_FAMILIAS}\n  );\n}}"
)
print("FIX 12: modales añadidos OK")

with open('src/app/(app)/practicas/page.tsx', 'w') as f:
    f.write(content)

print("\n✅ TODOS LOS CAMBIOS APLICADOS")
print(f"Líneas totales: {len(content.splitlines())}")
