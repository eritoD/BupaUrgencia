import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Icons (SVG inline) ────────────────────────────────────────────────────────
const Icon = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const IcoMenu       = () => <Icon><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></Icon>
const IcoChevron    = ({ open }) => <Icon size={14}><polyline points={open ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/></Icon>
const IcoTriage     = () => <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>
const IcoAdmision   = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/></Icon>
const IcoMedico     = () => <Icon><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>
const IcoCheck      = () => <Icon><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>
const IcoCama       = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></Icon>
const IcoIngreso    = () => <Icon><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></Icon>
const IcoMapa       = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></Icon>
const IcoPacientes  = () => <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>
const IcoDashboard  = () => <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Icon>
const IcoKPI        = () => <Icon><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Icon>
const IcoClock      = () => <Icon size={14}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>

// ── Navigation config ─────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    id: 'urgencias',
    label: 'Urgencias',
    items: [
      { to: '/ingreso',   icon: <IcoIngreso />,   label: 'Nuevo Ingreso' },
      { to: '/triage',    icon: <IcoTriage />,     label: 'Cola Triage' },
      { to: '/admision',  icon: <IcoAdmision />,   label: 'Cola Admisión' },
      { to: '/medico',    icon: <IcoMedico />,     label: 'Atención Médica' },
    ],
  },
  {
    id: 'validacion',
    label: 'Validación',
    items: [
      { to: '/doble-check',      icon: <IcoCheck />,  label: 'Doble Validación' },
      { to: '/solicitudes-cama', icon: <IcoCama />,   label: 'Solicitudes Cama' },
    ],
  },
  {
    id: 'hospitalizacion',
    label: 'Hospitalización',
    items: [
      { to: '/mapa',      icon: <IcoMapa />,       label: 'Mapa de Camas' },
      { to: '/pacientes', icon: <IcoPacientes />,   label: 'Pacientes' },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { to: '/dashboard', icon: <IcoKPI />,  label: 'Dashboard KPI' },
    ],
  },
]

// ── Breadcrumb helper ─────────────────────────────────────────────────────────
const ROUTE_TITLES = {
  '/ingreso':          { section: 'Urgencias',        page: 'Nuevo Ingreso' },
  '/triage':           { section: 'Urgencias',        page: 'Cola Triage' },
  '/admision':         { section: 'Urgencias',        page: 'Cola Admisión' },
  '/medico':           { section: 'Urgencias',        page: 'Atención Médica' },
  '/doble-check':      { section: 'Validación',       page: 'Doble Validación' },
  '/solicitudes-cama': { section: 'Validación',       page: 'Solicitudes Cama' },
  '/mapa':             { section: 'Hospitalización',  page: 'Mapa de Camas' },
  '/pacientes':        { section: 'Hospitalización',  page: 'Pacientes' },
  '/dashboard':        { section: 'Análisis',         page: 'Dashboard KPI' },
  '/kpis':             { section: 'Análisis',         page: 'Dashboard KPI' },
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date())
  useState(() => {
    const interval = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(interval)
  })
  return time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState({ urgencias: true, validacion: true, hospitalizacion: true, analisis: true })
  const currentTime = useCurrentTime()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleSection = (id) => {
    if (collapsed) return
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const routeInfo = ROUTE_TITLES[location.pathname] || { section: '', page: '' }

  // Detect if current route belongs to a section
  const isActiveSection = (sectionId) => {
    const section = NAV_SECTIONS.find(s => s.id === sectionId)
    return section?.items.some(item => location.pathname.startsWith(item.to))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? '64px' : '252px',
          background: 'linear-gradient(180deg, #0A1628 0%, #0F2040 100%)',
        }}
      >
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#009FE3] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-xs">B</span>
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm tracking-wide">BUPA</div>
                <div className="text-white/30 text-[10px] font-medium truncate">Clínica Santiago</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors flex-shrink-0"
          >
            <IcoMenu />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_SECTIONS.map(({ id, label, items }) => {
            const isOpen = openSections[id]
            const active = isActiveSection(id)

            return (
              <div key={id}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors group ${
                    active ? 'text-white/90' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {!collapsed && (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-widest flex-1">{label}</span>
                      <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                        <IcoChevron open={isOpen} />
                      </span>
                    </>
                  )}
                  {collapsed && (
                    <span className="w-full text-center text-[9px] font-bold uppercase tracking-wider">{label.slice(0, 3)}</span>
                  )}
                </button>

                {/* Section items */}
                {(isOpen || collapsed) && (
                  <div className={`space-y-0.5 ${collapsed ? 'mt-1' : 'mt-0.5 ml-1'}`}>
                    {items.map(({ to, icon, label: itemLabel }) => (
                      <NavLink
                        key={to}
                        to={to}
                        title={collapsed ? itemLabel : undefined}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-md transition-all duration-150 ${
                            collapsed ? 'px-0 py-2 justify-center' : 'px-3 py-2'
                          } ${
                            isActive
                              ? 'bg-[#009FE3]/15 text-[#4FC3F7] shadow-[inset_3px_0_0_#009FE3]'
                              : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                          }`
                        }
                      >
                        <span className="flex-shrink-0 opacity-90">{icon}</span>
                        {!collapsed && (
                          <span className="text-[13px] font-medium truncate">{itemLabel}</span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`px-4 py-3 border-t border-white/8 ${collapsed ? 'text-center' : ''}`}>
          <div className="text-white/25 text-[10px]">{collapsed ? 'v2' : 'Demo2 · v2.0'}</div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-400 font-medium">{routeInfo.section}</span>
            {routeInfo.page && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-800 font-semibold truncate">{routeInfo.page}</span>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <IcoClock />
              <span className="font-medium tabular-nums">{currentTime}</span>
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#003087] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">
                  {(user?.full_name || user?.username || 'U').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="hidden lg:flex flex-col leading-tight">
                <span className="text-xs text-gray-800 font-semibold">{user?.full_name || user?.username}</span>
                <span className="text-[10px] text-gray-400 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Visualizador'}</span>
              </div>
            </div>
            {user?.role === 'admin' && (
              <>
                <div className="w-px h-5 bg-gray-200" />
                <NavLink
                  to="/usuarios"
                  className={({ isActive }) =>
                    `text-xs font-medium transition-colors hidden lg:block ${isActive ? 'text-[#009FE3]' : 'text-gray-400 hover:text-gray-700'}`
                  }
                >
                  Usuarios
                </NavLink>
              </>
            )}
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
