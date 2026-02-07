'use client'

import React, { useMemo, useState } from 'react'
import styles from './psi.module.css'

type TimeKey = 'llamada' | 'salida' | 'llegada' | 'terminado' | 'disponible'

type FormState = {
  fecha: string
  hora: string
  numeroInforme: string

  lugar: string
  motivo: string
  alertante: string

  // Pautas de tiempo
  tiempos: Record<TimeKey, string>

  // Tabla vehículos/equipo/walkies (dos bloques)
  // Cada fila: { vehiculo, equipo, walkie }
  tabla1: Array<{ vehiculo: string; equipo: string; walkie: string }>
  tabla2: Array<{ equipo: string; walkie: string }>

  // Tipología
  prevencion: Record<'mantenimiento' | 'practicas' | 'suministros' | 'preventivo' | 'otros', boolean>
  intervencion: Record<'svb' | 'incendios' | 'inundaciones' | 'otros_riesgos_meteo' | 'activacion_pem_bor' | 'otros', boolean>
  otros: Record<'reunion_coordinacion' | 'reunion_areas' | 'limpieza' | 'formacion' | 'otros', boolean>

  otrosDescripcion: string
  posiblesCausas: string

  heridosSi: boolean
  heridosNo: boolean
  heridosNum: string

  fallecidosSi: boolean
  fallecidosNo: boolean
  fallecidosNum: string

  // Accidentes de tráfico
  matriculasImplicados: string[] // 5 casillas
  autoridadInterviene: string
  policiaLocalDe: string
  guardiaCivilDe: string

  observaciones: string

  indicativosInforman: string
  vbJefeServicio: string
  indicativoCumplimenta: string
  responsableTurno: string

  circulacion: string
}

const EMPTY_ROWS_1 = 9
const EMPTY_ROWS_2 = 9

