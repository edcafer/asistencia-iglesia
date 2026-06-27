-- ============================================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS
-- Programa Infantil - Registro de Asistencia
-- ============================================================
-- INSTRUCCIONES:
-- 1. Entra a tu proyecto en https://supabase.com
-- 2. Ve a la sección "SQL Editor" (en el menú lateral izquierdo)
-- 3. Crea una "New query"
-- 4. Copia y pega TODO este archivo
-- 5. Dale clic a "Run" (o presiona Ctrl+Enter)
-- ============================================================

-- Tabla de grupos/clases (organizados por edad)
create table grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad_min int,
  edad_max int,
  creado_en timestamptz default now()
);

-- Tabla de niños
create table ninos (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  fecha_nacimiento date,
  grupo_id uuid references grupos(id) on delete set null,
  tutor_nombre text,
  tutor_telefono text,
  activo boolean default true,
  creado_en timestamptz default now()
);

-- Tabla de asistencia (un registro por niño, por fecha)
create table asistencia (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid references ninos(id) on delete cascade,
  fecha date not null default current_date,
  presente boolean not null default true,
  registrado_por uuid references auth.users(id),
  creado_en timestamptz default now(),
  unique (nino_id, fecha)
);

-- Índices para que las consultas sean rápidas con 100+ niños
create index idx_asistencia_fecha on asistencia(fecha);
create index idx_ninos_grupo on ninos(grupo_id);

-- ============================================================
-- SEGURIDAD: Solo líderes con cuenta (autenticados) pueden
-- ver y modificar los datos. Nadie de fuera puede entrar.
-- ============================================================
alter table grupos enable row level security;
alter table ninos enable row level security;
alter table asistencia enable row level security;

create policy "Lideres autenticados pueden ver grupos"
  on grupos for select to authenticated using (true);
create policy "Lideres autenticados pueden crear grupos"
  on grupos for insert to authenticated with check (true);
create policy "Lideres autenticados pueden editar grupos"
  on grupos for update to authenticated using (true);

create policy "Lideres autenticados pueden ver ninos"
  on ninos for select to authenticated using (true);
create policy "Lideres autenticados pueden crear ninos"
  on ninos for insert to authenticated with check (true);
create policy "Lideres autenticados pueden editar ninos"
  on ninos for update to authenticated using (true);

create policy "Lideres autenticados pueden ver asistencia"
  on asistencia for select to authenticated using (true);
create policy "Lideres autenticados pueden crear asistencia"
  on asistencia for insert to authenticated with check (true);
create policy "Lideres autenticados pueden editar asistencia"
  on asistencia for update to authenticated using (true);

-- ============================================================
-- DATOS DE EJEMPLO (puedes borrar estas líneas si no las quieres)
-- ============================================================
insert into grupos (nombre, edad_min, edad_max) values
  ('Pequeños', 3, 5),
  ('Primaria', 6, 9),
  ('Preadolescentes', 10, 12);

-- ============================================================
-- LISTO. Si no salió ningún error en rojo, la base de datos
-- quedó configurada correctamente.
-- ============================================================
