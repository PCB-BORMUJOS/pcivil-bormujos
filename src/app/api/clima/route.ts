import { NextResponse } from 'next/server'

const AEMET_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwY2l2aWxAYm9ybXVqb3MubmV0IiwianRpIjoiODI3OTk0MTItMjE1NS00MDA0LWEyOWUtZjczYzZjMTE0M2I4IiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NjcwMzYwODQsInVzZXJJZCI6IjgyNzk5NDEyLTIxNTUtNDAwNC1hMjllLWY3M2M2YzExNDNiOCIsInJvbGUiOiIifQ.AkoaqmfDjK9YI4pvzYet4xJwk3W7FL4v45Ced4eP7IQ'
const MUNICIPIO_BORMUJOS = '41017' // Código INE de Bormujos

export async function GET() {
  try {
    // Obtener URL de datos de predicción
    const response = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${MUNICIPIO_BORMUJOS}`,
      {
        headers: {
          'api_key': AEMET_API_KEY,
        },
      }
    )

    const data = await response.json()
    
    if (data.estado !== 200 || !data.datos) {
      throw new Error('Error obteniendo URL de datos')
    }

    // Obtener datos reales
    const datosResponse = await fetch(data.datos)
    const prediccion = await datosResponse.json()

    if (!prediccion || !prediccion[0]) {
      throw new Error('No hay datos de predicción')
    }

    const hoy = prediccion[0].prediccion.dia[0]
    const tempActual = hoy.temperatura.dato?.find((t: any) => t.hora)?.value || 
                       Math.round((hoy.temperatura.maxima + hoy.temperatura.minima) / 2)
    
    // Obtener estado del cielo
    const estadoCielo = hoy.estadoCielo?.find((e: any) => e.descripcion)?.descripcion || 'Despejado'
    
    // Humedad
    const humedad = hoy.humedadRelativa?.dato?.find((h: any) => h.hora)?.value || 
                    Math.round((hoy.humedadRelativa?.maxima + hoy.humedadRelativa?.minima) / 2) || 50

    // Viento
    const viento = hoy.viento?.find((v: any) => v.velocidad)
    const velocidadViento = viento?.velocidad || 10
    const direccionViento = viento?.direccion || 'N'

    // UV
    const uvMax = hoy.uvMax || 5

    const clima = {
      temperatura: tempActual || Math.round((hoy.temperatura.maxima + hoy.temperatura.minima) / 2),
      tempMaxima: hoy.temperatura.maxima,
      tempMinima: hoy.temperatura.minima,
      estadoCielo: estadoCielo,
      humedad: humedad,
      viento: {
        velocidad: velocidadViento,
        direccion: direccionViento,
      },
      uvMax: uvMax,
      municipio: prediccion[0].nombre,
      provincia: prediccion[0].provincia,
      actualizacion: new Date().toISOString(),
    }

    return NextResponse.json(clima)
  } catch (error) {
    console.error('Error fetching clima:', error)
    // Devolver datos por defecto en caso de error
    return NextResponse.json({
      temperatura: 18,
      tempMaxima: 22,
      tempMinima: 14,
      estadoCielo: 'No disponible',
      humedad: 50,
      viento: { velocidad: 10, direccion: 'N' },
      uvMax: 5,
      municipio: 'Bormujos',
      provincia: 'Sevilla',
      error: true,
    })
  }
}
