import {
  loginUser,
  loginUserWithGoogle,
  registerUser,
  getUsers,
  updateUserRole,
  approveUser,
  deleteUser,
  getProgramSheets,
  uploadProgramSheet,
  getActiveProgramSheet,
  getHistoricalProgramSheets,
  getAnnouncements,
  createAnnouncement,
  getServiceSignups,
  signupForService,
  cancelSignupForService
} from './data.js';

import { isFirebaseConfigured } from './firebase-config.js';

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let currentUser = null;
let currentMonth = new Date(); // Para el Calendario/Agenda
let selectedDate = null;       // Fecha seleccionada en el calendario
let selectedFileBase64 = null; // Archivo cargado en Base64
let selectedFileType = null;   // Tipo del archivo cargado (image o pdf)
let selectedFileName = null;   // Nombre del archivo cargado

// --- ELEMENTOS DEL DOM ---
const DOM = {
  // Contenedores de vistas principales
  authContainer: document.getElementById('auth-container'),
  appContainer: document.getElementById('app-container'),
  
  // Splash Screen (Intro)
  splashScreen: document.getElementById('splash-screen'),
  splashLoaderBar: document.getElementById('splash-loader-bar'),
  splashStatus: document.getElementById('splash-status'),
  btnSkipIntro: document.getElementById('btn-skip-intro'),
  
  // Pantalla de Éxito Temporal (Login/Registro)
  successOverlay: document.getElementById('success-overlay'),
  successOverlayTitle: document.getElementById('success-overlay-title'),
  successOverlayMessage: document.getElementById('success-overlay-message'),
  
  // Alertas e Hilos de Autenticación
  authAlert: document.getElementById('auth-alert'),
  authSubtitle: document.getElementById('auth-flow-subtitle'),
  loginForm: document.getElementById('login-form'),
  btnGoogleLogin: document.getElementById('btn-google-login'),
  registerForm: document.getElementById('register-form'),
  btnGotoRegister: document.getElementById('btn-goto-register'),
  btnGotoLogin: document.getElementById('btn-goto-login'),
  
  // Sidebar y Perfil
  sidebar: document.getElementById('sidebar'),
  btnSidebarClose: document.getElementById('btn-sidebar-close'),
  btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
  userDisplayName: document.getElementById('user-display-name'),
  userRoleBadge: document.getElementById('user-role-badge'),
  userAreaBadge: document.getElementById('user-area-badge'),
  systemModeIndicator: document.getElementById('system-mode-indicator'),
  btnLogout: document.getElementById('btn-logout'),
  navItems: document.querySelectorAll('.nav-item'),
  navAdminLi: document.getElementById('nav-admin-console-li'),
  
  // Header principal
  currentSectionTitle: document.getElementById('current-section-title'),
  headerTime: document.getElementById('header-time'),
  
  // Secciones Dinámicas SPA
  sections: document.querySelectorAll('.content-section'),
  
  // Módulo: Dashboard Home
  statAreaMembers: document.getElementById('stat-area-members'),
  statMonthlyServices: document.getElementById('stat-monthly-services'),
  statUploadedPrograms: document.getElementById('stat-uploaded-programs'),
  statPendingUsers: document.getElementById('stat-pending-users'),
  adminStatCard: document.getElementById('admin-stat-card'),
  activeProgramContainer: document.getElementById('active-program-container'),
  activeAgendaBadge: document.getElementById('active-agenda-badge'),
  activeAgendaContainer: document.getElementById('active-agenda-container'),
  dashboardTeamBadge: document.getElementById('dashboard-team-badge'),
  dashboardTeamContainer: document.getElementById('dashboard-team-container'),
  announcementsContainer: document.getElementById('announcements-container'),
  btnOpenAnnModal: document.getElementById('btn-create-announcement-modal'),
  
  // Módulo: Agenda
  btnPrevMonth: document.getElementById('btn-prev-month'),
  btnNextMonth: document.getElementById('btn-next-month'),
  calendarMonthYear: document.getElementById('calendar-month-year'),
  calendarDaysGrid: document.getElementById('calendar-days-grid'),
  selectedDayTitle: document.getElementById('selected-day-title'),
  selectedDayContent: document.getElementById('selected-day-content'),
  
  // Módulo: Programaciones
  uploadPanelContainer: document.getElementById('upload-panel-container'),
  uploadProgramForm: document.getElementById('upload-program-form'),
  uploadDate: document.getElementById('upload-date'),
  uploadTime: document.getElementById('upload-time'),
  fileDropZone: document.getElementById('file-drop-zone'),
  fileInput: document.getElementById('upload-file-input'),
  filePreview: document.getElementById('file-preview-indicator'),
  filePreviewName: document.getElementById('file-preview-name'),
  btnRemoveFile: document.getElementById('btn-remove-file'),
  programHistoryGrid: document.getElementById('program-history-grid'),
  searchHistory: document.getElementById('search-history'),
  
  // Módulo: Gestión de Equipo
  searchTeamInput: document.getElementById('search-team-input'),
  filterTeamArea: document.getElementById('filter-team-area'),
  filterTeamRole: document.getElementById('filter-team-role'),
  teamTableBody: document.getElementById('team-table-body'),
  
  // Módulo: Consola de Administración
  pendingRequestsList: document.getElementById('pending-requests-list'),
  systemLogsContainer: document.getElementById('system-logs-container'),
  
  // Modales
  announcementModal: document.getElementById('announcement-modal'),
  btnCloseAnnModal: document.getElementById('btn-close-announcement-modal'),
  announcementForm: document.getElementById('announcement-form'),
  
  viewerModal: document.getElementById('viewer-modal'),
  btnCloseViewerModal: document.getElementById('btn-close-viewer-modal'),
  viewerModalTitle: document.getElementById('viewer-modal-title'),
  viewerModalBody: document.getElementById('viewer-modal-body')
};

// --- CONFIGURACIÓN & INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initSystemModeIndicator();
  startClock();
  runSplashIntro(); // Ejecutar intro animada
});

