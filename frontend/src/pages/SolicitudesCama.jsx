import { useEffect, useState, useCallback } from 'react'
import { getSolicitudesCama, getCamas, hospitalizar, confirmarLlegada } from '../api'

const TRIAGE_CONFIG = {
  0: { label: 'N0', bg: 'bg-purple-600', text: 'text-white' },
  1: { label: 'N1', bg: 'bg-red-600', text: 'text-white' },
  2: { label: 'N2', bg: 'bg-orange-500', text: 'text-white' },
  3: { label: 'N3', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  4: { label: 'N4', bg: 'bg-green-500', text: 'text-white' },
  5: { label: 'N5', bg: 'bg-blue-400', text: 'text-white' },
}

function ModalAsignarCama({ paciente, onClose, onConfirm }) {
  const [camas, setCamas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selNum, setSelNum] = useState(null)
  const [selUni, setSelUni] = useState(null)
  const [asignando, setAsignando] = useState(false)

  useEffect(() => {
    getCamas().then(r => {
      setCamas(r.data)
      setLoading(false)
    })
  }, [])

  const catSugerida = paciente.categoria_solicitada?.replace('F', '') || ''
  const camasLibres = camas.filter(c => c.estado === 'libre')
  const camasSugeridas = camasLibres.filter(c => c.unidad === catSugerida)
  const camasOtras = camasLibres.filter(c => c.unidad !== catSugerida)

  const handleConfirm = async () => {
    if (!selNum || !selUni) return
    setAsignando(true)
    await onConfirm({ nueva_unidad: selUni, nueva_cama_numero: selNum })
    setAsignando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Asignar Cama — {paciente.nombre}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Categoría solicitada: <span className="font-bold text-[#003087]">{paciente.categoria_solicitada || '—'}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" /></div>
          ) : camasLibres.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay camas disponibles</div>
          ) : (
            <div className="space-y-4">
              {/* Sugeridas */}
              {camasSugeridas.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">
                    Camas Sugeridas — {catSugerida} ({camasSugeridas.length} disponibles)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {camasSugeridas.map(c => (
                      <button key={c.numero} onClick={() => { setSelNum(c.numero); setSelUni(c.unidad) }}
                        className={`px-3 py-2 rounded-md border-2 text-xs font-semibold transition-all ${
                          selNum === c.numero ? 'border-[#003087] bg-[#003087]/5 text-[#003087]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {c.numero}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Otras */}
              {camasOtras.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Otras Unidades Disponibles</div>
                  {Object.entries(
                    camasOtras.reduce((acc, c) => { (acc[c.unidad] ??= []).push(c); return acc }, {})
                  ).map(([unidad, beds]) => (
                    <div key={unidad} className="mb-2">
                      <div className="text-[10px] text-gray-400 font-semibold mb-1">{unidad}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {beds.map(c => (
                          <button key={c.numero} onClick={() => { setSelNum(c.numero); setSelUni(c.unidad) }}
                            className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                              selNum === c.numero ? 'border-[#003087] bg-[#003087]/5 text-[#003087]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}>
                            {c.numero}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={!selNum || asignando}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 text-white font-semibold py-2 rounded-md text-sm">
            {asignando ? 'Asignando…' : selNum ? `Asignar Cama ${selNum}` : 'Selecciona una cama'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SolicitudesCama() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await getSolicitudesCama()
      setData(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    // Refresh immediately when user navigates back to this tab/page
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') load()
    })
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const handleAsignar = async (asignarData) => {
    await hospitalizar(modal.id, asignarData)
    setModal(null)
    await load()
  }

  const handleLlegada = async (pacienteId) => {
    await confirmarLlegada(pacienteId)
    await load()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" /></div>
  }

  const pendientes = data?.pendientes || []
  const enTransito = data?.en_transito || []

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitudes de Cama</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestor de Camas — asignar y monitorear tránsito</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-purple-600">{data?.total_pendientes || 0}</div>
            <div className="text-[10px] text-purple-500 font-medium uppercase">Pendientes</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-amber-600">{data?.total_transito || 0}</div>
            <div className="text-[10px] text-amber-500 font-medium uppercase">En Tránsito</div>
          </div>
        </div>
      </div>

      {/* En Tránsito */}
      {enTransito.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-purple-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <h2 className="font-semibold text-gray-900 text-sm">En Tránsito a Unidad</h2>
            </div>
            <span className="text-xs text-purple-600 font-medium">{enTransito.length} paciente{enTransito.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {enTransito.map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{p.nombre}</div>
                  <div className="text-xs text-gray-500">{p.diagnostico}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">Destino</div>
                  <div className="font-semibold text-[#003087] text-sm">{p.unidad} — {p.cama_numero}</div>
                </div>
                <div className="text-right flex-shrink-0 min-w-[70px]">
                  <div className={`text-lg font-bold tabular-nums ${(p.transit_min || 0) > 30 ? 'text-red-600' : 'text-purple-600'}`}>
                    {Math.round(p.transit_min || 0)} min
                  </div>
                  <div className="text-[10px] text-gray-400">tránsito</div>
                </div>
                <button onClick={() => handleLlegada(p.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0">
                  Paciente Llegó ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendientes de asignación */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <h2 className="font-semibold text-gray-800 text-sm">Pacientes Listos para Asignación</h2>
          <span className="text-xs text-gray-400">({pendientes.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Paciente', 'Triage', 'Categoría', 'Previsión', 'Diagnóstico', 'Espera Total', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendientes.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No hay solicitudes pendientes</td></tr>
            ) : (
              pendientes.map(p => {
                const triageCfg = TRIAGE_CONFIG[p.nivel_triage]
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.critico ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.nombre}</div>
                      <div className="text-xs text-gray-400">{p.edad}a · {p.rut}</div>
                    </td>
                    <td className="px-4 py-3">
                      {triageCfg && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${triageCfg.bg} ${triageCfg.text}`}>{triageCfg.label}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#003087]/10 text-[#003087]">→ {p.categoria_solicitada}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600">{p.prevision}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[150px] truncate">{p.diagnostico}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold tabular-nums ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>{p.horas_espera}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(p)}
                        className="bg-[#003087] hover:bg-blue-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                        Asignar Cama
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalAsignarCama paciente={modal} onClose={() => setModal(null)} onConfirm={handleAsignar} />}
    </div>
  )
}
