from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import random

import models
from database import engine, get_db, SessionLocal
from auth import (
    get_current_user, get_current_admin,
    get_password_hash, verify_password, create_access_token,
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BUPA Demo2 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Servir archivos estáticos de React ─────────────────────────────────────────
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    print(f"⚠️  Static directory not found: {static_dir}")


# ── Auth middleware ────────────────────────────────────────────────────────────
OPEN_PATHS = {"/api/auth/login", "/docs", "/openapi.json", "/redoc"}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in OPEN_PATHS or request.method == "OPTIONS":
        return await call_next(request)
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "No autenticado"})
    return await call_next(request)


# ── Seed admin user ────────────────────────────────────────────────────────────
def seed_admin():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.username == "admin").first()
        if not existing:
            admin = models.User(
                username="admin",
                full_name="Administrador",
                hashed_password=get_password_hash("admin"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

seed_admin()


# ── Schemas ────────────────────────────────────────────────────────────────────

class PacienteOut(BaseModel):
    id: int
    nombre: str
    rut: str
    edad: int
    sexo: str
    prevision: str
    diagnostico: str
    comorbilidades: str
    estado: str
    unidad: Optional[str]
    fecha_ingreso: datetime
    fecha_hospitalizacion: Optional[datetime]
    fecha_alta: Optional[datetime]
    valor_cuenta_estimado: float
    dias_estadia: int
    cama_numero: Optional[str] = None
    # Contacto
    telefono: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    # Clínico adicional
    alergias: Optional[str] = None
    medicamentos_actuales: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    peso_kg: Optional[float] = None
    talla_cm: Optional[int] = None
    observaciones_clinicas: Optional[str] = None
    # Flujo de urgencias
    nivel_triage: Optional[int] = None
    categoria_solicitada: Optional[str] = None
    orden_hospitalizacion: bool = False
    fecha_orden: Optional[datetime] = None
    check_clinico: bool = False
    check_admin: bool = False
    fecha_doble_check: Optional[datetime] = None
    fecha_asignacion_cama: Optional[datetime] = None
    fecha_llegada_unidad: Optional[datetime] = None
    # Demo2 — Admisión
    admision_completada: bool = False
    fecha_admision: Optional[datetime] = None
    pagare_firmado: bool = False
    # Demo2 — Atención Médica
    atencion_medica_completada: bool = False
    fecha_atencion_medica: Optional[datetime] = None
    indicaciones_medicas: Optional[str] = None
    prescripciones: Optional[str] = None
    # Demo2 — Signos Vitales
    presion_arterial: Optional[str] = None
    frecuencia_cardiaca: Optional[int] = None
    temperatura: Optional[float] = None
    saturacion_o2: Optional[int] = None
    frecuencia_respiratoria: Optional[int] = None

    class Config:
        from_attributes = True


class CamaOut(BaseModel):
    id: int
    numero: str
    unidad: str
    estado: str
    paciente: Optional[PacienteOut] = None

    class Config:
        from_attributes = True


class PacienteCreate(BaseModel):
    nombre: str
    rut: str
    edad: int
    sexo: str
    prevision: str
    diagnostico: str
    comorbilidades: str = ""
    nivel_triage: Optional[int] = None
    telefono: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    alergias: Optional[str] = None
    medicamentos_actuales: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    peso_kg: Optional[float] = None
    talla_cm: Optional[int] = None
    # Signos vitales
    presion_arterial: Optional[str] = None
    frecuencia_cardiaca: Optional[int] = None
    temperatura: Optional[float] = None
    saturacion_o2: Optional[int] = None
    frecuencia_respiratoria: Optional[int] = None


class HospitalizarData(BaseModel):
    nueva_unidad: str
    nueva_cama_numero: str


class DatosClinicosUpdate(BaseModel):
    telefono: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    alergias: Optional[str] = None
    medicamentos_actuales: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    peso_kg: Optional[float] = None
    talla_cm: Optional[int] = None
    observaciones_clinicas: Optional[str] = None


class TriageData(BaseModel):
    nivel_triage: int  # 0-5
    presion_arterial: Optional[str] = None
    frecuencia_cardiaca: Optional[int] = None
    temperatura: Optional[float] = None
    saturacion_o2: Optional[int] = None
    frecuencia_respiratoria: Optional[int] = None


class AdmisionData(BaseModel):
    pagare_firmado: bool = True
    telefono: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    prevision: Optional[str] = None


class AtencionMedicaData(BaseModel):
    observaciones_clinicas: Optional[str] = None
    indicaciones_medicas: Optional[str] = None
    prescripciones: Optional[str] = None
    diagnostico: Optional[str] = None
    categoria_solicitada: str  # UCI | UTI | MQ | UCO UI | UCO UTI


class OrdenHospitalizacionData(BaseModel):
    categoria_solicitada: str  # UCI | UTI | MQ | UCO UI | UCO UTI


class DobleCheckData(BaseModel):
    check_clinico: bool
    check_admin: bool


class ExamenOut(BaseModel):
    id: int
    tipo: str
    nombre: str
    estado: str
    urgente: bool
    resultado: Optional[str]
    fecha_solicitado: datetime
    fecha_resultado: Optional[datetime]

    class Config:
        from_attributes = True


class ExamenCreate(BaseModel):
    tipo: str
    nombre: str
    urgente: bool = False


class ExamenResultado(BaseModel):
    resultado: str


class ArchivoOut(BaseModel):
    id: int
    nombre: str
    tipo: str
    descripcion: Optional[str]
    mime_type: Optional[str]
    datos_b64: Optional[str]
    fecha_subida: datetime

    class Config:
        from_attributes = True


class ArchivoCreate(BaseModel):
    nombre: str
    tipo: str
    descripcion: Optional[str] = None
    datos_b64: Optional[str] = None
    mime_type: Optional[str] = None


class NotaCreate(BaseModel):
    texto: str


# ── Configuración financiera por previsión ─────────────────────────────────────

PREVISION_META = {
    "FONASA": {
        "label": "FONASA Libre Elección",
        "tarifa_dia": 48_000,
        "riesgo": "Medio",
        "cobertura": "80% MLE",
        "color": "blue",
    },
    "ISAPRE": {
        "label": "ISAPRE",
        "tarifa_dia": 115_000,
        "riesgo": "Bajo",
        "cobertura": "90-100% Póliza",
        "color": "purple",
    },
    "Ley Urgencia": {
        "label": "Ley de Urgencia",
        "tarifa_dia": 75_000,
        "riesgo": "Alto",
        "cobertura": "FONASA MLE tope",
        "color": "orange",
    },
    "GES": {
        "label": "GES / 2° Prestador",
        "tarifa_dia": 62_000,
        "riesgo": "Medio",
        "cobertura": "Tarifa GES regulada",
        "color": "teal",
    },
    "Particular": {
        "label": "Particular",
        "tarifa_dia": 155_000,
        "riesgo": "Bajo",
        "cobertura": "100% Pago directo",
        "color": "gray",
    },
}

TRIAGE_LABELS = {
    0: "N0 — Parto/RN",
    1: "N1 — Riesgo Vital",
    2: "N2 — Emergencia",
    3: "N3 — Urgencia",
    4: "N4 — Urgencia Menor",
    5: "N5 — No Urgente",
}


# ── Mock data ──────────────────────────────────────────────────────────────────

MOCK_PACIENTES = [
    # UCI (3)
    {
        "nombre": "Juan Pérez Morales",     "rut": "12.345.678-9", "edad": 67, "sexo": "M",
        "prevision": "FONASA",       "diagnostico": "Neumonía Severa (J18.9)",
        "comorbilidades": "HTA, DM2",            "unidad": "UCI", "cama": "UCI-01",
        "dias": 8, "valor": 4_800_000, "horas_admision": 3.5,
    },
    {
        "nombre": "María González Vega",    "rut": "9.876.543-2",  "edad": 54, "sexo": "F",
        "prevision": "ISAPRE",       "diagnostico": "Post-Op Cardíaco (I25.1)",
        "comorbilidades": "Cardiopatía Isquémica", "unidad": "UCI", "cama": "UCI-02",
        "dias": 3, "valor": 6_200_000, "horas_admision": 1.5,
    },
    {
        "nombre": "Carmen López Reyes",     "rut": "7.654.321-8",  "edad": 62, "sexo": "F",
        "prevision": "Ley Urgencia", "diagnostico": "IAM (I21.9)",
        "comorbilidades": "HTA, Dislipidemia",    "unidad": "UCI", "cama": "UCI-03",
        "dias": 4, "valor": 7_500_000, "horas_admision": 2.0,
    },
    # UCO UTI (1)
    {
        "nombre": "Roberto Vega Contreras", "rut": "11.223.344-5", "edad": 71, "sexo": "M",
        "prevision": "GES",          "diagnostico": "SCA sin elevación ST (I24.0)",
        "comorbilidades": "HTA, DM2, Tabaquismo",  "unidad": "UCO UTI", "cama": "UCO-UTI-01",
        "dias": 2, "valor": 5_100_000, "horas_admision": 1.0,
    },
    # UCO UI (1)
    {
        "nombre": "Rosa Fuentes Valdés",    "rut": "8.112.334-6",  "edad": 65, "sexo": "F",
        "prevision": "ISAPRE",       "diagnostico": "Angina Inestable (I20.0)",
        "comorbilidades": "HTA, Dislipidemia",    "unidad": "UCO UI", "cama": "UCO-UI-01",
        "dias": 1, "valor": 3_200_000, "horas_admision": 0.5,
    },
    # UTI (4)
    {
        "nombre": "Carlos Rodríguez Silva", "rut": "15.432.198-7", "edad": 32, "sexo": "M",
        "prevision": "Ley Urgencia", "diagnostico": "Trauma Craneal (S09.9)",
        "comorbilidades": "Ninguna",              "unidad": "UTI", "cama": "UTI-01",
        "dias": 5, "valor": 3_100_000, "horas_admision": 5.0,
    },
    {
        "nombre": "Lucía Fernández Castro", "rut": "16.543.210-3", "edad": 28, "sexo": "F",
        "prevision": "ISAPRE",       "diagnostico": "Sepsis (A41.9)",
        "comorbilidades": "Ninguna",              "unidad": "UTI", "cama": "UTI-02",
        "dias": 6, "valor": 5_400_000, "horas_admision": 2.0,
    },
    {
        "nombre": "Patricia Torres Bustos", "rut": "10.987.654-6", "edad": 50, "sexo": "F",
        "prevision": "ISAPRE",       "diagnostico": "Post-Op Abdominal (K66.9)",
        "comorbilidades": "HTA",                  "unidad": "UTI", "cama": "UTI-03",
        "dias": 3, "valor": 3_800_000, "horas_admision": 1.5,
    },
    {
        "nombre": "Sofía Ramírez Díaz",     "rut": "20.123.456-7", "edad": 41, "sexo": "F",
        "prevision": "GES",          "diagnostico": "Pancreatitis Aguda (K85.9)",
        "comorbilidades": "Obesidad, DM2",         "unidad": "UTI", "cama": "UTI-04",
        "dias": 7, "valor": 2_900_000, "horas_admision": 4.0,
    },
    # MQ (6)
    {
        "nombre": "Ana Martínez Torres",    "rut": "11.234.567-K", "edad": 45, "sexo": "F",
        "prevision": "FONASA",       "diagnostico": "Colecistectomía Laparoscópica (K80.2)",
        "comorbilidades": "Obesidad",             "unidad": "MQ",  "cama": "MQ-01",
        "dias": 2, "valor": 1_200_000, "horas_admision": 2.0,
    },
    {
        "nombre": "Pedro Soto Fuentes",     "rut": "8.765.432-1",  "edad": 71, "sexo": "M",
        "prevision": "GES",          "diagnostico": "Diabetes con Complicaciones (E11.9)",
        "comorbilidades": "DM2, IRC",             "unidad": "MQ",  "cama": "MQ-02",
        "dias": 12, "valor": 2_800_000, "horas_admision": 2.5,
    },
    {
        "nombre": "Roberto Muñoz Pinto",    "rut": "13.456.789-5", "edad": 38, "sexo": "M",
        "prevision": "FONASA",       "diagnostico": "Apendicitis Aguda (K35.9)",
        "comorbilidades": "Ninguna",              "unidad": "MQ",  "cama": "MQ-03",
        "dias": 1, "valor": 800_000, "horas_admision": 1.5,
    },
    {
        "nombre": "Francisco Silva Mora",   "rut": "14.567.890-2", "edad": 74, "sexo": "M",
        "prevision": "GES",          "diagnostico": "EPOC Exacerbado (J44.1)",
        "comorbilidades": "EPOC, Tabaquismo",     "unidad": "MQ",  "cama": "MQ-04",
        "dias": 9, "valor": 1_900_000, "horas_admision": 3.0,
    },
    {
        "nombre": "Miguel Ángel Vidal",     "rut": "19.345.678-5", "edad": 58, "sexo": "M",
        "prevision": "ISAPRE",       "diagnostico": "Hernia Inguinal (K40.9)",
        "comorbilidades": "DM2",                  "unidad": "MQ",  "cama": "MQ-05",
        "dias": 3, "valor": 2_200_000, "horas_admision": 1.5,
    },
    {
        "nombre": "Elena Castillo Neira",   "rut": "21.456.789-3", "edad": 66, "sexo": "F",
        "prevision": "FONASA",       "diagnostico": "Hipertensión Descompensada (I10)",
        "comorbilidades": "HTA, Obesidad",        "unidad": "MQ",  "cama": "MQ-06",
        "dias": 5, "valor": 1_500_000, "horas_admision": 8.0,
    },
    # Recuperación (1)
    {
        "nombre": "Isabel Morales Vera",    "rut": "12.876.543-2", "edad": 52, "sexo": "F",
        "prevision": "Particular",   "diagnostico": "Post-Op Colecistectomía (Z09)",
        "comorbilidades": "Obesidad",             "unidad": "Recuperacion", "cama": "REC-01",
        "dias": 1, "valor": 1_800_000, "horas_admision": 1.0,
    },
]

# Pacientes en pipeline de Urgencias — distribuidos en todas las etapas del nuevo ciclo
URGENCIAS_PACIENTES = [
    # Etapa: Triage (recién llegó, sin clasificar)
    {
        "nombre": "Diego Herrera Vega",     "rut": "17.234.567-8", "edad": 44, "sexo": "M",
        "prevision": "ISAPRE",       "diagnostico": "Dolor Abdominal Agudo (R10.0)",
        "comorbilidades": "Ninguna", "horas_espera": 0.5,
        "nivel_triage": None,
        "admision_completada": False,
        "atencion_medica_completada": False,
        "orden_hospitalizacion": False, "categoria_solicitada": None,
        "check_clinico": False, "check_admin": False,
    },
    {
        "nombre": "Fernanda Salas Mora",    "rut": "23.456.789-0", "edad": 33, "sexo": "F",
        "prevision": "FONASA",       "diagnostico": "Cefalea Intensa Súbita (R51)",
        "comorbilidades": "Migraña", "horas_espera": 0.3,
        "nivel_triage": None,
        "admision_completada": False,
        "atencion_medica_completada": False,
        "orden_hospitalizacion": False, "categoria_solicitada": None,
        "check_clinico": False, "check_admin": False,
    },
    # Etapa: Admisión (triage hecho, pendiente admisión administrativa)
    {
        "nombre": "Valentina Rivas Ojeda",  "rut": "18.765.432-1", "edad": 29, "sexo": "F",
        "prevision": "FONASA",       "diagnostico": "Crisis Asmática Severa (J45.1)",
        "comorbilidades": "Asma Bronquial", "horas_espera": 1.8,
        "nivel_triage": 3,
        "admision_completada": False,
        "atencion_medica_completada": False,
        "orden_hospitalizacion": False, "categoria_solicitada": None,
        "check_clinico": False, "check_admin": False,
    },
    {
        "nombre": "Tomás Beltrán Ríos",     "rut": "24.567.890-1", "edad": 56, "sexo": "M",
        "prevision": "ISAPRE",       "diagnostico": "Dolor Torácico (R07.4)",
        "comorbilidades": "HTA, DM2", "horas_espera": 1.2,
        "nivel_triage": 2,
        "admision_completada": False,
        "atencion_medica_completada": False,
        "orden_hospitalizacion": False, "categoria_solicitada": None,
        "check_clinico": False, "check_admin": False,
    },
    # Etapa: Atención Médica (admisión completada, pendiente atención del médico)
    {
        "nombre": "Luisa Paredes Castillo", "rut": "25.678.901-2", "edad": 48, "sexo": "F",
        "prevision": "GES",          "diagnostico": "Insuficiencia Respiratoria (J96.0)",
        "comorbilidades": "EPOC", "horas_espera": 3.0,
        "nivel_triage": 2,
        "admision_completada": True,
        "atencion_medica_completada": False,
        "orden_hospitalizacion": False, "categoria_solicitada": None,
        "check_clinico": False, "check_admin": False,
    },
    # Etapa: Doble check (orden emitida, enfermero debe validar)
    {
        "nombre": "Arturo Campos Fuentes",  "rut": "6.543.210-4",  "edad": 78, "sexo": "M",
        "prevision": "Ley Urgencia", "diagnostico": "Síncope y Colapso (R55)",
        "comorbilidades": "HTA, Cardiopatía", "horas_espera": 5.0,
        "nivel_triage": 2,
        "admision_completada": True,
        "atencion_medica_completada": True,
        "orden_hospitalizacion": True, "categoria_solicitada": "UTI",
        "check_clinico": False, "check_admin": False,
    },
    # Etapa: Listo para cama (doble check completado)
    {
        "nombre": "Catalina Espinoza Ríos", "rut": "22.111.222-3", "edad": 55, "sexo": "F",
        "prevision": "GES",          "diagnostico": "ACV Isquémico (I63.9)",
        "comorbilidades": "HTA, Fibrilación auricular", "horas_espera": 6.5,
        "nivel_triage": 1,
        "admision_completada": True,
        "atencion_medica_completada": True,
        "orden_hospitalizacion": True, "categoria_solicitada": "UCI",
        "check_clinico": True, "check_admin": True,
    },
]

CAMAS_CONFIG = {
    "UCI":          [f"UCI-{i:02d}" for i in range(1, 7)],
    "UCO UTI":      [f"UCO-UTI-{i:02d}" for i in range(1, 5)],
    "UCO UI":       [f"UCO-UI-{i:02d}" for i in range(1, 7)],
    "UTI":          [f"UTI-{i:02d}" for i in range(1, 9)],
    "MQ":           [f"MQ-{i:02d}"  for i in range(1, 17)],
    "Recuperacion": [f"REC-{i:02d}" for i in range(1, 7)],
    "Urgencia":     [f"URG-{i:02d}" for i in range(1, 9)],
}


def seed_database():
    db = SessionLocal()
    try:
        if db.query(models.Cama).count() > 0:
            return

        ocupadas = {p["cama"] for p in MOCK_PACIENTES}

        for unidad, camas in CAMAS_CONFIG.items():
            for num in camas:
                if num in ocupadas:
                    estado = "ocupada"
                elif unidad == "Urgencia":
                    estado = random.choices(
                        ["libre", "ocupada", "limpieza"], weights=[50, 30, 20]
                    )[0]
                else:
                    estado = random.choices(
                        ["libre", "limpieza"], weights=[85, 15]
                    )[0]
                db.add(models.Cama(numero=num, unidad=unidad, estado=estado))
        db.commit()

        now = datetime.utcnow()

        # Seed hospitalized patients
        for p in MOCK_PACIENTES:
            fecha_ingreso = now - timedelta(days=p["dias"])
            fecha_hosp    = fecha_ingreso + timedelta(hours=p.get("horas_admision", 2.0))
            paciente = models.Paciente(
                nombre=p["nombre"], rut=p["rut"], edad=p["edad"], sexo=p["sexo"],
                prevision=p["prevision"], diagnostico=p["diagnostico"],
                comorbilidades=p["comorbilidades"], estado="hospitalizado",
                unidad=p["unidad"], fecha_ingreso=fecha_ingreso,
                fecha_hospitalizacion=fecha_hosp,
                valor_cuenta_estimado=p["valor"], dias_estadia=p["dias"],
                # Flujo completado
                nivel_triage=random.choice([1, 2, 3]),
                admision_completada=True,
                fecha_admision=fecha_ingreso + timedelta(minutes=30),
                pagare_firmado=True,
                atencion_medica_completada=True,
                fecha_atencion_medica=fecha_ingreso + timedelta(hours=1),
                orden_hospitalizacion=True,
                check_clinico=True,
                check_admin=True,
                fecha_doble_check=fecha_hosp - timedelta(minutes=30),
                fecha_asignacion_cama=fecha_hosp - timedelta(minutes=20),
                fecha_llegada_unidad=fecha_hosp,
            )
            db.add(paciente)
            db.commit()
            db.refresh(paciente)

            cama = db.query(models.Cama).filter(models.Cama.numero == p["cama"]).first()
            if cama:
                cama.paciente_id = paciente.id
                db.commit()

            db.add(models.Evento(
                paciente_id=paciente.id, tipo="ingreso",
                descripcion=f"Ingreso a Urgencias — {p['diagnostico']}",
                timestamp=fecha_ingreso,
            ))
            db.add(models.Evento(
                paciente_id=paciente.id, tipo="hospitalizacion",
                descripcion=f"Hospitalizado en {p['unidad']} — Cama {p['cama']}",
                timestamp=fecha_hosp,
            ))
        db.commit()

        # Seed urgencias patients (pipeline)
        for u in URGENCIAS_PACIENTES:
            fecha_ingreso = now - timedelta(hours=u["horas_espera"])
            fecha_orden = None
            fecha_doble_check = None
            fecha_admision = None
            fecha_atencion = None

            if u.get("admision_completada"):
                fecha_admision = fecha_ingreso + timedelta(minutes=20)
            if u.get("atencion_medica_completada"):
                fecha_atencion = fecha_admision + timedelta(minutes=40) if fecha_admision else None
            if u["orden_hospitalizacion"]:
                fecha_orden = fecha_atencion or (fecha_ingreso + timedelta(hours=u["horas_espera"] * 0.5))
            if u["check_clinico"] and u["check_admin"]:
                fecha_doble_check = fecha_orden + timedelta(minutes=30) if fecha_orden else None

            paciente = models.Paciente(
                nombre=u["nombre"], rut=u["rut"], edad=u["edad"], sexo=u["sexo"],
                prevision=u["prevision"], diagnostico=u["diagnostico"],
                comorbilidades=u["comorbilidades"], estado="urgencias",
                unidad=None, fecha_ingreso=fecha_ingreso,
                valor_cuenta_estimado=0, dias_estadia=0,
                nivel_triage=u["nivel_triage"],
                admision_completada=u.get("admision_completada", False),
                fecha_admision=fecha_admision,
                pagare_firmado=u.get("admision_completada", False),
                atencion_medica_completada=u.get("atencion_medica_completada", False),
                fecha_atencion_medica=fecha_atencion,
                categoria_solicitada=u.get("categoria_solicitada"),
                orden_hospitalizacion=u["orden_hospitalizacion"],
                fecha_orden=fecha_orden,
                check_clinico=u["check_clinico"],
                check_admin=u["check_admin"],
                fecha_doble_check=fecha_doble_check,
            )
            db.add(paciente)
            db.commit()
            db.refresh(paciente)

            db.add(models.Evento(
                paciente_id=paciente.id, tipo="ingreso",
                descripcion=f"Ingreso a Urgencias — {u['diagnostico']}",
                timestamp=fecha_ingreso,
            ))
            if u["nivel_triage"] is not None:
                db.add(models.Evento(
                    paciente_id=paciente.id, tipo="triage",
                    descripcion=f"Triage clasificado: {TRIAGE_LABELS.get(u['nivel_triage'], 'Nivel ' + str(u['nivel_triage']))}",
                    timestamp=fecha_ingreso + timedelta(minutes=10),
                ))
            if u.get("admision_completada") and fecha_admision:
                db.add(models.Evento(
                    paciente_id=paciente.id, tipo="admision",
                    descripcion="Admisión completada — Pagaré firmado, datos validados",
                    timestamp=fecha_admision,
                ))
            if u.get("atencion_medica_completada") and fecha_atencion:
                db.add(models.Evento(
                    paciente_id=paciente.id, tipo="atencion_medica",
                    descripcion="Atención médica completada — Orden de hospitalización emitida",
                    timestamp=fecha_atencion,
                ))
            if u["orden_hospitalizacion"] and fecha_orden:
                cat = u.get("categoria_solicitada", "—")
                db.add(models.Evento(
                    paciente_id=paciente.id, tipo="orden",
                    descripcion=f"Orden de hospitalización emitida — Categoría: {cat}",
                    timestamp=fecha_orden,
                ))
            if u["check_clinico"] and u["check_admin"] and fecha_doble_check:
                db.add(models.Evento(
                    paciente_id=paciente.id, tipo="doble_check",
                    descripcion="Doble validación completada — Paciente listo para asignación de cama",
                    timestamp=fecha_doble_check,
                ))
        db.commit()

    finally:
        db.close()


@app.on_event("startup")
def startup():
    seed_database()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _paciente_to_out(p: models.Paciente, cama_numero=None) -> PacienteOut:
    return PacienteOut(
        id=p.id, nombre=p.nombre, rut=p.rut, edad=p.edad, sexo=p.sexo,
        prevision=p.prevision, diagnostico=p.diagnostico, comorbilidades=p.comorbilidades,
        estado=p.estado, unidad=p.unidad, fecha_ingreso=p.fecha_ingreso,
        fecha_hospitalizacion=p.fecha_hospitalizacion, fecha_alta=p.fecha_alta,
        valor_cuenta_estimado=p.valor_cuenta_estimado, dias_estadia=p.dias_estadia,
        cama_numero=cama_numero,
        telefono=p.telefono, contacto_emergencia=p.contacto_emergencia,
        alergias=p.alergias, medicamentos_actuales=p.medicamentos_actuales,
        grupo_sanguineo=p.grupo_sanguineo, peso_kg=p.peso_kg, talla_cm=p.talla_cm,
        observaciones_clinicas=p.observaciones_clinicas,
        nivel_triage=p.nivel_triage,
        categoria_solicitada=p.categoria_solicitada,
        orden_hospitalizacion=p.orden_hospitalizacion or False,
        fecha_orden=p.fecha_orden,
        check_clinico=p.check_clinico or False,
        check_admin=p.check_admin or False,
        fecha_doble_check=p.fecha_doble_check,
        fecha_asignacion_cama=p.fecha_asignacion_cama,
        fecha_llegada_unidad=p.fecha_llegada_unidad,
        admision_completada=p.admision_completada or False,
        fecha_admision=p.fecha_admision,
        pagare_firmado=p.pagare_firmado or False,
        atencion_medica_completada=p.atencion_medica_completada or False,
        fecha_atencion_medica=p.fecha_atencion_medica,
        indicaciones_medicas=p.indicaciones_medicas,
        prescripciones=p.prescripciones,
        presion_arterial=p.presion_arterial,
        frecuencia_cardiaca=p.frecuencia_cardiaca,
        temperatura=p.temperatura,
        saturacion_o2=p.saturacion_o2,
        frecuencia_respiratoria=p.frecuencia_respiratoria,
    )


# ── Routes — Camas & Pacientes ─────────────────────────────────────────────────

@app.get("/api/camas", response_model=List[CamaOut])
def get_camas(db: Session = Depends(get_db)):
    camas = db.query(models.Cama).all()
    result = []
    for c in camas:
        paciente_out = None
        if c.paciente:
            paciente_out = _paciente_to_out(c.paciente, c.numero)
        result.append(CamaOut(id=c.id, numero=c.numero, unidad=c.unidad,
                               estado=c.estado, paciente=paciente_out))
    return result


@app.get("/api/pacientes/{paciente_id}", response_model=PacienteOut)
def get_paciente(paciente_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    cama = db.query(models.Cama).filter(models.Cama.paciente_id == p.id).first()
    if p.fecha_hospitalizacion:
        p.dias_estadia = (datetime.utcnow() - p.fecha_hospitalizacion).days
    return _paciente_to_out(p, cama.numero if cama else None)


@app.post("/api/pacientes/{paciente_id}/notas")
def add_nota(paciente_id: int, nota: NotaCreate, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    db.add(models.Evento(
        paciente_id=paciente_id,
        tipo="nota",
        descripcion=nota.texto,
    ))
    db.commit()
    return {"message": "Nota registrada"}


@app.patch("/api/pacientes/{paciente_id}/clinica")
def update_datos_clinicos(paciente_id: int, data: DatosClinicosUpdate, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.add(models.Evento(
        paciente_id=paciente_id,
        tipo="nota",
        descripcion="Datos clínicos actualizados",
    ))
    db.commit()
    return {"message": "Datos actualizados"}


# ── Routes — Flujo de Urgencias (Demo2 — Ciclo completo) ──────────────────────

@app.put("/api/pacientes/{paciente_id}/triage")
def registrar_triage(paciente_id: int, data: TriageData, db: Session = Depends(get_db)):
    if data.nivel_triage not in range(6):
        raise HTTPException(400, "Nivel de triage debe ser 0-5")
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    p.nivel_triage = data.nivel_triage
    # Signos vitales
    if data.presion_arterial:
        p.presion_arterial = data.presion_arterial
    if data.frecuencia_cardiaca:
        p.frecuencia_cardiaca = data.frecuencia_cardiaca
    if data.temperatura:
        p.temperatura = data.temperatura
    if data.saturacion_o2:
        p.saturacion_o2 = data.saturacion_o2
    if data.frecuencia_respiratoria:
        p.frecuencia_respiratoria = data.frecuencia_respiratoria
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="triage",
        descripcion=f"Triage clasificado: {TRIAGE_LABELS.get(data.nivel_triage, f'Nivel {data.nivel_triage}')}",
    ))
    db.commit()
    return {"message": "Triage registrado"}


@app.put("/api/pacientes/{paciente_id}/completar-admision")
def completar_admision(paciente_id: int, data: AdmisionData, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    p.admision_completada = True
    p.fecha_admision = datetime.utcnow()
    p.pagare_firmado = data.pagare_firmado
    if data.telefono:
        p.telefono = data.telefono
    if data.contacto_emergencia:
        p.contacto_emergencia = data.contacto_emergencia
    if data.prevision:
        p.prevision = data.prevision
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="admision",
        descripcion=f"Admisión completada — Pagaré {'firmado' if data.pagare_firmado else 'pendiente'}, datos administrativos validados",
    ))
    db.commit()
    return {"message": "Admisión completada"}


@app.put("/api/pacientes/{paciente_id}/atencion-medica")
def registrar_atencion_medica(paciente_id: int, data: AtencionMedicaData, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    p.atencion_medica_completada = True
    p.fecha_atencion_medica = datetime.utcnow()
    if data.observaciones_clinicas:
        p.observaciones_clinicas = data.observaciones_clinicas
    if data.indicaciones_medicas:
        p.indicaciones_medicas = data.indicaciones_medicas
    if data.prescripciones:
        p.prescripciones = data.prescripciones
    if data.diagnostico:
        p.diagnostico = data.diagnostico
    # Emitir orden de hospitalización
    cat = data.categoria_solicitada
    if p.prevision == "FONASA" and not cat.endswith("F"):
        cat = cat + "F"
    p.orden_hospitalizacion = True
    p.categoria_solicitada = cat
    p.fecha_orden = datetime.utcnow()
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="atencion_medica",
        descripcion=f"Atención médica completada — Observaciones y orden de hospitalización emitida (Categoría: {cat})",
    ))
    db.commit()
    return {"message": "Atención médica registrada", "categoria": cat}


@app.put("/api/pacientes/{paciente_id}/orden-hospitalizacion")
def emitir_orden(paciente_id: int, data: OrdenHospitalizacionData, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    cat = data.categoria_solicitada
    if p.prevision == "FONASA" and not cat.endswith("F"):
        cat = cat + "F"
    p.orden_hospitalizacion = True
    p.categoria_solicitada = cat
    p.fecha_orden = datetime.utcnow()
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="orden",
        descripcion=f"Orden de hospitalización emitida — Categoría solicitada: {cat}",
    ))
    db.commit()
    return {"message": "Orden emitida", "categoria": cat}