// Lógica de carga / splash animado (Intro)
function runSplashIntro() {
  const steps = [
    { progress: 15, status: "Conectando al servidor de base de datos..." },
    { progress: 35, status: "Verificando estado y estructura de tablas..." },
    { progress: 60, status: "Inicializando módulos de Switchers y Cámaras..." },
    { progress: 85, status: "Cargando roles, calendario e historial de servicios..." },
    { progress: 100, status: "¡Listo! Abriendo consola de control..." }
  ];

  let currentStepIdx = 0;
  
  // Intervalo de actualización de la barra y texto
  const interval = setInterval(() => {
    if (currentStepIdx < steps.length) {
      const step = steps[currentStepIdx];
      DOM.splashLoaderBar.style.width = `${step.progress}%`;
      DOM.splashStatus.textContent = step.status;
      currentStepIdx++;
    } else {
      clearInterval(interval);
      endSplashIntro();
    }
  }, 150); // Duración de ~0.75 segundos para que sea rápido y responsivo

  // Botón para saltar intro
  DOM.btnSkipIntro.addEventListener('click', () => {
    clearInterval(interval);
    endSplashIntro();
  });
}

function endSplashIntro() {
  DOM.splashScreen.classList.add('fade-out');
  
  // Esperar a que finalice la transición de fadeOut en CSS (400ms)
  setTimeout(() => {
    DOM.splashScreen.classList.add('hidden');
    
    // Verificar si ya existe una sesión activa para saltarse el login
    const savedUser = sessionStorage.getItem('erp_active_user');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      loginSuccess();
    } else {
      DOM.authContainer.classList.remove('hidden');
    }
  }, 400);
}

// Reloj del Header
function startClock() {
  const updateClock = () => {
    const now = new Date();
    DOM.headerTime.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Indicador de modo (Firebase vs LocalStorage)
function initSystemModeIndicator() {
  if (isFirebaseConfigured()) {
    DOM.systemModeIndicator.innerHTML = `
      <span class="status-dot green"></span>
      <span class="status-text">Modo Nube (Firebase)</span>
    `;
  } else {
    DOM.systemModeIndicator.innerHTML = `
      <span class="status-dot amber"></span>
      <span class="status-text">Modo Local (LocalStorage)</span>
    `;
  }
}

// Agregar logs al panel de auditoría (Admin)
function addAuditLog(type, message) {
  const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-message">${message}</span>`;
  DOM.systemLogsContainer.appendChild(entry);
  DOM.systemLogsContainer.scrollTop = DOM.systemLogsContainer.scrollHeight;
}

// --- MANEJADORES DE EVENTOS PRINCIPALES ---
function setupEventListeners() {
  // Cambios de pantallas de autenticación
  DOM.btnGotoRegister.addEventListener('click', () => {
    DOM.loginForm.classList.add('hidden');
    DOM.registerForm.classList.remove('hidden');
    DOM.authSubtitle.textContent = "Crea tu solicitud de membresía para el equipo de producción";
    DOM.authAlert.classList.add('hidden');
  });

  DOM.btnGotoLogin.addEventListener('click', () => {
    DOM.registerForm.classList.add('hidden');
    DOM.loginForm.classList.remove('hidden');
    DOM.authSubtitle.textContent = "Ingresa tus credenciales para acceder al sistema";
    DOM.authAlert.classList.add('hidden');
  });

  // Mostrar/Ocultar contraseñas
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = e.currentTarget.previousElementSibling;
      const icon = e.currentTarget.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    });
  });

  // Envío del Login
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.authAlert.classList.add('hidden');
    const username = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    
    try {
      const user = await loginUser(username, pass);
      currentUser = user;
      sessionStorage.setItem('erp_active_user', JSON.stringify(currentUser));
      loginSuccess();
    } catch (err) {
      showAuthError(err.message);
    }
  });

  // Inicio de Sesión con Google
  DOM.btnGoogleLogin.addEventListener('click', async () => {
    DOM.authAlert.classList.add('hidden');
    try {
      const user = await loginUserWithGoogle();
      currentUser = user;
      sessionStorage.setItem('erp_active_user', JSON.stringify(currentUser));
      loginSuccess();
    } catch (err) {
      // Si el error contiene instrucciones sobre el registro local de prueba, mostramos una alerta verde de éxito/información
      if (err.message.includes("registrada en el sistema de forma local") || err.message.includes("ha sido registrada en el sistema")) {
        DOM.authAlert.textContent = err.message;
        DOM.authAlert.className = "alert-box success";
        DOM.authAlert.classList.remove('hidden');
      } else {
        showAuthError(err.message);
      }
    }
  });

  // Envío de Registro
  DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.authAlert.classList.add('hidden');
    
    const userData = {
      alias: document.getElementById('reg-alias').value.trim().toLowerCase(),
      name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      district: document.getElementById('reg-district').value.trim(),
      area: document.getElementById('reg-area').value,
      password: document.getElementById('reg-password').value
    };

    if (userData.password.length < 6) {
      showAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      await registerUser(userData);
      showSuccessOverlay("Registro Completado", "Tu solicitud de acceso ha sido enviada al liderazgo.", () => {
        DOM.registerForm.reset();
        DOM.registerForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
        DOM.authSubtitle.textContent = "Ingresa tus credenciales para acceder al sistema";
        
        // Mostrar alerta de éxito
        DOM.authAlert.textContent = "¡Solicitud enviada con éxito! Espera a que un administrador o super líder apruebe tu cuenta para iniciar sesión.";
        DOM.authAlert.className = "alert-box success";
        DOM.authAlert.classList.remove('hidden');
      });
    } catch (err) {
      showAuthError(err.message);
    }
  });

  // Cerrar Sesión
  DOM.btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('erp_active_user');
    currentUser = null;
    DOM.appContainer.classList.add('hidden');
    DOM.authContainer.classList.remove('hidden');
    DOM.loginForm.reset();
    DOM.authAlert.classList.add('hidden');
  });

  // Navegación Sidebar (SPA Routing)
  DOM.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSectionId = e.currentTarget.getAttribute('data-target');
      navigateSection(targetSectionId);
      
      // En móviles, cerrar el sidebar al navegar
      if (window.innerWidth <= 992) {
        DOM.sidebar.classList.remove('open');
      }
    });
  });

  // Toggle Sidebar en móvil
  DOM.btnSidebarToggle.addEventListener('click', () => {
    DOM.sidebar.classList.add('open');
  });
  DOM.btnSidebarClose.addEventListener('click', () => {
    DOM.sidebar.classList.remove('open');
  });

  // Cerrar modales haciendo clic fuera del contenido
  window.addEventListener('click', (e) => {
    if (e.target === DOM.announcementModal) {
      DOM.announcementModal.classList.add('hidden');
    }
    if (e.target === DOM.viewerModal) {
      DOM.viewerModal.classList.add('hidden');
    }
  });

  // --- EVENTOS DEL CALENDARIO ---
  DOM.btnPrevMonth.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  DOM.btnNextMonth.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });

  // --- EVENTOS DE SUBIDA DE PROGRAMACIÓN ---
  // Evento Drag & Drop
  DOM.fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.fileDropZone.classList.add('dragover');
  });
  DOM.fileDropZone.addEventListener('dragleave', () => {
    DOM.fileDropZone.classList.remove('dragover');
  });
  DOM.fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.fileDropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileInput(files[0]);
    }
  });
  DOM.fileDropZone.addEventListener('click', () => {
    DOM.fileInput.click();
  });
  DOM.fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileInput(files[0]);
    }
  });

  // Quitar archivo cargado
  DOM.btnRemoveFile.addEventListener('click', () => {
    clearFileSelection();
  });

  DOM.uploadProgramForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFileBase64) {
      alert("Por favor selecciona un archivo.");
      return;
    }

    // Validar que la fecha sea Domingo o Miércoles
    const selectedDateVal = DOM.uploadDate.value;
    if (selectedDateVal) {
      const dateObj = new Date(selectedDateVal + 'T00:00:00');
      const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 3 = Miércoles
      if (dayOfWeek !== 0 && dayOfWeek !== 3) {
        alert("Error: Las programaciones solo se pueden subir para días Domingo o Miércoles.");
        return;
      }
    }

    const progData = {
      date: DOM.uploadDate.value,
      time: DOM.uploadTime.value,
      fileName: selectedFileName,
      fileType: selectedFileType,
      fileData: selectedFileBase64
    };

    try {
      await uploadProgramSheet(progData, currentUser);
      DOM.uploadProgramForm.reset();
      clearFileSelection();
      alert("Hojas de programación subidas y asociadas con éxito.");
      addAuditLog("success", `Hoja de programación publicada para el ${progData.date} a las ${progData.time}.`);
      
      // Actualizar vistas
      renderActiveProgram();
      renderProgramHistory();
      renderCalendar();
    } catch (err) {
      alert("Error al cargar programación: " + err.message);
    }
  });

  // Modales adicionales
  DOM.btnOpenAnnModal.addEventListener('click', () => {
    DOM.announcementModal.classList.remove('hidden');
  });
  DOM.btnCloseAnnModal.addEventListener('click', () => {
    DOM.announcementModal.classList.add('hidden');
  });
  DOM.btnCloseViewerModal.addEventListener('click', () => {
    DOM.viewerModal.classList.add('hidden');
  });

  // Publicar Anuncio
  DOM.announcementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();
    
    try {
      await createAnnouncement(title, content, currentUser);
      DOM.announcementForm.reset();
      DOM.announcementModal.classList.add('hidden');
      renderAnnouncements();
      addAuditLog("info", `Nuevo anuncio publicado: "${title}"`);
    } catch (err) {
      alert("Error al publicar anuncio: " + err.message);
    }
  });

  // Filtros del directorio de equipo
  DOM.searchTeamInput.addEventListener('input', renderTeamDirectory);
  DOM.filterTeamArea.addEventListener('change', renderTeamDirectory);
  DOM.filterTeamRole.addEventListener('change', renderTeamDirectory);

  // Buscador de historial de programaciones
  DOM.searchHistory.addEventListener('input', renderProgramHistory);
}

