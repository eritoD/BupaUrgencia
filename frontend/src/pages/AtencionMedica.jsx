import { useEffect, useState, useCallback } from 'react'
import { getColaMedica, registrarAtencionMedica } from '../api'

const TRIAGE_CONFIG = {
  0: { label: 'N0', bg: 'bg-purple-600', text: 'text-white' },
  1: { label: 'N1', bg: 'bg-red-600', text: 'text-white' },
  2: { label: 'N2', bg: 'bg-orange-500', text: 'text-white' },
  3: { label: 'N3', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  4: { label: 'N4', bg: 'bg-green-500', text: 'text-white' },
  5: { label: 'N5', bg: 'bg-blue-400', text: 'text-white' },
}

const CATEGORIAS = ['UCI', 'UTI', 'MQ', 'UCO UI', 'UCO UTI']
const CATEGORIAS_DESC = {
  'UCI': 'Cuidados Intensivos Adulto',
  'UTI': 'Tratamiento Intermedio Adulto',
  'MQ': 'Médico-Quirúrgico General',
  'UCO UI': 'Unidad Coronaria Intermedio',
  'UCO UTI': 'Unidad Coronaria Intensivo',
}

const LS_KEY = 'demo2_atencion_medica_'

function ModalAtencion({ paciente, onClose, onConfirm }) {
  const storageKey = LS_KEY + paciente.id

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge saved data with any new patient data
        return {
          observaciones_clinicas: parsed.observaciones_clinicas || paciente.observaciones_clinicas || '',
          indicaciones_medicas: parsed.indicaciones_medicas || '',
          prescripciones: parsed.prescripciones || '',
          diagnostico: parsed.diagnostico || paciente.diagnostico || '',
          categoria_solicitada: parsed.categoria_solicitada || '',
        }
      }
    } catch { /* ignore */ }
    return {
      observaciones_clinicas: paciente.observaciones_clinicas || '',
      indicaciones_medicas: '',
      prescripciones: '',
      diagnostico: paciente.diagnostico || '',
      categoria_solicitada: '',
    }
  })
  const [loading, setLoading] = useState(false)

  // Persist to localStorage on every form change
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(form)) } catch { /* ignore */ }
  }, [form, storageKey])

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }))
  const isFonasa = paciente.prevision === 'FONASA'

  const handleConfirm = async () => {
    if (!form.categoria_solicitada) return
    setLoading(true)
    await onConfirm({
      observaciones_clinicas: form.observaciones_clinicas || undefined,
      indicaciones_medicas: form.indicaciones_medicas || undefined,
      prescripciones: form.prescripciones || undefined,
      diagnostico: form.diagnostico || undefined,
      categoria_solicitada: form.categoria_solicitada,
    })
    // Clear localStorage on successful submit
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    setLoading(false)
  }

  const inputCls = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]"
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Atención Médica — {paciente.nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{paciente.edad}a · {paciente.prevision} · {paciente.diagnostico}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info del paciente */}
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-400 font-medium">Signos Vitales</span>
              <div className="mt-1 space-y-0.5 text-gray-700">
                {paciente.presion_arterial && <div>PA: {paciente.presion_arterial}</div>}
                {paciente.frecuencia_cardiaca && <div>FC: {paciente.frecuencia_cardiaca} bpm</div>}
                {paciente.temperatura && <div>T°: {paciente.temperatura}°C</div>}
                {paciente.saturacion_o2 && <div>SpO₂: {paciente.saturacion_o2}%</div>}
                {!paciente.presion_arterial && !paciente.frecuencia_cardiaca && <div className="text-gray-300">Sin registrar</div>}
              </div>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Comorbilidades</span>
              <div className="mt-1 text-gray-700">{paciente.comorbilidades || '—'}</div>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Tiempo en urgencias</span>
              <div className={`mt-1 font-bold ${paciente.critico ? 'text-red-600' : 'text-amber-600'}`}>{paciente.horas_espera}h</div>
            </div>
          </div>

          {/* Diagnóstico actualizado */}
          <div>
            <label className={labelCls}>Diagnóstico (actualizar si es necesario)</label>
            <input value={form.diagnostico} onChange={set('diagnostico')} className={inputCls} />
          </div>

          {/* Observaciones */}
          <div>
            <label className={labelCls}>Observaciones Clínicas / Evolución</label>
            <textarea value={form.observaciones_clinicas} onChange={set('observaciones_clinicas')} rows={3}
              placeholder="Estado general del paciente, hallazgos clínicos, evolución…"
              className={inputCls + ' resize-none'} />
          </div>

          {/* Indicaciones */}
          <div>
            <label className={labelCls}>Indicaciones Médicas</label>
            <textarea value={form.indicaciones_medicas} onChange={set('indicaciones_medicas')} rows={3}
              placeholder="Régimen, hidratación, monitorización, cuidados especiales…"
              className={inputCls + ' resize-none'} />
          </div>

          {/* Prescripciones */}
          <div>
            <label className={labelCls}>Prescripciones / Medicamentos</label>
            <textarea value={form.prescripciones} onChange={set('prescripciones')} rows={3}
              placeholder="Medicamento + Dosis + Frecuencia + Vía&#10;Ej: Paracetamol 1g c/8h VO&#10;Ej: Ceftriaxona 2g c/24h EV"
              className={inputCls + ' resize-none'} />
          </div>

          {/* Categoría de hospitalización */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Orden de Hospitalización — Categoría</div>
            {isFonasa && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs text-blue-700">
                Paciente FONASA — se agregará automáticamente el sufijo <strong>F</strong>
              </div>
            )}
            <div className="space-y-1.5">
              {CATEGORIAS.map(cat => {
                const label = isFonasa ? `${cat}F` : cat
                return (
                  <button key={cat} onClick={() => setForm(v => ({ ...v, categoria_solicitada: cat }))}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all text-left ${
                      form.categoria_solicitada === cat ? 'border-[#003087] bg-[#003087]/5' : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    <span className="w-16 text-sm font-bold text-[#003087] flex-shrink-0">{label}</span>
                    <span className="text-sm text-gray-600">{CATEGORIAS_DESC[cat]}</span>
                    {form.categoria_solicitada === cat && (
                      <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={!form.categoria_solicitada || loading}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-md text-sm">
            {loading ? 'Procesando…' : 'Completar Atención y Emitir Orden'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AtencionMedica() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await getColaMedica()
      setData(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleAtencion = async (atencionData) => {
    await registrarAtencionMedica(modal.id, atencionData)
    setModal(null)
    await load()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" /></div>
  }

  const pacientes = (data?.pacientes || []).filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search)
  )

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Atención Médica</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pacientes con admisión completada — pendientes de evaluación médica y orden de hospitalización</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
          <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
          <div className="text-[10px] text-blue-500 font-medium uppercase">Pendientes</div>
        </div>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT…"
          className="w-full max-w-md border border-gray-200 rounded-md px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Paciente', 'Triage', 'Previsión', 'Diagnóstico', 'Comorbilidades', 'Espera', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pacientes.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No hay pacientes pendientes de atención médica</td></tr>
            ) : (
              pacientes.map(p => {
                const triageCfg = TRIAGE_CONFIG[p.nivel_triage]
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.critico ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.nombre}</div>
                      <div className="text-xs text-gray-400">{p.edad}a · {p.sexo === 'M' ? 'M' : 'F'} · {p.rut}</div>
                    </td>
                    <td className="px-4 py-3">
                      {triageCfg && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${triageCfg.bg} ${triageCfg.text}`}>{triageCfg.label}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600">{p.prevision}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[180px] truncate">{p.diagnostico}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{p.comorbilidades || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold tabular-nums ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>{p.horas_espera}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(p)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                        Atender Paciente
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalAtencion paciente={modal} onClose={() => setModal(null)} onConfirm={handleAtencion} />}
    </div>
  )
}
