// ============================================================
// APP DE ASISTENCIA — lógica principal
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let grupos = [];
let ninos = [];
let asistenciaHoy = {}; // { nino_id: true/false }

const hoyISO = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------
// AUTENTICACIÓN
// ------------------------------------------------------------
async function revisarSesion() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    mostrarApp();
  } else {
    mostrarLogin();
  }
}

function mostrarLogin() {
  document.getElementById("vista-login").classList.remove("oculto");
  document.getElementById("vista-app").classList.add("oculto");
}

async function mostrarApp() {
  document.getElementById("vista-login").classList.add("oculto");
  document.getElementById("vista-app").classList.remove("oculto");
  await cargarDatosIniciales();
}

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = "Correo o contraseña incorrectos.";
    return;
  }
  await mostrarApp();
});

document.getElementById("btn-salir").addEventListener("click", async () => {
  await sb.auth.signOut();
  mostrarLogin();
});

// ------------------------------------------------------------
// PESTAÑAS
// ------------------------------------------------------------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("activa"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("tab-panel-activa"));
    tab.classList.add("activa");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("tab-panel-activa");
  });
});

// ------------------------------------------------------------
// CARGA INICIAL
// ------------------------------------------------------------
async function cargarDatosIniciales() {
  const fechaHoy = new Date();
  document.getElementById("fecha-hoy-texto").textContent = fechaHoy.toLocaleDateString("es", {
    weekday: "long", day: "numeric", month: "long"
  });
  document.getElementById("historial-fecha").value = hoyISO();
  document.getElementById("historial-fecha").max = hoyISO();

  await cargarGrupos();
  await cargarNinos();
  await cargarAsistenciaDeHoy();
  renderPasarLista();
  renderAdminNinos();

  document.getElementById("historial-fecha").addEventListener("change", cargarHistorial);
  await cargarHistorial();
}

async function cargarGrupos() {
  const { data, error } = await sb.from("grupos").select("*").order("edad_min");
  if (error) return mostrarToast("No se pudieron cargar los grupos");
  grupos = data || [];

  const selectGrupo = document.getElementById("select-grupo");
  const selectNinoGrupo = document.getElementById("nino-grupo");
  selectGrupo.innerHTML = `<option value="todos">Todos los grupos</option>` +
    grupos.map((g) => `<option value="${g.id}">${escapeHtml(g.nombre)}</option>`).join("");
  selectNinoGrupo.innerHTML = grupos.map((g) => `<option value="${g.id}">${escapeHtml(g.nombre)}</option>`).join("");
  selectGrupo.addEventListener("change", renderPasarLista);
}

async function cargarNinos() {
  const { data, error } = await sb.from("ninos").select("*").eq("activo", true).order("nombre_completo");
  if (error) return mostrarToast("No se pudieron cargar los niños");
  ninos = data || [];
}

async function cargarAsistenciaDeHoy() {
  const { data, error } = await sb.from("asistencia").select("nino_id, presente").eq("fecha", hoyISO());
  if (error) return;
  asistenciaHoy = {};
  (data || []).forEach((r) => { asistenciaHoy[r.nino_id] = r.presente; });
  actualizarContador();
}

// ------------------------------------------------------------
// PASAR LISTA
// ------------------------------------------------------------
function renderPasarLista() {
  const grupoSeleccionado = document.getElementById("select-grupo").value;
  const contenedor = document.getElementById("lista-ninos-asistencia");

  const lista = ninos.filter((n) => grupoSeleccionado === "todos" || n.grupo_id === grupoSeleccionado);

  if (lista.length === 0) {
    contenedor.innerHTML = `<p class="estado-vacio">No hay niños en este grupo todavía. Ve a la pestaña "Niños" para agregarlos.</p>`;
    return;
  }

  contenedor.innerHTML = lista.map((n) => {
    const presente = !!asistenciaHoy[n.id];
    return `
      <div class="fila-nino">
        <div class="fila-nino-info">
          <span class="fila-nino-nombre">${escapeHtml(n.nombre_completo)}</span>
          <span class="fila-nino-meta">${edadTexto(n.fecha_nacimiento)}</span>
        </div>
        <button class="toggle-presente ${presente ? "activo" : ""}" data-nino="${n.id}" aria-pressed="${presente}">
          <svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${presente ? "Presente" : "Marcar"}
        </button>
      </div>`;
  }).join("");

  contenedor.querySelectorAll(".toggle-presente").forEach((btn) => {
    btn.addEventListener("click", () => marcarAsistencia(btn.dataset.nino));
  });
}

async function marcarAsistencia(ninoId) {
  const nuevoEstado = !asistenciaHoy[ninoId];
  asistenciaHoy[ninoId] = nuevoEstado;
  renderPasarLista();
  actualizarContador();

  const { data: usuario } = await sb.auth.getUser();

  const { error } = await sb.from("asistencia").upsert({
    nino_id: ninoId,
    fecha: hoyISO(),
    presente: nuevoEstado,
    registrado_por: usuario?.user?.id || null
  }, { onConflict: "nino_id,fecha" });

  if (error) {
    mostrarToast("No se pudo guardar. Revisa tu conexión.");
    asistenciaHoy[ninoId] = !nuevoEstado;
    renderPasarLista();
    actualizarContador();
  }
}