// Muestra alertas de error de Login/Registro
function showAuthError(msg) {
  DOM.authAlert.textContent = msg;
  DOM.authAlert.className = "alert-box error";
  DOM.authAlert.classList.remove('hidden');
}

// --- FLUJO DE NAVEGACIÓN Y PERMISOS ---

// Muestra una pantalla temporal de éxito en el Login o Registro
function showSuccessOverlay(title, message, callback) {
  DOM.successOverlayTitle.textContent = title;
  DOM.successOverlayMessage.textContent = message;
  DOM.successOverlay.classList.remove('hidden');
  
  setTimeout(() => {
    DOM.successOverlay.classList.add('hidden');
    if (callback) callback();
  }, 1600); // 1.6 segundos para mostrar el tick de éxito y mensaje
}

// Ejecuta las configuraciones necesarias después de que el inicio de sesión sea exitoso
function loginSuccess() {
  showSuccessOverlay("Acceso Concedido", `¡Bienvenido de vuelta, ${currentUser.name}!`, () => {
    DOM.authContainer.classList.add('hidden');
    DOM.appContainer.classList.remove('hidden');
    
    // Actualizar perfil
    DOM.userDisplayName.textContent = currentUser.name;
    DOM.userRoleBadge.textContent = getRoleLabel(currentUser.role);
    DOM.userAreaBadge.textContent = currentUser.area;
    
    // Limpiar navegación activa
    DOM.navItems.forEach(i => i.classList.remove('active'));
    document.getElementById('nav-dashboard').classList.add('active');
    
    // Configurar elementos visibles basados en roles
    configureRolePermissions();
    
    // Renderizar secciones principales
    renderApp();
    navigateSection('sec-dashboard');
    addAuditLog("success", `Sesión iniciada por ${currentUser.name} (${getRoleLabel(currentUser.role)})`);
  });
}

