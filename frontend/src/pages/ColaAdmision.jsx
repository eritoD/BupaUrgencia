import { useEffect, useState, useCallback } from 'react'
import { getColaAdmision, completarAdmision } from '../api'

const TRIAGE_CONFIG = {
  0: { label: 'N0', bg: 'bg-purple-600', text: 'text-white' },
  1: { label: 'N1', bg: 'bg-red-600', text: 'text-white' },
  2: { label: 'N2', bg: 'bg-orange-500', text: 'text-white' },
  3: { label: 'N3', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  4: { label: 'N4', bg: 'bg-green-500', text: 'text-white' },
  5: { label: 'N5', bg: 'bg-blue-400', text: 'text-white' },
}

const PREVISIONES = ['FONASA', 'ISAPRE', 'Ley Urgencia', 'GES', 'Particular']

function ModalAdmision({ paciente, onClose, onConfirm }) {
  const [form, setForm] = useState({
    pagare_firmado: false,
    telefono: paciente.telefono || '',
    contacto_emergencia: paciente.contacto_emergencia || '',
    prevision: paciente.prevision || 'FONASA',
  })
  const [loading, setLoading] = useState(false)

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleConfirm = async () => {
    if (!form.pagare_firmado) return
    setLoading(true)
    await onConfirm({
      pagare_firmado: form.pagare_firmado,
      telefono: form.telefono || undefined,
      contacto_emergencia: form.contacto_emergencia || undefined,
      prevision: form.prevision || undefined,
    })
    setLoading(false)
  }

  const inputCls = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]"
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Completar Admisión — {paciente.nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Validar datos administrativos y firma de pagaré</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Pagaré */}
          <div
            onClick={() => setForm(v => ({ ...v, pagare_firmado: !v.pagare_firmado }))}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              form.pagare_firmado ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              form.pagare_firmado ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
            }`}>
              {form.pagare_firmado && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Pagaré Firmado</div>
              <div className="text-xs text-gray-500 mt-0.5">El paciente o tutor legal ha firmado el pagaré de responsabilidad financiera</div>
            </div>
          </div>

          {/* Datos administrativos */}
          <div>
            <label className={labelCls}>Previsión</label>
            <select value={form.prevision} onChange={set('prevision')} className={inputCls}>
              {PREVISIONES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input value={form.telefono} onChange={set('telefono')} className={inputCls} placeholder="+56 9 1234 5678" />
          </div>
          <div>
            <label className={labelCls}>Contacto de Emergencia</label>
            <input value={form.contacto_emergencia} onChange={set('contacto_emergencia')} className={inputCls} placeholder="Nombre — Teléfono" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={!form.pagare_firmado || loading}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-md text-sm">
            {loading ? 'Procesando…' : 'Completar Admisión'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ColaAdmision() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await getColaAdmision()
      setData(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const handleAdmision = async (admData) => {
    await completarAdmision(modal.id, admData)
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
          <h1 className="text-xl font-bold text-gray-900">Cola de Admisión</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pacientes clasificados — pendientes de pagaré y datos administrativos</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
          <div className="text-2xl font-bold text-amber-600">{data?.total || 0}</div>
          <div className="text-[10px] text-amber-500 font-medium uppercase">Pendientes</div>
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
              {['Paciente', 'RUT', 'Triage', 'Previsión', 'Diagnóstico', 'Espera', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pacientes.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No hay pacientes pendientes de admisión</td></tr>
            ) : (
              pacientes.map(p => {
                const triageCfg = TRIAGE_CONFIG[p.nivel_triage]
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.critico ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.nombre}</div>
                      <div className="text-xs text-gray-400">{p.edad}a · {p.sexo === 'M' ? 'M' : 'F'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.rut}</td>
                    <td className="px-4 py-3">
                      {triageCfg && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${triageCfg.bg} ${triageCfg.text}`}>{triageCfg.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600">{p.prevision}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[180px] truncate">{p.diagnostico}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold tabular-nums ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>{p.horas_espera}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(p)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                        Completar Admisión
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && <ModalAdmision paciente={modal} onClose={() => setModal(null)} onConfirm={handleAdmision} />}
    </div>
  )
}
