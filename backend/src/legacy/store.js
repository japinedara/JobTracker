/* =====================================================================
   ⚠️ ARCHIVO LEGADO — YA NO SE USA EN EL BACKEND ACTIVO
   ---------------------------------------------------------------------
   Este archivo se conserva únicamente como referencia histórica de la
   versión en memoria del backend (antes de la migración a MySQL).
   Ninguna ruta en src/routes/*.js lo importa actualmente: todas usan
   los repositorios en src/db/repositories/*.js, que consultan MySQL
   a través de mysql2 (ver src/db/connection.js).

   Si necesitas volver a la versión en memoria, basta con:
     1. Mover este archivo de nuevo a src/data/store.js
     2. Cambiar los `require('../db/repositories/...')` en cada ruta
        por `require('../data/store')`, como estaba originalmente.
   ===================================================================== */

/* =====================================================================
   ALMACÉN DE DATOS EN MEMORIA
   ---------------------------------------------------------------------
   Simula una base de datos. Todas las colecciones y contadores viven
   aquí. Al reiniciar el servidor, los datos vuelven a su estado
   inicial (seed).

   Las formas (shapes) de cada objeto replican EXACTAMENTE lo que el
   frontend de JobTracker espera, para que pueda conectarse sin cambios:

   Usuario:
     { id, nombre, apellidos, correo, password, rol,
       estadoVerificacion, telefono, ciudad, linkedin, github }

   Vacante:
     { id, empresa, cargo, salario, ciudad, estado, fechaCreacion }

   Solicitud (admin request / "application"):
     { id, usuarioId, nombre, correo, fecha, estado }

   Seguimiento:
     { id, vacanteId, fecha, tipo, descripcion }

   Actividad:
     { id, tipo, mensaje, tono, fecha }
   ===================================================================== */

// ---------------------------------------------------------------------
// Contadores autoincrementales (simulan IDs de BD)
// ---------------------------------------------------------------------
let nextUsuarioId = 1;
let nextVacanteId = 1;
let nextSeguimientoId = 1;
let nextAdminRequestId = 1;
let nextActivityId = 1;

// ---------------------------------------------------------------------
// Colecciones
// ---------------------------------------------------------------------
const usuarios = [];
const vacantes = [];
const seguimientos = [];
const adminRequests = [];
const actividad = [];

// ---------------------------------------------------------------------
// Registro de actividad (máx. 10 eventos, más recientes primero)
// ---------------------------------------------------------------------
function logActivity(tipo, mensaje, tono = 'info') {
  actividad.unshift({
    id: nextActivityId++,
    tipo,
    mensaje,
    tono,
    fecha: new Date().toISOString()
  });
  if (actividad.length > 10) {
    actividad.length = 10;
  }
}

// ---------------------------------------------------------------------
// SEED: usuarios iniciales (mismas credenciales que el frontend)
// ---------------------------------------------------------------------
const usuariosSeed = [
  {
    nombre: 'Laura',
    apellidos: 'Gómez',
    correo: 'laura.gomez@jobtracker.com',
    password: 'admin123',
    rol: 'ADMIN',
    estadoVerificacion: 'verificado',
    telefono: '',
    ciudad: '',
    linkedin: '',
    github: ''
  },
  {
    nombre: 'Mariana',
    apellidos: 'Ríos',
    correo: 'mariana.rios@jobtracker.com',
    password: 'user123',
    rol: 'USER',
    estadoVerificacion: 'verificado',
    telefono: '+57 300 123 4567',
    ciudad: 'Bogotá',
    linkedin: 'https://linkedin.com/in/marianarios',
    github: 'https://github.com/marianarios'
  }
];

usuariosSeed.forEach(u => {
  usuarios.push({ id: nextUsuarioId++, ...u });
});

// ---------------------------------------------------------------------
// SEED: vacantes iniciales
// ---------------------------------------------------------------------
const vacantesSeed = [
  { empresa: 'Nimbus Tech', cargo: 'Desarrollador Frontend', salario: 4500000, ciudad: 'Bogotá', estado: 'Entrevista', fechaCreacion: '2026-05-18' },
  { empresa: 'DataForge', cargo: 'Analista de Datos', salario: 4000000, ciudad: 'Medellín', estado: 'En revisión', fechaCreacion: '2026-05-25' },
  { empresa: 'CloudNine SAS', cargo: 'Ingeniero Backend', salario: 5200000, ciudad: 'Remoto', estado: 'Aplicada', fechaCreacion: '2026-06-01' },
  { empresa: 'Vertex Software', cargo: 'Desarrollador Full Stack', salario: 4800000, ciudad: 'Cali', estado: 'Oferta', fechaCreacion: '2026-06-04' },
  { empresa: 'PixelWorks', cargo: 'Diseñador UI/UX', salario: 3800000, ciudad: 'Bogotá', estado: 'Rechazada', fechaCreacion: '2026-06-08' }
];

vacantesSeed.forEach(v => {
  const nueva = { id: nextVacanteId++, ...v };
  vacantes.push(nueva);
});

// ---------------------------------------------------------------------
// SEED: seguimientos iniciales (ligados a las vacantes de arriba)
// ---------------------------------------------------------------------
const seguimientosSeed = [
  { vacanteId: 1, fecha: '2026-05-20', tipo: 'Correo', descripcion: 'Confirmación de recepción de la hoja de vida.' },
  { vacanteId: 1, fecha: '2026-06-02', tipo: 'Entrevista', descripcion: 'Entrevista técnica con el equipo de ingeniería.' },
  { vacanteId: 2, fecha: '2026-05-28', tipo: 'Llamada', descripcion: 'Llamada de reclutadora para validar disponibilidad.' },
  { vacanteId: 4, fecha: '2026-06-05', tipo: 'Correo', descripcion: 'Recepción de carta de oferta laboral.' }
];

seguimientosSeed.forEach(s => {
  seguimientos.push({ id: nextSeguimientoId++, ...s });
});

// ---------------------------------------------------------------------
// SEED: actividad inicial (refleja la carga de datos de ejemplo)
// ---------------------------------------------------------------------
vacantesSeed.forEach(v => {
  logActivity('vacante_creada', `Vacante creada: ${v.cargo} en ${v.empresa}`, 'success');
});

module.exports = {
  usuarios,
  vacantes,
  seguimientos,
  adminRequests,
  actividad,
  logActivity,
  // Funciones para obtener y consumir los siguientes IDs
  getNextUsuarioId: () => nextUsuarioId++,
  getNextVacanteId: () => nextVacanteId++,
  getNextSeguimientoId: () => nextSeguimientoId++,
  getNextAdminRequestId: () => nextAdminRequestId++
};