@app.put("/api/pacientes/{paciente_id}/doble-check")
def doble_check(paciente_id: int, data: DobleCheckData, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    p.check_clinico = data.check_clinico
    p.check_admin = data.check_admin
    if data.check_clinico and data.check_admin:
        p.fecha_doble_check = datetime.utcnow()
        db.add(models.Evento(
            paciente_id=paciente_id, tipo="doble_check",
            descripcion="Doble validación completada — Paciente listo para asignación de cama",
        ))
    else:
        db.add(models.Evento(
            paciente_id=paciente_id, tipo="nota",
            descripcion=f"Doble check actualizado — Clínico: {'✓' if data.check_clinico else '✗'} · Admin: {'✓' if data.check_admin else '✗'}",
        ))
    db.commit()
    return {"message": "Validación actualizada"}


@app.put("/api/pacientes/{paciente_id}/paciente-llego")
def paciente_llego(paciente_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    now = datetime.utcnow()
    p.fecha_llegada_unidad = now
    transit_min = None
    if p.fecha_asignacion_cama:
        transit_min = round((now - p.fecha_asignacion_cama).total_seconds() / 60, 1)
    desc = f"Paciente llegó a la unidad {p.unidad}"
    if transit_min is not None:
        desc += f" — Tiempo de tránsito: {transit_min} min"
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="llegada_unidad",
        descripcion=desc,
    ))
    db.commit()
    return {"message": "Llegada confirmada", "transit_min": transit_min}


