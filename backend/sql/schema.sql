-- =====================================================================
-- ESQUEMA DE REFERENCIA — Base de datos `jobtracker` (MySQL)
-- ---------------------------------------------------------------------
-- Este archivo documenta la estructura de columnas que el backend
-- espera encontrar en cada tabla. Si tus tablas ya existen con otros
-- nombres de columna, ajusta los nombres en este archivo o en
-- src/db/repositories/*.js (las consultas SQL) para que coincidan.
--
-- Convención usada: nombres de columna en snake_case, mapeados a los
-- nombres camelCase que ya consume el frontend (por ejemplo,
-- fecha_creacion -> fechaCreacion, usuario_id -> usuarioId).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS jobtracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jobtracker;

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(120)  NOT NULL,
  apellidos           VARCHAR(120)  NOT NULL DEFAULT '',
  correo              VARCHAR(190)  NOT NULL UNIQUE,
  password            VARCHAR(255)  NOT NULL,
  rol                 ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  estado_verificacion ENUM('pendiente_verificacion', 'verificado') NOT NULL DEFAULT 'pendiente_verificacion',
  telefono            VARCHAR(40)   NOT NULL DEFAULT '',
  ciudad              VARCHAR(120)  NOT NULL DEFAULT '',
  linkedin            VARCHAR(255)  NOT NULL DEFAULT '',
  github              VARCHAR(255)  NOT NULL DEFAULT '',
  creado_en           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- vacantes
-- ---------------------------------------------------------------------
-- usuario_id: dueño de la vacante. Cada usuario solo debe ver y
-- gestionar sus propias vacantes (ver src/routes/jobs.js).
CREATE TABLE IF NOT EXISTS vacantes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT          NOT NULL,
  empresa         VARCHAR(150) NOT NULL,
  cargo           VARCHAR(150) NOT NULL,
  salario         VARCHAR(30)  NOT NULL DEFAULT '',
  ciudad          VARCHAR(120) NOT NULL,
  estado          ENUM('Aplicada', 'En revisión', 'Entrevista', 'Oferta', 'Rechazada') NOT NULL DEFAULT 'Aplicada',
  fecha_creacion  DATE         NOT NULL,
  CONSTRAINT fk_vacantes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- seguimientos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seguimientos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vacante_id  INT  NOT NULL,
  fecha       DATE NOT NULL,
  tipo        VARCHAR(60)  NOT NULL DEFAULT 'Otro',
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  CONSTRAINT fk_seguimientos_vacante
    FOREIGN KEY (vacante_id) REFERENCES vacantes(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- solicitudes_admin
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_admin (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  nombre      VARCHAR(255) NOT NULL,
  correo      VARCHAR(190) NOT NULL,
  fecha       DATE NOT NULL,
  estado      ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT fk_solicitudes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- actividad (log de acciones para el Dashboard)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividad (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  tipo    VARCHAR(60)  NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  tono    VARCHAR(20)  NOT NULL DEFAULT 'info',
  fecha   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- SEED: mismos datos que tenía el backend en memoria, para partir del
-- mismo estado inicial (opcional, solo si las tablas están vacías)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre, apellidos, correo, password, rol, estado_verificacion, telefono, ciudad, linkedin, github)
VALUES
  ('Laura', 'Gómez', 'laura.gomez@jobtracker.com', 'admin123', 'ADMIN', 'verificado', '', '', '', ''),
  ('Mariana', 'Ríos', 'mariana.rios@jobtracker.com', 'user123', 'USER', 'verificado', '+57 300 123 4567', 'Bogotá', 'https://linkedin.com/in/marianarios', 'https://github.com/marianarios')
ON DUPLICATE KEY UPDATE correo = correo;

-- El seed de vacantes asigna las vacantes de ejemplo al usuario ADMIN
-- (id = 1, Laura) para no dejar usuario_id en NULL. Ajusta el id si en
-- tu base de datos el primer usuario insertado tiene otro id.
INSERT INTO vacantes (usuario_id, empresa, cargo, salario, ciudad, estado, fecha_creacion)
VALUES
  (1, 'Nimbus Tech', 'Desarrollador Frontend', '4500000', 'Bogotá', 'Entrevista', '2026-05-18'),
  (1, 'DataForge', 'Analista de Datos', '4000000', 'Medellín', 'En revisión', '2026-05-25'),
  (1, 'CloudNine SAS', 'Ingeniero Backend', '5200000', 'Remoto', 'Aplicada', '2026-06-01'),
  (1, 'Vertex Software', 'Desarrollador Full Stack', '4800000', 'Cali', 'Oferta', '2026-06-04'),
  (1, 'PixelWorks', 'Diseñador UI/UX', '3800000', 'Bogotá', 'Rechazada', '2026-06-08');