// Adapta la interfaz a los permisos del usuario activo
function configureRolePermissions() {
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'slider';
  
  // Consola de Administración (Pestaña Secreta)
  if (isStaff) {
    DOM.navAdminLi.classList.remove('hidden');
    DOM.adminStatCard.classList.remove('hidden');
    DOM.btnOpenAnnModal.classList.remove('hidden');
    DOM.uploadPanelContainer.classList.remove('hidden');
  } else {
    DOM.navAdminLi.classList.add('hidden');
    DOM.adminStatCard.classList.add('hidden');
    DOM.btnOpenAnnModal.classList.add('hidden');
    DOM.uploadPanelContainer.classList.add('hidden');
  }

  // Columnas y botones de acción en directorio (se ocultan/muestran en el render)
  const staffOnlyElements = document.querySelectorAll('.staff-only');
  staffOnlyElements.forEach(el => {
    if (isStaff) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// Traduce roles técnicos a legibles en español
function getRoleLabel(role) {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'slider': return 'Super Líder';
    case 'lider': return 'Líder';
    case 'co_lider': return 'Co-Líder';
    case 'siervo': return 'Siervo';
    default: return role;
  }
}

// Router SPA básico
function navigateSection(sectionId) {
  DOM.sections.forEach(sec => {
    if (sec.id === sectionId) {
      sec.classList.remove('hidden');
    } else {
      sec.classList.add('hidden');
    }
  });

  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-target') === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Cambiar título en el header
  let title = "Dashboard";
  if (sectionId === 'sec-agenda') title = "Calendario y Servicios";
  if (sectionId === 'sec-programacion') title = "Hojas de Programación";
  if (sectionId === 'sec-team') title = "Directorio de Equipo";
  if (sectionId === 'sec-admin-console') title = "Consola de Administración";
  
  DOM.currentSectionTitle.textContent = title;

  // Renderizar la sección cargada
  if (sectionId === 'sec-dashboard') renderDashboardHome();
  if (sectionId === 'sec-agenda') renderCalendar();
  if (sectionId === 'sec-programacion') renderProgramHistory();
  if (sectionId === 'sec-team') renderTeamDirectory();
  if (sectionId === 'sec-admin-console') renderAdminConsole();
}

// --- RENDERIZADO GENERAL DE DATOS ---

function renderApp() {
  renderDashboardHome();
  renderCalendar();
  renderProgramHistory();
  renderTeamDirectory();
  renderAdminConsole();
}

// ==========================================================================
// RENDERIZADO: DASHBOARD HOME
// ==========================================================================
async function renderDashboardHome() {
  // Estadísticas
  try {
    const allUsers = await getUsers(currentUser);
    // Filtrar miembros aprobados de su área
    const areaMembers = allUsers.filter(u => u.area === currentUser.area && u.status === 'approved');
    DOM.statAreaMembers.textContent = areaMembers.length;
    
    // Conteo de servicios fijos en el mes actual
    DOM.statMonthlyServices.textContent = calculateServicesInMonth(currentMonth);

    // Conteo de programaciones totales subidas
    const progs = await getProgramSheets();
    DOM.statUploadedPrograms.textContent = progs.length;

    // Registros pendientes (Solo visible para Admin/SLíder)
    if (currentUser.role === 'admin' || currentUser.role === 'slider') {
      const pending = allUsers.filter(u => u.status === 'pending');
      DOM.statPendingUsers.textContent = pending.length;
    }
  } catch (err) {
    console.error("Error al calcular estadísticas:", err);
  }

  // Renderizar Programación Activa, Agenda Activa, Directorio de Equipo y Anuncios
  renderActiveProgram();
  renderActiveAgenda();
  renderDashboardTeam();
  renderAnnouncements();
}

// Calcula cuántos servicios fijos ocurren en el mes en curso (miércoles y domingos)
function calculateServicesInMonth(dateObj) {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (dayOfWeek === 0) count += 4; // Domingos tienen 4 servicios
    if (dayOfWeek === 3) count += 1; // Miércoles tiene 1 servicio
  }
  return count;
}

// Renderiza la hoja de programación inminente/activa
async function renderActiveProgram() {
  DOM.activeProgramContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const activeProg = await getActiveProgramSheet();
    
    if (!activeProg) {
      DOM.activeProgramContainer.innerHTML = `
        <div class="pdf-placeholder">
          <i class="fa-regular fa-file-excel" style="color: var(--text-muted);"></i>
          <p class="placeholder-text" style="padding:0;">No hay programación activa para el próximo servicio.<br><span style="font-size:11px;">Sube un archivo de planificación desde la sección de Programaciones o haciendo clic en el Calendario.</span></p>
        </div>
      `;
      return;
    }

    const isImage = activeProg.fileType === 'image';
    
    DOM.activeProgramContainer.innerHTML = `
      <div class="active-sheet-container">
        <div class="active-sheet-preview">
          ${isImage 
            ? `<img src="${activeProg.fileData}" alt="Hojas de programación">` 
            : `<div class="pdf-placeholder"><i class="fa-solid fa-file-pdf"></i><span>Documento de Planificación PDF</span></div>`
          }
        </div>
        <div class="active-sheet-info">
          <div>
            <h4 class="active-sheet-title">${activeProg.date}</h4>
            <span class="active-sheet-time"><i class="fa-regular fa-clock"></i> Servicio: ${activeProg.time}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-xs btn-view-prog" data-id="${activeProg.id}">
              <i class="fa-regular fa-eye"></i> Visualizar
            </button>
            <a href="${activeProg.fileData}" download="Programacion_${activeProg.date}_${activeProg.time.replace(/ /g, '_')}" class="btn btn-primary btn-xs">
              <i class="fa-solid fa-download"></i> Descargar
            </a>
          </div>
        </div>
      </div>
    `;

    // Evento de ver archivo en modal
    DOM.activeProgramContainer.querySelector('.btn-view-prog').addEventListener('click', () => {
      openFileViewer(activeProg);
    });

  } catch (err) {
    DOM.activeProgramContainer.innerHTML = `<p class="placeholder-text">Error al cargar programación activa.</p>`;
  }
}

// Determina la fecha y hora del próximo servicio
async function getTargetService() {
  const activeProg = await getActiveProgramSheet();
  if (activeProg) {
    return {
      date: activeProg.date,
      time: activeProg.time,
      isProgrammed: true
    };
  }

  // Si no hay programación cargada, buscamos el próximo servicio por horario fijo
  const now = new Date();
  
  const getYearMonthDayString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseServiceDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes);
  };

  for (let i = 0; i < 8; i++) {
    const testDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = testDate.getDay(); // 0 = Domingo, 3 = Miércoles
    
    let slots = [];
    if (dayOfWeek === 0) {
      slots = ["08:00 AM", "11:00 AM", "01:00 PM", "07:00 PM"];
    } else if (dayOfWeek === 3) {
      slots = ["07:30 PM"];
    }
    
    for (let slot of slots) {
      const dateStr = getYearMonthDayString(testDate);
      const serviceDate = parseServiceDateTime(dateStr, slot);
      const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000); // 2 horas
      if (serviceEndDate >= now) {
        return {
          date: dateStr,
          time: slot,
          isProgrammed: false
        };
      }
    }
  }
  return null;
}