# ── Colas separadas del pipeline (Demo2) ──────────────────────────────────────

def _build_cola_item(p, now):
    horas = round((now - p.fecha_ingreso).total_seconds() / 3600, 1)
    return {
        "id": p.id,
        "nombre": p.nombre,
        "rut": p.rut,
        "edad": p.edad,
        "sexo": p.sexo,
        "prevision": p.prevision,
        "diagnostico": p.diagnostico,
        "comorbilidades": p.comorbilidades,
        "nivel_triage": p.nivel_triage,
        "categoria_solicitada": p.categoria_solicitada,
        "orden_hospitalizacion": p.orden_hospitalizacion or False,
        "check_clinico": p.check_clinico or False,
        "check_admin": p.check_admin or False,
        "admision_completada": p.admision_completada or False,
        "atencion_medica_completada": p.atencion_medica_completada or False,
        "pagare_firmado": p.pagare_firmado or False,
        "horas_espera": horas,
        "critico": horas > 4 or (p.nivel_triage is not None and p.nivel_triage <= 1),
        "fecha_ingreso": p.fecha_ingreso.isoformat() if p.fecha_ingreso else None,
        "presion_arterial": p.presion_arterial,
        "frecuencia_cardiaca": p.frecuencia_cardiaca,
        "temperatura": p.temperatura,
        "saturacion_o2": p.saturacion_o2,
        "frecuencia_respiratoria": p.frecuencia_respiratoria,
        "telefono": p.telefono,
        "contacto_emergencia": p.contacto_emergencia,
        "indicaciones_medicas": p.indicaciones_medicas,
        "prescripciones": p.prescripciones,
        "observaciones_clinicas": p.observaciones_clinicas,
    }


