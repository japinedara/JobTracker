-- =====================================================================
-- MIGRACIÓN — Agregar usuario_id a la tabla `vacantes`
-- ---------------------------------------------------------------------
-- Ejecuta este script UNA SOLA VEZ sobre tu base de datos `jobtracker`
-- ya existente. Soluciona el problema de que las vacantes eran
-- visibles para todos los usuarios (no había forma de saber a quién
-- pertenecía cada una).
--
-- IMPORTANTE: ajusta el valor 1 en el UPDATE de abajo si el id del
-- usuario ADMIN en tu tabla `usuarios` es distinto. El objetivo es
-- que ninguna fila de `vacantes` quede con usuario_id en NULL antes
-- de aplicar la restricción NOT NULL + FOREIGN KEY.
-- =====================================================================

USE jobtracker;

-- 1) Agrega la columna como NULL primero (no se puede agregar NOT NULL
--    directamente si la tabla ya tiene filas).
ALTER TABLE vacantes
  ADD COLUMN usuario_id INT NULL AFTER id;

-- 2) Asigna las vacantes existentes a un usuario válido (por defecto,
--    el primer ADMIN). Cambia el "1" por el id correcto si aplica.
UPDATE vacantes
SET usuario_id = (SELECT id FROM usuarios WHERE rol = 'ADMIN' ORDER BY id ASC LIMIT 1)
WHERE usuario_id IS NULL;

-- 3) Ya con todas las filas pobladas, se vuelve la columna obligatoria
--    y se agrega la relación con `usuarios`.
ALTER TABLE vacantes
  MODIFY COLUMN usuario_id INT NOT NULL;

ALTER TABLE vacantes
  ADD CONSTRAINT fk_vacantes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- Verificación rápida (opcional): debe devolver 0 filas
-- ---------------------------------------------------------------------
-- SELECT * FROM vacantes WHERE usuario_id IS NULL;