export default function PsiParteServicioPage() {
  const initial: FormState = useMemo(
    () => ({
      fecha: '',
      hora: '',
      numeroInforme: '',

      lugar: '',
      motivo: '',
      alertante: '',

      tiempos: {
        llamada: '',
        salida: '',
        llegada: '',
        terminado: '',
        disponible: '',
      },

      tabla1: Array.from({ length: EMPTY_ROWS_1 }, () => ({ vehiculo: '', equipo: '', walkie: '' })),
      tabla2: Array.from({ length: EMPTY_ROWS_2 }, () => ({ equipo: '', walkie: '' })),

      prevencion: {
        mantenimiento: false,
        practicas: false,
        suministros: false,
        preventivo: false,
        otros: false,
      },
      intervencion: {
        svb: false,
        incendios: false,
        inundaciones: false,
        otros_riesgos_meteo: false,
        activacion_pem_bor: false,
        otros: false,
      },
      otros: {
        reunion_coordinacion: false,
        reunion_areas: false,
        limpieza: false,
        formacion: false,
        otros: false,
      },

      otrosDescripcion: '',
      posiblesCausas: '',

      heridosSi: false,
      heridosNo: false,
      heridosNum: '',

      fallecidosSi: false,
      fallecidosNo: false,
      fallecidosNum: '',

      matriculasImplicados: Array.from({ length: 5 }, () => ''),
      autoridadInterviene: '',
      policiaLocalDe: '',
      guardiaCivilDe: '',

      observaciones: '',

      indicativosInforman: '',
      vbJefeServicio: '',
      indicativoCumplimenta: '',
      responsableTurno: '',

      circulacion: '',
    }),
    []
  )

  const [form, setForm] = useState<FormState>(initial)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
  }

  const setTiempo = (key: TimeKey, value: string) => {
    setForm((p) => ({ ...p, tiempos: { ...p.tiempos, [key]: value } }))
  }

  const togglePrevencion = (k: keyof FormState['prevencion']) =>
    setForm((p) => ({ ...p, prevencion: { ...p.prevencion, [k]: !p.prevencion[k] } }))

  const toggleIntervencion = (k: keyof FormState['intervencion']) =>
    setForm((p) => ({ ...p, intervencion: { ...p.intervencion, [k]: !p.intervencion[k] } }))

  const toggleOtros = (k: keyof FormState['otros']) =>
    setForm((p) => ({ ...p, otros: { ...p.otros, [k]: !p.otros[k] } }))

  const setRow1 = (idx: number, key: 'vehiculo' | 'equipo' | 'walkie', value: string) => {
    setForm((p) => {
      const next = [...p.tabla1]
      next[idx] = { ...next[idx], [key]: value }
      return { ...p, tabla1: next }
    })
  }

  const setRow2 = (idx: number, key: 'equipo' | 'walkie', value: string) => {
    setForm((p) => {
      const next = [...p.tabla2]
      next[idx] = { ...next[idx], [key]: value }
      return { ...p, tabla2: next }
    })
  }

  const setMatricula = (idx: number, value: string) => {
    setForm((p) => {
      const next = [...p.matriculasImplicados]
      next[idx] = value
      return { ...p, matriculasImplicados: next }
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí conectas con tu API / Prisma. De momento solo valida/console:
    console.log('PSI payload', form)
    alert('Parte PSI listo (payload en consola). Conecta aquí tu endpoint de guardado.')
  }

  return (
    <form className={styles.page} onSubmit={onSubmit}>
      {/* CABECERA */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.psiBox}>PSI</div>
          <div className={styles.headerTitle}>
            <div className={styles.headerTitleTop}>PARTE DE</div>
            <div className={styles.headerTitleBottom}>SERVICIO E INTERVENCIÓN</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.logoMark} aria-hidden="true">
            <div className={styles.logoSquares} />
          </div>
          <div className={styles.logoText}>
            <div className={styles.logoTextTop}>PROTECCIÓN CIVIL</div>
            <div className={styles.logoTextBottom}>BORMUJOS</div>
          </div>
        </div>
      </header>

      {/* BLOQUE SUPERIOR */}
      <section className={styles.topBlock}>
        <div className={styles.topGrid}>
          <div className={styles.fieldRow}>
            <label className={styles.labelSmall}>FECHA</label>
            <input className={styles.inputSmall} value={form.fecha} onChange={(e) => setField('fecha', e.target.value)} />
            <label className={styles.labelSmall}>HORA</label>
            <input className={styles.inputSmall} value={form.hora} onChange={(e) => setField('hora', e.target.value)} />
          </div>

          <div className={styles.fieldRowRight}>
            <label className={styles.labelSmall}>Nº INFORME</label>
            <div className={styles.informeWrap}>
              <input
                className={styles.inputInforme}
                value={form.numeroInforme}
                onChange={(e) => setField('numeroInforme', e.target.value)}
              />
              <div className={styles.informeCheck} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.labelSmall}>LUGAR</label>
            <input className={styles.inputFull} value={form.lugar} onChange={(e) => setField('lugar', e.target.value)} />
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.labelSmall}>MOTIVO</label>
            <input className={styles.inputFull} value={form.motivo} onChange={(e) => setField('motivo', e.target.value)} />
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.labelSmall}>ALERTANTE</label>
            <input
              className={styles.inputFull}
              value={form.alertante}
              onChange={(e) => setField('alertante', e.target.value)}
            />
          </div>

          {/* Tabla derecha VEHÍCULOS / EQUIPO / WALKIES */}
          <div className={styles.rightTables}>
            <div className={styles.tableBlock}>
              <div className={styles.tableHead}>
                <div>VEHÍCULOS</div>
                <div>EQUIPO</div>
                <div>WALKIES</div>
              </div>
              <div className={styles.tableBody}>
                {form.tabla1.map((r, i) => (
                  <div className={styles.tableRow} key={`t1-${i}`}>
                    <input className={styles.tableCell} value={r.vehiculo} onChange={(e) => setRow1(i, 'vehiculo', e.target.value)} />
                    <input className={styles.tableCell} value={r.equipo} onChange={(e) => setRow1(i, 'equipo', e.target.value)} />
                    <input className={styles.tableCell} value={r.walkie} onChange={(e) => setRow1(i, 'walkie', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.tableBlock}>
              <div className={styles.tableHead}>
                <div>EQUIPO</div>
                <div>WALKIES</div>
              </div>
              <div className={styles.tableBody2}>
                {form.tabla2.map((r, i) => (
                  <div className={styles.tableRow2} key={`t2-${i}`}>
                    <input className={styles.tableCell} value={r.equipo} onChange={(e) => setRow2(i, 'equipo', e.target.value)} />
                    <input className={styles.tableCell} value={r.walkie} onChange={(e) => setRow2(i, 'walkie', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campo CIRCULACIÓN + VB JEFE SERVICIO (zona derecha media) */}
          <div className={styles.circulacionRow}>
            <label className={styles.labelSmall}>CIRCULACIÓN</label>
            <input className={styles.inputFull} value={form.circulacion} onChange={(e) => setField('circulacion', e.target.value)} />
          </div>
          <div className={styles.vbRow}>
            <label className={styles.labelSmall}>VB JEFE DE SERVICIO</label>
            <input className={styles.inputFull} value={form.vbJefeServicio} onChange={(e) => setField('vbJefeServicio', e.target.value)} />
          </div>
        </div>
      </section>

      {/* PAUTAS DE TIEMPO */}
      <section className={styles.block}>
        <div className={styles.bar}>PAUTAS DE TIEMPO</div>
        <div className={styles.timeGrid}>
          <div className={styles.timeBox}>
            <input className={styles.timeInput} value={form.tiempos.llamada} onChange={(e) => setTiempo('llamada', e.target.value)} />
            <div className={styles.timeLabel}>LLAMADA</div>
          </div>
          <div className={styles.timeBox}>
            <input className={styles.timeInput} value={form.tiempos.salida} onChange={(e) => setTiempo('salida', e.target.value)} />
            <div className={styles.timeLabel}>SALIDA</div>
          </div>
          <div className={styles.timeBox}>
            <input className={styles.timeInput} value={form.tiempos.llegada} onChange={(e) => setTiempo('llegada', e.target.value)} />
            <div className={styles.timeLabel}>LLEGADA</div>
          </div>
          <div className={styles.timeBox}>
            <input className={styles.timeInput} value={form.tiempos.terminado} onChange={(e) => setTiempo('terminado', e.target.value)} />
            <div className={styles.timeLabel}>TERMINADO</div>
          </div>
          <div className={styles.timeBox}>
            <input className={styles.timeInput} value={form.tiempos.disponible} onChange={(e) => setTiempo('disponible', e.target.value)} />
            <div className={styles.timeLabel}>DISPONIBLE</div>
          </div>
        </div>
      </section>

      {/* TIPOLOGÍA DE SERVICIO */}
      <section className={styles.block}>
        <div className={styles.bar}>TIPOLOGÍA DE SERVICIO</div>

        <div className={styles.typologyGrid}>
          {/* PREVENCIÓN */}
          <div className={styles.typologyCol}>
            <div className={styles.typologyTitle}>PREVENCIÓN</div>
            <div className={styles.typologyList}>
              <TypItem n="1" label="MANTENIMIENTO" checked={form.prevencion.mantenimiento} onToggle={() => togglePrevencion('mantenimiento')} />
              <TypItem n="2" label="PRÁCTICAS" checked={form.prevencion.practicas} onToggle={() => togglePrevencion('practicas')} />
              <TypItem n="3" label="SUMINISTROS" checked={form.prevencion.suministros} onToggle={() => togglePrevencion('suministros')} />
              <TypItem n="4" label="PREVENTIVO" checked={form.prevencion.preventivo} onToggle={() => togglePrevencion('preventivo')} />
              <TypItem n="5" label="OTROS" checked={form.prevencion.otros} onToggle={() => togglePrevencion('otros')} />
            </div>
          </div>

          {/* INTERVENCIÓN */}
          <div className={styles.typologyCol}>
            <div className={styles.typologyTitle}>INTERVENCIÓN</div>
            <div className={styles.typologyList}>
              <TypItem n="1" label="SOPORTE VITAL" checked={form.intervencion.svb} onToggle={() => toggleIntervencion('svb')} />
              <TypItem n="2" label="INCENDIOS" checked={form.intervencion.incendios} onToggle={() => toggleIntervencion('incendios')} />
              <TypItem n="3" label="INUNDACIONES" checked={form.intervencion.inundaciones} onToggle={() => toggleIntervencion('inundaciones')} />
              <TypItem n="4" label="OTROS RIESGOS METEO" checked={form.intervencion.otros_riesgos_meteo} onToggle={() => toggleIntervencion('otros_riesgos_meteo')} />
              <TypItem n="5" label="ACTIVACIÓN PEM- BOR" checked={form.intervencion.activacion_pem_bor} onToggle={() => toggleIntervencion('activacion_pem_bor')} />
              <TypItem n="6" label="OTROS" checked={form.intervencion.otros} onToggle={() => toggleIntervencion('otros')} />
            </div>
          </div>

          {/* OTROS */}
          <div className={styles.typologyCol}>
            <div className={styles.typologyTitle}>OTROS</div>
            <div className={styles.typologyList}>
              <TypItem n="1" label="REUNIÓN COORDINACIÓN" checked={form.otros.reunion_coordinacion} onToggle={() => toggleOtros('reunion_coordinacion')} />
              <TypItem n="2" label="REUNIÓN ÁREAS" checked={form.otros.reunion_areas} onToggle={() => toggleOtros('reunion_areas')} />
              <TypItem n="3" label="LIMPIEZA" checked={form.otros.limpieza} onToggle={() => toggleOtros('limpieza')} />
              <TypItem n="4" label="FORMACIÓN" checked={form.otros.formacion} onToggle={() => toggleOtros('formacion')} />
              <TypItem n="5" label="OTROS" checked={form.otros.otros} onToggle={() => toggleOtros('otros')} />
            </div>
          </div>
        </div>

        <div className={styles.subBar}>OTROS DESCRIPCIÓN</div>
        <textarea className={styles.textAreaShort} value={form.otrosDescripcion} onChange={(e) => setField('otrosDescripcion', e.target.value)} />

        <div className={styles.subBar}>POSIBLES CAUSAS</div>
        <textarea className={styles.textAreaShort} value={form.posiblesCausas} onChange={(e) => setField('posiblesCausas', e.target.value)} />

        {/* HERIDOS / FALLECIDOS */}
        <div className={styles.casualtiesRow}>
          <div className={styles.casualtyBox}>
            <div className={styles.casualtyTitle}>HERIDOS</div>
            <div className={styles.casualtyControls}>
              <span className={styles.smallText}>SI</span>
              <input type="checkbox" checked={form.heridosSi} onChange={() => setForm((p) => ({ ...p, heridosSi: !p.heridosSi }))} />
              <span className={styles.smallText}>NO</span>
              <input type="checkbox" checked={form.heridosNo} onChange={() => setForm((p) => ({ ...p, heridosNo: !p.heridosNo }))} />
              <span className={styles.smallText}>Nº</span>
              <input className={styles.inputTiny} value={form.heridosNum} onChange={(e) => setField('heridosNum', e.target.value)} />
            </div>
          </div>

          <div className={styles.casualtyBox}>
            <div className={styles.casualtyTitle}>FALLECIDOS</div>
            <div className={styles.casualtyControls}>
              <span className={styles.smallText}>SI</span>
              <input type="checkbox" checked={form.fallecidosSi} onChange={() => setForm((p) => ({ ...p, fallecidosSi: !p.fallecidosSi }))} />
              <span className={styles.smallText}>NO</span>
              <input type="checkbox" checked={form.fallecidosNo} onChange={() => setForm((p) => ({ ...p, fallecidosNo: !p.fallecidosNo }))} />
              <span className={styles.smallText}>Nº</span>
              <input className={styles.inputTiny} value={form.fallecidosNum} onChange={(e) => setField('fallecidosNum', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ACCIDENTES DE TRÁFICO */}
        <div className={styles.subBar}>EN ACCIDENTES DE TRÁFICO</div>
        <div className={styles.trafficGrid}>
          <div className={styles.trafficRow}>
            <div className={styles.trafficLabel}>MATRÍCULA VEHÍCULOS IMPLICADOS</div>
            <div className={styles.trafficInputs}>
              {form.matriculasImplicados.map((m, i) => (
                <input key={`mat-${i}`} className={styles.inputMatricula} value={m} onChange={(e) => setMatricula(i, e.target.value)} />
              ))}
            </div>
          </div>

          <div className={styles.trafficRow2}>
            <div className={styles.trafficLabel}>AUTORIDAD QUE INTERVIENEN</div>
            <input className={styles.inputFull} value={form.autoridadInterviene} onChange={(e) => setField('autoridadInterviene', e.target.value)} />
            <div className={styles.inlineLabel}>POLICÍA LOCAL DE</div>
            <input className={styles.inputMid} value={form.policiaLocalDe} onChange={(e) => setField('policiaLocalDe', e.target.value)} />
            <div className={styles.inlineLabel}>GUARDIA CIVIL DE</div>
            <input className={styles.inputMid} value={form.guardiaCivilDe} onChange={(e) => setField('guardiaCivilDe', e.target.value)} />
          </div>
        </div>

        {/* OBSERVACIONES */}
        <div className={styles.bar}>OBSERVACIONES</div>
        <textarea className={styles.textAreaBig} value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} />
      </section>

      {/* PIE: INDICATIVOS + VB + RESPONSABLE */}
      <section className={styles.footerGrid}>
        <div className={styles.footerBarLeft}>INDICATIVOS QUE INFORMAN</div>
        <div className={styles.footerBarRight}>VB JEFE DE SERVICIO</div>

        <div className={styles.footerCellLeft}>
          <input className={styles.inputFull} value={form.indicativosInforman} onChange={(e) => setField('indicativosInforman', e.target.value)} />
        </div>
        <div className={styles.footerCellRight}>
          <input className={styles.inputFull} value={form.vbJefeServicio} onChange={(e) => setField('vbJefeServicio', e.target.value)} />
        </div>

        <div className={styles.footerRow2}>
          <div className={styles.footerSmallLabel}>INDICATIVO QUE CUMPLIMENTA</div>
          <input className={styles.inputFull} value={form.indicativoCumplimenta} onChange={(e) => setField('indicativoCumplimenta', e.target.value)} />
        </div>

        <div className={styles.footerRow2}>
          <div className={styles.footerSmallLabel}>RESPONSABLE DEL TURNO</div>
          <input className={styles.inputFull} value={form.responsableTurno} onChange={(e) => setField('responsableTurno', e.target.value)} />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn}>Guardar Parte PSI</button>
          <button type="button" className={styles.secondaryBtn} onClick={() => setForm(initial)}>Limpiar</button>
        </div>
      </section>
    </form>
  )
}

function TypItem(props: { n: string; label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className={styles.typItem}>
      <div className={styles.typNum}>{props.n}</div>
      <div className={styles.typLabel}>{props.label}</div>
      <div className={styles.typCheck}>
        <input type="checkbox" checked={props.checked} onChange={props.onToggle} />
      </div>
    </div>
  )
}
