import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MapaCamas from './pages/MapaCamas'
import NuevoIngreso from './pages/NuevoIngreso'
import Pacientes from './pages/Pacientes'
import FichaPaciente from './pages/FichaPaciente'
import ColaTriage from './pages/ColaTriage'
import ColaAdmision from './pages/ColaAdmision'
import AtencionMedica from './pages/AtencionMedica'
import DobleCheck from './pages/DobleCheck'
import SolicitudesCama from './pages/SolicitudesCama'
import DashboardKPI from './pages/DashboardKPI'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/triage" replace />} />
          {/* Urgencias */}
          <Route path="/ingreso" element={<NuevoIngreso />} />
          <Route path="/triage" element={<ColaTriage />} />
          <Route path="/admision" element={<ColaAdmision />} />
          <Route path="/medico" element={<AtencionMedica />} />
          {/* Validación */}
          <Route path="/doble-check" element={<DobleCheck />} />
          <Route path="/solicitudes-cama" element={<SolicitudesCama />} />
          {/* Hospitalización */}
          <Route path="/mapa" element={<MapaCamas />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/pacientes/:id" element={<FichaPaciente />} />
          {/* Análisis */}
          <Route path="/dashboard" element={<DashboardKPI />} />
          <Route path="/kpis" element={<DashboardKPI />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
