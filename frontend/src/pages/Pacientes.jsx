import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPacientes } from '../api'

const PREVISION_BADGE = {
  'FONASA':       'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  'ISAPRE':       'bg-[#003087]/10 text-[#003087] ring-1 ring-[#003087]/20',
  'Ley Urgencia': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'GES':          'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  'Particular':   'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
}

const ESTADO_BADGE = {
  urgencias:        'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  hospitalizado:    'bg-[#003087]/10 text-[#003087] ring-1 ring-[#003087]/20',
  alta:             'bg-green-50 text-green-700 ring-1 ring-green-200',
  traslado_externo: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

const ESTADO_LABEL = {
  urgencias: 'Urgencias', hospitalizado: 'Hospitalizado',
  alta: 'Alta', traslado_externo: 'Traslado Ext.',
}

const FILTROS = ['Todos', 'UCI', 'UTI', 'MQ', 'Recuperacion', 'Urgencia', 'Urgencias']

export default function Pacientes() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtro,    setFiltro]    = useState('Todos')

  useEffect(() => {
    getPacientes().then(r => { setPacientes(r.data); setLoading(false) })
  }, [])

  const filtered = pacientes.filter(p => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.rut.includes(search) ||
      p.diagnostico.toLowerCase().includes(search.toLowerCase())
    const matchUnidad =
      filtro === 'Todos' ||
      p.unidad === filtro ||
      (filtro === 'Urgencias' && p.estado === 'urgencias')
    return matchSearch && matchUnidad
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const urgentesCount   = pacientes.filter(p => p.estado === 'urgencias').length
  const hospCount       = pacientes.filter(p => p.estado === 'hospitalizado').length
  const largaDataCount  = pacientes.filter(p => p.dias_estadia >= 7).length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-sm text-gray-500">{pacientes.length} registros</span>
          <span className="text-gray-200">·</span>
          <span className="text-sm text-gray-500">{hospCount} hospitalizados</span>
          {urgentesCount > 0 && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-sm text-amber-600 font-medium">{urgentesCount} en urgencias</span>
            </>
          )}
          {largaDataCount > 0 && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-sm text-red-500 font-medium">{largaDataCount} larga data</span>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, RUT o diagnóstico…"
          className="flex-1 border border-gray-200 rounded-md px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]"
        />
        <div className="flex gap-1">
          {FILTROS.map(u => (
            <button
              key={u}
              onClick={() => setFiltro(u)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                filtro === u
                  ? 'bg-[#003087] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Paciente', 'Unidad / Cama', 'Previsión', 'Diagnóstico', 'Días', 'Cuenta Est.', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(p => (
              <tr
                key={p.id}
                onClick={() => navigate(`/pacientes/${p.id}`)}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  p.dias_estadia >= 7 ? 'border-l-4 border-amber-400' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{p.nombre}</div>
                  <div className="text-gray-400 text-xs font-mono mt-0.5">{p.rut} · {p.edad}a · {p.sexo}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-700">{p.unidad || '—'}</span>
                  {p.cama_numero && (
                    <div className="text-gray-400 text-xs mt-0.5">{p.cama_numero}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${PREVISION_BADGE[p.prevision] || 'bg-gray-100 text-gray-600'}`}>
                    {p.prevision}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-gray-700 truncate block text-xs">{p.diagnostico}</span>
                  {p.comorbilidades && p.comorbilidades !== 'Ninguna' && (
                    <span className="text-gray-400 text-xs">{p.comorbilidades}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold text-xs ${p.dias_estadia >= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {p.dias_estadia}d
                  </span>
                  {p.dias_estadia >= 7 && (
                    <div className="text-amber-500 text-xs mt-0.5">Larga data</div>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 text-xs">
                  {p.valor_cuenta_estimado > 0
                    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(p.valor_cuenta_estimado)
                    : '—'
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${ESTADO_BADGE[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADO_LABEL[p.estado] || p.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No se encontraron pacientes
          </div>
        )}
      </div>
    </div>
  )
}
