import { useEffect, useState } from 'react'
import {
  getDashboard,
  getDashboardFinanciero,
  getDashboardOperaciones,
} from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadialBarChart, RadialBar,
  AreaChart, Area,
} from 'recharts'

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const fmtM = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return fmt(n)
}

// ── Color palette ─────────────────────────────────────────────────────────────

const PREV_COLORS = {
  FONASA: '#3b82f6', ISAPRE: '#8b5cf6',
  'Ley Urgencia': '#f97316', GES: '#14b8a6', Particular: '#6b7280',
}
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#14b8a6', '#6b7280']
const UNIT_COLORS = {
  UCI: '#ef4444', UTI: '#f97316', MQ: '#3b82f6',
  Recuperacion: '#14b8a6', Urgencia: '#8b5cf6',
}
const RIESGO_STYLE = {
  Bajo:  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Medio: { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  Alto:  { bg: 'bg-red-100',     text: 'text-red-700'     },
}

// ── Simulated trend data ──────────────────────────────────────────────────────

const TENDENCIA_7D = [
  { dia: 'Lun', ocupacion: 71, facturacion: 28.5 },
  { dia: 'Mar', ocupacion: 74, facturacion: 30.1 },
  { dia: 'Mié', ocupacion: 68, facturacion: 27.8 },
  { dia: 'Jue', ocupacion: 77, facturacion: 31.4 },
  { dia: 'Vie', ocupacion: 80, facturacion: 33.2 },
  { dia: 'Sáb', ocupacion: 75, facturacion: 29.9 },
  { dia: 'Hoy', ocupacion: null, facturacion: null },
]

// ── Shared UI components ──────────────────────────────────────────────────────

function ViewToggle({ views, active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            active === v.id
              ? 'bg-white shadow text-[#003087]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, trend, color = 'text-gray-900', bg = 'bg-white', icon, alert }) {
  return (
    <div className={`${bg} rounded-xl border border-gray-100 shadow-sm p-5 relative overflow-hidden`}>
      {alert && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-1.5 ${color}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1 leading-tight">{sub}</p>}
      {trend !== undefined && (
        <div className={`text-xs font-semibold mt-2 ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs ayer
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-gray-800 text-base">{title}</h2>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function AlertaBadge({ tipo }) {
  const styles = {
    critical: 'bg-red-100 text-red-700 border border-red-200',
    warning:  'bg-amber-100 text-amber-700 border border-amber-200',
    info:     'bg-blue-100 text-blue-700 border border-blue-200',
  }
  const labels = { critical: '🔴 Crítico', warning: '🟡 Atención', info: '🔵 Info' }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[tipo]}`}>
      {labels[tipo]}
    </span>
  )
}

// ── Score Gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Operación Saludable' : score >= 50 ? 'Requiere Atención' : 'Estado Crítico'
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: '#f3f4f6' }]
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <RadialBarChart width={180} height={180} cx={90} cy={90} innerRadius={55} outerRadius={80}
          startAngle={180} endAngle={0} data={data}>
          <RadialBar dataKey="value" cornerRadius={8} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-400 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB GERENCIA
// ═══════════════════════════════════════════════════════════════════════════════

function TabGerencia({ dashData, finData, opsData, view }) {
  const { resumen_camas, por_unidad, por_prevision, financiero, urgencias_en_espera } = dashData
  const { total_facturacion, total_riesgo } = finData
  const { tiempo_promedio_admision_horas, urgencias_criticas, alertas_complejidad, meta } = opsData

  // Compute operational score
  let score = 100
  if (resumen_camas.ocupacion_pct > 95) score -= 20
  else if (resumen_camas.ocupacion_pct > 85) score -= 10
  if (tiempo_promedio_admision_horas > 3) score -= 15
  if (urgencias_criticas > 0) score -= 15
  if (total_facturacion > 0 && total_riesgo / total_facturacion > 0.3) score -= 15
  const avgDias = finData.breakdown?.reduce((s, b) => s + b.dias_promedio * b.count, 0) /
    (finData.breakdown?.reduce((s, b) => s + b.count, 0) || 1)
  if (avgDias > 7) score -= 10
  if (resumen_camas.limpieza > resumen_camas.total * 0.15) score -= 10
  if (alertas_complejidad.length > 3) score -= 15
  score = Math.max(0, score)

  const eficienciaFlujo = opsData.chart_tiempos?.length > 0
    ? Math.round(opsData.chart_tiempos.filter(u => u.tiempo_promedio <= 3).length / opsData.chart_tiempos.length * 100)
    : 100

  const barData = Object.entries(por_unidad).map(([u, v]) => ({
    unidad: u, Ocupadas: v.ocupadas, Libres: v.libres,
  }))

  const tendencia = TENDENCIA_7D.map((d, i) =>
    i === TENDENCIA_7D.length - 1
      ? { ...d, ocupacion: resumen_camas.ocupacion_pct, facturacion: +(total_facturacion / 1_000_000).toFixed(1) }
      : d
  )

  const alertasFinancieras = finData.breakdown?.filter(b => b.dinero_en_riesgo > 0).length || 0
  const alertasOperativas = alertas_complejidad.length
  const totalAlertas = alertasFinancieras + alertasOperativas + (urgencias_criticas > 0 ? 1 : 0)

  // ── Vista A: Executive Summary ──────────────────────────────────────────────
  if (view === 'A') return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-5">
        {/* Score principal */}
        <div className="col-span-3">
          <Card className="p-6 flex flex-col items-center justify-center h-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Score Operacional</p>
            <ScoreGauge score={score} />
            <div className="mt-3 w-full space-y-1.5">
              {[
                { label: 'Ocupación', ok: resumen_camas.ocupacion_pct <= 85 },
                { label: 'Flujo admisión', ok: meta.tiempo_ok },
                { label: 'Sin esperas críticas', ok: meta.sin_espera_critica },
                { label: 'Riesgo financiero', ok: total_facturacion === 0 || total_riesgo / total_facturacion <= 0.3 },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className={ok ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                    {ok ? '✓ OK' : '✗ Alerta'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* KPIs macro */}
        <div className="col-span-9 grid grid-cols-3 gap-4">
          <KpiCard
            label="Índice de Ocupación"
            value={`${resumen_camas.ocupacion_pct}%`}
            sub={`${resumen_camas.ocupadas} de ${resumen_camas.total} camas activas`}
            color={resumen_camas.ocupacion_pct > 85 ? 'text-red-600' : 'text-emerald-600'}
            bg={resumen_camas.ocupacion_pct > 85 ? 'bg-red-50' : 'bg-emerald-50'}
            icon="🏥"
            trend={3.2}
          />
          <KpiCard
            label="Eficiencia de Flujo"
            value={`${eficienciaFlujo}%`}
            sub={`Admisiones en ≤3h · Prom ${tiempo_promedio_admision_horas}h`}
            color={eficienciaFlujo >= 80 ? 'text-emerald-600' : 'text-amber-600'}
            icon="⏱️"
          />
          <KpiCard
            label="Facturación Activa"
            value={fmtM(total_facturacion)}
            sub="Pacientes hospitalizados hoy"
            color="text-blue-700"
            icon="💰"
            trend={5.1}
          />
          <KpiCard
            label="Tasa de Riesgo"
            value={total_facturacion > 0 ? `${((total_riesgo / total_facturacion) * 100).toFixed(1)}%` : '—'}
            sub={`${fmtM(total_riesgo)} comprometidos`}
            color={total_riesgo / total_facturacion > 0.3 ? 'text-red-600' : 'text-amber-600'}
            bg={total_riesgo / total_facturacion > 0.3 ? 'bg-red-50' : 'bg-white'}
            icon="⚠️"
            alert={total_riesgo / total_facturacion > 0.3}
          />
          <KpiCard
            label="Alertas Abiertas"
            value={totalAlertas}
            sub={`${alertasOperativas} operativas · ${alertasFinancieras} financieras`}
            color={totalAlertas > 3 ? 'text-red-600' : 'text-amber-600'}
            bg={totalAlertas > 3 ? 'bg-red-50' : 'bg-amber-50'}
            icon="🚨"
            alert={totalAlertas > 0}
          />
          <KpiCard
            label="Urgencias en Espera"
            value={urgencias_en_espera}
            sub={urgencias_criticas > 0 ? `${urgencias_criticas} críticos (>4h)` : 'Sin casos críticos'}
            color={urgencias_criticas > 0 ? 'text-red-600' : 'text-gray-700'}
            bg={urgencias_criticas > 0 ? 'bg-red-50' : 'bg-white'}
            icon="🚑"
          />
        </div>
      </div>

      {/* Top 3 alertas críticas */}
      {totalAlertas > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h3 className="font-bold text-gray-800 text-sm">Alertas Críticas Activas</h3>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
              {totalAlertas} abiertas
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {urgencias_criticas > 0 && (
              <div className="px-5 py-3.5 flex items-center gap-4">
                <AlertaBadge tipo="critical" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pacientes en espera crítica (&gt;4h)</p>
                  <p className="text-xs text-gray-400">{urgencias_criticas} paciente(s) en urgencias sin cama asignada</p>
                </div>
              </div>
            )}
            {alertas_complejidad.slice(0, 3).map((a, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <AlertaBadge tipo={a.tipo === 'escalada_potencial' ? 'warning' : 'critical'} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.nombre}</p>
                  <p className="text-xs text-gray-400">{a.mensaje}</p>
                </div>
                <span className="ml-auto text-sm font-bold text-gray-500">{a.dias}d</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  // ── Vista B: Cuadro de Mando Integral ──────────────────────────────────────
  if (view === 'B') return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5">
        {/* KPI vs Meta table */}
        <Card>
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm">KPIs vs Meta — Semáforo</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              {
                kpi: 'Ocupación Global', valor: `${resumen_camas.ocupacion_pct}%`, meta: '75–85%',
                ok: resumen_camas.ocupacion_pct >= 60 && resumen_camas.ocupacion_pct <= 85,
                warn: resumen_camas.ocupacion_pct > 85 && resumen_camas.ocupacion_pct <= 95,
              },
              {
                kpi: 'Tiempo Promedio Admisión', valor: `${tiempo_promedio_admision_horas}h`, meta: '≤ 3h',
                ok: tiempo_promedio_admision_horas <= 3,
                warn: tiempo_promedio_admision_horas > 3 && tiempo_promedio_admision_horas <= 5,
              },
              {
                kpi: 'Eficiencia de Flujo', valor: `${eficienciaFlujo}%`, meta: '> 80%',
                ok: eficienciaFlujo >= 80,
                warn: eficienciaFlujo >= 60 && eficienciaFlujo < 80,
              },
              {
                kpi: 'Tasa de Riesgo Financiero',
                valor: total_facturacion > 0 ? `${((total_riesgo / total_facturacion) * 100).toFixed(1)}%` : '0%',
                meta: '< 20%',
                ok: total_facturacion === 0 || total_riesgo / total_facturacion < 0.2,
                warn: total_facturacion > 0 && total_riesgo / total_facturacion >= 0.2 && total_riesgo / total_facturacion < 0.3,
              },
              {
                kpi: 'Urgencias Críticas', valor: urgencias_criticas, meta: '0',
                ok: urgencias_criticas === 0, warn: false,
              },
              {
                kpi: 'Score Operacional', valor: score, meta: '≥ 75',
                ok: score >= 75, warn: score >= 50 && score < 75,
              },
            ].map(({ kpi, valor, meta, ok, warn }) => {
              const semaforo = ok ? '🟢' : warn ? '🟡' : '🔴'
              const rowBg = ok ? '' : warn ? 'bg-amber-50' : 'bg-red-50'
              return (
                <div key={kpi} className={`px-5 py-3 flex items-center ${rowBg}`}>
                  <span className="text-base mr-3">{semaforo}</span>
                  <span className="text-sm text-gray-800 flex-1 font-medium">{kpi}</span>
                  <span className="text-sm font-black text-gray-900 mr-4">{valor}</span>
                  <span className="text-xs text-gray-400">Meta: {meta}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Desempeño por unidad */}
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4">Desempeño por Unidad</h3>
          <div className="space-y-3">
            {Object.entries(por_unidad).map(([unidad, vals]) => {
              const pct = vals.total > 0 ? Math.round(vals.ocupadas / vals.total * 100) : 0
              const color = UNIT_COLORS[unidad] || '#6b7280'
              const alertaUnidad = alertas_complejidad.filter(a => a.unidad === unidad).length
              return (
                <div key={unidad}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-xs font-semibold text-gray-700">{unidad}</span>
                      {alertaUnidad > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                          {alertaUnidad} alerta{alertaUnidad > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black" style={{ color }}>{pct}%</span>
                      <span className="text-xs text-gray-400 ml-1">{vals.ocupadas}/{vals.total}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Mix de Pacientes por Previsión</h3>
          <p className="text-xs text-gray-400 mb-4">Quién paga y cuánto representa</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={por_prevision} cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={11}>
                {por_prevision.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Ocupación por Unidad</h3>
          <p className="text-xs text-gray-400 mb-4">Camas ocupadas vs disponibles</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="unidad" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="Ocupadas" fill="#ef4444" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Libres"   fill="#22c55e" radius={[0, 3, 3, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )

  // ── Vista C: Tendencias ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Score Semanal Promedio" value={`${Math.round((score + 72 + 68 + 75 + 71) / 5)}`}
          sub="Promedio últimos 5 días" color="text-blue-700" icon="📊" />
        <KpiCard label="Tendencia Ocupación" value="▲ +3.2%" sub="vs semana anterior" color="text-emerald-600" icon="📈" />
        <KpiCard label="Facturación Acumulada (7d)" value={fmtM(total_facturacion * 1.8)}
          sub="Estimado semana corriente" color="text-blue-700" icon="💳" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Tendencia de Ocupación (7 días)</h3>
          <p className="text-xs text-gray-400 mb-4">% camas ocupadas — últimos 7 días</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tendencia}>
              <defs>
                <linearGradient id="gradOcup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003087" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#003087" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Ocupación']} />
              <Area type="monotone" dataKey="ocupacion" stroke="#003087" strokeWidth={2.5}
                fill="url(#gradOcup)" dot={{ r: 4, fill: '#003087' }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-1">Facturación Estimada (7 días)</h3>
          <p className="text-xs text-gray-400 mb-4">Millones CLP — evolución de la semana</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tendencia}>
              <defs>
                <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`$${v}M`, 'Facturación']} />
              <Area type="monotone" dataKey="facturacion" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#gradFact)" dot={{ r: 4, fill: '#3b82f6' }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-1">Score Operacional 7 días</h3>
        <p className="text-xs text-gray-400 mb-4">Evolución del índice compuesto de salud del sistema</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={[
            { dia: 'Lun', score: 72 }, { dia: 'Mar', score: 68 }, { dia: 'Mié', score: 75 },
            { dia: 'Jue', score: 71 }, { dia: 'Vie', score: 78 }, { dia: 'Sáb', score: 74 },
            { dia: 'Hoy', score },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, 'Score']} />
            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5}
              dot={{ r: 4, fill: '#8b5cf6' }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB FINANZAS
// ═══════════════════════════════════════════════════════════════════════════════

function TabFinanzas({ finData, view }) {
  const { breakdown = [], total_facturacion, total_riesgo, chart_data = [] } = finData

  const tarifaEfectivaData = breakdown.map(b => ({
    name: b.prevision,
    tarifa: b.dias_totales > 0 ? Math.round(b.facturacion_estimada / b.dias_totales / 1000) : 0,
  }))

  const ticketPromedio = breakdown.length > 0
    ? total_facturacion / breakdown.reduce((s, b) => s + b.count, 0)
    : 0

  const pctRiesgo = total_facturacion > 0 ? (total_riesgo / total_facturacion * 100).toFixed(1) : 0

  // ── Vista A: Control de Caja ────────────────────────────────────────────────
  if (view === 'A') {
    const topPacientes = breakdown
      .flatMap(b => b.pacientes_larga_data.map(p => ({ ...p, prevision: b.prevision })))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)

    const alertasActivas = [
      ...breakdown.filter(b => b.prevision === 'Ley Urgencia' && b.pacientes_larga_data.some(p => p.dias > 3))
        .map(b => ({ tipo: 'critical', msg: `Ley Urgencia: ${b.count} pacs. → cobertura con tope FONASA MLE` })),
      ...breakdown.filter(b => b.prevision === 'GES' && b.pacientes_larga_data.length > 0)
        .map(b => ({ tipo: 'warning', msg: `GES: ${b.pacientes_larga_data.length} pacs. larga data → tarifa regulada` })),
      ...(pctRiesgo > 30 ? [{ tipo: 'critical', msg: `${pctRiesgo}% de la cartera en riesgo — supera umbral 30%` }] : []),
    ]

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Facturación Total Activa" value={fmtM(total_facturacion)}
            sub="Pacientes hospitalizados hoy" color="text-blue-700" icon="💵" />
          <KpiCard label="Dinero en Riesgo" value={fmtM(total_riesgo)}
            sub="Larga data · cobertura incierta"
            color={pctRiesgo > 30 ? 'text-red-600' : 'text-amber-600'}
            bg={pctRiesgo > 30 ? 'bg-red-50' : 'bg-amber-50'}
            icon="⚠️" alert={pctRiesgo > 30} />
          <KpiCard label="Ticket Promedio" value={fmtM(ticketPromedio)}
            sub="Por paciente hospitalizado" color="text-gray-800" icon="🧾" />
          <KpiCard label="Tasa de Riesgo" value={`${pctRiesgo}%`}
            sub="Del total facturado"
            color={pctRiesgo > 30 ? 'text-red-600' : 'text-amber-600'}
            bg={pctRiesgo > 30 ? 'bg-red-50' : 'bg-white'}
            icon="📉" />
        </div>

        {alertasActivas.length > 0 && (
          <Card>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <h3 className="font-bold text-gray-800 text-sm">Alertas Financieras Tempranas</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {alertasActivas.map((a, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <AlertaBadge tipo={a.tipo} />
                  <p className="text-sm text-gray-700">{a.msg}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {topPacientes.length > 0 && (
          <Card>
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Top 5 — Cuentas de Mayor Valor</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pacientes con estadía ≥ 7 días</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#', 'Paciente', 'Previsión', 'Unidad', 'Días', 'Cuenta Est.'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topPacientes.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 font-bold text-xs">#{i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{p.nombre}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: (PREV_COLORS[p.prevision] || '#999') + '20', color: PREV_COLORS[p.prevision] || '#666' }}>
                        {p.prevision}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.unidad}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{p.dias}d</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-red-700">{fmt(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    )
  }

  // ── Vista B: Distribución de Ingresos ──────────────────────────────────────
  if (view === 'B') {
    const donutData = breakdown.map(b => ({ name: b.prevision, value: b.facturacion_estimada }))
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-5">
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Distribución por Previsión</h3>
            <p className="text-xs text-gray-400 mb-3">Peso % en facturación total</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" outerRadius={80} innerRadius={50}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmtM(v), 'Facturación']} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Facturación vs Riesgo</h3>
            <p className="text-xs text-gray-400 mb-3">Por tipo de previsión</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart_data} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmt(v)]} />
                <Legend iconSize={10} />
                <Bar dataKey="Facturación" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Riesgo" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Tarifa Diaria Efectiva</h3>
            <p className="text-xs text-gray-400 mb-3">Miles CLP / día por previsión</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tarifaEfectivaData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={85} />
                <Tooltip formatter={(v) => [`$${v}K/día`]} />
                <Bar dataKey="tarifa" radius={[0, 4, 4, 0]}>
                  {tarifaEfectivaData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Tarjetas por previsión */}
        <div>
          <h3 className="font-bold text-gray-800 text-sm mb-3">Desglose Detallado por Previsión</h3>
          <div className="grid grid-cols-5 gap-3">
            {breakdown.map((b) => {
              const rs = RIESGO_STYLE[b.riesgo] || RIESGO_STYLE.Medio
              const pct = total_facturacion > 0 ? ((b.facturacion_estimada / total_facturacion) * 100).toFixed(0) : 0
              const color = PREV_COLORS[b.prevision] || '#999'
              return (
                <Card key={b.prevision} className="p-4 overflow-hidden" style={{ borderTop: `3px solid ${color}` }}>
                  <div className="text-xs font-bold text-gray-800 truncate">{b.label}</div>
                  <div className="text-[10px] text-gray-400 mb-3">{b.cobertura}</div>
                  <div className="text-2xl font-black text-gray-900">{b.count}</div>
                  <div className="text-[10px] text-gray-400">pacientes</div>
                  <div className="mt-2 text-sm font-bold text-blue-700">{fmtM(b.facturacion_estimada)}</div>
                  <div className="text-[10px] text-gray-400">{pct}% del total</div>
                  <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                    <span>Días prom.</span><span className="font-bold">{b.dias_promedio}d</span>
                  </div>
                  {b.dinero_en_riesgo > 0 && (
                    <div className="mt-1.5 text-[10px] text-red-600 font-semibold">{fmtM(b.dinero_en_riesgo)} riesgo</div>
                  )}
                  <div className={`mt-2 text-[10px] px-2 py-0.5 rounded-full inline-block font-bold ${rs.bg} ${rs.text}`}>
                    Riesgo {b.riesgo}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Vista C: Radar de Riesgo ────────────────────────────────────────────────
  const pacientesRiesgo = breakdown
    .flatMap(b => b.pacientes_larga_data.map(p => ({ ...p, prevision: b.prevision, riesgo: b.riesgo })))
    .sort((a, b) => b.dias - a.dias)

  const diasParaAlerta = breakdown
    .flatMap(b => b.pacientes_larga_data
      .filter(p => p.dias < 10)
      .map(p => ({ ...p, prevision: b.prevision, diasRestantes: 10 - p.dias }))
    )
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pacientes en Riesgo" value={pacientesRiesgo.length}
          sub="Estadía ≥ 7 días — cobertura incierta"
          color={pacientesRiesgo.length > 3 ? 'text-red-600' : 'text-amber-600'}
          bg={pacientesRiesgo.length > 3 ? 'bg-red-50' : 'bg-white'}
          icon="🚨" alert={pacientesRiesgo.length > 0} />
        <KpiCard label="Dinero en Riesgo" value={fmtM(total_riesgo)}
          sub={`${pctRiesgo}% de facturación total`}
          color="text-red-700" bg="bg-red-50" icon="💸" />
        <KpiCard label="Próximos a Alerta" value={diasParaAlerta.length}
          sub="Llegarán a 7 días en < 4 días"
          color="text-amber-600" bg="bg-amber-50" icon="⏰" />
      </div>

      {/* Semáforo de riesgo */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Radar de Riesgo — Todos los Pacientes</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pacientes con estadía ≥ 7 días con semáforo de urgencia</p>
        </div>
        {pacientesRiesgo.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            ✅ No hay pacientes con riesgo financiero activo
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Riesgo', 'Paciente', 'Previsión', 'Unidad', 'Días', 'Valor', 'Acción'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pacientesRiesgo.map((p, i) => {
                const semaforo = p.dias >= 10 ? '🔴' : p.dias >= 7 ? '🟡' : '🟢'
                const rs = RIESGO_STYLE[p.riesgo] || RIESGO_STYLE.Medio
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${p.dias >= 10 ? 'bg-red-50' : ''}`}>
                    <td className="px-5 py-3 text-xl">{semaforo}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{p.nombre}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: (PREV_COLORS[p.prevision] || '#999') + '20', color: PREV_COLORS[p.prevision] || '#666' }}>
                        {p.prevision}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.unidad}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.dias >= 10 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.dias}d
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-red-700">{fmt(p.valor)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${rs.bg} ${rs.text}`}>
                        {p.dias >= 10 ? 'Contactar financiero' : 'Monitorear'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Próximos alertas */}
      {diasParaAlerta.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="font-bold text-amber-800 text-sm">⏰ Próximos en Entrar a Riesgo</h3>
            <p className="text-xs text-amber-500 mt-0.5">Pacientes que llegarán a 7 días en los próximos 4 días</p>
          </div>
          <div className="divide-y divide-gray-50">
            {diasParaAlerta.map((p, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm">
                  {p.diasRestantes}d
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.prevision} · {p.unidad} · {p.dias} días actuales</p>
                </div>
                <div className="ml-auto font-bold text-gray-600">{fmt(p.valor)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════════

function TabOperaciones({ dashData, opsData, view }) {
  const {
    pipeline_urgencias = [], total_en_espera, urgencias_criticas,
    tiempo_promedio_admision_horas, camas_en_limpieza,
    alertas_complejidad = [], chart_tiempos = [], meta,
  } = opsData
  const { resumen_camas, por_unidad } = dashData

  const ocupacionPct = resumen_camas.ocupacion_pct

  // ── Vista A: Control de Flujo ───────────────────────────────────────────────
  if (view === 'A') return (
    <div className="space-y-6">
      {/* Semáforo global */}
      <div className={`rounded-xl px-6 py-4 flex items-center gap-4 ${
        urgencias_criticas > 0 || ocupacionPct > 95
          ? 'bg-red-600 text-white'
          : urgencias_criticas > 0 || !meta.tiempo_ok
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-500 text-white'
      }`}>
        <div className="text-4xl">
          {urgencias_criticas > 0 || ocupacionPct > 95 ? '🔴' : !meta.tiempo_ok ? '🟡' : '🟢'}
        </div>
        <div>
          <p className="font-black text-lg">
            {urgencias_criticas > 0 ? 'Estado Crítico — Acción Inmediata Requerida'
              : !meta.tiempo_ok ? 'Atención Requerida — Flujo con Problemas'
              : 'Sistema Operando Normalmente'}
          </p>
          <p className="text-sm opacity-80 mt-0.5">
            {urgencias_criticas > 0
              ? `${urgencias_criticas} paciente(s) esperan más de 4h sin cama asignada`
              : meta.tiempo_ok
              ? `Tiempo promedio de admisión: ${tiempo_promedio_admision_horas}h ✓`
              : `Tiempo promedio de admisión: ${tiempo_promedio_admision_horas}h — supera objetivo de 3h`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Pacientes en Espera" value={total_en_espera}
          sub="Urgencias sin cama asignada"
          color={total_en_espera > 2 ? 'text-amber-600' : 'text-gray-800'}
          bg={total_en_espera > 2 ? 'bg-amber-50' : 'bg-white'} icon="🚑" />
        <KpiCard label="Esperas Críticas >4h" value={urgencias_criticas}
          sub="Requieren asignación inmediata"
          color={urgencias_criticas > 0 ? 'text-red-600' : 'text-emerald-600'}
          bg={urgencias_criticas > 0 ? 'bg-red-50' : 'bg-emerald-50'}
          icon={urgencias_criticas > 0 ? '🚨' : '✅'} alert={urgencias_criticas > 0} />
        <KpiCard label="Tiempo Prom. Admisión" value={`${tiempo_promedio_admision_horas}h`}
          sub={meta.tiempo_ok ? '✓ Dentro del objetivo (≤3h)' : '✗ Sobre el objetivo de 3h'}
          color={meta.tiempo_ok ? 'text-emerald-600' : 'text-red-600'} icon="⏱️" />
        <KpiCard label="Camas en Limpieza" value={camas_en_limpieza}
          sub={`${Math.round(camas_en_limpieza / resumen_camas.total * 100)}% del total`}
          color={camas_en_limpieza > 4 ? 'text-amber-600' : 'text-gray-700'} icon="🧹" />
      </div>

      {/* Pipeline en tiempo real */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Pipeline — Urgencias en Tiempo Real</h3>
            <p className="text-xs text-gray-400 mt-0.5">Pacientes pendientes de asignación de cama</p>
          </div>
          {urgencias_criticas > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold animate-pulse">
              {urgencias_criticas} CRÍTICO{urgencias_criticas > 1 ? 'S' : ''}
            </span>
          )}
        </div>
        {pipeline_urgencias.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            ✅ Sin pacientes en espera actualmente
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pipeline_urgencias.map((p, i) => (
              <div key={i} className={`px-5 py-4 ${p.critico ? 'bg-red-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${p.critico ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{p.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.diagnostico}</p>
                      {p.comorbilidades && p.comorbilidades !== 'Ninguna' && (
                        <p className="text-xs text-gray-400 mt-0.5">⚕ {p.comorbilidades}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${p.critico ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.horas_espera}h
                    </div>
                    <div className="text-xs text-gray-400">esperando</div>
                    <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {p.prevision}
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${p.critico ? 'bg-red-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min((p.horas_espera / 8) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0h</span><span className="text-red-400 font-semibold">4h crítico</span><span>8h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )

  // ── Vista B: Mapa de Unidades ───────────────────────────────────────────────
  if (view === 'B') {
    const unidadData = Object.entries(por_unidad).map(([u, v]) => ({
      unidad: u, pct: v.total > 0 ? Math.round(v.ocupadas / v.total * 100) : 0,
      ocupadas: v.ocupadas, total: v.total, libres: v.libres,
      alertas: alertas_complejidad.filter(a => a.unidad === u).length,
      color: UNIT_COLORS[u] || '#6b7280',
    }))

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Ocupación Global" value={`${ocupacionPct}%`}
            sub={`${resumen_camas.ocupadas}/${resumen_camas.total} camas`}
            color={ocupacionPct > 85 ? 'text-red-600' : 'text-emerald-600'}
            icon="📊" />
          <KpiCard label="Tiempo Promedio Admisión" value={`${tiempo_promedio_admision_horas}h`}
            sub="Por unidad — promedio global"
            color={meta.tiempo_ok ? 'text-emerald-600' : 'text-red-600'} icon="⏱️" />
          <KpiCard label="Alertas de Complejidad" value={alertas_complejidad.length}
            sub="Escaladas potenciales + larga data"
            color={alertas_complejidad.length > 3 ? 'text-red-600' : 'text-amber-600'} icon="⚠️"
            alert={alertas_complejidad.length > 0} />
        </div>

        {/* Mapa de unidades */}
        <div className="grid grid-cols-5 gap-3">
          {unidadData.map((u) => (
            <Card key={u.unidad} className="p-4 overflow-hidden" style={{ borderTop: `3px solid ${u.color}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-800 text-sm">{u.unidad}</span>
                {u.alertas > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                    {u.alertas}⚠
                  </span>
                )}
              </div>
              <div className="text-3xl font-black" style={{ color: u.color }}>{u.pct}%</div>
              <div className="text-xs text-gray-400 mt-0.5">{u.ocupadas}/{u.total} camas</div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${u.pct}%`, background: u.color }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px]">
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <div className="font-bold text-gray-800">{u.libres}</div>
                  <div className="text-gray-400">libres</div>
                </div>
                <div className={`rounded p-1.5 text-center ${u.pct > 85 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <div className={`font-bold ${u.pct > 85 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {u.pct > 95 ? 'Crítico' : u.pct > 85 ? 'Alto' : 'OK'}
                  </div>
                  <div className="text-gray-400">estado</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Tiempo de Admisión por Unidad</h3>
            <p className="text-xs text-gray-400 mb-4">Horas desde urgencias hasta cama (promedio)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart_tiempos} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="unidad" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}h`, 'Tiempo promedio']} />
                <Bar dataKey="tiempo_promedio" radius={[4, 4, 0, 0]}>
                  {chart_tiempos.map((e, i) => (
                    <Cell key={i}
                      fill={e.tiempo_promedio > 4 ? '#ef4444' : e.tiempo_promedio > 2.5 ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { color: 'bg-emerald-500', label: '≤2.5h Óptimo' },
                { color: 'bg-amber-400', label: '≤4h Aceptable' },
                { color: 'bg-red-500', label: '>4h Crítico' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Ocupación por Unidad</h3>
            <p className="text-xs text-gray-400 mb-4">Camas ocupadas vs disponibles</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={Object.entries(por_unidad).map(([u, v]) => ({ unidad: u, Ocupadas: v.ocupadas, Libres: v.libres }))}
                layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="unidad" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="Ocupadas" fill="#ef4444" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Libres"   fill="#22c55e" radius={[0, 3, 3, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    )
  }

  // ── Vista C: Panel de Alertas ───────────────────────────────────────────────
  const alertasCriticas = [
    ...pipeline_urgencias.filter(p => p.critico).map(p => ({
      tipo: 'critical',
      titulo: `Espera crítica: ${p.nombre}`,
      detalle: `${p.horas_espera}h en urgencias sin cama · ${p.diagnostico}`,
      accion: 'Asignar cama urgente',
      orden: 0,
    })),
    ...alertas_complejidad.filter(a => a.tipo === 'escalada_potencial').map(a => ({
      tipo: 'warning',
      titulo: `Posible escalada: ${a.nombre}`,
      detalle: `${a.mensaje} · ${a.diagnostico}`,
      accion: 'Evaluar traslado UCI/UTI',
      orden: 1,
    })),
    ...alertas_complejidad.filter(a => a.tipo === 'larga_data').map(a => ({
      tipo: 'warning',
      titulo: `Larga estadía: ${a.nombre}`,
      detalle: `${a.dias} días en ${a.unidad} · ${a.prevision}`,
      accion: 'Revisar plan de alta',
      orden: 2,
    })),
    ...(camas_en_limpieza > 4 ? [{
      tipo: 'info',
      titulo: `${camas_en_limpieza} camas bloqueadas en limpieza`,
      detalle: 'Camas no disponibles para nuevos ingresos',
      accion: 'Coordinar aseo',
      orden: 3,
    }] : []),
  ].sort((a, b) => a.orden - b.orden)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Críticas', count: alertasCriticas.filter(a => a.tipo === 'critical').length, color: 'text-red-600', bg: 'bg-red-50', icon: '🔴' },
          { label: 'Atención', count: alertasCriticas.filter(a => a.tipo === 'warning').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' },
          { label: 'Informativas', count: alertasCriticas.filter(a => a.tipo === 'info').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: '🔵' },
          { label: 'Total activas', count: alertasCriticas.length, color: 'text-gray-800', bg: 'bg-white', icon: '📋' },
        ].map(({ label, count, color, bg, icon }) => (
          <KpiCard key={label} label={label} value={count} color={color} bg={bg} icon={icon}
            alert={count > 0 && label !== 'Total activas'} />
        ))}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">Panel de Alertas — Ordenadas por Urgencia</h3>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {alertasCriticas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500 font-semibold">Sin alertas operativas activas</p>
            <p className="text-xs text-gray-400 mt-1">El sistema opera dentro de parámetros normales</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alertasCriticas.map((a, i) => {
              const styles = {
                critical: 'border-l-4 border-red-500 bg-red-50',
                warning:  'border-l-4 border-amber-400 bg-amber-50',
                info:     'border-l-4 border-blue-400 bg-blue-50',
              }
              const accionStyles = {
                critical: 'bg-red-600 text-white hover:bg-red-700',
                warning:  'bg-amber-500 text-white hover:bg-amber-600',
                info:     'bg-blue-500 text-white hover:bg-blue-600',
              }
              return (
                <div key={i} className={`px-5 py-4 flex items-center gap-4 ${styles[a.tipo]}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertaBadge tipo={a.tipo} />
                      <span className="font-bold text-gray-900 text-sm">{a.titulo}</span>
                    </div>
                    <p className="text-xs text-gray-500">{a.detalle}</p>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${accionStyles[a.tipo]}`}>
                    {a.accion}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  {
    id: 'gerencia',
    label: 'Gerencia',
    icon: '📊',
    sub: 'Vista Macro',
    views: [
      { id: 'A', label: 'A — Executive Summary' },
      { id: 'B', label: 'B — Cuadro de Mando' },
      { id: 'C', label: 'C — Tendencias' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '💰',
    sub: 'Control Financiero',
    views: [
      { id: 'A', label: 'A — Control de Caja' },
      { id: 'B', label: 'B — Distribución' },
      { id: 'C', label: 'C — Radar de Riesgo' },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: '⚙️',
    sub: 'Flujos y Alertas',
    views: [
      { id: 'A', label: 'A — Control de Flujo' },
      { id: 'B', label: 'B — Mapa de Unidades' },
      { id: 'C', label: 'C — Panel de Alertas' },
    ],
  },
]

export default function DashboardKPI() {
  const [tab, setTab]         = useState('gerencia')
  const [view, setView]       = useState('A')
  const [dashData, setDashData] = useState(null)
  const [finData,  setFinData]  = useState(null)
  const [opsData,  setOpsData]  = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getDashboard(), getDashboardFinanciero(), getDashboardOperaciones()])
      .then(([d, f, o]) => {
        setDashData(d.data)
        setFinData(f.data)
        setOpsData(o.data)
        setLoading(false)
      })
  }, [])

  // Reset view to A when changing tab
  const handleTabChange = (newTab) => {
    setTab(newTab)
    setView('A')
  }

  const activeTab = TABS.find(t => t.id === tab)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-3 border-[#009FE3] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Cargando KPIs...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Dashboard KPI</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Indicadores de gestión — Clínica BUPA Santiago · {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tab + View selectors */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        {/* Area tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-[#003087] text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <div className="text-left">
                <div>{t.label}</div>
                <div className={`text-[10px] font-normal ${tab === t.id ? 'text-blue-200' : 'text-gray-400'}`}>{t.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* View selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">Vista:</span>
          <ViewToggle views={activeTab.views} active={view} onChange={setView} />
        </div>
      </div>

      {/* View description banner */}
      <div className="bg-gradient-to-r from-[#003087]/5 to-[#009FE3]/5 border border-[#003087]/10 rounded-lg px-4 py-2.5 flex items-center gap-3">
        <span className="text-lg">{activeTab?.icon}</span>
        <div>
          <span className="text-xs font-bold text-[#003087]">{activeTab?.label} — {activeTab?.views.find(v2 => v2.id === view)?.label}</span>
        </div>
      </div>

      {/* Content */}
      {tab === 'gerencia'    && <TabGerencia    dashData={dashData} finData={finData} opsData={opsData} view={view} />}
      {tab === 'finanzas'    && <TabFinanzas    finData={finData}   view={view} />}
      {tab === 'operaciones' && <TabOperaciones dashData={dashData} opsData={opsData} view={view} />}
    </div>
  )
}
