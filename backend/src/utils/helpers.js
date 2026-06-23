/* =====================================================================
   FUNCIONES AUXILIARES COMPARTIDAS
   ===================================================================== */

// Quita la contraseña de un usuario antes de devolverlo en una respuesta
function stripPassword(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return { ...rest };
}

// Formatea una fecha ISO a YYYY-MM-DD (la fecha de hoy si no se provee)
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// Identificación del usuario actual (sin JWT real)
// ---------------------------------------------------------------------
// El proyecto no implementa autenticación basada en tokens JWT
// verificados en el servidor; el "login" devuelve un token simulado
// y el frontend simplemente recuerda quién inició sesión.
//
// Para poder filtrar vacantes y seguimientos por dueño (cada usuario
// solo ve los suyos), el frontend envía el id del usuario actual en
// cada petición relevante mediante el header `x-user-id` (también se
// acepta como query string ?usuarioId=, o en el body como usuarioId,
// como alternativa). Esta función centraliza esa lectura para que
// todas las rutas la obtengan de la misma forma.
//
// Esto NO sustituye una autenticación real: es el mecanismo más
// simple posible para resolver "qué usuario está pidiendo esto" sin
// tocar el sistema de login/roles ya existente. Si en el futuro se
// agrega JWT real, este es el único lugar que habría que cambiar.
function getCurrentUserId(req) {
  const fromHeader = req.headers['x-user-id'];
  const fromQuery = req.query.usuarioId;
  const fromBody = req.body && req.body.usuarioId;

  const raw = fromHeader || fromQuery || fromBody;
  if (raw === undefined || raw === null || raw === '') return null;

  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

module.exports = {
  stripPassword,
  todayISO,
  getCurrentUserId
};
