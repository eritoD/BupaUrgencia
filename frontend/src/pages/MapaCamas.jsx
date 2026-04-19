import { useEffect, useState, useCallback } from 'react'
import { getCamas, getPacientes, darAlta, liberarCama, hospitalizar, confirmarLlegada } from '../api'

const UNIDADES_ORDER = ['UCI', 'UCO UTI', 'UCO UI', 'UTI', 'MQ', 'Recuperacion', 'Urgencia']

const UNIDAD_INFO = {
  UCI:          { label: 'UCI — Cuidados Intensivos',        accent: '#003087' },
  'UCO UTI':    { label: 'UCO UTI — Coronaria Intensivo',    accent: '#7c3aed' },
  'UCO UI':     { label: 'UCO UI — Coronaria Intermedio',    accent: '#9333ea' },
  UTI:          { label: 'UTI — Tratamiento Intermedio',     accent: '#0047b3' },
  MQ:           { label: 'MQ — Médico-Quirúrgico',           accent: '#009FE3' },
  Recuperacion: { label: 'Recuperación — Post-Op',           accent: '#0083bc' },
  Urgencia:     { label: 'Urgencia — Emergencia',            accent: '#d97706' },
}

const ESTADO_STYLES = {
  libre:          { bg: 'bg-white border-gray-200',    dot: 'bg-green-400',  label: 'Disponible'    },
  ocupada:        { bg: 'bg-gray-50 border-gray-300',  dot: 'bg-red-500',    label: 'Ocupada'       },
  limpieza:       { bg: 'bg-amber-50 border-amber-200',dot: 'bg-amber-400',  label: 'En Limpieza'   },
  fuera_servicio: { bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-300',   label: 'Fuera Servicio'},
}

const PREVISION_BADGE = {
  'FONASA':       'bg-gray-100 text-gray-600',
  'ISAPRE':       'bg-[#003087]/10 text-[#003087]',
  'Ley Urgencia': 'bg-amber-50 text-amber-700',
  'GES':          'bg-gray-100 text-gray-600',
  'Particular':   'bg-gray-50 text-gray-500',
}

function BedCard({ cama, onSelect }) {
  const style = ESTADO_STYLES[cama.estado] || ESTADO_STYLES.libre
  const p = cama.paciente

  return (
    <button
      onClick={() => onSelect(cama)}
      className={`w-36 h-24 rounded-md border text-left p-3 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#009FE3] ${style.bg}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-semibold text-gray-800 text-xs">{cama.numero}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
      </div>
      {p ? (
        <>
          <div className="text-gray-900 text-xs font-semibold leading-tight truncate">
            {p.nombre.split(' ').slice(0, 2).join(' ')}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PREVISION_BADGE[p.prevision] || 'bg-gray-100 text-gray-600'}`}>
              {p.prevision}
            </span>
            <span className={`text-[10px] font-semibold ${p.dias_estadia >= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
              {p.dias_estadia}d
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 text-xs text-gray-400">{style.label}</div>
      )}
    </button>
  )
}

function ModalAsignarPaciente({ cama, urgPacientes, onClose, onAsignar, asignando }) {
  const [seleccionado, setSeleccionado] = useState(null)
  if (!cama) return null

  const now = new Date()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Asignar Paciente</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cama <span className="font-semibold text-gray-700">{cama.numero}</span>
              {' — '}{UNIDAD_INFO[cama.unidad]?.label || cama.unidad}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Lista de pacientes en urgencias */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pacientes en Urgencias — pendientes de cama
          </p>

          {urgPacientes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay pacientes en espera de cama
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {urgPacientes.map(p => {
                const horas = ((now - new Date(p.fecha_ingreso)) / 3600000).toFixed(1)
                const critico = parseFloat(horas) > 4
                const isSelected = seleccionado?.id === p.id

                return (
                  <button
                    key={p.id}
                    onClick={() => setSeleccionado(p)}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-all ${
                      isSelected
                        ? 'border-[#009FE3] bg-[#009FE3]/5 ring-1 ring-[#009FE3]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${critico ? 'bg-red-400' : 'bg-amber-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{p.nombre}</div>
                        <div className="text-xs text-gray-500 truncate">{p.diagnostico}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PREVISION_BADGE[p.prevision] || 'bg-gray-100 text-gray-600'}`}>
                          {p.prevision}
                        </span>
                        <div className="text-right">
                          <div className={`text-xs font-bold ${critico ? 'text-red-600' : 'text-amber-600'}`}>{horas}h</div>
                          <div className="text-[10px] text-gray-400">espera</div>
                        </div>
                        {isSelected && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#009FE3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => seleccionado && onAsignar(seleccionado.id)}
            disabled={!seleccionado || asignando}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-md text-sm transition-colors"
          >
            {asignando
              ? 'Asignando…'
              : seleccionado
                ? `Asignar a ${seleccionado.nombre.split(' ')[0]}`
                : 'Selecciona un paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PacienteModal({ cama, onClose, onAlta, onLiberar, onLlegada }) {
  if (!cama) return null
  const p = cama.paciente
  const style = ESTADO_STYLES[cama.estado] || ESTADO_STYLES.libre

  const enTransito = p && p.fecha_asignacion_cama && !p.fecha_llegada_unidad
  const transitMin = enTransito
    ? Math.round((Date.now() - new Date(p.fecha_asignacion_cama).getTime()) / 60000)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">{cama.numero}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className="text-xs text-gray-500">{style.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {p ? (
          <div className="space-y-3">
            {enTransito && (
              <div className="bg-purple-50 border border-purple-200 rounded-md px-3 py-2.5 flex items-center justify-between">
                <div className="text-xs text-purple-700 font-medium">
                  <span className="animate-pulse">● </span>En tránsito hacia la unidad
                </div>
                <div className="text-sm font-bold text-purple-700">{transitMin} min</div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
              {[
                ['Paciente', p.nombre],
                ['RUT',      p.rut],
                ['Edad / Sexo', `${p.edad} años · ${p.sexo}`],
                ['Días',     `${p.dias_estadia}d`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400 text-xs font-medium">{label}</span>
                  <span className="font-medium text-gray-900 text-xs">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 text-xs font-medium">Previsión</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${PREVISION_BADGE[p.prevision] || 'bg-gray-100'}`}>
                  {p.prevision}
                </span>
              </div>
              {p.categoria_solicitada && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 text-xs font-medium">Categoría</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#003087]/10 text-[#003087]">
                    {p.categoria_solicitada}
                  </span>
                </div>
              )}
              <div className="pt-1 border-t border-gray-200">
                <div className="text-gray-400 text-xs font-medium mb-1">Diagnóstico</div>
                <div className="text-xs text-gray-800 font-medium">{p.diagnostico}</div>
              </div>
            </div>

            {p.dias_estadia >= 7 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-xs text-amber-700 font-medium">
                Paciente de larga data — riesgo financiero activo
              </div>
            )}

            {enTransito && (
              <button
                onClick={() => onLlegada(p.id)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
              >
                Paciente Llegó a la Unidad ✓
              </button>
            )}

            <button
              onClick={() => onAlta(p.id)}
              className="w-full bg-[#003087] hover:bg-blue-900 text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
            >
              Dar Alta Médica
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">Esta cama está {style.label.toLowerCase()}.</p>
            {cama.estado === 'limpieza' && (
              <button
                onClick={() => onLiberar(cama.numero)}
                className="w-full bg-[#003087] hover:bg-blue-900 text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
              >
                Marcar como Disponible
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UrgenciasPipeline({ pacientes, camas, onAsignar }) {
  const [asignandoId, setAsignandoId] = useState(null)
  const [selCama, setSelCama] = useState(null)
  const [procesando, setProcesando] = useState(false)

  if (!pacientes || pacientes.length === 0) return null
  const now = new Date()
  const camasLibres = camas.filter(c => c.estado === 'libre')

  const handleAsignar = async (pacienteId) => {
    if (!selCama) return
    setProcesando(true)
    await onAsignar(pacienteId, selCama.unidad, selCama.numero)
    setProcesando(false)
    setAsignandoId(null)
    setSelCama(null)
  }

  return (
    <div className="bg-white rounded-lg border border-amber-200 overflow-hidden mb-5">
      <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          <h2 className="font-semibold text-gray-900 text-sm">Urgencias — Pendientes de Cama</h2>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded font-medium">
          {pacientes.length} en espera
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {pacientes.map((p) => {
          const horas = ((now - new Date(p.fecha_ingreso)) / 3600000).toFixed(1)
          const critico = parseFloat(horas) > 4
          const catBase = p.categoria_solicitada?.replace('F', '') || ''
          const sugeridas = camasLibres.filter(c => c.unidad === catBase)
          const otras = camasLibres.filter(c => c.unidad !== catBase)
          const isOpen = asignandoId === p.id

          return (
            <div key={p.id}>
              <div className={`px-5 py-3 flex items-center gap-4 ${critico ? 'bg-red-50' : ''}`}>
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${critico ? 'bg-red-400' : 'bg-amber-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{p.nombre}</div>
                  <div className="text-xs text-gray-500 truncate">{p.diagnostico}</div>
                </div>
                {p.categoria_solicitada && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#003087]/10 text-[#003087]">
                    → {p.categoria_solicitada}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${PREVISION_BADGE[p.prevision] || 'bg-gray-100 text-gray-600'}`}>
                  {p.prevision}
                </span>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-bold ${critico ? 'text-red-600' : 'text-amber-600'}`}>{horas}h</div>
                  <div className="text-xs text-gray-400">espera</div>
                </div>
                {critico && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium animate-pulse">
                    Crítico
                  </span>
                )}
                <button
                  onClick={() => { setAsignandoId(isOpen ? null : p.id); setSelCama(null) }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0 ${
                    isOpen ? 'bg-gray-200 text-gray-700' : 'bg-[#003087] hover:bg-blue-900 text-white'
                  }`}
                >
                  {isOpen ? 'Cancelar' : 'Asignar Cama'}
                </button>
              </div>

              {/* Inline bed picker */}
              {isOpen && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  {camasLibres.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">No hay camas disponibles</p>
                  ) : (
                    <div className="space-y-3">
                      {sugeridas.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mb-1.5">
                            Sugeridas — {catBase} ({sugeridas.length} disponibles)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sugeridas.map(c => (
                              <button key={c.numero} onClick={() => setSelCama(c)}
                                className={`px-2.5 py-1.5 rounded-md border-2 text-xs font-semibold transition-all ${
                                  selCama?.numero === c.numero ? 'border-[#003087] bg-[#003087]/5 text-[#003087]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}>
                                {c.numero}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {otras.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Otras Unidades</div>
                          <div className="flex flex-wrap gap-1.5">
                            {otras.map(c => (
                              <button key={c.numero} onClick={() => setSelCama(c)}
                                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                                  selCama?.numero === c.numero ? 'border-[#003087] bg-[#003087]/5 text-[#003087]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}>
                                {c.numero} <span className="text-gray-400 text-[9px]">({c.unidad})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleAsignar(p.id)}
                        disabled={!selCama || procesando}
                        className="bg-[#003087] hover:bg-blue-900 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                      >
                        {procesando ? 'Asignando…' : selCama ? `Confirmar → Cama ${selCama.numero} (${selCama.unidad})` : 'Selecciona una cama'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MapaCamas() {
  const [camas,        setCamas]        = useState([])
  const [urgPacientes, setUrgPacientes] = useState([])
  const [selected,     setSelected]     = useState(null)
  const [asignarCama,  setAsignarCama]  = useState(null)
  const [asignando,    setAsignando]    = useState(false)
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    try {
      const [camasRes, pacRes] = await Promise.all([getCamas(), getPacientes()])
      setCamas(camasRes.data)
      setUrgPacientes(pacRes.data.filter(p => p.estado === 'urgencias'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const handleSelect = (cama) => {
    if (cama.estado === 'libre') {
      setAsignarCama(cama)
    } else {
      setSelected(cama)
    }
  }

  const handleAlta = async (pacienteId) => {
    await darAlta(pacienteId)
    setSelected(null)
    await load()
  }

  const handleLiberar = async (numero) => {
    await liberarCama(numero)
    setSelected(null)
    await load()
  }

  const handleLlegada = async (pacienteId) => {
    await confirmarLlegada(pacienteId)
    setSelected(null)
    await load()
  }

  const handleAsignar = async (pacienteId) => {
    setAsignando(true)
    try {
      await hospitalizar(pacienteId, {
        nueva_unidad: asignarCama.unidad,
        nueva_cama_numero: asignarCama.numero,
      })
      setAsignarCama(null)
      await load()
    } finally {
      setAsignando(false)
    }
  }

  const handleAsignarDesdeUrgencias = async (pacienteId, unidad, numero) => {
    await hospitalizar(pacienteId, { nueva_unidad: unidad, nueva_cama_numero: numero })
    await load()
  }

  const total    = camas.length
  const ocupadas = camas.filter(c => c.estado === 'ocupada').length
  const libres   = camas.filter(c => c.estado === 'libre').length
  const limpieza = camas.filter(c => c.estado === 'limpieza').length
  const pct      = total ? Math.round((ocupadas / total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mapa General de Camas</h1>
          <p className="text-gray-400 text-xs mt-0.5">Actualización automática cada 30 s · Clínica BUPA Santiago</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm">
          {[
            { label: 'Total',     value: total,                   color: 'text-gray-700' },
            { label: 'Ocupadas',  value: `${ocupadas} (${pct}%)`, color: 'text-red-500'  },
            { label: 'Libres',    value: libres,                  color: 'text-green-600'},
            { label: 'Limpieza',  value: limpieza,                color: 'text-amber-500'},
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} className="flex items-center gap-3">
              <div className="text-center">
                <div className={`font-bold ${color}`}>{value}</div>
                <div className="text-gray-400 text-xs">{label}</div>
              </div>
              {i < arr.length - 1 && <div className="w-px h-6 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-5">
        {Object.entries(ESTADO_STYLES).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            {v.label}
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-400 italic">
          Click en cama verde para asignar paciente
        </div>
      </div>

      <UrgenciasPipeline pacientes={urgPacientes} camas={camas} onAsignar={handleAsignarDesdeUrgencias} />

      {/* Units */}
      <div className="space-y-4">
        {UNIDADES_ORDER.map(unidad => {
          const camsUnidad = camas.filter(c => c.unidad === unidad)
          if (camsUnidad.length === 0) return null
          const ocup = camsUnidad.filter(c => c.estado === 'ocupada').length
          const info = UNIDAD_INFO[unidad] || { label: unidad, accent: '#6b7280' }
          const pctOcup = camsUnidad.length ? ocup / camsUnidad.length : 0

          return (
            <div key={unidad} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"
                   style={{ borderLeftColor: info.accent, borderLeftWidth: '3px' }}>
                <span className="font-semibold text-gray-800 text-sm">{info.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{ocup}/{camsUnidad.length} ocupadas</span>
                  <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pctOcup * 100}%`,
                        background: pctOcup >= 0.9 ? '#ef4444' : pctOcup >= 0.7 ? '#f59e0b' : info.accent,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 flex flex-wrap gap-2.5">
                {camsUnidad.map(c => (
                  <BedCard key={c.id} cama={c} onSelect={handleSelect} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <PacienteModal
        cama={selected}
        onClose={() => setSelected(null)}
        onAlta={handleAlta}
        onLiberar={handleLiberar}
        onLlegada={handleLlegada}
      />

      <ModalAsignarPaciente
        cama={asignarCama}
        urgPacientes={urgPacientes}
        onClose={() => setAsignarCama(null)}
        onAsignar={handleAsignar}
        asignando={asignando}
      />
    </div>
  )
}
