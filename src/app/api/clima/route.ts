import { NextResponse } from 'next/server'

const AEMET_API_KEY = process.env.AEMET_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwY2l2aWxAYm9ybXVqb3MubmV0IiwianRpIjoiODI3OTk0MTItMjE1NS00MDA0LWEyOWUtZjczYzZjMTE0M2I4IiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NjcwMzYwODQsInVzZXJJZCI6IjgyNzk5NDEyLTIxNTUtNDAwNC1hMjllLWY3M2M2YzExNDNiOCIsInJvbGUiOiIifQ.AkoaqmfDjK9YI4pvzYet4xJwk3W7FL4v45Ced4eP7IQ'
const MUNICIPIO_BORMUJOS = '41017'
const AEMET_DOMINIO = 'and' // Andalucía

// Coordenadas de Bormujos para Open-Meteo
const BORMUJOS_LAT = 37.3719
const BORMUJOS_LON = -6.0722

function getIcono(codigo: number): string {
  // Códigos WMO de Open-Meteo
  if (codigo === 0) return 'sun'
  if (codigo <= 3) return 'partly-cloudy'
  if (codigo <= 48) return 'fog'
  if (codigo <= 57) return 'rain'
  if (codigo <= 67) return 'rain'
  if (codigo <= 77) return 'snow'
  if (codigo <= 82) return 'rain'
  if (codigo <= 86) return 'snow'
  if (codigo >= 95) return 'storm'
  return 'partly-cloudy'
}

function getIconoAemet(estado: string): string {
  const s = estado.toLowerCase()
  if (s.includes('lluvia') || s.includes('chubasco')) return 'rain'
  if (s.includes('tormenta')) return 'storm'
  if (s.includes('nieve')) return 'snow'
  if (s.includes('niebla') || s.includes('bruma')) return 'fog'
  if (s.includes('cubierto')) return 'overcast'
  if (s.includes('muy nuboso')) return 'cloudy'
  if (s.includes('nuboso') || s.includes('nubes') || s.includes('intervalos')) return 'partly-cloudy'
  if (s.includes('despejado') || s.includes('soleado')) return 'sun'
  return 'partly-cloudy'
}

function getDescripcionWMO(codigo: number): string {
  const descripciones: { [key: number]: string } = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nevada ligera',
    73: 'Nevada moderada',
    75: 'Nevada intensa',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo',
    99: 'Tormenta fuerte con granizo',
  }
  return descripciones[codigo] || 'Variable'
}

function getNombreDia(fecha: Date, hoy: Date): string {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const diffDias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDias === 0) return 'Hoy'
  if (diffDias === 1) return 'Mañana'
  return dias[fecha.getDay()]
}