// Renderiza la lista de personal asignado al próximo servicio
async function renderActiveAgenda() {
  DOM.activeAgendaContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const target = await getTargetService();
    if (!target) {
      DOM.activeAgendaBadge.textContent = '0 Asignados';
      DOM.activeAgendaContainer.innerHTML = '<p class="placeholder-text">No hay servicios próximos configurados.</p>';
      return;
    }

    // Obtener los anotados
    const signups = await getServiceSignups(target.date, target.time);
    DOM.activeAgendaBadge.textContent = `${signups.length} Asignado${signups.length === 1 ? '' : 's'}`;

    const isSignedUp = signups.some(s => s.userAlias === currentUser.alias);

    // Formatear fecha bonita
    const parsedDate = new Date(target.date + 'T00:00:00');
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const formattedDate = `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} de ${monthNames[parsedDate.getMonth()]} (${target.time})`;

    // Agrupar por área
    const groups = {};
    signups.forEach(s => {
      if (!groups[s.userArea]) groups[s.userArea] = [];
      groups[s.userArea].push(s);
    });

    let signupsHtml = '';
    if (signups.length === 0) {
      signupsHtml = `
        <div style="text-align: center; padding: 15px 0;">
          <p class="placeholder-text" style="margin-bottom: 0;">Ningún miembro se ha anotado en este servicio aún.</p>
        </div>
      `;
    } else {
      signupsHtml = `
        <div class="agenda-group-list">
          ${Object.keys(groups).map(area => `
            <div class="agenda-group-area">
              <span class="agenda-group-title"><i class="fa-solid fa-people-group"></i> ${area}</span>
              <div class="agenda-group-members">
                ${groups[area].map(m => `
                  <div class="agenda-member-tag">
                    <i class="fa-solid fa-user-check"></i>
                    <span>${m.userName} <small style="color:var(--text-muted);">(${m.userAlias})</small></span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    DOM.activeAgendaContainer.innerHTML = `
      <div class="active-agenda-card-wrapper">
        <div class="active-agenda-header-info">
          <div>
            <span class="agenda-info-label"><i class="fa-regular fa-clock"></i> Próximo Servicio Activo:</span>
            <h4 class="agenda-info-date">${formattedDate}</h4>
          </div>
          <button id="btn-toggle-active-signup" class="btn btn-sm ${isSignedUp ? 'btn-danger' : 'btn-primary'}">
            ${isSignedUp ? '<i class="fa-solid fa-user-minus"></i> Quitarme' : '<i class="fa-solid fa-user-plus"></i> Anotarme'}
          </button>
        </div>
        ${signupsHtml}
      </div>
    `;

    // Hook del botón de anotarse/quitarse
    document.getElementById('btn-toggle-active-signup').addEventListener('click', async () => {
      try {
        if (isSignedUp) {
          await cancelSignupForService(target.date, target.time, currentUser.alias);
        } else {
          await signupForService(target.date, target.time, currentUser);
        }
        // Volver a renderizar
        renderActiveAgenda();
        // Si la sección activa es Agenda, también refrescarla
        const activeSection = document.querySelector('.content-section:not(.hidden)');
        if (activeSection && activeSection.id === 'sec-agenda') {
          renderCalendar();
        }
      } catch (err) {
        alert("Error al guardar la asignación: " + err.message);
      }
    });

  } catch (err) {
    console.error("Error al cargar la agenda activa:", err);
    DOM.activeAgendaContainer.innerHTML = '<p class="placeholder-text">Error al cargar el personal asignado.</p>';
  }
}

// Renderiza el directorio de miembros activos en el Dashboard Home de manera compacta
async function renderDashboardTeam() {
  DOM.dashboardTeamContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const list = await getUsers(currentUser);
    // Filtrar solo usuarios aprobados
    const approved = list.filter(u => u.status === 'approved');
    DOM.dashboardTeamBadge.textContent = `${approved.length} Miembro${approved.length === 1 ? '' : 's'}`;

    if (approved.length === 0) {
      DOM.dashboardTeamContainer.innerHTML = '<p class="placeholder-text">No hay miembros aprobados en el equipo.</p>';
      return;
    }

    // Ordenar miembros por área
    approved.sort((a, b) => a.area.localeCompare(b.area));

    DOM.dashboardTeamContainer.innerHTML = `
      <div class="dashboard-team-list">
        ${approved.map(u => `
          <div class="dashboard-team-item">
            <div class="dashboard-team-avatar">
              <i class="fa-solid fa-user"></i>
            </div>
            <div class="dashboard-team-info">
              <span class="dashboard-team-name">${u.name}</span>
              <div class="dashboard-team-badges">
                <span class="dashboard-team-alias">@${u.alias}</span>
                <span class="dashboard-team-area-badge">${u.area}</span>
              </div>
            </div>
            <div class="dashboard-team-actions">
              <a href="tel:${u.phone}" class="btn btn-outline btn-xs" title="Llamar"><i class="fa-solid fa-phone"></i></a>
              <a href="https://wa.me/${u.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-outline btn-xs" style="color: #25d366; border-color: rgba(37, 211, 102, 0.3);" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  } catch (err) {
    console.error("Error al cargar directorio del dashboard:", err);
    DOM.dashboardTeamContainer.innerHTML = '<p class="placeholder-text">Error al cargar el directorio de miembros.</p>';
  }
}



// Renderiza lista de anuncios en el dashboard
async function renderAnnouncements() {
  DOM.announcementsContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const list = await getAnnouncements();
    if (list.length === 0) {
      DOM.announcementsContainer.innerHTML = '<p class="placeholder-text">No hay anuncios publicados para el equipo.</p>';
      return;
    }

    DOM.announcementsContainer.innerHTML = list.map(ann => `
      <div class="announcement-item">
        <div class="ann-item-header">
          <span><i class="fa-solid fa-user-pen"></i> ${ann.author}</span>
          <span><i class="fa-regular fa-calendar"></i> ${ann.date}</span>
        </div>
        <h4 class="ann-item-title">${ann.title}</h4>
        <p class="ann-item-content">${ann.content}</p>
      </div>
    `).join('');
  } catch (err) {
    DOM.announcementsContainer.innerHTML = '<p class="placeholder-text">Error al cargar anuncios.</p>';
  }
}

// ==========================================================================
// RENDERIZADO: AGENDA / CALENDARIO
// ==========================================================================
async function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Nombres de meses en español
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  DOM.calendarMonthYear.textContent = `${monthNames[month]} ${year}`;
  DOM.calendarDaysGrid.innerHTML = '';
  
  // Obtener días del mes
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Corregir índice para que la semana empiece en Lunes (getDay: 0=Dom, 1=Lun...)
  // Lun=0, Mar=1, Mié=2, Jue=3, Vie=4, Sáb=5, Dom=6
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  
  const lastDayDate = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  
  // Obtener programaciones subidas para pintar los puntos de carga en el calendario
  const progs = await getProgramSheets();

  // Días del mes anterior
  for (let i = adjustedFirstDayIndex; i > 0; i--) {
    const day = prevMonthLastDay - i + 1;
    createCalendarDay(day, true, false, null);
  }

  // Días del mes actual
  const today = new Date();
  for (let d = 1; d <= lastDayDate; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay(); // 0 = Domingo, 3 = Miércoles
    
    const isServiceDay = dayOfWeek === 0 || dayOfWeek === 3;
    
    // Filtrar programaciones correspondientes a este día
    const dayProgs = progs.filter(p => p.date === dateStr);
    
    createCalendarDay(d, false, isToday, isServiceDay, dateStr, dayProgs);
  }

  // Rellenar con días del mes siguiente para completar la grilla
  const totalCells = adjustedFirstDayIndex + lastDayDate;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remainingCells; d++) {
    createCalendarDay(d, true, false, null);
  }
}

// Crea una casilla del calendario e inyecta sus manejadores de evento click
function createCalendarDay(dayNum, isOtherMonth, isToday, isServiceDay, dateStr, dayProgs = []) {
  const dayEl = document.createElement('div');
  dayEl.className = 'cal-day';
  if (isOtherMonth) dayEl.classList.add('other-month');
  if (isToday) dayEl.classList.add('today');
  if (isServiceDay) dayEl.classList.add('service-day');
  
  dayEl.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
  
  if (isServiceDay && !isOtherMonth) {
    const dotsEl = document.createElement('div');
    dotsEl.className = 'cal-dots';
    
    // Pintar un puntito por cada archivo subido
    dayProgs.forEach(() => {
      const dot = document.createElement('span');
      dot.className = 'cal-dot';
      dotsEl.appendChild(dot);
    });
    dayEl.appendChild(dotsEl);
    
    // Evento de clic en día de servicio
    dayEl.addEventListener('click', () => {
      selectCalendarDay(dateStr, dayProgs);
    });
  }
  
  DOM.calendarDaysGrid.appendChild(dayEl);
}

// Muestra el detalle del día de servicio seleccionado en el calendario
async function selectCalendarDay(dateStr, dayProgs) {
  selectedDate = dateStr;
  
  const parsedDate = new Date(dateStr + 'T00:00:00');
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const formattedDate = `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} de ${parsedDate.toLocaleDateString('es-ES', { month: 'long' })}`;
  
  DOM.selectedDayTitle.textContent = formattedDate;
  DOM.selectedDayContent.innerHTML = '<div class="loading-spinner"></div>';
  
  const dayOfWeek = parsedDate.getDay(); // 0 = Domingo, 3 = Miércoles
  let slots = [];
  
  if (dayOfWeek === 0) {
    slots = ["08:00 AM", "11:00 AM", "01:00 PM", "07:00 PM"];
  } else if (dayOfWeek === 3) {
    slots = ["07:30 PM"];
  }
  
  const listEl = document.createElement('div');
  listEl.className = 'service-list';
  
  for (const slot of slots) {
    const associatedProg = dayProgs.find(p => p.time === slot);
    const itemEl = document.createElement('div');
    itemEl.className = 'service-item';
    
    let progHtml = '';
    if (associatedProg) {
      progHtml = `
        <div class="service-sheet-preview-box">
          <span style="font-size:12px; color:var(--text-sub);"><i class="fa-regular fa-file"></i> ${associatedProg.fileName}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline btn-xs btn-view-cell" data-id="${associatedProg.id}"><i class="fa-regular fa-eye"></i></button>
            <a href="${associatedProg.fileData}" download class="btn btn-primary btn-xs"><i class="fa-solid fa-download"></i></a>
          </div>
        </div>
      `;
    } else {
      const isStaff = currentUser.role === 'admin' || currentUser.role === 'slider';
      progHtml = isStaff 
        ? `<button class="btn btn-outline btn-xs btn-block btn-direct-upload" data-time="${slot}" style="margin-top:10px; border-style:dashed;">
             <i class="fa-solid fa-plus"></i> Cargar Programación
           </button>`
        : `<p class="placeholder-text" style="padding:10px 0 0 0; font-size:11px; text-align:left;">Sin programar.</p>`;
    }

    itemEl.innerHTML = `
      <div class="service-item-header">
        <span class="service-time-badge"><i class="fa-regular fa-clock"></i> ${slot}</span>
        ${associatedProg ? `<span class="badge badge-success">Programado</span>` : `<span class="badge badge-status">Pendiente</span>`}
      </div>
      <p style="font-size:12px; color:var(--text-sub);">Servicio general de adoración y palabra.</p>
      ${progHtml}
    `;

    // Escuchadores dinámicos
    if (associatedProg) {
      itemEl.querySelector('.btn-view-cell').addEventListener('click', () => {
        openFileViewer(associatedProg);
      });
    } else {
      const uploadBtn = itemEl.querySelector('.btn-direct-upload');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
          const timeSlot = e.currentTarget.getAttribute('data-time');
          goToUploadModule(dateStr, timeSlot);
        });
      }
    }

    // --- SECCIÓN DE AGENDA / PERSONAL ASIGNADO ---
    try {
      const signups = await getServiceSignups(dateStr, slot);
      const isSignedUp = signups.some(s => s.userAlias === currentUser.alias);
      
      const agendaContainer = document.createElement('div');
      agendaContainer.className = 'service-item-agenda-container';
      
      const signupsHtml = signups.length === 0 
        ? `<span style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-users-slash"></i> Sin personal anotado</span>`
        : `<span style="font-size:11px; color:var(--text-sub); line-height: 1.4;"><i class="fa-solid fa-user-check text-cyan"></i> ${signups.map(s => `${s.userName} (${s.userArea})`).join(', ')}</span>`;
      
      agendaContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); gap:10px;">
          ${signupsHtml}
          <button class="btn btn-outline btn-xs btn-toggle-slot-signup" style="flex-shrink:0;">
            ${isSignedUp ? '<i class="fa-solid fa-user-minus text-red"></i> Quitarme' : '<i class="fa-solid fa-user-plus text-cyan"></i> Anotarme'}
          </button>
        </div>
      `;

      // Escuchador para anotarse en el slot
      agendaContainer.querySelector('.btn-toggle-slot-signup').addEventListener('click', async () => {
        try {
          if (isSignedUp) {
            await cancelSignupForService(dateStr, slot, currentUser.alias);
          } else {
            await signupForService(dateStr, slot, currentUser);
          }
          // Recargar el detalle del día
          selectCalendarDay(dateStr, dayProgs);
          // Recargar la agenda en el dashboard también
          renderActiveAgenda();
        } catch (err) {
          alert("Error al guardar la asignación: " + err.message);
        }
      });

      itemEl.appendChild(agendaContainer);
    } catch (err) {
      console.error("Error al cargar agenda para slot:", err);
    }
    
    listEl.appendChild(itemEl);
  }
  
  DOM.selectedDayContent.innerHTML = '';
  DOM.selectedDayContent.appendChild(listEl);
}

// Redirecciona al panel de subida de archivos pre-rellenando el formulario
function goToUploadModule(dateStr, timeSlot) {
  navigateSection('sec-programacion');
  DOM.uploadDate.value = dateStr;
  DOM.uploadTime.value = timeSlot;
}

// ==========================================================================
// RENDERIZADO: PROGRAMACIONES (UPLOAD & HISTORIAL)
// ==========================================================================

// Manejo del Input del archivo subido
function handleFileInput(file) {
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    alert("Formato no soportado. Sube una imagen (JPG/PNG) o un PDF.");
    return;
  }

  selectedFileName = file.name;
  selectedFileType = file.type === 'application/pdf' ? 'pdf' : 'image';

  // Leer a Base64
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedFileBase64 = e.target.result;
    
    // Mostrar preview
    DOM.fileDropZone.classList.add('hidden');
    DOM.filePreviewName.textContent = selectedFileName;
    DOM.filePreview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearFileSelection() {
  selectedFileBase64 = null;
  selectedFileType = null;
  selectedFileName = null;
  DOM.fileInput.value = '';
  DOM.filePreview.classList.add('hidden');
  DOM.fileDropZone.classList.remove('hidden');
}

// Renderiza la lista histórica de programaciones con filtros
async function renderProgramHistory() {
  DOM.programHistoryGrid.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const history = await getHistoricalProgramSheets();
    const active = await getActiveProgramSheet();
    
    // Juntar y clasificar (la activa también se puede buscar en el listado general)
    const progs = await getProgramSheets();
    
    // Filtro por texto
    const filterText = DOM.searchHistory.value.trim();
    const filtered = progs.filter(p => p.date.includes(filterText) || p.time.toLowerCase().includes(filterText.toLowerCase()));
    
    if (filtered.length === 0) {
      DOM.programHistoryGrid.innerHTML = '<p class="placeholder-text" style="grid-column: 1/-1;">No se encontraron hojas de programación en los registros.</p>';
      return;
    }

    // Ordenar por fecha descendente
    filtered.sort((a,b) => new Date(b.date + 'T' + convertTimeTo24(b.time)) - new Date(a.date + 'T' + convertTimeTo24(a.time)));

    DOM.programHistoryGrid.innerHTML = filtered.map(p => {
      const isImage = p.fileType === 'image';
      const isActive = active && active.id === p.id;
      
      return `
        <div class="program-card glass-panel" style="${isActive ? 'border-color: var(--color-cyan);' : ''}">
          <div class="program-card-preview">
            ${isImage 
              ? `<img src="${p.fileData}" alt="Hojas de programación">` 
              : `<i class="fa-solid fa-file-pdf"></i>`
            }
            ${isActive ? `<span class="badge badge-success" style="position:absolute; top:8px; right:8px; font-size:8px;">Activo</span>` : ''}
          </div>
          <div class="program-card-info">
            <span class="prog-date">${p.date}</span>
            <span class="prog-time"><i class="fa-regular fa-clock"></i> ${p.time}</span>
            <span class="prog-uploader">Por: ${p.uploadedBy}</span>
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button class="btn btn-outline btn-xs btn-view-history btn-block" data-id="${p.id}"><i class="fa-regular fa-eye"></i> Ver</button>
              <a href="${p.fileData}" download class="btn btn-primary btn-xs" style="padding: 6px 8px;"><i class="fa-solid fa-download"></i></a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar eventos a botones de visualizar
    DOM.programHistoryGrid.querySelectorAll('.btn-view-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const prog = filtered.find(p => p.id === id);
        if (prog) openFileViewer(prog);
      });
    });

  } catch (err) {
    DOM.programHistoryGrid.innerHTML = '<p class="placeholder-text" style="grid-column:1/-1;">Error al cargar registros históricos.</p>';
  }
}

