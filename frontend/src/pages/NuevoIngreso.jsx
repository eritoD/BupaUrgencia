import { useState } from 'react'
import { crearPaciente } from '../api'
import { useNavigate } from 'react-router-dom'

const CheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#009FE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const ChevronDown = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={`transition-transform ${open ? 'rotate-180' : ''}`}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const PREVISIONES = ['FONASA', 'ISAPRE', 'Ley Urgencia', 'GES', 'Particular']
const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const TRIAGE_CONFIG = [
  { nivel: 0, label: 'N0 — Parto / Recién Nacido', desc: 'Atención inmediata por nacimiento',               color: 'bg-purple-600 text-white', border: 'border-purple-300 bg-purple-50' },
  { nivel: 1, label: 'N1 — Riesgo Vital',          desc: 'Riesgo vital — atención sin demora',              color: 'bg-red-600 text-white',    border: 'border-red-300 bg-red-50'     },
  { nivel: 2, label: 'N2 — Emergencia',            desc: 'Alta complejidad con potencial inestabilidad',    color: 'bg-orange-500 text-white', border: 'border-orange-300 bg-orange-50'},
  { nivel: 3, label: 'N3 — Urgencia',              desc: 'Paciente estable, necesita recursos múltiples',   color: 'bg-yellow-400 text-yellow-900', border: 'border-yellow-300 bg-yellow-50' },
  { nivel: 4, label: 'N4 — Urgencia Menor',        desc: 'Complejidad baja, sin riesgo inmediato',          color: 'bg-green-500 text-white',  border: 'border-green-300 bg-green-50'  },
  { nivel: 5, label: 'N5 — No Urgente',            desc: 'Atención diferida según demanda',                 color: 'bg-blue-400 text-white',   border: 'border-blue-300 bg-blue-50'   },
]