@app.get("/api/urgencias/cola-triage")
def get_cola_triage(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    pacientes = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.nivel_triage == None,
    ).all()
    items = [_build_cola_item(p, now) for p in pacientes]
    items.sort(key=lambda x: -x["horas_espera"])
    return {"pacientes": items, "total": len(items)}


@app.get("/api/urgencias/cola-admision")
def get_cola_admision(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    pacientes = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.nivel_triage != None,
        models.Paciente.admision_completada == False,
    ).all()
    items = [_build_cola_item(p, now) for p in pacientes]
    items.sort(key=lambda x: -x["horas_espera"])
    return {"pacientes": items, "total": len(items)}


@app.get("/api/urgencias/cola-medica")
def get_cola_medica(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    pacientes = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.admision_completada == True,
        models.Paciente.atencion_medica_completada == False,
    ).all()
    items = [_build_cola_item(p, now) for p in pacientes]
    items.sort(key=lambda x: -x["horas_espera"])
    return {"pacientes": items, "total": len(items)}


@app.get("/api/urgencias/cola-doble-check")
def get_cola_doble_check(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    pacientes = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.orden_hospitalizacion == True,
        models.Paciente.check_clinico == False,
    ).all()
    # Also include partially checked
    pacientes2 = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.orden_hospitalizacion == True,
        models.Paciente.check_admin == False,
    ).all()
    seen = set()
    all_p = []
    for p in pacientes + pacientes2:
        if p.id not in seen:
            seen.add(p.id)
            all_p.append(p)
    items = [_build_cola_item(p, now) for p in all_p]
    items.sort(key=lambda x: -x["horas_espera"])
    return {"pacientes": items, "total": len(items)}


