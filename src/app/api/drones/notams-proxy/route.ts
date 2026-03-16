import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat') || '37.3710'
  const lon = searchParams.get('lon') || '-6.0719'
  const radius = searchParams.get('radius') || '30'

  try {
    // ENAIRE NOTAMs via ICAO NOTAM Search API (free, no key required for basic)
    const icaoUrl = `https://applications.icao.int/dataservices/api/notams?api_key=web-arrived&airports=LEZL,LEMD,LEBB&criticality=0&lastUpdated=false&format=json`
    
    let notams: any[] = []
    
    try {
      const res = await fetch(icaoUrl, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      })
      
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items || data.notams || [])
        
        notams = items.map((n: any) => ({
          id: n.id || n.notamId || `notam-${Math.random().toString(36).slice(2)}`,
          referencia: n.notamNumber || n.id || 'N/A',
          tipo: n.type || n.classification || 'AERÓDROMO',
          estado: 'activo',
          icao: n.icaoLocation || n.location || 'LEZL',
          descripcion: n.message || n.description || n.text || '',
          descripcionHtml: n.message || n.description || '',
          fechaInicio: n.startValidity || n.effectiveStart || null,
          fechaFin: n.endValidity || n.effectiveEnd || null,
          alturaMin: n.lowerLimit ? parseFloat(n.lowerLimit) : null,
          alturaMax: n.upperLimit ? parseFloat(n.upperLimit) : null,
          latitud: parseFloat(lat),
          longitud: parseFloat(lon),
          fuente: 'enaire',
          activo: true,
        }))
      }
    } catch (icaoError) {
      console.log('ICAO API no disponible, usando ENAIRE directo')
    }

    // Si ICAO falla, intentar ENAIRE directo
    if (notams.length === 0) {
      try {
        const enaire = await fetch(
          `https://notamweb.enaire.es/NOTAM/RecuperarNOTAMsVigentes?icao=LEZL`,
          { 
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000)
          }
        )
        if (enaire.ok) {
          const data = await enaire.json()
          const items = data.notams || data.data || []
          notams = items.map((n: any) => ({
            id: n.id || `enaire-${Math.random().toString(36).slice(2)}`,
            referencia: n.numero || n.id || 'N/A',
            tipo: n.tipo || 'AERÓDROMO',
            estado: 'activo',
            icao: n.icao || 'LEZL',
            descripcion: n.texto || n.mensaje || '',
            fechaInicio: n.fechaInicio || null,
            fechaFin: n.fechaFin || null,
            alturaMin: n.alturaMin || null,
            alturaMax: n.alturaMax || null,
            latitud: parseFloat(lat),
            longitud: parseFloat(lon),
            fuente: 'enaire',
            activo: true,
          }))
        }
      } catch (enaireError) {
        console.log('ENAIRE directo tampoco disponible')
      }
    }

    // Si ninguna fuente externa funciona, devolver NOTAMs de ejemplo para la zona
    if (notams.length === 0) {
      notams = [
        {
          id: 'demo-1',
          referencia: 'A0001/26',
          tipo: 'ESPACIO AÉREO',
          estado: 'activo',
          icao: 'LEZL',
          descripcion: 'ZONA DE ESPACIO AÉREO RESTRINGIDO EN TORNO AL AEROPUERTO DE SEVILLA. ALTURA MÁXIMA 500FT AGL. CONSULTAR NOTAM COMPLETO EN ENAIRE.',
          fechaInicio: new Date().toISOString(),
          fechaFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          alturaMin: 0,
          alturaMax: 500,
          latitud: 37.4180,
          longitud: -5.8931,
          fuente: 'demo',
          activo: true,
        },
        {
          id: 'demo-2',
          referencia: 'A0002/26',
          tipo: 'AERÓDROMO',
          estado: 'activo',
          icao: 'LEMD',
          descripcion: 'OPERACIONES CON RPAS PROHIBIDAS EN RADIO DE 8KM DEL AEROPUERTO SIN AUTORIZACIÓN AESA.',
          fechaInicio: new Date().toISOString(),
          fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          alturaMin: 0,
          alturaMax: 1000,
          latitud: parseFloat(lat),
          longitud: parseFloat(lon),
          fuente: 'demo',
          activo: true,
        }
      ]
    }

    return NextResponse.json({ 
      notams,
      fuente: notams[0]?.fuente || 'demo',
      total: notams.length,
      consultadoEn: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error proxy NOTAMs:', error)
    return NextResponse.json({ error: 'Error consultando NOTAMs', notams: [] }, { status: 500 })
  }
}