// Función para generar alertas basadas en los datos meteorológicos
function generarAlertas(datos: any, proximosDias: any[]): any[] {
  const alertas: any[] = []
  const hoy = new Date()
  
  // Alerta por viento fuerte (>= 50 km/h)
  if (datos.viento && datos.viento.velocidad >= 50) {
    alertas.push({
      tipo: 'Vientos',
      nivel: datos.viento.velocidad >= 70 ? 'naranja' : 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      descripcion: `Riesgo por vientos de ${datos.viento.velocidad} km/h direction ${datos.viento.direccion}`
    })
  }
  
  // Alerta por lluvia (buscar en el estado del cielo de hoy y próximos días)
  const estadosLluvia = ['lluvia', 'chubasco', 'aguanieve', 'llovizna']
  const estadosTormenta = ['tormenta', 'storm']
  
  // Verificar hoy
  const estadoHoy = (datos.estadoCielo || '').toLowerCase()
  if (estadosLluvia.some(e => estadoHoy.includes(e))) {
    alertas.push({
      tipo: 'Lluvias',
      nivel: 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      descripcion: `Precipitaciones previstas en las próximas horas`
    })
  }
  if (estadosTormenta.some(e => estadoHoy.includes(e))) {
    alertas.push({
      tipo: 'Tormentas',
      nivel: 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      descripcion: `Riesgo de tormentas`
    })
  }
  
  // Verificar próximos días
  for (const dia of proximosDias) {
    const estadoDia = (dia.estado || '').toLowerCase()
    if (estadosTormenta.some(e => estadoDia.includes(e))) {
      alertas.push({
        tipo: 'Tormentas',
        nivel: 'amarillo',
        inicio: dia.fecha,
        fin: new Date(new Date(dia.fecha).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        descripcion: `Tormentas previstas para ${dia.dia}`
      })
      break // Solo agregar una alerta de tormenta
    }
    if (estadosLluvia.some(e => estadoDia.includes(e))) {
      alertas.push({
        tipo: 'Lluvias',
        nivel: 'amarillo',
        inicio: dia.fecha,
        fin: new Date(new Date(dia.fecha).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        descripcion: `Precipitaciones previstas para ${dia.dia}`
      })
      break // Solo agregar una alerta de lluvia
    }
  }
  
  // Alerta por ola de calor (temp >= 38°C) o frío extremo (temp <= 0°C)
  if (datos.tempMaxima >= 38) {
    alertas.push({
      tipo: 'Ola de calor',
      nivel: datos.tempMaxima >= 42 ? 'naranja' : 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      descripcion: `Temperaturas máximas de ${datos.tempMaxima}°C. Recomendable hidratación y evitar exposición solar.`
    })
  }
  if (datos.tempMinima <= 0) {
    alertas.push({
      tipo: 'Temperaturas extremas',
      nivel: 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      descripcion: `Temperaturas mínimas de ${datos.tempMinima}°C. Riesgo de heladas.`
    })
  }
  
  // Alerta por niebla
  if (estadoHoy.includes('niebla') || estadoHoy.includes('bruma')) {
    alertas.push({
      tipo: 'Niebla',
      nivel: 'amarillo',
      inicio: hoy.toISOString(),
      fin: new Date(hoy.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      descripcion: 'Visibilidad reducida por niebla. Conducción con precaución.'
    })
  }
  
  return alertas
}

// Función para obtener alertas de AEMET
async function fetchAemetAlertas(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  
  try {
    // Primero verificar si la API key funciona consultando el estado
    const testResponse = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${MUNICIPIO_BORMUJOS}`,
      { 
        headers: { 'api_key': AEMET_API_KEY },
        signal: controller.signal,
        cache: 'no-store'
      }
    )
    clearTimeout(timeout)
    
    // Si el test falla, no intentamos consultar alertas
    if (!testResponse.ok) {
      console.warn('AEMET API no disponible, saltando alertas')
      return []
    }
    
    // Intentar obtener alertas solo si la API funciona
    const controller2 = new AbortController()
    const timeout2 = setTimeout(() => controller2.abort(), 5000)
    
    try {
      const response = await fetch(
        `https://opendata.aemet.es/opendata/api/prediccion/aviso/dominio/geografico/${AEMET_DOMINIO}`,
        { 
          headers: { 'api_key': AEMET_API_KEY },
          signal: controller2.signal,
          cache: 'no-store'
        }
      )
      clearTimeout(timeout2)
      
      // Verificar si la respuesta es JSON válido
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('AEMET alertas: respuesta no es JSON, saltando')
        return []
      }
      
      const data = await response.json()
      if (data.estado !== 200 || !data.datos) {
        return []
      }
      
      const datosResponse = await fetch(data.datos, { signal: AbortSignal.timeout(5000) })
      const alertasData = await datosResponse.json()
      
      // Procesar alertas relevantes para protección civil
      const alertasRelevantes: any[] = []
      
      if (alertasData && alertasData.datos) {
        for (const zona of alertasData.datos) {
          if (zona.avisos && zona.avisos.length > 0) {
            for (const aviso of zona.avisos) {
              if (aviso.nivel >= 1) { // Nivel amarillo o superior
                const fenomeno = (aviso.fenomeno || '').toLowerCase()
                const esRelevante = fenomeno.includes('tormenta') ||
                  fenomeno.includes('lluv') ||
                  fenomeno.includes('viento') ||
                  fenomeno.includes('nev') ||
                  fenomeno.includes('niebla') ||
                  fenomeno.includes('granizo') ||
                  fenomeno.includes('calor') ||
                  fenomeno.includes('frio') ||
                  fenomeno.includes('temperatura')
                
                if (esRelevante) {
                  let nivel = 'amarillo'
                  if (aviso.nivel >= 3) nivel = 'naranja'
                  if (aviso.nivel >= 4) nivel = 'rojo'
                  
                  let nombreFenomeno = aviso.fenomeno || 'fenómeno meteorológico'
                  if (fenomeno.includes('storm') || fenomeno.includes('tormenta')) nombreFenomeno = 'Tormentas'
                  else if (fenomeno.includes('rain') || fenomeno.includes('lluv')) nombreFenomeno = 'Lluvias'
                  else if (fenomeno.includes('wind') || fenomeno.includes('viento')) nombreFenomeno = 'Vientos'
                  else if (fenomeno.includes('snow') || fenomeno.includes('nev')) nombreFenomeno = 'Nieve'
                  else if (fenomeno.includes('fog') || fenomeno.includes('niebla')) nombreFenomeno = 'Niebla'
                  else if (fenomeno.includes('heat') || fenomeno.includes('calor')) nombreFenomeno = 'Ola de calor'
                  else if (fenomeno.includes('cold') || fenomeno.includes('frio') || fenomeno.includes('temperature')) nombreFenomeno = 'Temperaturas extremas'
                  else if (fenomeno.includes('hail') || fenomeno.includes('granizo')) nombreFenomeno = 'Granizo'
                  
                  alertasRelevantes.push({
                    tipo: nombreFenomeno,
                    nivel,
                    inicio: aviso.inicio || new Date().toISOString(),
                    fin: aviso.fin || new Date().toISOString(),
                    descripcion: aviso.descripcion || `Riesgo de ${nombreFenomeno.toLowerCase()}`
                  })
                }
              }
            }
          }
        }
      }
      
      return alertasRelevantes
    } catch (alertasError) {
      clearTimeout(timeout2)
      console.warn('Error al obtener alertas AEMET:', alertasError)
      return []
    }
    
  } catch (error) {
    clearTimeout(timeout)
    console.warn('Error en fetchAemetAlertas:', error)
    return []
  }
}

