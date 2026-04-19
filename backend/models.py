from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Cama(Base):
    __tablename__ = "camas"

    id          = Column(Integer, primary_key=True, index=True)
    numero      = Column(String, unique=True, index=True)
    unidad      = Column(String)   # UCI | UTI | MQ | Recuperacion | Urgencia | UCO UI | UCO UTI
    estado      = Column(String, default="libre")  # libre | ocupada | limpieza | fuera_servicio
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=True)

    paciente = relationship("Paciente", back_populates="cama")


class Paciente(Base):
    __tablename__ = "pacientes"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String, nullable=False)
    rut         = Column(String)
    edad        = Column(Integer)
    sexo        = Column(String)
    prevision   = Column(String)   # FONASA | ISAPRE | Ley Urgencia | GES | Particular
    diagnostico = Column(String)
    comorbilidades = Column(String, default="")
    estado      = Column(String, default="urgencias")  # urgencias | hospitalizado | alta | traslado_externo | fallecido
    unidad      = Column(String, nullable=True)
    fecha_ingreso          = Column(DateTime, default=datetime.utcnow)
    fecha_hospitalizacion  = Column(DateTime, nullable=True)
    fecha_alta             = Column(DateTime, nullable=True)
    valor_cuenta_estimado  = Column(Float, default=0.0)
    dias_estadia           = Column(Integer, default=0)

    # ── Flujo de Urgencias ────────────────────────────────────────────────────
    nivel_triage          = Column(Integer, nullable=True)    # 0-5 según escala clínica
    categoria_solicitada  = Column(String, nullable=True)     # UCI | UTI | MQ | UCO UI | UCO UTI (+ F para FONASA)
    orden_hospitalizacion = Column(Boolean, default=False)    # Médico emitió la orden
    fecha_orden           = Column(DateTime, nullable=True)
    check_clinico         = Column(Boolean, default=False)    # Enfermero: estado clínico ok
    check_admin           = Column(Boolean, default=False)    # Enfermero: trámite admin ok
    fecha_doble_check     = Column(DateTime, nullable=True)
    fecha_asignacion_cama = Column(DateTime, nullable=True)   # Inicio reloj de tránsito
    fecha_llegada_unidad  = Column(DateTime, nullable=True)   # Fin reloj de tránsito

    # ── Admisión (NUEVO Demo2) ───────────────────────────────────────────────
    admision_completada   = Column(Boolean, default=False)    # Paso administrativo completado
    fecha_admision        = Column(DateTime, nullable=True)   # Timestamp de completar admisión
    pagare_firmado        = Column(Boolean, default=False)    # Pagaré firmado por el paciente

    # ── Atención Médica (NUEVO Demo2) ────────────────────────────────────────
    atencion_medica_completada = Column(Boolean, default=False)  # Médico completó atención
    fecha_atencion_medica = Column(DateTime, nullable=True)
    indicaciones_medicas  = Column(Text, nullable=True)       # Indicaciones del médico
    prescripciones        = Column(Text, nullable=True)       # JSON string con prescripciones

    # ── Contacto ─────────────────────────────────────────────────────────────
    telefono              = Column(String, nullable=True)
    contacto_emergencia   = Column(String, nullable=True)   # "Nombre — Teléfono"

    # ── Clínico adicional ─────────────────────────────────────────────────────
    alergias              = Column(Text, nullable=True)
    medicamentos_actuales = Column(Text, nullable=True)
    grupo_sanguineo       = Column(String, nullable=True)   # A+, A-, B+…
    peso_kg               = Column(Float, nullable=True)
    talla_cm              = Column(Integer, nullable=True)
    observaciones_clinicas= Column(Text, nullable=True)

    # ── Signos Vitales (NUEVO Demo2) ─────────────────────────────────────────
    presion_arterial      = Column(String, nullable=True)     # ej: "120/80"
    frecuencia_cardiaca   = Column(Integer, nullable=True)    # bpm
    temperatura           = Column(Float, nullable=True)      # °C
    saturacion_o2         = Column(Integer, nullable=True)    # %
    frecuencia_respiratoria = Column(Integer, nullable=True)  # rpm

    # ── Relaciones ────────────────────────────────────────────────────────────
    cama     = relationship("Cama", back_populates="paciente", uselist=False)
    eventos  = relationship("Evento",  back_populates="paciente", cascade="all, delete-orphan")
    examenes = relationship("Examen",  back_populates="paciente", cascade="all, delete-orphan")
    archivos = relationship("Archivo", back_populates="paciente", cascade="all, delete-orphan")


class Evento(Base):
    __tablename__ = "eventos"

    id          = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    tipo        = Column(String)   # ingreso | triage | admision | atencion_medica | orden | doble_check | hospitalizacion | llegada_unidad | traslado | alta | alerta | nota
    descripcion = Column(String)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    usuario     = Column(String, default="Sistema")

    paciente = relationship("Paciente", back_populates="eventos")


class Examen(Base):
    __tablename__ = "examenes"

    id               = Column(Integer, primary_key=True, index=True)
    paciente_id      = Column(Integer, ForeignKey("pacientes.id"))
    tipo             = Column(String)   # laboratorio | radiologia | ecografia | ekg | otro
    nombre           = Column(String)
    estado           = Column(String, default="pendiente")  # pendiente | completado | cancelado
    urgente          = Column(Boolean, default=False)
    resultado        = Column(Text, nullable=True)
    fecha_solicitado = Column(DateTime, default=datetime.utcnow)
    fecha_resultado  = Column(DateTime, nullable=True)

    paciente = relationship("Paciente", back_populates="examenes")


class Archivo(Base):
    __tablename__ = "archivos"

    id           = Column(Integer, primary_key=True, index=True)
    paciente_id  = Column(Integer, ForeignKey("pacientes.id"))
    nombre       = Column(String)
    tipo         = Column(String)   # imagen | documento | informe | otro
    descripcion  = Column(String, nullable=True)
    datos_b64    = Column(Text, nullable=True)
    mime_type    = Column(String, nullable=True)
    fecha_subida = Column(DateTime, default=datetime.utcnow)

    paciente = relationship("Paciente", back_populates="archivos")
