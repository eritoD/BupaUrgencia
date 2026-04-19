import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPaciente, getEventos, getCamas, getExamenes, getArchivos,
  hospitalizar, darAlta, addNota, liberarCama,
  updateClinica, crearExamen, registrarResultado, cancelarExamen,
  subirArchivo, eliminarArchivo, confirmarLlegada,
} from '../api'

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const IcoBack     = () => <Ico d="M15 18l-6-6 6-6" />
const IcoTransfer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
)
const IcoAlta   = () => <Ico d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
const IcoNota   = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IcoFlask  = () => <Ico d="M9 3h6l1 9H8L9 3zM6 21h12l-1-9H7L6 21zM5 3h14" />
const IcoPaper  = () => <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
const IcoPlus   = () => <Ico d="M12 5v14M5 12h14" />
const IcoCheck  = () => <Ico d="M20 6L9 17l-5-5" />
const IcoTrash  = () => <Ico d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
const IcoEdit   = () => <Ico d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
const IcoUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IcoEye = () => <Ico d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmtFecha = (iso) => iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtHora  = (iso) => iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

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
const ESTADO_LABEL = { urgencias: 'Urgencias', hospitalizado: 'Hospitalizado', alta: 'Alta', traslado_externo: 'Traslado Ext.' }
const PREVISION_META = {
  'FONASA':       { cobertura: '80% Libre Elección',    riesgo: 'Medio' },
  'ISAPRE':       { cobertura: '90–100% Póliza',        riesgo: 'Bajo'  },
  'Ley Urgencia': { cobertura: 'FONASA MLE tope legal', riesgo: 'Alto'  },
  'GES':          { cobertura: 'Tarifa GES regulada',   riesgo: 'Medio' },
  'Particular':   { cobertura: '100% Pago directo',     riesgo: 'Bajo'  },
}
const EVENTO_CONFIG = {
  ingreso:         { dot: 'bg-[#009FE3]',  label: 'Ingreso'          },
  triage:          { dot: 'bg-orange-400', label: 'Triage'           },
  orden:           { dot: 'bg-blue-500',   label: 'Orden Médica'     },
  doble_check:     { dot: 'bg-teal-500',   label: 'Doble Validación' },
  hospitalizacion: { dot: 'bg-[#003087]',  label: 'Hospitalización'  },
  llegada_unidad:  { dot: 'bg-green-500',  label: 'Llegada a Unidad' },
  traslado:        { dot: 'bg-amber-500',  label: 'Traslado'         },
  alta:            { dot: 'bg-green-600',  label: 'Alta'             },
  alerta:          { dot: 'bg-red-500',    label: 'Alerta'           },
  nota:            { dot: 'bg-gray-400',   label: 'Nota'             },
}

const TRIAGE_CONFIG = {
  0: { label: 'N0 — Parto/RN',       bg: 'bg-purple-600', text: 'text-white' },
  1: { label: 'N1 — Riesgo Vital',   bg: 'bg-red-600',    text: 'text-white' },
  2: { label: 'N2 — Emergencia',     bg: 'bg-orange-500', text: 'text-white' },
  3: { label: 'N3 — Urgencia',       bg: 'bg-yellow-400', text: 'text-yellow-900' },
  4: { label: 'N4 — Urgencia Menor', bg: 'bg-green-500',  text: 'text-white' },
  5: { label: 'N5 — No Urgente',     bg: 'bg-blue-400',   text: 'text-white' },
}
const EXAMEN_TIPO_LABEL = {
  laboratorio: 'Laboratorio', radiologia: 'Radiología',
  ecografia: 'Ecografía', ekg: 'ECG', otro: 'Otro',
}
const EXAMEN_TIPO_COLOR = {
  laboratorio: 'bg-blue-50 text-blue-700',
  radiologia:  'bg-purple-50 text-purple-700',
  ecografia:   'bg-teal-50 text-teal-700',
  ekg:         'bg-red-50 text-red-700',
  otro:        'bg-gray-100 text-gray-600',
}
const ARCHIVO_TIPO_COLOR = {
  imagen:    'bg-purple-50 text-purple-700',
  documento: 'bg-blue-50 text-blue-700',
  informe:   'bg-teal-50 text-teal-700',
  otro:      'bg-gray-100 text-gray-600',
}
const GRUPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// ── Componentes de sección ────────────────────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {(title || action) && (
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          {title && <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900 font-medium">{children || '—'}</div>
    </div>
  )
}