export default function NuevoIngreso() {
  const navigate = useNavigate()
  const [nivelTriage, setNivelTriage] = useState(null)
  const [form, setForm] = useState({
    nombre: '', rut: '', edad: '', sexo: 'M',
    prevision: 'FONASA', diagnostico: '', comorbilidades: '',
    telefono: '', contacto_emergencia: '', alergias: '',
    medicamentos_actuales: '', grupo_sanguineo: '',
    peso_kg: '', talla_cm: '',
  })
  const [showExtra, setShowExtra] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.rut || !form.diagnostico || !form.edad) {
      setError('Completa los campos obligatorios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        edad:         parseInt(form.edad),
        nivel_triage: nivelTriage,
        peso_kg:      form.peso_kg  ? parseFloat(form.peso_kg)  : undefined,
        talla_cm:     form.talla_cm ? parseInt(form.talla_cm)   : undefined,
        grupo_sanguineo:       form.grupo_sanguineo       || undefined,
        telefono:              form.telefono              || undefined,
        contacto_emergencia:   form.contacto_emergencia   || undefined,
        alergias:              form.alergias              || undefined,
        medicamentos_actuales: form.medicamentos_actuales || undefined,
      }
      await crearPaciente(payload)
      setSuccess(true)
      setTimeout(() => navigate('/triage'), 1800)
    } catch {
      setError('Error al registrar el paciente. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex justify-center mb-4"><CheckCircle /></div>
          <h2 className="text-lg font-bold text-gray-900">Paciente Registrado</h2>
          <p className="text-gray-500 text-sm mt-2">Redirigiendo a la cola de triage…</p>
        </div>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-200 rounded-md px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009FE3]"
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nuevo Ingreso</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registro de paciente — ingresa al Pipeline de Urgencias</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── PASO 1: TRIAGE ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#003087] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nivel de Triage</h2>
            <span className="text-xs text-gray-400 font-normal">(recomendado al ingreso)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TRIAGE_CONFIG.map(({ nivel, label, desc, color, border }) => (
              <button
                key={nivel}
                type="button"
                onClick={() => setNivelTriage(nivelTriage === nivel ? null : nivel)}
                className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 text-left transition-all ${
                  nivelTriage === nivel
                    ? `${border} ring-2 ring-[#003087]`
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${color}`}>{label.split('—')[0].trim()}</span>
                <span className="text-[10px] text-gray-600 leading-tight">{label.split('—')[1]?.trim()}</span>
              </button>
            ))}
          </div>
          {nivelTriage !== null && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TRIAGE_CONFIG[nivelTriage].color}`}>
                {TRIAGE_CONFIG[nivelTriage].label}
              </span>
              <span>— {TRIAGE_CONFIG[nivelTriage].desc}</span>
              <button type="button" onClick={() => setNivelTriage(null)} className="ml-auto text-gray-400 hover:text-gray-600">×</button>
            </div>
          )}
          {nivelTriage === null && (
            <p className="mt-2 text-[10px] text-gray-400">El triage también puede clasificarse luego desde el Pipeline de Urgencias.</p>
          )}
        </div>

        {/* ── PASO 2: DATOS DEL PACIENTE ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-[#003087] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del Paciente</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nombre completo *</label>
              <input value={form.nombre} onChange={set('nombre')} className={inputClass} placeholder="Juan Pérez Morales" />
            </div>
            <div>
              <label className={labelClass}>RUT *</label>
              <input value={form.rut} onChange={set('rut')} className={inputClass} placeholder="12.345.678-9" />
            </div>
            <div>
              <label className={labelClass}>Edad *</label>
              <input type="number" value={form.edad} onChange={set('edad')} className={inputClass} placeholder="45" />
            </div>
            <div>
              <label className={labelClass}>Sexo</label>
              <select value={form.sexo} onChange={set('sexo')} className={inputClass}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Previsión</label>
              <select value={form.prevision} onChange={set('prevision')} className={inputClass}>
                {PREVISIONES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── PASO 3: DATOS CLÍNICOS ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-[#003087] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos Clínicos</h2>
          </div>
          <div>
            <label className={labelClass}>Diagnóstico (CIE-10) *</label>
            <input value={form.diagnostico} onChange={set('diagnostico')} className={inputClass} placeholder="Ej: Neumonía Severa (J18.9)" />
          </div>
          <div>
            <label className={labelClass}>Comorbilidades</label>
            <input value={form.comorbilidades} onChange={set('comorbilidades')} className={inputClass} placeholder="Ej: HTA, DM2 (opcional)" />
          </div>
        </div>

        {/* ── Datos adicionales ── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowExtra(v => !v)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Datos Adicionales
              <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">(opcional)</span>
            </span>
            <ChevronDown open={showExtra} />
          </button>

          {showExtra && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input value={form.telefono} onChange={set('telefono')} className={inputClass} placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className={labelClass}>Contacto Emergencia</label>
                  <input value={form.contacto_emergencia} onChange={set('contacto_emergencia')} className={inputClass} placeholder="Nombre — Teléfono" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Alergias conocidas</label>
                  <input value={form.alergias} onChange={set('alergias')} className={inputClass} placeholder="Ej: Penicilina, AAS, látex" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Medicamentos actuales</label>
                  <input value={form.medicamentos_actuales} onChange={set('medicamentos_actuales')} className={inputClass} placeholder="Ej: Atenolol 50mg, Metformina 850mg" />
                </div>
                <div>
                  <label className={labelClass}>Grupo Sanguíneo</label>
                  <select value={form.grupo_sanguineo} onChange={set('grupo_sanguineo')} className={inputClass}>
                    <option value="">Desconocido</option>
                    {GRUPOS_SANGUINEOS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div />
                <div>
                  <label className={labelClass}>Peso (kg)</label>
                  <input type="number" step="0.1" value={form.peso_kg} onChange={set('peso_kg')} className={inputClass} placeholder="70.5" />
                </div>
                <div>
                  <label className={labelClass}>Talla (cm)</label>
                  <input type="number" value={form.talla_cm} onChange={set('talla_cm')} className={inputClass} placeholder="175" />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/triage')}
            className="px-5 py-2.5 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#003087] hover:bg-blue-900 disabled:opacity-50 text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
          >
            {loading ? 'Registrando…' : 'Registrar Ingreso'}
          </button>
        </div>
      </form>
    </div>
  )
}