@app.get("/api/urgencias/solicitudes-cama")
def get_solicitudes_cama(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Pacientes listos (ambos checks pasados, sin cama asignada)
    listos = db.query(models.Paciente).filter(
        models.Paciente.estado == "urgencias",
        models.Paciente.check_clinico == True,
        models.Paciente.check_admin == True,
    ).all()
    # En tránsito (cama asignada pero no ha llegado)
    en_transito = db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado",
        models.Paciente.fecha_llegada_unidad == None,
        models.Paciente.fecha_asignacion_cama != None,
    ).all()

    items_listos = [_build_cola_item(p, now) for p in listos]
    items_transito = []
    for p in en_transito:
        item = _build_cola_item(p, now)
        item["transit_min"] = round((now - p.fecha_asignacion_cama).total_seconds() / 60, 1) if p.fecha_asignacion_cama else None
        item["unidad"] = p.unidad
        cama = db.query(models.Cama).filter(models.Cama.paciente_id == p.id).first()
        item["cama_numero"] = cama.numero if cama else None
        items_transito.append(item)

    items_listos.sort(key=lambda x: -x["horas_espera"])
    items_transito.sort(key=lambda x: -(x.get("transit_min") or 0))

    return {
        "pendientes": items_listos,
        "en_transito": items_transito,
        "total_pendientes": len(items_listos),
        "total_transito": len(items_transito),
    }


