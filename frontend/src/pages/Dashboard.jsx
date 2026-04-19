import { useEffect, useState } from 'react'
import { getDashboard, getDashboardFinanciero, getDashboardOperaciones } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const fmtM = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return fmt(n)
}

// ── Shared Components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-gray-900', bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-lg border border-gray-200 p-4`}>
      <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── Tab: Gerencial ────────────────────────────────────────────────────────────

const UNIT_COLORS = {
  UCI: '#ef4444', UTI: '#f97316', MQ: '#3b82f6',
  Recuperacion: '#14b8a6', Urgencia: '#8b5cf6',
}

// Simulated 7-day trend
const TENDENCIA = [
  { dia: 'Lun', ocupacion: 71 },
  { dia: 'Mar', ocupacion: 74 },
  { dia: 'Mié', ocupacion: 68 },
  { dia: 'Jue', ocupacion: 77 },
  { dia: 'Vie', ocupacion: 80 },
  { dia: 'Sáb', ocupacion: 75 },
  { dia: 'Hoy', ocupacion: null }, // will be filled with real data
]

function TabGerencial({ data }) {
  const { resumen_camas, por_unidad, por_prevision, financiero, urgencias_en_espera } = data

  const barData = Object.entries(por_unidad).map(([unidad, vals]) => ({
    unidad,
    Ocupadas: vals.ocupadas,
    Libres:   vals.libres,
  }))

  const tendencia = TENDENCIA.map((d, i) =>
    i === TENDENCIA.length - 1
      ? { ...d, ocupacion: resumen_camas.ocupacion_pct }
      : d
  )

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#14b8a6', '#6b7280']

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Ocupación Global"
          value={`${resumen_camas.ocupacion_pct}%`}
          sub={`${resumen_camas.ocupadas} / ${resumen_camas.total} camas`}
          color={resumen_camas.ocupacion_pct >= 85 ? 'text-red-600' : 'text-gray-900'}
        />
        <KpiCard
          label="Camas Disponibles"
          value={resumen_camas.libres}
          sub={`${resumen_camas.limpieza} en limpieza`}
          color="text-green-600"
        />
        <KpiCard
          label="Facturación Activa"
          value={fmtM(financiero.total_facturacion_estimada)}
          sub="Pacientes hospitalizados"
          color="text-blue-700"
        />
        <KpiCard
          label="Dinero en Riesgo"
          value={fmtM(financiero.dinero_en_riesgo)}
          sub={`${financiero.pacientes_larga_data.length} pacientes larga data`}
          color="text-red-600"
          bg="bg-red-50"
        />
        <KpiCard
          label="Urgencias en Espera"
          value={urgencias_en_espera}
          sub="Pendientes de cama"
          color={urgencias_en_espera > 2 ? 'text-amber-600' : 'text-gray-700'}
          bg={urgencias_en_espera > 2 ? 'bg-amber-50' : 'bg-white'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Occupancy by unit */}
        <div className="col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Ocupación por Unidad</h2>
          <p className="text-xs text-gray-400 mb-3">Camas ocupadas vs disponibles</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={14} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="unidad" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="Ocupadas" fill="#ef4444" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Libres"   fill="#22c55e" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend */}
        <div className="col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Tendencia Ocupación</h2>
          <p className="text-xs text-gray-400 mb-3">Últimos 7 días (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Ocupación']} />
              <Line
                type="monotone" dataKey="ocupacion" stroke="#003087"
                strokeWidth={2} dot={{ r: 4, fill: '#003087' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By prevision */}
        <div className="col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Mix Previsional</h2>
          <p className="text-xs text-gray-400 mb-3">Pacientes por tipo de cuenta</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={por_prevision} cx="50%" cy="50%" outerRadius={65}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={10}
              >
                {por_prevision.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Larga data table */}
      {financiero.pacientes_larga_data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <h2 className="font-semibold text-red-800 text-sm">Pacientes Larga Data — Money at Risk</h2>
            </div>
            <span className="text-xs text-red-500 font-medium">
              {fmt(financiero.dinero_en_riesgo)} comprometidos
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Paciente', 'Unidad', 'Previsión', 'Días Estancia', 'Cuenta Estimada'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {financiero.pacientes_larga_data.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-5 py-3 text-gray-600">{p.unidad}</td>
                  <td className="px-5 py-3 text-gray-600">{p.prevision}</td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                      {p.dias} días
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-red-700">{fmt(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tab: Financiero ───────────────────────────────────────────────────────────

const RIESGO_STYLE = {
  Bajo:         { bg: 'bg-green-100',  text: 'text-green-700' },
  Medio:        { bg: 'bg-amber-100',  text: 'text-amber-700' },
  Alto:         { bg: 'bg-red-100',    text: 'text-red-700'   },
  Desconocido:  { bg: 'bg-gray-100',   text: 'text-gray-600'  },
}

const PREVISION_COLORS = {
  FONASA:        '#3b82f6',
  ISAPRE:        '#8b5cf6',
  'Ley Urgencia':'#f97316',
  GES:           '#14b8a6',
  Particular:    '#6b7280',
}

function TabFinanciero({ data }) {
  const { breakdown, total_facturacion, total_riesgo, chart_data } = data

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Facturación Total Activa"
          value={fmtM(total_facturacion)}
          sub="Pacientes hospitalizados"
          color="text-blue-700"
        />
        <KpiCard
          label="Dinero en Riesgo Global"
          value={fmtM(total_riesgo)}
          sub="Larga data + cobertura incierta"
          color="text-red-600"
          bg="bg-red-50"
        />
        <KpiCard
          label="Porcentaje en Riesgo"
          value={total_facturacion > 0 ? `${((total_riesgo / total_facturacion) * 100).toFixed(1)}%` : '—'}
          sub="Del total facturado"
          color={total_riesgo / total_facturacion > 0.3 ? 'text-red-600' : 'text-amber-600'}
        />
      </div>

      {/* Per-prevision cards */}
      <div>
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Desglose por Tipo de Cuenta</h2>
        <div className="grid grid-cols-5 gap-3">
          {breakdown.map((b) => {
            const rs = RIESGO_STYLE[b.riesgo] || RIESGO_STYLE.Desconocido
            const pct = total_facturacion > 0
              ? ((b.facturacion_estimada / total_facturacion) * 100).toFixed(0)
              : 0
            return (
              <div
                key={b.prevision}
                className="bg-white rounded-lg border border-gray-100 shadow-sm p-4"
                style={{ borderTop: `3px solid ${PREVISION_COLORS[b.prevision] || '#999'}` }}
              >
                <div className="text-xs font-bold text-gray-800 mb-0.5 truncate">{b.label}</div>
                <div className="text-xs text-gray-400 mb-3">{b.cobertura}</div>

                <div className="text-2xl font-bold text-gray-900">{b.count}</div>
                <div className="text-xs text-gray-500">pacientes</div>

                <div className="mt-3 text-sm font-bold text-blue-700">{fmtM(b.facturacion_estimada)}</div>
                <div className="text-xs text-gray-400">{pct}% del total</div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">Días prom.</div>
                  <div className="text-xs font-semibold text-gray-700">{b.dias_promedio}d</div>
                </div>

                {b.dinero_en_riesgo > 0 && (
                  <div className="mt-2 text-xs text-red-600 font-medium">
                    {fmtM(b.dinero_en_riesgo)} en riesgo
                  </div>
                )}

                <div className={`mt-3 text-xs px-2 py-0.5 rounded-full inline-block font-medium ${rs.bg} ${rs.text}`}>
                  Riesgo {b.riesgo}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Facturación vs Riesgo por Previsión</h2>
          <p className="text-xs text-gray-400 mb-3">CLP — pacientes hospitalizados activos</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart_data} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [fmt(v), name]} />
              <Legend />
              <Bar dataKey="Facturación" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Riesgo"      fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Tabla Financiera Detallada</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Previsión', 'Pac.', 'Días prom.', 'Facturado', 'En Riesgo'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {breakdown.map((b) => (
                <tr key={b.prevision} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PREVISION_COLORS[b.prevision] || '#999' }}
                      />
                      <span className="font-medium text-gray-800 text-xs">{b.prevision}</span>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">{b.cobertura}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{b.count}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{b.dias_promedio}d</td>
                  <td className="px-4 py-3 font-semibold text-blue-700 text-xs">{fmtM(b.facturacion_estimada)}</td>
                  <td className="px-4 py-3">
                    {b.dinero_en_riesgo > 0 ? (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                        {fmtM(b.dinero_en_riesgo)}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Long-stay risk breakdown */}
      {breakdown.some(b => b.pacientes_larga_data.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <h2 className="font-semibold text-red-800 text-sm">Detalle Money at Risk por Previsión</h2>
            <p className="text-xs text-red-400 mt-0.5">Pacientes con estancia ≥ 7 días — riesgo de cobertura</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Paciente', 'Previsión', 'Unidad', 'Días', 'Cuenta Est.'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {breakdown.flatMap(b =>
                b.pacientes_larga_data.map((p, i) => (
                  <tr key={`${b.prevision}-${i}`} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: (PREVISION_COLORS[b.prevision] || '#999') + '20',
                          color: PREVISION_COLORS[b.prevision] || '#666',
                        }}
                      >{b.prevision}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.unidad}</td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{p.dias}d</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-red-700">{fmt(p.valor)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tab: Operaciones ──────────────────────────────────────────────────────────

const ALERTA_STYLE = {
  escalada_potencial: { bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400', text: 'text-orange-800', badge: 'Escalada UCI/UTI' },
  larga_data:         { bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500',    text: 'text-red-800',    badge: 'Larga Data'    },
}

function TabOperaciones({ data }) {
  const {
    pipeline_urgencias, total_en_espera, urgencias_criticas,
    tiempo_promedio_admision_horas, camas_en_limpieza,
    alertas_complejidad, chart_tiempos, meta,
  } = data

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Pacientes en Espera"
          value={total_en_espera}
          sub="Urgencias sin cama asignada"
          color={total_en_espera > 2 ? 'text-amber-600' : 'text-gray-900'}
          bg={total_en_espera > 2 ? 'bg-amber-50' : 'bg-white'}
        />
        <KpiCard
          label="Esperas Críticas (>4h)"
          value={urgencias_criticas}
          sub="Requieren acción inmediata"
          color={urgencias_criticas > 0 ? 'text-red-600' : 'text-green-600'}
          bg={urgencias_criticas > 0 ? 'bg-red-50' : 'bg-white'}
        />
        <KpiCard
          label="Tiempo Prom. Admisión"
          value={`${tiempo_promedio_admision_horas}h`}
          sub={meta.tiempo_ok ? 'Dentro del objetivo (≤3h)' : 'Sobre objetivo — revisar'}
          color={meta.tiempo_ok ? 'text-green-600' : 'text-red-600'}
        />
        <KpiCard
          label="Camas en Limpieza"
          value={camas_en_limpieza}
          sub="Pendientes de liberación"
          color={camas_en_limpieza > 4 ? 'text-amber-600' : 'text-gray-700'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline urgencias */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Pipeline — Urgencias en Espera</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pacientes pendientes de asignación de cama</p>
            </div>
            {urgencias_criticas > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
                {urgencias_criticas} crítico{urgencias_criticas > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {pipeline_urgencias.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              Sin pacientes en espera
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pipeline_urgencias.map((p, i) => (
                <div key={i} className={`px-5 py-3.5 ${p.critico ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.critico ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="font-semibold text-gray-900 text-sm">{p.nombre}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 ml-4">{p.diagnostico}</div>
                      {p.comorbilidades && p.comorbilidades !== 'Ninguna' && (
                        <div className="text-xs text-gray-400 ml-4">{p.comorbilidades}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.horas_espera}h
                      </div>
                      <div className="text-xs text-gray-400">en espera</div>
                      <div className="text-xs mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-center">
                        {p.prevision}
                      </div>
                    </div>
                  </div>
                  {/* Wait bar */}
                  <div className="mt-2 ml-4 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${p.critico ? 'bg-red-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min((p.horas_espera / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avg admission time by unit */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1 text-sm">Tiempo Promedio de Admisión por Unidad</h2>
          <p className="text-xs text-gray-400 mb-4">Desde orden en Urgencias hasta ingreso efectivo (horas)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart_tiempos} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="unidad" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}h`, 'Tiempo promedio']} />
              <Bar dataKey="tiempo_promedio" radius={[4, 4, 0, 0]}>
                {chart_tiempos.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.tiempo_promedio > 4 ? '#ef4444' : entry.tiempo_promedio > 2.5 ? '#f97316' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[
              { color: 'bg-green-500', label: '≤ 2.5h  Óptimo' },
              { color: 'bg-orange-400', label: '≤ 4h  Aceptable' },
              { color: 'bg-red-500', label: '> 4h  Cuello de botella' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alertas_complejidad.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <h2 className="font-semibold text-gray-800 text-sm">Alertas de Complejidad y Larga Data</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {alertas_complejidad.map((a, i) => {
              const style = ALERTA_STYLE[a.tipo] || ALERTA_STYLE.larga_data
              return (
                <div key={i} className={`px-5 py-3.5 flex items-start gap-4 border-l-4 ${style.bg}`}>
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{a.nombre}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                        {style.badge}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{a.diagnostico} · {a.prevision}</div>
                    <div className={`text-xs mt-1 font-medium ${style.text}`}>{a.mensaje}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${style.text}`}>{a.dias}d</div>
                    <div className="text-xs text-gray-400">{a.unidad}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const IconBarChart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const IconTrending = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)
const IconActivity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const TABS = [
  { id: 'gerencial',   label: 'Gerencial',   icon: <IconBarChart />,  sub: 'Macro y tendencias'      },
  { id: 'financiero',  label: 'Financiero',  icon: <IconTrending />,  sub: 'Cuentas por previsión'   },
  { id: 'operaciones', label: 'Operaciones', icon: <IconActivity />,  sub: 'Flujos y cuellos botella'},
]

export default function Dashboard() {
  const [tab, setTab] = useState('gerencial')
  const [dashData,  setDashData]  = useState(null)
  const [finData,   setFinData]   = useState(null)
  const [opsData,   setOpsData]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboard(),
      getDashboardFinanciero(),
      getDashboardOperaciones(),
    ]).then(([d, f, o]) => {
      setDashData(d.data)
      setFinData(f.data)
      setOpsData(o.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Centro de Control</h1>
          <p className="text-gray-400 text-sm mt-0.5">Indicadores en tiempo real — Clínica BUPA Santiago</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white shadow-sm text-[#003087]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex-shrink-0">{t.icon}</span>
              <div className="text-left">
                <div className="leading-tight">{t.label}</div>
                <div className="text-[10px] font-normal text-gray-400 leading-none">{t.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'gerencial'   && <TabGerencial    data={dashData} />}
      {tab === 'financiero'  && <TabFinanciero   data={finData}  />}
      {tab === 'operaciones' && <TabOperaciones  data={opsData}  />}
    </div>
  )
}
