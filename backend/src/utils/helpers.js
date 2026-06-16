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

module.exports = {
  stripPassword,
  todayISO
};