# Keep legacy pipeline for backward compatibility
@app.get("/api/urgencias/pipeline")
def get_pipeline(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    urgencias = db.query(models.Paciente).filter(models.Paciente.estado == "urgencias").all()
    en_transito = db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado",
        models.Paciente.fecha_llegada_unidad == None,
        models.Paciente.fecha_asignacion_cama != None,
    ).all()

    def build_card(p, etapa):
        horas = round((now - p.fecha_ingreso).total_seconds() / 3600, 1)
        transit_min = None
        if p.fecha_asignacion_cama:
            transit_min = round((now - p.fecha_asignacion_cama).total_seconds() / 60, 1)
        return {
            "id": p.id, "nombre": p.nombre, "rut": p.rut, "edad": p.edad,
            "sexo": p.sexo, "prevision": p.prevision, "diagnostico": p.diagnostico,
            "comorbilidades": p.comorbilidades, "nivel_triage": p.nivel_triage,
            "categoria_solicitada": p.categoria_solicitada,
            "orden_hospitalizacion": p.orden_hospitalizacion or False,
            "check_clinico": p.check_clinico or False,
            "check_admin": p.check_admin or False,
            "horas_espera": horas, "transit_min": transit_min,
            "critico": horas > 4 or (p.nivel_triage is not None and p.nivel_triage <= 1),
            "etapa": etapa, "unidad": p.unidad,
        }

    stages = {"triage": [], "admision": [], "atencion_medica": [], "doble_check": [], "cama_pendiente": [], "en_transito": []}

    for p in urgencias:
        if p.nivel_triage is None:
            etapa = "triage"
        elif not (p.admision_completada or False):
            etapa = "admision"
        elif not (p.atencion_medica_completada or False):
            etapa = "atencion_medica"
        elif not ((p.check_clinico or False) and (p.check_admin or False)):
            etapa = "doble_check"
        else:
            etapa = "cama_pendiente"
        stages[etapa].append(build_card(p, etapa))

    for p in en_transito:
        stages["en_transito"].append(build_card(p, "en_transito"))

    for s in stages.values():
        s.sort(key=lambda x: -x["horas_espera"])

    total = sum(len(s) for s in stages.values())
    criticos = sum(1 for s in stages.values() for p in s if p["critico"])
    avg_espera = 0
    all_p = [p for s in stages.values() for p in s]
    if all_p:
        avg_espera = round(sum(p["horas_espera"] for p in all_p) / len(all_p), 1)

    return {"stages": stages, "total": total, "criticos": criticos, "avg_espera": avg_espera}


# ── Exámenes ───────────────────────────────────────────────────────────────────

@app.get("/api/pacientes/{paciente_id}/examenes", response_model=List[ExamenOut])
def get_examenes(paciente_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Examen)
        .filter(models.Examen.paciente_id == paciente_id)
        .order_by(models.Examen.fecha_solicitado.desc())
        .all()
    )


@app.post("/api/pacientes/{paciente_id}/examenes", response_model=ExamenOut)
def crear_examen(paciente_id: int, data: ExamenCreate, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    examen = models.Examen(
        paciente_id=paciente_id, tipo=data.tipo, nombre=data.nombre,
        urgente=data.urgente, estado="pendiente",
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)
    urgencia_txt = " [URGENTE]" if data.urgente else ""
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="nota",
        descripcion=f"Examen solicitado{urgencia_txt}: {data.nombre} ({data.tipo})",
    ))
    db.commit()
    return examen


@app.put("/api/examenes/{examen_id}/resultado")
def registrar_resultado(examen_id: int, data: ExamenResultado, db: Session = Depends(get_db)):
    examen = db.query(models.Examen).filter(models.Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(404, "Examen no encontrado")
    examen.resultado = data.resultado
    examen.estado = "completado"
    examen.fecha_resultado = datetime.utcnow()
    db.commit()
    db.add(models.Evento(
        paciente_id=examen.paciente_id, tipo="nota",
        descripcion=f"Resultado registrado: {examen.nombre}",
    ))
    db.commit()
    return {"message": "Resultado registrado"}


@app.delete("/api/examenes/{examen_id}")
def cancelar_examen(examen_id: int, db: Session = Depends(get_db)):
    examen = db.query(models.Examen).filter(models.Examen.id == examen_id).first()
    if not examen:
        raise HTTPException(404, "Examen no encontrado")
    examen.estado = "cancelado"
    db.commit()
    return {"message": "Examen cancelado"}


# ── Archivos ───────────────────────────────────────────────────────────────────

@app.get("/api/pacientes/{paciente_id}/archivos", response_model=List[ArchivoOut])
def get_archivos(paciente_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Archivo)
        .filter(models.Archivo.paciente_id == paciente_id)
        .order_by(models.Archivo.fecha_subida.desc())
        .all()
    )