function actualizarContador() {
  const total = Object.values(asistenciaHoy).filter(Boolean).length;
  document.getElementById("contador-num").textContent = total;
}

// ------------------------------------------------------------
// HISTORIAL
// ------------------------------------------------------------
async function cargarHistorial() {
  const fecha = document.getElementById("historial-fecha").value;
  const contenedor = document.getElementById("historial-resultado");
  if (!fecha) return;

  const { data, error } = await sb
    .from("asistencia")
    .select("nino_id, presente, ninos(nombre_completo, grupo_id)")
    .eq("fecha", fecha)
    .eq("presente", true);

  if (error) {
    contenedor.innerHTML = `<p class="estado-vacio">No se pudo cargar el historial.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p class="estado-vacio">No hay registros de asistencia en esta fecha.</p>`;
    return;
  }

  contenedor.innerHTML = `<p class="fila-nino-meta" style="margin-bottom:10px;">${data.length} niño(s) presentes</p>` +
    data.map((r) => `
      <div class="fila-nino">
        <div class="fila-nino-info">
          <span class="fila-nino-nombre">${escapeHtml(r.ninos?.nombre_completo || "—")}</span>
        </div>
      </div>`).join("");
}

// ------------------------------------------------------------
// ADMINISTRAR NIÑOS
// ------------------------------------------------------------
function renderAdminNinos() {
  const contenedor = document.getElementById("lista-ninos-admin");
  if (ninos.length === 0) {
    contenedor.innerHTML = `<p class="estado-vacio">Todavía no hay niños registrados.</p>`;
    return;
  }
  contenedor.innerHTML = ninos.map((n) => {
    const grupoNombre = grupos.find((g) => g.id === n.grupo_id)?.nombre || "Sin grupo";
    return `
      <div class="fila-nino">
        <div class="fila-nino-info">
          <span class="fila-nino-nombre">${escapeHtml(n.nombre_completo)}</span>
          <span class="fila-nino-meta">${escapeHtml(grupoNombre)} · Tutor: ${escapeHtml(n.tutor_nombre || "—")}</span>
        </div>
        <div class="fila-nino-acciones">
          <button class="btn-icono" data-editar="${n.id}" aria-label="Editar">✎</button>
        </div>
      </div>`;
  }).join("");

  contenedor.querySelectorAll("[data-editar]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalNino(btn.dataset.editar));
  });
}

function abrirModalNino(ninoId) {
  const modal = document.getElementById("modal-nino");
  const titulo = document.getElementById("modal-nino-titulo");

  if (ninoId) {
    const n = ninos.find((x) => x.id === ninoId);
    titulo.textContent = "Editar niño";
    document.getElementById("nino-id").value = n.id;
    document.getElementById("nino-nombre").value = n.nombre_completo;
    document.getElementById("nino-nacimiento").value = n.fecha_nacimiento || "";
    document.getElementById("nino-grupo").value = n.grupo_id || "";
    document.getElementById("nino-tutor-nombre").value = n.tutor_nombre || "";
    document.getElementById("nino-tutor-telefono").value = n.tutor_telefono || "";
  } else {
    titulo.textContent = "Agregar niño";
    document.getElementById("form-nino").reset();
    document.getElementById("nino-id").value = "";
  }
  modal.classList.remove("oculto");
}

document.getElementById("btn-nuevo-nino").addEventListener("click", () => abrirModalNino(null));
document.getElementById("btn-cancelar-nino").addEventListener("click", () => {
  document.getElementById("modal-nino").classList.add("oculto");
});

document.getElementById("form-nino").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("nino-id").value;
  const payload = {
    nombre_completo: document.getElementById("nino-nombre").value.trim(),
    fecha_nacimiento: document.getElementById("nino-nacimiento").value || null,
    grupo_id: document.getElementById("nino-grupo").value || null,
    tutor_nombre: document.getElementById("nino-tutor-nombre").value.trim() || null,
    tutor_telefono: document.getElementById("nino-tutor-telefono").value.trim() || null
  };

  let error;
  if (id) {
    ({ error } = await sb.from("ninos").update(payload).eq("id", id));
  } else {
    ({ error } = await sb.from("ninos").insert(payload));
  }

  if (error) {
    mostrarToast("No se pudo guardar el niño.");
    return;
  }

  document.getElementById("modal-nino").classList.add("oculto");
  mostrarToast(id ? "Niño actualizado" : "Niño agregado");
  await cargarNinos();
  renderPasarLista();
  renderAdminNinos();
});

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------
function edadTexto(fechaNacimiento) {
  if (!fechaNacimiento) return "Edad no registrada";
  const nacimiento = new Date(fechaNacimiento);
  const ahora = new Date();
  let edad = ahora.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple = (ahora.getMonth() < nacimiento.getMonth()) ||
    (ahora.getMonth() === nacimiento.getMonth() && ahora.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return `${edad} años`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

let toastTimeout;
function mostrarToast(mensaje) {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.classList.remove("oculto");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("oculto"), 2800);
}

// ------------------------------------------------------------
// INICIO
// ------------------------------------------------------------
revisarSesion();
