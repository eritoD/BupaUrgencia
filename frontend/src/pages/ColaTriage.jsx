import { useEffect, useState, useCallback } from 'react'
import { getColaTriage, registrarTriage } from '../api'

const TRIAGE_CONFIG = {
  0: { label: 'N0 — Parto/RN',       bg: 'bg-purple-600', text: 'text-white', desc: 'Atención inmediata por nacimiento' },
  1: { label: 'N1 — Riesgo Vital',   bg: 'bg-red-600',    text: 'text-white', desc: 'Riesgo vital — atención sin demora' },
  2: { label: 'N2 — Emergencia',     bg: 'bg-orange-500', text: 'text-white', desc: 'Alta complejidad con potencial inestabilidad' },
  3: { label: 'N3 — Urgencia',       bg: 'bg-yellow-400', text: 'text-yellow-900', desc: 'Paciente estable, necesita recursos múltiples' },
  4: { label: 'N4 — Urgencia Menor', bg: 'bg-green-500',  text: 'text-white', desc: 'Complejidad baja, sin riesgo inmediato' },
  5: { label: 'N5 — No Urgente',     bg: 'bg-blue-400',   text: 'text-white', desc: 'Atención diferida según demanda' },
}

function ModalTriage({ paciente, onClose, onConfirm }) {
  const [nivel, setNivel] = useState(null)
  const [vitales, setVitales] = useState({ presion_arterial: '', frecuencia_cardiaca: '', temperatura: '', saturacion_o2: '', frecuencia_respiratoria: '' })
  const [loading, setLoading] = useState(false)

  const setV = (f) => (e) => setVitales(v => ({ ...v, [f]: e.target.value }))

  const handleConfirm = async () => {
    if (nivel === null) return
    setLoading(true)
    await onConfirm({
      nivel_triage: nivel,
      presion_arterial: vitales.presion_arterial || undefined,
      frecuencia_cardiaca: vitales.frecuencia_cardiaca ? parseInt(vitales.frecuencia_cardiaca) : undefined,
      temperatura: vitales.temperatura ? parseFloat(vitales.temperatura) : undefined,
      saturacion_o2: vitales.saturacion_o2 ? parseInt(vitales.saturacion_o2) : undefined,
      frecuencia_respiratoria: vitales.frecuencia_respiratoria ? parseInt(vitales.frecuencia_respiratoria) : undefined,
    })
    setLoading(false)
  }

  const inputCls = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]"
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Registrar Triage — {paciente.nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Selecciona la gravedad e ingresa signos vitales</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Nivel triage */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nivel de Urgencia</div>
            <div className="space-y-1.5">
              {Object.entries(TRIAGE_CONFIG).map(([n, cfg]) => (
                <button
                  key={n}
                  onClick={() => setNivel(parseInt(n))}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all text-left ${
                    nivel === parseInt(n) ? 'border-[#003087] shadow-sm' : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>{n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{cfg.label}</div>
                    <div className="text-[10px] text-gray-400">{cfg.desc}</div>
                  </div>
                  {nivel === parseInt(n) && (
                    <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Signos vitales */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Signos Vitales</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Presión Arterial</label>
                <input value={vitales.presion_arterial} onChange={setV('presion_arterial')} className={inputCls} placeholder="120/80" />
              </div>
              <div>
                <label className={labelCls}>FC (bpm)</label>
                <input type="number" value={vitales.frecuencia_cardiaca} onChange={setV('frecuencia_cardiaca')} className={inputCls} placeholder="72" />
              </div>
              <div>
                <label className={labelCls}>Temp. (°C)</label>
                <input type="number" step="0.1" value={vitales.temperatura} onChange={setV('temperatura')} className={inputCls} placeholder="36.5" />
              </div>
              <div>
                <label className={labelCls}>SpO₂ (%)</label>
                <input type="number" value={vitales.saturacion_o2} onChange={setV('saturacion_o2')} className={inputCls} placeholder="98" />
              </div>
              <div>
                <label className={labelCls}>FR (rpm)</label>
                <input type="number" value={vitales.frecuencia_respiratoria} onChange={setV('frecuencia_respiratoria')} className={inputCls} placeholder="16" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={nivel === null || loading}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-md text-sm">
            {loading ? 'Registrando…' : 'Confirmar Triage'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ColaTriage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await getColaTriage()
      setData(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleTriage = async (triageData) => {
    await registrarTriage(modal.id, triageData)
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
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cola de Triage</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pacientes pendientes de clasificación de urgencia · Actualización cada 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-orange-600">{data?.total || 0}</div>
            <div className="text-[10px] text-orange-500 font-medium uppercase">Pendientes</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT…"
          className="w-full max-w-md border border-gray-200 rounded-md px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Paciente', 'RUT', 'Edad', 'Previsión', 'Diagnóstico', 'Tiempo Espera', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pacientes.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No hay pacientes pendientes de triage</td></tr>
            ) : (
              pacientes.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.critico ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{p.nombre}</div>
                    <div className="text-xs text-gray-400">{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.rut}</td>
                  <td className="px-4 py-3 text-gray-700">{p.edad}a</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600">{p.prevision}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-[200px] truncate">{p.diagnostico}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold tabular-nums ${p.critico ? 'text-red-600' : p.horas_espera > 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {p.horas_espera}h
                    </span>
                    {p.critico && <span className="ml-1 text-[10px] text-red-500 font-medium animate-pulse">crítico</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal(p)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                      Registrar Triage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalTriage paciente={modal} onClose={() => setModal(null)} onConfirm={handleTriage} />}
    </div>
  )
}
