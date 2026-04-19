import { useEffect, useState, useCallback } from 'react'
import { getColaDobleCheck, dobleCheck } from '../api'

const TRIAGE_CONFIG = {
  0: { label: 'N0', bg: 'bg-purple-600', text: 'text-white' },
  1: { label: 'N1', bg: 'bg-red-600', text: 'text-white' },
  2: { label: 'N2', bg: 'bg-orange-500', text: 'text-white' },
  3: { label: 'N3', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  4: { label: 'N4', bg: 'bg-green-500', text: 'text-white' },
  5: { label: 'N5', bg: 'bg-blue-400', text: 'text-white' },
}

function ModalDobleCheck({ paciente, onClose, onConfirm }) {
  const [clinico, setCli] = useState(paciente.check_clinico || false)
  const [admin, setAdm]   = useState(paciente.check_admin   || false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm({ check_clinico: clinico, check_admin: admin })
    setLoading(false)
  }

  const ambos = clinico && admin

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Doble Validación — {paciente.nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enfermero Líder de Turno — confirma ambas condiciones</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info rápida */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Categoría solicitada</span><span className="font-bold text-[#003087]">{paciente.categoria_solicitada || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Diagnóstico</span><span className="text-gray-700">{paciente.diagnostico}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Tiempo en urgencias</span><span className={`font-bold ${paciente.critico ? 'text-red-600' : 'text-amber-600'}`}>{paciente.horas_espera}h</span></div>
          </div>

          <div
            onClick={() => setCli(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              clinico ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              clinico ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
            }`}>
              {clinico && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Validación Clínica</div>
              <div className="text-xs text-gray-500 mt-0.5">Medicamentos de carga administrados · Exámenes críticos disponibles · Paciente estabilizado para traslado</div>
            </div>
          </div>

          <div
            onClick={() => setAdm(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              admin ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              admin ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
            }`}>
              {admin && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Validación Administrativa</div>
              <div className="text-xs text-gray-500 mt-0.5">Trámite de hospitalización ejecutado · Previsión validada · Pagaré generado</div>
            </div>
          </div>

          {ambos && (
            <div className="bg-teal-50 border border-teal-200 rounded-md px-3 py-2.5 text-xs text-teal-700 font-medium">
              ✓ Ambas validaciones confirmadas — el paciente pasará a la cola del Gestor de Camas
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 text-white font-semibold py-2 rounded-md text-sm">
              {loading ? 'Guardando…' : ambos ? 'Confirmar — Liberar al Gestor' : 'Guardar Validación Parcial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DobleCheckPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await getColaDobleCheck()
      setData(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleDobleCheck = async (checkData) => {
    await dobleCheck(modal.id, checkData)
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
          <h1 className="text-xl font-bold text-gray-900">Doble Validación</h1>
          <p className="text-gray-400 text-sm mt-0.5">Enfermera de turno — validar condiciones clínicas y administrativas</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 text-center">
          <div className="text-2xl font-bold text-teal-600">{data?.total || 0}</div>
          <div className="text-[10px] text-teal-500 font-medium uppercase">Pendientes</div>
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
              {['Paciente', 'Triage', 'Categoría', 'Diagnóstico', 'Clínico', 'Admin', 'Espera', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pacientes.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-400">No hay pacientes pendientes de validación</td></tr>
            ) : (
              pacientes.map(p => {
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
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[160px] truncate">{p.diagnostico}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.check_clinico ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                        {p.check_clinico ? '✓ OK' : '○ Pend.'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.check_admin ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                        {p.check_admin ? '✓ OK' : '○ Pend.'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold tabular-nums ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>{p.horas_espera}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(p)}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                        Validar
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalDobleCheck paciente={modal} onClose={() => setModal(null)} onConfirm={handleDobleCheck} />}
    </div>
  )
}