// ── Modales ───────────────────────────────────────────────────────────────────
function ModalDerivacion({ pacienteId, camaActual, onClose, onSuccess }) {
  const [camas, setCamas]     = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getCamas().then(r => setCamas(r.data.filter(c => c.estado === 'libre')))
  }, [])

  const porUnidad = camas.reduce((acc, c) => {
    ;(acc[c.unidad] = acc[c.unidad] || []).push(c)
    return acc
  }, {})

  const handleConfirmar = async () => {
    if (!selected) return
    setLoading(true)
    try {
      if (camaActual) await liberarCama(camaActual)
      await hospitalizar(pacienteId, { nueva_unidad: selected.unidad, nueva_cama_numero: selected.numero })
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Derivar / Transferir Paciente" subtitle="Selecciona la cama de destino" onClose={onClose} size="lg">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {Object.keys(porUnidad).length === 0
          ? <p className="text-gray-400 text-sm text-center py-6">No hay camas disponibles</p>
          : Object.entries(porUnidad).map(([unidad, camasUnidad]) => (
            <div key={unidad}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{unidad}</div>
              <div className="flex flex-wrap gap-2">
                {camasUnidad.map(c => (
                  <button key={c.numero} onClick={() => setSelected(c)}
                    className={`border rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected?.numero === c.numero
                        ? 'border-[#003087] bg-[#003087] text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}>
                    {c.numero}
                  </button>
                ))}
              </div>
            </div>
          ))
        }
      </div>
      <ModalFooter>
        <span className="text-sm text-gray-500">
          {selected ? <><strong className="text-gray-900">{selected.numero}</strong> — {selected.unidad}</> : 'Ninguna seleccionada'}
        </span>
        <div className="flex gap-2">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <BtnPrimary onClick={handleConfirmar} disabled={!selected || loading}>
            {loading ? 'Confirmando…' : 'Confirmar Derivación'}
          </BtnPrimary>
        </div>
      </ModalFooter>
    </Modal>
  )
}

function ModalAlta({ nombre, onClose, onConfirm, loading }) {
  return (
    <Modal title="Confirmar Alta Médica" onClose={onClose} size="sm">
      <div className="p-5">
        <p className="text-sm text-gray-500 mb-5">
          ¿Dar de alta a <strong className="text-gray-800">{nombre}</strong>?
          La cama quedará en estado de limpieza.
        </p>
        <div className="flex gap-2 justify-end">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <button onClick={onConfirm} disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-40 transition-colors">
            {loading ? 'Procesando…' : 'Confirmar Alta'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalNota({ onClose, onGuardar }) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const handleGuardar = async () => {
    if (!texto.trim()) return
    setLoading(true)
    await onGuardar(texto.trim())
    setLoading(false)
    onClose()
  }
  return (
    <Modal title="Agregar Nota Clínica" onClose={onClose} size="md">
      <div className="p-5">
        <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)} rows={4}
          placeholder="Escribe la nota clínica…"
          className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3] resize-none" />
        <div className="flex gap-2 justify-end mt-4">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <BtnPrimary onClick={handleGuardar} disabled={!texto.trim() || loading}>
            {loading ? 'Guardando…' : 'Guardar Nota'}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

function ModalSolicitarExamen({ onClose, onCrear }) {
  const [form, setForm] = useState({ tipo: 'laboratorio', nombre: '', urgente: false })
  const [loading, setLoading] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const EXAMENES_PRESET = {
    laboratorio: ['Hemograma completo', 'PCR', 'Perfil bioquímico', 'Coagulación', 'Electrolitos', 'Troponina', 'Lactato', 'Gasometría arterial'],
    radiologia:  ['RX Tórax AP', 'RX Abdomen', 'TAC Cerebro', 'TAC Tórax', 'TAC Abdomen/Pelvis', 'RMN Cerebro'],
    ecografia:   ['Eco Abdominal', 'Eco Pélvico', 'Eco Cardíaco (eco)', 'Eco Vesical', 'Doppler MMII'],
    ekg:         ['ECG 12 derivadas', 'Holter 24h', 'Ecocardiograma'],
    otro:        [],
  }

  const handleCrear = async () => {
    if (!form.nombre) return
    setLoading(true)
    await onCrear(form)
    setLoading(false)
    onClose()
  }

  return (
    <Modal title="Solicitar Examen" onClose={onClose} size="md">
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Tipo de examen</label>
          <select value={form.tipo} onChange={set('tipo')} className={inputCls}>
            {Object.entries(EXAMEN_TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nombre del examen</label>
          <input list="examenes-preset" value={form.nombre} onChange={set('nombre')}
            placeholder="Ej: Hemograma completo" className={inputCls} />
          <datalist id="examenes-preset">
            {(EXAMENES_PRESET[form.tipo] || []).map(e => <option key={e} value={e} />)}
          </datalist>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.urgente} onChange={set('urgente')}
            className="w-4 h-4 rounded accent-red-600" />
          <span className="text-sm font-medium text-gray-700">Marcar como <span className="text-red-600 font-semibold">urgente</span></span>
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <BtnPrimary onClick={handleCrear} disabled={!form.nombre.trim() || loading}>
            {loading ? 'Solicitando…' : 'Solicitar Examen'}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

function ModalResultado({ examen, onClose, onGuardar }) {
  const [resultado, setResultado] = useState('')
  const [loading, setLoading] = useState(false)
  const handleGuardar = async () => {
    if (!resultado.trim()) return
    setLoading(true)
    await onGuardar(examen.id, resultado.trim())
    setLoading(false)
    onClose()
  }
  return (
    <Modal title={`Resultado: ${examen.nombre}`} onClose={onClose} size="md">
      <div className="p-5">
        <label className={labelCls}>Resultado del examen</label>
        <textarea autoFocus value={resultado} onChange={e => setResultado(e.target.value)} rows={5}
          placeholder="Ingresa el resultado o hallazgos del examen…"
          className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3] resize-none mt-1" />
        <div className="flex gap-2 justify-end mt-4">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <BtnPrimary onClick={handleGuardar} disabled={!resultado.trim() || loading}>
            {loading ? 'Guardando…' : 'Registrar Resultado'}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

function ModalSubirArchivo({ onClose, onSubir }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'documento', descripcion: '' })
  const [fileData, setFileData] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!form.nombre) setForm(p => ({ ...p, nombre: file.name }))
    const reader = new FileReader()
    reader.onload = (ev) => setFileData({ b64: ev.target.result.split(',')[1], mime: file.type })
    reader.readAsDataURL(file)
  }

  const handleSubir = async () => {
    if (!form.nombre) return
    setLoading(true)
    await onSubir({ nombre: form.nombre, tipo: form.tipo, descripcion: form.descripcion, datos_b64: fileData?.b64, mime_type: fileData?.mime })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title="Adjuntar Archivo" onClose={onClose} size="md">
      <div className="p-5 space-y-4">
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-[#009FE3] transition-colors"
             onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
          <div className="flex justify-center mb-2 text-gray-400"><IcoUpload /></div>
          <p className="text-sm text-gray-500">{fileData ? 'Archivo cargado ✓' : 'Haz click para seleccionar un archivo'}</p>
          <p className="text-xs text-gray-400 mt-1">PDF, imágenes, documentos Word/Excel</p>
        </div>
        <div>
          <label className={labelCls}>Nombre del archivo</label>
          <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: RX Tórax 12-abr-2026" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={form.tipo} onChange={set('tipo')} className={inputCls}>
            <option value="imagen">Imagen / Radiografía</option>
            <option value="informe">Informe médico</option>
            <option value="documento">Documento</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Descripción (opcional)</label>
          <input value={form.descripcion} onChange={set('descripcion')} placeholder="Ej: Control post-operatorio" className={inputCls} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
          <BtnPrimary onClick={handleSubir} disabled={!form.nombre.trim() || loading}>
            {loading ? 'Subiendo…' : 'Adjuntar Archivo'}
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

// ── Primitivos de UI ──────────────────────────────────────────────────────────
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1"
const inputCls = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3] bg-white"

function Modal({ title, subtitle, onClose, size = 'md', children }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[85vh] flex flex-col`}
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function ModalFooter({ children }) {
  return <div className="px-5 py-3.5 border-t border-gray-200 flex items-center justify-between flex-shrink-0">{children}</div>
}
function BtnPrimary({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 text-sm font-semibold bg-[#003087] text-white rounded-md hover:bg-blue-900 disabled:opacity-40 transition-colors">
      {children}
    </button>
  )
}
function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
      {children}
    </button>
  )
}

// ── Tabs de contenido ─────────────────────────────────────────────────────────

function TabResumen({ paciente, eventos }) {
  const isLargaData = paciente.dias_estadia >= 7
  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="col-span-3 space-y-5">
        <Section title="Datos Clínicos">
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="col-span-2"><Field label="Diagnóstico">{paciente.diagnostico}</Field></div>
            <Field label="Comorbilidades">{paciente.comorbilidades || '—'}</Field>
            <Field label="Edad / Sexo">{paciente.edad} años · {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</Field>
            {paciente.alergias && <div className="col-span-2">
              <Field label="Alergias"><span className="text-red-600">{paciente.alergias}</span></Field>
            </div>}
            {paciente.medicamentos_actuales && <div className="col-span-2">
              <Field label="Medicamentos actuales">{paciente.medicamentos_actuales}</Field>
            </div>}
          </div>
        </Section>

        <Section title="Línea de Tiempo">
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {eventos.length === 0
              ? <div className="px-5 py-8 text-center text-gray-400 text-sm">Sin eventos</div>
              : eventos.map((e, i) => {
                const cfg = EVENTO_CONFIG[e.tipo] || EVENTO_CONFIG.nota
                return (
                  <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="flex flex-col items-center flex-shrink-0 mt-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {i < eventos.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1.5 min-h-[20px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                      <p className="text-sm text-gray-800 mt-0.5">{e.descripcion}</p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{fmtHora(e.timestamp)}</div>
                  </div>
                )
              })
            }
          </div>
        </Section>
      </div>

      <div className="col-span-2 space-y-5">
        <Section title="Resumen Financiero">
          <div className="p-5 space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Cuenta Estimada</div>
              <div className="text-2xl font-bold text-gray-900">
                {paciente.valor_cuenta_estimado > 0 ? fmt(paciente.valor_cuenta_estimado) : '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Previsión">{paciente.prevision}</Field>
              <Field label="Cobertura">{(PREVISION_META[paciente.prevision] || {}).cobertura || '—'}</Field>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Riesgo</div>
                <div className={`text-sm font-semibold ${
                  (PREVISION_META[paciente.prevision] || {}).riesgo === 'Alto' ? 'text-red-600' :
                  (PREVISION_META[paciente.prevision] || {}).riesgo === 'Medio' ? 'text-amber-600' : 'text-green-700'
                }`}>{(PREVISION_META[paciente.prevision] || {}).riesgo || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Días</div>
                <div className={`text-sm font-semibold ${isLargaData ? 'text-amber-600' : 'text-gray-900'}`}>
                  {paciente.dias_estadia}d {isLargaData && '· Larga data'}
                </div>
              </div>
            </div>
            {isLargaData && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-xs text-amber-700 font-medium">
                Revisar plan de alta y cobertura previsional
              </div>
            )}
          </div>
        </Section>

        <Section title="Identificación">
          <div className="p-5 space-y-3">
            {[['RUT', paciente.rut], ['Nombre', paciente.nombre],
              ['Edad / Sexo', `${paciente.edad}a · ${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}`],
              ['Teléfono', paciente.telefono || '—'],
              ['Contacto emergencia', paciente.contacto_emergencia || '—'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-start text-xs">
                <span className="text-gray-400 font-medium">{l}</span>
                <span className="text-gray-800 font-medium text-right max-w-[55%]">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function TabClinica({ paciente, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    telefono:              paciente.telefono || '',
    contacto_emergencia:   paciente.contacto_emergencia || '',
    alergias:              paciente.alergias || '',
    medicamentos_actuales: paciente.medicamentos_actuales || '',
    grupo_sanguineo:       paciente.grupo_sanguineo || '',
    peso_kg:               paciente.peso_kg || '',
    talla_cm:              paciente.talla_cm || '',
    observaciones_clinicas:paciente.observaciones_clinicas || '',
  })
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleGuardar = async () => {
    setSaving(true)
    const payload = { ...form }
    if (payload.peso_kg) payload.peso_kg = parseFloat(payload.peso_kg)
    if (payload.talla_cm) payload.talla_cm = parseInt(payload.talla_cm)
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    await updateClinica(paciente.id, payload)
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const rowClass = "grid grid-cols-2 gap-x-8 gap-y-5"

  const DisplayField = ({ label, value }) => (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      <Section title="Datos de Contacto"
        action={!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-[#003087] font-medium hover:underline"><IcoEdit /> Editar</button>
          : <div className="flex gap-2">
              <BtnSecondary onClick={() => setEditing(false)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</BtnPrimary>
            </div>
        }
      >
        <div className={`px-5 py-4 ${rowClass}`}>
          {editing ? (
            <>
              <div><label className={labelCls}>Teléfono</label><input value={form.telefono} onChange={set('telefono')} placeholder="+56 9 1234 5678" className={inputCls} /></div>
              <div><label className={labelCls}>Contacto de emergencia</label><input value={form.contacto_emergencia} onChange={set('contacto_emergencia')} placeholder="Nombre — Teléfono" className={inputCls} /></div>
            </>
          ) : (
            <>
              <DisplayField label="Teléfono" value={form.telefono} />
              <DisplayField label="Contacto de emergencia" value={form.contacto_emergencia} />
            </>
          )}
        </div>
      </Section>

      <Section title="Datos Clínicos Adicionales">
        <div className={`px-5 py-4 ${rowClass}`}>
          {editing ? (
            <>
              <div><label className={labelCls}>Grupo sanguíneo</label>
                <select value={form.grupo_sanguineo} onChange={set('grupo_sanguineo')} className={inputCls}>
                  <option value="">— No especificado —</option>
                  {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Peso (kg)</label><input type="number" value={form.peso_kg} onChange={set('peso_kg')} placeholder="70" className={inputCls} /></div>
                <div><label className={labelCls}>Talla (cm)</label><input type="number" value={form.talla_cm} onChange={set('talla_cm')} placeholder="170" className={inputCls} /></div>
              </div>
              <div className="col-span-2"><label className={labelCls}>Alergias conocidas</label><textarea value={form.alergias} onChange={set('alergias')} rows={2} placeholder="Ej: Penicilina, AAS, látex" className={inputCls + ' resize-none'} /></div>
              <div className="col-span-2"><label className={labelCls}>Medicamentos actuales</label><textarea value={form.medicamentos_actuales} onChange={set('medicamentos_actuales')} rows={2} placeholder="Ej: Metformina 850mg, Enalapril 10mg" className={inputCls + ' resize-none'} /></div>
            </>
          ) : (
            <>
              <DisplayField label="Grupo sanguíneo" value={form.grupo_sanguineo} />
              <div className="grid grid-cols-2 gap-4">
                <DisplayField label="Peso" value={form.peso_kg ? `${form.peso_kg} kg` : null} />
                <DisplayField label="Talla" value={form.talla_cm ? `${form.talla_cm} cm` : null} />
              </div>
              <div className="col-span-2"><DisplayField label="Alergias" value={form.alergias ? <span className="text-red-600">{form.alergias}</span> : null} /></div>
              <div className="col-span-2"><DisplayField label="Medicamentos actuales" value={form.medicamentos_actuales} /></div>
            </>
          )}
        </div>
      </Section>

      <Section title="Observaciones Clínicas">
        <div className="px-5 py-4">
          {editing
            ? <textarea value={form.observaciones_clinicas} onChange={set('observaciones_clinicas')} rows={4}
                placeholder="Observaciones generales, evolución clínica, notas del médico tratante…"
                className={inputCls + ' resize-none'} />
            : <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {form.observaciones_clinicas || <span className="text-gray-300">Sin observaciones registradas</span>}
              </div>
          }
        </div>
      </Section>
    </div>
  )
}

function TabExamenes({ pacienteId, onReload }) {
  const [examenes, setExamenes] = useState([])
  const [filtro, setFiltro]     = useState('todos')
  const [modal, setModal]       = useState(null)
  const [examenActivo, setExamenActivo] = useState(null)

  const load = useCallback(async () => {
    const r = await getExamenes(pacienteId)
    setExamenes(r.data)
  }, [pacienteId])

  useEffect(() => { load() }, [load])

  const filtered = examenes.filter(e =>
    filtro === 'todos' ? true : e.estado === filtro
  )

  const handleCrear = async (data) => { await crearExamen(pacienteId, data); await load(); onReload() }
  const handleResultado = async (id, resultado) => { await registrarResultado(id, resultado); await load() }
  const handleCancelar = async (id) => { await cancelarExamen(id); await load() }

  const ESTADO_STYLE = {
    pendiente:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completado:  'bg-green-50 text-green-700 ring-1 ring-green-200',
    cancelado:   'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['todos', 'pendiente', 'completado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filtro === f ? 'bg-[#003087] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Completados'}</button>
          ))}
        </div>
        <button onClick={() => setModal('crear')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003087] text-white rounded-md text-xs font-semibold hover:bg-blue-900 transition-colors">
          <IcoPlus /> Solicitar Examen
        </button>
      </div>

      <Section>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {filtro === 'todos' ? 'No hay exámenes solicitados' : `No hay exámenes ${filtro}s`}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(ex => (
              <div key={ex.id} className={`px-5 py-4 ${ex.estado === 'cancelado' ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{ex.nombre}</span>
                      {ex.urgente && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Urgente</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${EXAMEN_TIPO_COLOR[ex.tipo] || 'bg-gray-100 text-gray-600'}`}>
                        {EXAMEN_TIPO_LABEL[ex.tipo] || ex.tipo}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">Solicitado: {fmtHora(ex.fecha_solicitado)}</div>
                    {ex.resultado && (
                      <div className="mt-2 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700 whitespace-pre-line border border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Resultado · {fmtHora(ex.fecha_resultado)}</div>
                        {ex.resultado}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${ESTADO_STYLE[ex.estado]}`}>
                      {ex.estado === 'pendiente' ? 'Pendiente' : ex.estado === 'completado' ? 'Completado' : 'Cancelado'}
                    </span>
                    {ex.estado === 'pendiente' && (
                      <>
                        <button onClick={() => { setExamenActivo(ex); setModal('resultado') }}
                          className="flex items-center gap-1 text-xs text-[#003087] border border-[#003087]/20 rounded-md px-2 py-1 hover:bg-[#003087]/5 transition-colors">
                          <IcoCheck /> Resultado
                        </button>
                        <button onClick={() => handleCancelar(ex.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1 hover:bg-gray-50 transition-colors">
                          <IcoTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {modal === 'crear' && <ModalSolicitarExamen onClose={() => setModal(null)} onCrear={handleCrear} />}
      {modal === 'resultado' && examenActivo && (
        <ModalResultado examen={examenActivo} onClose={() => { setModal(null); setExamenActivo(null) }} onGuardar={handleResultado} />
      )}
    </div>
  )
}

function TabArchivos({ pacienteId }) {
  const [archivos, setArchivos] = useState([])
  const [modal, setModal]       = useState(false)
  const [visor, setVisor]       = useState(null)

  const load = useCallback(async () => {
    const r = await getArchivos(pacienteId)
    setArchivos(r.data)
  }, [pacienteId])

  useEffect(() => { load() }, [load])

  const handleSubir = async (data) => { await subirArchivo(pacienteId, data); await load() }
  const handleEliminar = async (id) => { await eliminarArchivo(id); await load() }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003087] text-white rounded-md text-xs font-semibold hover:bg-blue-900 transition-colors">
          <IcoUpload /> Adjuntar Archivo
        </button>
      </div>

      {archivos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
          <div className="flex justify-center mb-3 text-gray-300"><IcoPaper /></div>
          <p className="text-sm text-gray-400">No hay archivos adjuntos</p>
          <p className="text-xs text-gray-300 mt-1">Sube imágenes, informes o documentos del paciente</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {archivos.map(a => (
            <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${ARCHIVO_TIPO_COLOR[a.tipo] || 'bg-gray-100 text-gray-600'}`}>
                  {a.tipo.charAt(0).toUpperCase() + a.tipo.slice(1)}
                </span>
                <button onClick={() => handleEliminar(a.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"><IcoTrash /></button>
              </div>
              {a.datos_b64 && a.mime_type?.startsWith('image/') ? (
                <img src={`data:${a.mime_type};base64,${a.datos_b64}`}
                  className="w-full h-28 object-cover rounded-md mb-3 cursor-pointer border border-gray-100"
                  onClick={() => setVisor(a)} alt={a.nombre} />
              ) : (
                <div className="w-full h-28 bg-gray-50 rounded-md mb-3 flex items-center justify-center border border-gray-100 cursor-pointer"
                     onClick={() => a.datos_b64 && setVisor(a)}>
                  <div className="text-center">
                    <div className="flex justify-center mb-1 text-gray-300"><IcoPaper /></div>
                    <span className="text-xs text-gray-400">{a.nombre.split('.').pop()?.toUpperCase() || 'ARCHIVO'}</span>
                  </div>
                </div>
              )}
              <div className="font-medium text-gray-900 text-xs truncate">{a.nombre}</div>
              {a.descripcion && <div className="text-xs text-gray-400 truncate mt-0.5">{a.descripcion}</div>}
              <div className="text-xs text-gray-300 mt-1">{fmtFecha(a.fecha_subida)}</div>
              {a.datos_b64 && (
                <button onClick={() => setVisor(a)}
                  className="flex items-center gap-1 text-xs text-[#003087] mt-2 hover:underline">
                  <IcoEye /> Ver archivo
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && <ModalSubirArchivo onClose={() => setModal(false)} onSubir={handleSubir} />}
      {visor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setVisor(null)}>
          <div className="max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {visor.mime_type?.startsWith('image/')
              ? <img src={`data:${visor.mime_type};base64,${visor.datos_b64}`} className="rounded-lg max-h-[85vh]" alt={visor.nombre} />
              : visor.mime_type === 'application/pdf'
                ? <iframe src={`data:application/pdf;base64,${visor.datos_b64}`} className="w-[800px] h-[85vh] rounded-lg" title={visor.nombre} />
                : <div className="bg-white rounded-xl p-8 text-center"><p className="text-gray-500">Vista previa no disponible</p></div>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
const TABS_CONFIG = [
  { id: 'resumen',   label: 'Resumen'   },
  { id: 'clinica',   label: 'Clínica'   },
  { id: 'examenes',  label: 'Exámenes'  },
  { id: 'archivos',  label: 'Archivos'  },
]

export default function FichaPaciente() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paciente,    setPaciente]    = useState(null)
  const [eventos,     setEventos]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('resumen')
  const [modal,       setModal]       = useState(null)
  const [altaLoading, setAltaLoading] = useState(false)

  const load = useCallback(async () => {
    const [pRes, eRes] = await Promise.all([getPaciente(id), getEventos(id)])
    setPaciente(pRes.data)
    setEventos(eRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleAlta = async () => {
    setAltaLoading(true)
    await darAlta(id)
    setAltaLoading(false)
    setModal(null)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#009FE3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!paciente) {
    return <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">Paciente no encontrado</p></div>
  }

  const estadoBadge = ESTADO_BADGE[paciente.estado] || 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
  const estadoLabel = ESTADO_LABEL[paciente.estado] || paciente.estado
  const isLargaData = paciente.dias_estadia >= 7
  const puedeDerivar = paciente.estado !== 'alta'
  const puedeAlta    = paciente.estado === 'hospitalizado'
  const enTransito   = paciente.estado === 'hospitalizado' && paciente.fecha_asignacion_cama && !paciente.fecha_llegada_unidad
  const triageCfg    = paciente.nivel_triage != null ? TRIAGE_CONFIG[paciente.nivel_triage] : null

  const handleLlegada = async () => {
    await confirmarLlegada(paciente.id)
    await load()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/pacientes')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-800 transition-colors">
          <IcoBack /> Pacientes
        </button>
        <span className="text-gray-200">/</span>
        <span className="font-semibold text-gray-900 text-sm">{paciente.nombre}</span>
        <span className="text-gray-300 text-sm">·</span>
        <span className="text-gray-400 text-xs font-mono">{paciente.rut}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${estadoBadge}`}>{estadoLabel}</span>
        {isLargaData && <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Larga Data</span>}
        {triageCfg && (
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${triageCfg.bg} ${triageCfg.text}`}>
            {triageCfg.label}
          </span>
        )}
        {paciente.categoria_solicitada && (
          <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#003087]/10 text-[#003087] ring-1 ring-[#003087]/20">
            → {paciente.categoria_solicitada}
          </span>
        )}

        {/* Acciones rápidas en header */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setModal('nota')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <IcoNota /> Nota
          </button>
          {puedeDerivar && (
            <button onClick={() => setModal('derivacion')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:border-[#003087] hover:text-[#003087] transition-colors">
              <IcoTransfer /> Derivar
            </button>
          )}
          {enTransito && (
            <button onClick={handleLlegada}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-semibold transition-colors">
              Paciente Llegó ✓
            </button>
          )}
          {puedeAlta && (
            <button onClick={() => setModal('alta')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003087] text-white rounded-md text-xs font-semibold hover:bg-blue-900 transition-colors">
              <IcoAlta /> Dar Alta
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-0 text-sm overflow-x-auto">
        {[
          { label: 'Unidad',        value: paciente.unidad || '—' },
          { label: 'Cama',          value: paciente.cama_numero || '—' },
          { label: 'Días',          value: paciente.dias_estadia > 0 ? `${paciente.dias_estadia}d` : '< 1d', warn: isLargaData },
          { label: 'Ingreso',       value: fmtFecha(paciente.fecha_ingreso) },
          { label: 'Hospitaliz.',   value: fmtFecha(paciente.fecha_hospitalizacion) },
          { label: 'Cuenta est.',   value: paciente.valor_cuenta_estimado > 0 ? fmt(paciente.valor_cuenta_estimado) : '—' },
          { label: 'Previsión',     value: paciente.prevision },
          { label: 'Grupo',         value: paciente.grupo_sanguineo || '—' },
          ...(enTransito ? [{ label: 'Tránsito', value: `${Math.round((Date.now() - new Date(paciente.fecha_asignacion_cama).getTime()) / 60000)} min`, warn: true }] : []),
        ].map(({ label, value, warn }, i, arr) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col px-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
              <span className={`text-sm font-semibold mt-0.5 ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</span>
            </div>
            {i < arr.length - 1 && <div className="w-px h-8 bg-gray-100 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {TABS_CONFIG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {tab === 'resumen'  && <TabResumen  paciente={paciente} eventos={eventos} />}
          {tab === 'clinica'  && <TabClinica  paciente={paciente} onUpdated={load} />}
          {tab === 'examenes' && <TabExamenes pacienteId={id} onReload={load} />}
          {tab === 'archivos' && <TabArchivos pacienteId={id} />}
        </div>
      </div>

      {/* Modales */}
      {modal === 'derivacion' && (
        <ModalDerivacion pacienteId={id} camaActual={paciente.cama_numero}
          onClose={() => setModal(null)} onSuccess={() => { setModal(null); load() }} />
      )}
      {modal === 'alta' && (
        <ModalAlta nombre={paciente.nombre} loading={altaLoading}
          onClose={() => setModal(null)} onConfirm={handleAlta} />
      )}
      {modal === 'nota' && (
        <ModalNota onClose={() => setModal(null)} onGuardar={async (t) => { await addNota(id, t); await load() }} />
      )}
    </div>
  )
}