@app.post("/api/pacientes/{paciente_id}/archivos", response_model=ArchivoOut)
def subir_archivo(paciente_id: int, data: ArchivoCreate, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    archivo = models.Archivo(
        paciente_id=paciente_id, nombre=data.nombre, tipo=data.tipo,
        descripcion=data.descripcion, datos_b64=data.datos_b64, mime_type=data.mime_type,
    )
    db.add(archivo)
    db.commit()
    db.refresh(archivo)
    db.add(models.Evento(
        paciente_id=paciente_id, tipo="nota",
        descripcion=f"Archivo adjunto: {data.nombre} ({data.tipo})",
    ))
    db.commit()
    return archivo


@app.delete("/api/archivos/{archivo_id}")
def eliminar_archivo(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(models.Archivo).filter(models.Archivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(404, "Archivo no encontrado")
    db.delete(archivo)
    db.commit()
    return {"message": "Archivo eliminado"}


@app.get("/api/pacientes", response_model=List[PacienteOut])
def get_pacientes(db: Session = Depends(get_db)):
    pacientes = db.query(models.Paciente).all()
    result = []
    for p in pacientes:
        cama = db.query(models.Cama).filter(models.Cama.paciente_id == p.id).first()
        result.append(_paciente_to_out(p, cama.numero if cama else None))
    return result


@app.post("/api/pacientes", response_model=PacienteOut)
def crear_paciente(data: PacienteCreate, db: Session = Depends(get_db)):
    p = models.Paciente(
        nombre=data.nombre, rut=data.rut, edad=data.edad, sexo=data.sexo,
        prevision=data.prevision, diagnostico=data.diagnostico,
        comorbilidades=data.comorbilidades, estado="urgencias",
        fecha_ingreso=datetime.utcnow(), dias_estadia=0,
        nivel_triage=data.nivel_triage,
        telefono=data.telefono,
        contacto_emergencia=data.contacto_emergencia,
        alergias=data.alergias,
        medicamentos_actuales=data.medicamentos_actuales,
        grupo_sanguineo=data.grupo_sanguineo,
        peso_kg=data.peso_kg,
        talla_cm=data.talla_cm,
        presion_arterial=data.presion_arterial,
        frecuencia_cardiaca=data.frecuencia_cardiaca,
        temperatura=data.temperatura,
        saturacion_o2=data.saturacion_o2,
        frecuencia_respiratoria=data.frecuencia_respiratoria,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    db.add(models.Evento(
        paciente_id=p.id, tipo="ingreso",
        descripcion=f"Ingreso a Urgencias — {data.diagnostico}",
    ))
    if data.nivel_triage is not None:
        db.add(models.Evento(
            paciente_id=p.id, tipo="triage",
            descripcion=f"Triage clasificado al ingreso: {TRIAGE_LABELS.get(data.nivel_triage, f'Nivel {data.nivel_triage}')}",
        ))
    db.commit()
    return _paciente_to_out(p)


@app.put("/api/pacientes/{paciente_id}/hospitalizar")
def hospitalizar(paciente_id: int, data: HospitalizarData, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")

    cama = db.query(models.Cama).filter(models.Cama.numero == data.nueva_cama_numero).first()
    if not cama:
        raise HTTPException(404, "Cama no encontrada")
    if cama.estado == "ocupada":
        raise HTTPException(400, "La cama ya está ocupada")

    now = datetime.utcnow()
    p.estado = "hospitalizado"
    p.unidad = data.nueva_unidad
    p.fecha_hospitalizacion = now
    p.fecha_asignacion_cama = now   # Inicia reloj de tránsito
    cama.estado = "ocupada"
    cama.paciente_id = p.id

    db.add(models.Evento(
        paciente_id=p.id, tipo="hospitalizacion",
        descripcion=f"Cama asignada: {data.nueva_unidad} — {data.nueva_cama_numero}. Reloj de tránsito iniciado.",
    ))
    db.commit()
    return {"message": "Paciente hospitalizado"}


@app.put("/api/pacientes/{paciente_id}/alta")
def dar_alta(paciente_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(404, "Paciente no encontrado")

    p.estado = "alta"
    p.fecha_alta = datetime.utcnow()

    cama = db.query(models.Cama).filter(models.Cama.paciente_id == p.id).first()
    if cama:
        cama.estado = "limpieza"
        cama.paciente_id = None

    db.add(models.Evento(
        paciente_id=p.id, tipo="alta",
        descripcion="Alta médica otorgada — Cama pasa a limpieza",
    ))
    db.commit()
    return {"message": "Alta otorgada"}


@app.get("/api/pacientes/{paciente_id}/eventos")
def get_eventos(paciente_id: int, db: Session = Depends(get_db)):
    eventos = (
        db.query(models.Evento)
        .filter(models.Evento.paciente_id == paciente_id)
        .order_by(models.Evento.timestamp.desc())
        .all()
    )
    return [{"tipo": e.tipo, "descripcion": e.descripcion, "timestamp": e.timestamp} for e in eventos]


@app.put("/api/camas/{numero}/libre")
def liberar_cama(numero: str, db: Session = Depends(get_db)):
    cama = db.query(models.Cama).filter(models.Cama.numero == numero).first()
    if not cama:
        raise HTTPException(404, "Cama no encontrada")
    cama.estado = "libre"
    db.commit()
    return {"message": "Cama disponible"}


# ── Routes — Dashboard principal ───────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total    = db.query(models.Cama).count()
    ocupadas = db.query(models.Cama).filter(models.Cama.estado == "ocupada").count()
    libres   = db.query(models.Cama).filter(models.Cama.estado == "libre").count()
    limpieza = db.query(models.Cama).filter(models.Cama.estado == "limpieza").count()

    pacientes_hosp = db.query(models.Paciente).filter(models.Paciente.estado == "hospitalizado").all()
    pacientes_urg  = db.query(models.Paciente).filter(models.Paciente.estado == "urgencias").all()

    por_prevision: dict = {}
    total_facturacion = 0.0
    riesgo = []

    for p in pacientes_hosp:
        por_prevision[p.prevision] = por_prevision.get(p.prevision, 0) + 1
        total_facturacion += p.valor_cuenta_estimado
        if p.dias_estadia >= 7:
            riesgo.append({
                "nombre": p.nombre, "prevision": p.prevision,
                "unidad": p.unidad, "dias": p.dias_estadia, "valor": p.valor_cuenta_estimado,
            })

    por_unidad = {}
    for unidad in ["UCI", "UCO UTI", "UCO UI", "UTI", "MQ", "Recuperacion", "Urgencia"]:
        t = db.query(models.Cama).filter(models.Cama.unidad == unidad).count()
        o = db.query(models.Cama).filter(
            models.Cama.unidad == unidad, models.Cama.estado == "ocupada"
        ).count()
        if t > 0:
            por_unidad[unidad] = {"total": t, "ocupadas": o, "libres": t - o}

    return {
        "resumen_camas": {
            "total": total, "ocupadas": ocupadas, "libres": libres, "limpieza": limpieza,
            "ocupacion_pct": round(ocupadas / total * 100, 1) if total else 0,
        },
        "por_unidad": por_unidad,
        "por_prevision": [{"name": k, "value": v} for k, v in por_prevision.items()],
        "financiero": {
            "total_facturacion_estimada": total_facturacion,
            "dinero_en_riesgo": sum(r["valor"] for r in riesgo),
            "pacientes_larga_data": riesgo,
        },
        "urgencias_en_espera": len(pacientes_urg),
    }


# ── Routes — Dashboard Financiero ─────────────────────────────────────────────

@app.get("/api/dashboard/financiero")
def get_dashboard_financiero(db: Session = Depends(get_db)):
    pacientes = db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado"
    ).all()

    breakdown: dict = {}
    for p in pacientes:
        prev = p.prevision
        if prev not in breakdown:
            meta = PREVISION_META.get(prev, {
                "label": prev, "tarifa_dia": 80_000,
                "riesgo": "Desconocido", "cobertura": "—", "color": "gray",
            })
            breakdown[prev] = {
                "prevision": prev,
                "label": meta["label"],
                "riesgo": meta["riesgo"],
                "cobertura": meta["cobertura"],
                "color": meta["color"],
                "count": 0,
                "dias_totales": 0,
                "facturacion_estimada": 0.0,
                "dinero_en_riesgo": 0.0,
                "pacientes_larga_data": [],
            }

        breakdown[prev]["count"] += 1
        breakdown[prev]["dias_totales"] += p.dias_estadia
        breakdown[prev]["facturacion_estimada"] += p.valor_cuenta_estimado

        if p.dias_estadia >= 7:
            breakdown[prev]["dinero_en_riesgo"] += p.valor_cuenta_estimado
            breakdown[prev]["pacientes_larga_data"].append({
                "nombre": p.nombre, "dias": p.dias_estadia, "valor": p.valor_cuenta_estimado,
                "unidad": p.unidad,
            })

    for data in breakdown.values():
        data["dias_promedio"] = (
            round(data["dias_totales"] / data["count"], 1) if data["count"] else 0
        )

    total_facturacion = sum(d["facturacion_estimada"] for d in breakdown.values())
    total_riesgo = sum(d["dinero_en_riesgo"] for d in breakdown.values())

    chart_data = sorted(
        [
            {
                "name": d["prevision"],
                "Facturación": round(d["facturacion_estimada"]),
                "Riesgo": round(d["dinero_en_riesgo"]),
            }
            for d in breakdown.values()
        ],
        key=lambda x: -x["Facturación"],
    )

    return {
        "breakdown": list(breakdown.values()),
        "total_facturacion": total_facturacion,
        "total_riesgo": total_riesgo,
        "chart_data": chart_data,
    }


# ── Routes — Dashboard Operaciones ────────────────────────────────────────────

@app.get("/api/dashboard/operaciones")
def get_dashboard_operaciones(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    urgencias = db.query(models.Paciente).filter(models.Paciente.estado == "urgencias").all()
    pipeline = []
    for p in urgencias:
        horas = round((now - p.fecha_ingreso).total_seconds() / 3600, 1)
        pipeline.append({
            "id": p.id,
            "nombre": p.nombre,
            "prevision": p.prevision,
            "diagnostico": p.diagnostico,
            "comorbilidades": p.comorbilidades,
            "horas_espera": horas,
            "critico": horas > 4,
        })
    pipeline.sort(key=lambda x: -x["horas_espera"])

    hospitalizados = db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado",
        models.Paciente.fecha_hospitalizacion.isnot(None),
    ).all()

    tiempos = []
    for p in hospitalizados:
        if p.fecha_hospitalizacion and p.fecha_ingreso:
            delta = (p.fecha_hospitalizacion - p.fecha_ingreso).total_seconds() / 3600
            if 0 < delta < 72:
                tiempos.append(delta)

    avg_admision = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0

    tiempos_por_unidad = {}
    for p in hospitalizados:
        if p.unidad and p.fecha_hospitalizacion and p.fecha_ingreso:
            delta = (p.fecha_hospitalizacion - p.fecha_ingreso).total_seconds() / 3600
            if 0 < delta < 72:
                tiempos_por_unidad.setdefault(p.unidad, []).append(delta)

    chart_tiempos = [
        {"unidad": u, "tiempo_promedio": round(sum(ts) / len(ts), 1)}
        for u, ts in tiempos_por_unidad.items() if ts
    ]

    # Tiempos de tránsito
    tiempos_transito = []
    for p in hospitalizados:
        if p.fecha_asignacion_cama and p.fecha_llegada_unidad:
            mins = (p.fecha_llegada_unidad - p.fecha_asignacion_cama).total_seconds() / 60
            if 0 < mins < 120:
                tiempos_transito.append(mins)
    avg_transito = round(sum(tiempos_transito) / len(tiempos_transito), 1) if tiempos_transito else 0

    alertas = []
    pacientes_mq = db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado",
        models.Paciente.unidad == "MQ",
    ).all()
    for p in pacientes_mq:
        if p.dias_estadia >= 5:
            alertas.append({
                "nombre": p.nombre, "unidad": p.unidad, "dias": p.dias_estadia,
                "diagnostico": p.diagnostico, "prevision": p.prevision,
                "tipo": "escalada_potencial",
                "mensaje": f"Paciente con {p.dias_estadia} días en MQ — evaluar necesidad de UCI/UTI",
            })

    for p in db.query(models.Paciente).filter(
        models.Paciente.estado == "hospitalizado",
        models.Paciente.dias_estadia >= 7,
    ).all():
        if p.unidad != "MQ":
            alertas.append({
                "nombre": p.nombre, "unidad": p.unidad, "dias": p.dias_estadia,
                "diagnostico": p.diagnostico, "prevision": p.prevision,
                "tipo": "larga_data",
                "mensaje": f"Paciente con {p.dias_estadia} días en {p.unidad} — revisar plan de alta",
            })

    alertas.sort(key=lambda x: -x["dias"])

    camas_limpieza = db.query(models.Cama).filter(models.Cama.estado == "limpieza").count()

    return {
        "pipeline_urgencias": pipeline,
        "total_en_espera": len(pipeline),
        "urgencias_criticas": sum(1 for p in pipeline if p["critico"]),
        "tiempo_promedio_admision_horas": avg_admision,
        "tiempo_promedio_transito_min": avg_transito,
        "camas_en_limpieza": camas_limpieza,
        "alertas_complejidad": alertas,
        "chart_tiempos": chart_tiempos,
        "meta": {
            "tiempo_ok": avg_admision <= 3,
            "sin_espera_critica": sum(1 for p in pipeline if p["critico"]) == 0,
        },
    }


# ── Auth endpoints ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "viewer"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    token = create_access_token(data={"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role},
    }


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "full_name": current_user.full_name, "role": current_user.role}


@app.get("/api/auth/users")
def list_users(current_user: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role, "is_active": u.is_active, "created_at": u.created_at}
        for u in users
    ]


@app.post("/api/auth/users")
def create_user(data: UserCreate, current_user: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    if data.role not in ("admin", "viewer"):
        raise HTTPException(status_code=400, detail="Rol inválido. Use 'admin' o 'viewer'")
    user = models.User(
        username=data.username,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role, "is_active": user.is_active}


@app.put("/api/auth/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, current_user: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username == "admin" and data.role and data.role != "admin":
        raise HTTPException(status_code=400, detail="No se puede cambiar el rol del administrador principal")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.password:
        user.hashed_password = get_password_hash(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role, "is_active": user.is_active}


@app.delete("/api/auth/users/{user_id}")
def delete_user(user_id: int, current_user: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar el administrador principal")
    db.delete(user)
    db.commit()
    return {"ok": True}
