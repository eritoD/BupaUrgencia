# 🏥 BupaUrgencia

Sistema de gestión de flujo de pacientes en urgencias para Bupa Chile. Plataforma integral que permite el monitoreo en tiempo real de la ocupación de camas, el flujo operativo de pacientes y los indicadores financieros clave.

## 📋 Descripción

BupaUrgencia digitaliza el proceso de gestión de pacientes desde su ingreso a urgencias hasta la hospitalización, reemplazando la comunicación informal con una plataforma centralizada que ofrece:

- **Mapa de Camas**: Visualización en tiempo real de la ocupación por unidad (UCI, UTI, UCO, MQ, Recuperación, Urgencia)
- **Flujo de Urgencias**: Pipeline completo desde Triage → Admisión → Atención Médica → Doble Check → Asignación de Cama
- **Dashboard Gerencial (KPI)**: Indicadores financieros y operacionales para la toma de decisiones
- **Ficha de Paciente**: Gestión clínica completa con historial, exámenes y documentos

## 🛠️ Stack Tecnológico

### Backend
- **FastAPI** — API REST con documentación automática
- **SQLAlchemy** — ORM para manejo de base de datos
- **SQLite** — Base de datos (demo)
- **Pydantic** — Validación de datos

### Frontend
- **React 18** — Interfaz de usuario
- **Vite** — Build tool
- **TailwindCSS** — Estilos
- **Recharts** — Gráficos y visualizaciones
- **React Router** — Navegación SPA
- **Axios** — Comunicación con API

## 🚀 Instalación y Uso

### Prerrequisitos
- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000`
Documentación interactiva en `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
BupaUrgencia/
├── backend/
│   ├── main.py              # API endpoints y lógica de negocio
│   ├── models.py            # Modelos SQLAlchemy
│   ├── database.py          # Configuración de base de datos
│   └── requirements.txt     # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Router principal
│   │   ├── api.js           # Cliente API (Axios)
│   │   ├── components/
│   │   │   └── Layout.jsx   # Layout principal con navegación
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Panel principal
│   │       ├── DashboardKPI.jsx     # KPIs gerenciales
│   │       ├── MapaCamas.jsx        # Mapa de ocupación de camas
│   │       ├── ColaTriage.jsx       # Cola de triage
│   │       ├── ColaAdmision.jsx     # Cola de admisión
│   │       ├── AtencionMedica.jsx   # Atención médica
│   │       ├── DobleCheck.jsx       # Validación doble check
│   │       ├── SolicitudesCama.jsx  # Solicitudes de cama
│   │       ├── NuevoIngreso.jsx     # Registro de nuevos pacientes
│   │       ├── Pacientes.jsx        # Listado de pacientes
│   │       └── FichaPaciente.jsx    # Ficha clínica detallada
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── .gitignore
└── README.md
```

## 🔑 Funcionalidades Principales

### Flujo de Urgencias
1. **Triage** — Clasificación de pacientes (N0-N5) con signos vitales
2. **Admisión** — Registro administrativo y firma de pagaré
3. **Atención Médica** — Evaluación clínica, diagnóstico y orden de hospitalización
4. **Doble Check** — Validación clínica y administrativa
5. **Asignación de Cama** — Búsqueda y asignación según categoría solicitada

### Unidades Hospitalarias
| Unidad | Camas | Descripción |
|--------|-------|-------------|
| UCI | 6 | Unidad de Cuidados Intensivos |
| UCO UTI | 4 | Unidad Coronaria - Intensivo |
| UCO UI | 6 | Unidad Coronaria - Intermedio |
| UTI | 8 | Unidad de Tratamiento Intermedio |
| MQ | 16 | Médico-Quirúrgico |
| Recuperación | 6 | Post-operatorio |
| Urgencia | 8 | Boxes de urgencia |

## 📊 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/camas` | Listado de camas con estado |
| GET | `/api/pacientes/{id}` | Detalle de paciente |
| POST | `/api/pacientes` | Nuevo ingreso |
| PUT | `/api/pacientes/{id}/triage` | Registrar triage |
| PUT | `/api/pacientes/{id}/completar-admision` | Completar admisión |
| PUT | `/api/pacientes/{id}/atencion-medica` | Registrar atención médica |
| PUT | `/api/pacientes/{id}/doble-check` | Validación doble check |
| PUT | `/api/pacientes/{id}/hospitalizar` | Asignar cama |
| GET | `/api/kpi/resumen` | KPIs gerenciales |

## 👥 Autores

- **eritoD** — Desarrollo

## 📄 Licencia

Este proyecto es un demo para Bupa Chile.