// Convertidor auxiliar de 12h a 24h para ordenación correcta
function convertTimeTo24(timeStr) {
  let [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

// ==========================================================================
// RENDERIZADO: GESTIÓN DE EQUIPO (DIRECTORIO & ROLES)
// ==========================================================================
async function renderTeamDirectory() {
  DOM.teamTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="loading-spinner"></div></td></tr>';

  try {
    const list = await getUsers(currentUser);
    
    // Filtrar solo usuarios aprobados
    let filtered = list.filter(u => u.status === 'approved');

    // Filtro por término de búsqueda (Alias o Nombre)
    const term = DOM.searchTeamInput.value.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(u => u.name.toLowerCase().includes(term) || u.alias.toLowerCase().includes(term));
    }

    // Filtro por Área
    const area = DOM.filterTeamArea.value;
    if (area !== 'all') {
      filtered = filtered.filter(u => u.area === area);
    }

    // Filtro por Rol
    const role = DOM.filterTeamRole.value;
    if (role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }

    if (filtered.length === 0) {
      DOM.teamTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-text" style="text-align:center;">No se encontraron miembros del equipo aprobados.</td></tr>';
      return;
    }

    const isStaff = currentUser.role === 'admin' || currentUser.role === 'slider';

    DOM.teamTableBody.innerHTML = filtered.map(u => {
      const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const isSelf = u.alias === currentUser.alias;
      const isAdminTarget = u.role === 'admin';
      
      let actionButtons = '';
      if (isStaff) {
        if (isSelf) {
          actionButtons = `<span style="font-size:11px; color:var(--text-muted);">Tú (Sesión Activa)</span>`;
        } else if (isAdminTarget && currentUser.role !== 'admin') {
          actionButtons = `<span style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Bloqueado</span>`;
        } else {
          // El S-Líder no puede cambiar el rol a Admin, solo el Admin puede o el S-Líder puede cambiar a otros roles
          actionButtons = `
            <div class="actions-cell-buttons">
              <select class="btn-change-role-select" data-alias="${u.alias}" style="padding: 4px 6px; font-size:11px; width:auto; height:auto;">
                <option value="siervo" ${u.role === 'siervo' ? 'selected' : ''}>Siervo</option>
                <option value="co_lider" ${u.role === 'co_lider' ? 'selected' : ''}>Co-Líder</option>
                <option value="lider" ${u.role === 'lider' ? 'selected' : ''}>Líder</option>
                <option value="slider" ${u.role === 'slider' ? 'selected' : ''}>S-Líder</option>
                ${currentUser.role === 'admin' ? `<option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
              </select>
              <button class="btn btn-danger btn-xs btn-delete-member" data-alias="${u.alias}" title="Eliminar miembro">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `;
        }
      }

      return `
        <tr>
          <td>
            <div class="member-name-cell">
              <div class="member-cell-avatar">${initials}</div>
              <div>
                <div class="member-cell-name">${u.name}</div>
                <div class="member-cell-alias">@${u.alias}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size:12px;">${u.email}</div>
            <div style="font-size:11px; color:var(--text-muted);"><i class="fa-brands fa-whatsapp text-emerald"></i> ${u.phone}</div>
          </td>
          <td>${u.district}</td>
          <td><span class="badge badge-area">${u.area}</span></td>
          <td><span class="badge badge-role">${getRoleLabel(u.role)}</span></td>
          ${isStaff ? `<td class="actions-col">${actionButtons}</td>` : ''}
        </tr>
      `;
    }).join('');

    // Escuchadores dinámicos para cambios de rol y eliminación
    if (isStaff) {
      DOM.teamTableBody.querySelectorAll('.btn-change-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const alias = e.currentTarget.getAttribute('data-alias');
          const newRole = e.currentTarget.value;
          try {
            await updateUserRole(alias, newRole, currentUser);
            alert(`Rol de @${alias} actualizado correctamente a ${getRoleLabel(newRole)}.`);
            addAuditLog("success", `Cambiado el rol de @${alias} a ${getRoleLabel(newRole)}.`);
            renderTeamDirectory();
          } catch (err) {
            alert("Error al actualizar rol: " + err.message);
            renderTeamDirectory(); // recargar para restablecer valor
          }
        });
      });

      DOM.teamTableBody.querySelectorAll('.btn-delete-member').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const alias = e.currentTarget.getAttribute('data-alias');
          if (confirm(`¿Estás seguro de que deseas eliminar y revocar el acceso a @${alias}?`)) {
            try {
              await deleteUser(alias, currentUser);
              alert(`Miembro @${alias} eliminado del sistema.`);
              addAuditLog("warning", `Eliminado el miembro @${alias} del sistema.`);
              renderTeamDirectory();
              renderDashboardHome();
            } catch (err) {
              alert("Error al eliminar miembro: " + err.message);
            }
          }
        });
      });
    }

  } catch (err) {
    DOM.teamTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-text" style="text-align:center;">Error al cargar directorio.</td></tr>';
  }
}

// ==========================================================================
// RENDERIZADO: CONSOLA DE ADMINISTRACIÓN (SOLICITUDES PENDIENTES)
// ==========================================================================
async function renderAdminConsole() {
  if (currentUser.role !== 'admin' && currentUser.role !== 'slider') return;

  DOM.pendingRequestsList.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const list = await getUsers(currentUser);
    const pending = list.filter(u => u.status === 'pending');
    
    if (pending.length === 0) {
      DOM.pendingRequestsList.innerHTML = '<p class="placeholder-text" style="padding: 20px 0;">No hay solicitudes de registro pendientes.</p>';
      return;
    }

    DOM.pendingRequestsList.innerHTML = pending.map(u => `
      <div class="request-card glass-panel">
        <div class="member-name-cell">
          <div class="member-cell-avatar" style="background-color:rgba(245, 158, 11, 0.15); color:var(--color-amber);">${u.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
          <div>
            <div class="member-cell-name">${u.name}</div>
            <div class="member-cell-alias">@${u.alias}</div>
          </div>
        </div>
        <div class="request-info-grid">
          <div><strong>Correo:</strong> ${u.email}</div>
          <div><strong>Teléfono:</strong> ${u.phone}</div>
          <div><strong>Distrito:</strong> ${u.district}</div>
          <div><strong>Área Solicitada:</strong> <span class="badge badge-area">${u.area}</span></div>
        </div>
        <div class="request-actions">
          <button class="btn btn-outline btn-xs btn-reject-req" data-alias="${u.alias}"><i class="fa-solid fa-user-xmark"></i> Rechazar</button>
          <button class="btn btn-success btn-xs btn-approve-req" data-alias="${u.alias}"><i class="fa-solid fa-user-check"></i> Aprobar Acceso</button>
        </div>
      </div>
    `).join('');

    // Asignar eventos de aprobación / rechazo
    DOM.pendingRequestsList.querySelectorAll('.btn-approve-req').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const alias = e.currentTarget.getAttribute('data-alias');
        try {
          await approveUser(alias, currentUser);
          alert(`Usuario @${alias} aprobado correctamente.`);
          addAuditLog("success", `Registro aprobado: @${alias} ahora es miembro activo.`);
          renderAdminConsole();
          renderDashboardHome();
        } catch (err) {
          alert("Error: " + err.message);
        }
      });
    });

    DOM.pendingRequestsList.querySelectorAll('.btn-reject-req').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const alias = e.currentTarget.getAttribute('data-alias');
        if (confirm(`¿Rechazar y eliminar la solicitud de @${alias}?`)) {
          try {
            await deleteUser(alias, currentUser);
            alert(`Solicitud de @${alias} rechazada.`);
            addAuditLog("warning", `Solicitud de registro de @${alias} fue rechazada y eliminada.`);
            renderAdminConsole();
            renderDashboardHome();
          } catch (err) {
            alert("Error: " + err.message);
          }
        }
      });
    });

  } catch (err) {
    DOM.pendingRequestsList.innerHTML = '<p class="placeholder-text">Error al cargar solicitudes.</p>';
  }
}

// ==========================================================================
// VISOR DE ARCHIVOS INTEGRADO (MODAL PREVIEW)
// ==========================================================================
function openFileViewer(progObj) {
  DOM.viewerModalTitle.textContent = `Programación - ${progObj.date} (Servicio ${progObj.time})`;
  
  if (progObj.fileType === 'pdf') {
    // Si es un archivo PDF, usamos un iframe apuntando al Base64.
    // Firefox y Chrome soportan renderizar PDFs embebidos en data-uris directamente
    DOM.viewerModalBody.innerHTML = `<iframe src="${progObj.fileData}" title="Visor PDF"></iframe>`;
  } else {
    // Si es imagen
    DOM.viewerModalBody.innerHTML = `<img src="${progObj.fileData}" alt="Programación del servicio">`;
  }
  
  DOM.viewerModal.classList.remove('hidden');
}