// Función para obtener datos de AEMET
async function fetchAEMET(): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8 segundos timeout
  
  try {
    const response = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${MUNICIPIO_BORMUJOS}`,
      { 
        headers: { 'api_key': AEMET_API_KEY },
        signal: controller.signal,
        cache: 'no-store'
      }
    )
    clearTimeout(timeout)
    
    const data = await response.json()
    if (data.estado !== 200 || !data.datos) {
      throw new Error('AEMET: Estado no válido')
    }
    
    const datosResponse = await fetch(data.datos, { signal: AbortSignal.timeout(5000) })
    const prediccion = await datosResponse.json()
    
    if (!prediccion || !prediccion[0]) {
      throw new Error('AEMET: Sin datos de predicción')
    }
    
    // Obtener alertas en paralelo
    const alertasPromise = fetchAemetAlertas()
    
    const dias = prediccion[0].prediccion.dia
    const hoyFecha = new Date()
    hoyFecha.setHours(0, 0, 0, 0)
    
    const diasDesdeHoy = dias.filter((dia: any) => {
      const fechaDia = new Date(dia.fecha)
      fechaDia.setHours(0, 0, 0, 0)
      return fechaDia >= hoyFecha
    })
    
    const diasAMostrar = diasDesdeHoy.length > 0 ? diasDesdeHoy : dias
    const hoy = diasAMostrar[0]
    const horaActual = new Date().getHours()
    
    let tempActual = null
    if (hoy.temperatura.dato) {
      const tempPorHora = hoy.temperatura.dato.find((t: any) => parseInt(t.hora) === horaActual)
      if (tempPorHora) tempActual = tempPorHora.value
    }
    if (!tempActual) {
      tempActual = Math.round((hoy.temperatura.maxima + hoy.temperatura.minima) / 2)
    }
    
    let estadoCielo = 'Despejado'
    if (hoy.estadoCielo && hoy.estadoCielo.length > 0) {
      const estadoActual = hoy.estadoCielo.find((e: any) => {
        if (e.periodo) {
          const [inicio, fin] = e.periodo.split('-').map(Number)
          return horaActual >= inicio && horaActual < fin
        }
        return e.descripcion
      })
      if (estadoActual?.descripcion) estadoCielo = estadoActual.descripcion
    }
    
    let humedad = 50
    if (hoy.humedadRelativa?.dato) {
      const humedadActual = hoy.humedadRelativa.dato.find((h: any) => parseInt(h.hora) === horaActual)
      humedad = humedadActual?.value || Math.round((hoy.humedadRelativa.maxima + hoy.humedadRelativa.minima) / 2)
    }
    
    const viento = hoy.viento?.find((v: any) => v.velocidad) || { velocidad: 10, direccion: 'N' }
    
    const proximosDias = diasAMostrar.slice(0, 7).map((dia: any) => {
      const fecha = new Date(dia.fecha)
      fecha.setHours(0, 0, 0, 0)
      
      let estadoDia = 'Despejado'
      if (dia.estadoCielo && dia.estadoCielo.length > 0) {
        const estadoMediodia = dia.estadoCielo.find((e: any) => e.periodo === '12-24' || e.periodo === '12-18')
        const estadoConDesc = dia.estadoCielo.find((e: any) => e.descripcion && e.descripcion.length > 0)
        estadoDia = estadoMediodia?.descripcion || estadoConDesc?.descripcion || 'Despejado'
      }
      
      return {
        dia: getNombreDia(fecha, hoyFecha),
        fecha: dia.fecha,
        tempMax: dia.temperatura.maxima,
        tempMin: dia.temperatura.minima,
        estado: estadoDia,
        icono: getIconoAemet(estadoDia),
      }
    })
    
    // Obtener alertas de AEMET (si disponibles) y generar alertas basadas en umbrales
    const datosParaAlertas = {
      temperatura: tempActual,
      tempMaxima: hoy.temperatura.maxima,
      tempMinima: hoy.temperatura.minima,
      estadoCielo,
      viento: { velocidad: viento.velocidad || 10, direccion: viento.direccion || 'N' }
    }
    
    const [alertasAemet, alertasGeneradas] = await Promise.all([
      fetchAemetAlertas(),
      Promise.resolve(generarAlertas(datosParaAlertas, diasAMostrar.slice(0, 7).map((dia: any) => ({
        dia: getNombreDia(new Date(dia.fecha), hoyFecha),
        fecha: dia.fecha,
        estado: dia.estadoCielo?.find((e: any) => e.periodo === '12-24' || e.periodo === '12-18')?.descripcion || 'Despejado'
      }))))
    ])
    
    // Combinar alertas de AEMET con las generadas (AEMET tiene prioridad)
    const alertas = alertasAemet.length > 0 ? alertasAemet : alertasGeneradas
    
    return {
      temperatura: tempActual,
      tempMaxima: hoy.temperatura.maxima,
      tempMinima: hoy.temperatura.minima,
      estadoCielo,
      humedad,
      viento: { velocidad: viento.velocidad || 10, direccion: viento.direccion || 'N' },
      uvMax: hoy.uvMax || 5,
      municipio: prediccion[0].nombre,
      provincia: prediccion[0].provincia,
      proximosDias,
      alertas,
      fuente: 'AEMET',
    }
  } catch (error) {
    clearTimeout(timeout)
    console.error('Error AEMET:', error)
    throw error
  }
}

// Función para obtener datos de Open-Meteo (fallback)
async function fetchOpenMeteo(): Promise<any> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BORMUJOS_LAT}&longitude=${BORMUJOS_LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Madrid&forecast_days=7`
  
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json()
  
  if (!data.current || !data.daily) {
    throw new Error('Open-Meteo: Sin datos')
  }
  
  const hoyFecha = new Date()
  hoyFecha.setHours(0, 0, 0, 0)
  
  const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const direccionIndex = Math.round(data.current.wind_direction_10m / 45) % 8
  
  const proximosDias = data.daily.time.map((fecha: string, i: number) => {
    const fechaDate = new Date(fecha)
    return {
      dia: getNombreDia(fechaDate, hoyFecha),
      fecha,
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      estado: getDescripcionWMO(data.daily.weather_code[i]),
      icono: getIcono(data.daily.weather_code[i]),
    }
  })
  
  return {
    temperatura: Math.round(data.current.temperature_2m),
    tempMaxima: Math.round(data.daily.temperature_2m_max[0]),
    tempMinima: Math.round(data.daily.temperature_2m_min[0]),
    estadoCielo: getDescripcionWMO(data.current.weather_code),
    humedad: data.current.relative_humidity_2m,
    viento: {
      velocidad: Math.round(data.current.wind_speed_10m),
      direccion: direcciones[direccionIndex],
    },
    uvMax: 5,
    municipio: 'Bormujos',
    provincia: 'Sevilla',
    proximosDias,
    alertas: [],
    fuente: 'Open-Meteo',
  }
}

export async function GET() {
  try {
    // Intentar primero con AEMET
    const datosAemet = await fetchAEMET()
    console.log('✅ Datos obtenidos de AEMET')
    return NextResponse.json(datosAemet)
  } catch (errorAemet) {
    console.warn('⚠️ AEMET falló, usando Open-Meteo como fallback')
    
    try {
      // Fallback a Open-Meteo
      const datosOpenMeteo = await fetchOpenMeteo()
      console.log('✅ Datos obtenidos de Open-Meteo')
      return NextResponse.json(datosOpenMeteo)
    } catch (errorOpenMeteo) {
      console.error('❌ Ambas fuentes fallaron:', errorOpenMeteo)
      
      // Datos de emergencia
      return NextResponse.json({
        temperatura: '--',
        tempMaxima: '--',
        tempMinima: '--',
        estadoCielo: 'Sin conexión',
        humedad: '--',
        viento: { velocidad: '--', direccion: '--' },
        uvMax: '--',
        municipio: 'Bormujos',
        provincia: 'Sevilla',
        proximosDias: [],
        alertas: [],
        error: true,
        fuente: 'Sin datos',
      })
    }
  }
}
