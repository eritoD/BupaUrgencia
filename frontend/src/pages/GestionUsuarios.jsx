import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const ROLES = { admin: 'Administrador', viewer: 'Visualizador' }
const BADGE = {
  admin: 'bg-[#009FE3]/15 text-[#009FE3]',
  viewer: 'bg-gray-100 text-gray-600',
}

export default function GestionUsuarios() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'viewer' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users')
      setUsers(data)
    } catch {
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        No tienes permiso para acceder a esta sección.
      </div>
    )
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm({ username: '', password: '', full_name: '', role: 'viewer' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditTarget(u)
    setForm({ username: u.username, password: '', full_name: u.full_name || '', role: u.role })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTarget) {
        const payload = { full_name: form.full_name, role: form.role }
        if (form.password) payload.password = form.password
        await api.put(`/auth/users/${editTarget.id}`, payload)
      } else {
        if (!form.password) { setError('La contraseña es requerida'); setSaving(false); return }
        await api.post('/auth/users', form)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (u) => {
    if (u.username === 'admin') return
    try {
      await api.put(`/auth/users/${u.id}`, { is_active: !u.is_active })
      fetchUsers()
    } catch {
      setError('Error al cambiar estado')
    }
  }

  const handleDelete = async (u) => {
    if (u.username === 'admin') return
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return
    try {
      await api.delete(`/auth/users/${u.id}`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administra quién puede acceder al sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#009FE3] hover:bg-[#0088c7] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{u.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE[u.role]}`}>
                      {ROLES[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-gray-500 hover:text-[#009FE3] font-medium transition-colors"
                      >
                        Editar
                      </button>
                      {u.username !== 'admin' && (
                        <>
                          <span className="text-gray-200">|</span>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="text-xs text-gray-500 hover:text-amber-600 font-medium transition-colors"
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editTarget ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  disabled={!!editTarget}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009FE3] transition"
                  required={!editTarget}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nombre completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3] transition"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                  Contraseña{editTarget ? ' (dejar en blanco para no cambiar)' : ''}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009FE3] transition"
                  placeholder={editTarget ? 'Sin cambios' : 'Contraseña'}
                  required={!editTarget}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  disabled={editTarget?.username === 'admin'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#009FE3] transition"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#009FE3] hover:bg-[#0088c7] disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
