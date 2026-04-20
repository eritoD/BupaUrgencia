import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('bupa_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bupa_token')
      localStorage.removeItem('bupa_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Camas
export const getCamas                = ()             => api.get('/camas')
export const liberarCama             = (numero)       => api.put(`/camas/${numero}/libre`)

// Pacientes
export const getPacientes            = ()             => api.get('/pacientes')
export const getPaciente             = (id)           => api.get(`/pacientes/${id}`)
export const crearPaciente           = (data)         => api.post('/pacientes', data)
export const hospitalizar            = (id, data)     => api.put(`/pacientes/${id}/hospitalizar`, data)
export const darAlta                 = (id)           => api.put(`/pacientes/${id}/alta`)
export const getEventos              = (id)           => api.get(`/pacientes/${id}/eventos`)
export const addNota                 = (id, texto)    => api.post(`/pacientes/${id}/notas`, { texto })
export const updateClinica           = (id, data)     => api.patch(`/pacientes/${id}/clinica`, data)

// Flujo de Urgencias
export const registrarTriage         = (id, data)     => api.put(`/pacientes/${id}/triage`, data)
export const completarAdmision       = (id, data)     => api.put(`/pacientes/${id}/completar-admision`, data)
export const registrarAtencionMedica = (id, data)     => api.put(`/pacientes/${id}/atencion-medica`, data)
export const emitirOrden             = (id, categoria)=> api.put(`/pacientes/${id}/orden-hospitalizacion`, { categoria_solicitada: categoria })
export const dobleCheck              = (id, data)     => api.put(`/pacientes/${id}/doble-check`, data)
export const confirmarLlegada        = (id)           => api.put(`/pacientes/${id}/paciente-llego`)

// Colas separadas (Demo2)
export const getColaTriage           = ()             => api.get('/urgencias/cola-triage')
export const getColaAdmision         = ()             => api.get('/urgencias/cola-admision')
export const getColaMedica           = ()             => api.get('/urgencias/cola-medica')
export const getColaDobleCheck       = ()             => api.get('/urgencias/cola-doble-check')
export const getSolicitudesCama      = ()             => api.get('/urgencias/solicitudes-cama')
export const getPipeline             = ()             => api.get('/urgencias/pipeline')

// Exámenes
export const getExamenes             = (id)           => api.get(`/pacientes/${id}/examenes`)
export const crearExamen             = (id, data)     => api.post(`/pacientes/${id}/examenes`, data)
export const registrarResultado      = (exId, result) => api.put(`/examenes/${exId}/resultado`, { resultado: result })
export const cancelarExamen          = (exId)         => api.delete(`/examenes/${exId}`)

// Archivos
export const getArchivos             = (id)           => api.get(`/pacientes/${id}/archivos`)
export const subirArchivo            = (id, data)     => api.post(`/pacientes/${id}/archivos`, data)
export const eliminarArchivo         = (arId)         => api.delete(`/archivos/${arId}`)

// Dashboard
export const getDashboard            = ()             => api.get('/dashboard')
export const getDashboardFinanciero  = ()             => api.get('/dashboard/financiero')
export const getDashboardOperaciones = ()             => api.get('/dashboard/operaciones')
