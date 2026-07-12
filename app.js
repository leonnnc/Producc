import {
  loginUser,
  loginUserWithGoogle,
  registerUser,
  getUsers,
  updateUserRole,
  deleteUser,
  getProgramSheets,
  uploadProgramSheet,
  getActiveProgramSheet,
  getHistoricalProgramSheets,
  getAnnouncements,
  createAnnouncement,
  getServiceSignups,
  signupForService,
  cancelSignupForService,
  getAllServiceSignups,
  createSpecialEvent,
  getSpecialEvents,
  deleteSpecialEvent
} from './data.js';

import { isFirebaseConfigured } from './firebase-config.js';

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let currentUser = null;
let currentMonth = new Date(); // Para el Calendario/Agenda
let selectedDate = null;       // Fecha seleccionada en el calendario
let selectedFileBase64 = null; // Archivo cargado en Base64
let selectedFileType = null;   // Tipo del archivo cargado (image o pdf)
let selectedFileName = null;   // Nombre del archivo cargado

// YouTube Integration
const YOUTUBE_CHANNEL_ID = 'UC0XjfZF7rFUA9eS0Ok6pJvg'; // Catedral de Fe Channel ID

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
  
  // Header principal
  currentSectionTitle: document.getElementById('current-section-title'),
  headerTime: document.getElementById('header-time'),
  
  // Secciones Dinámicas SPA
  sections: document.querySelectorAll('.content-section'),
  
  // Módulo: Dashboard Home
  statAreaMembers: document.getElementById('stat-area-members'),
  statMonthlyServices: document.getElementById('stat-monthly-services'),
  statUploadedPrograms: document.getElementById('stat-uploaded-programs'),
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
  sundayMatrixTable: document.getElementById('sunday-matrix-table'),
  wednesdayMatrixTable: document.getElementById('wednesday-matrix-table'),
  serviceReserveModal: document.getElementById('service-reserve-modal'),
  btnCloseReserveModal: document.getElementById('btn-close-reserve-modal'),
  reserveModalTitle: document.getElementById('reserve-modal-title'),
  reserveModalBodyContent: document.getElementById('reserve-modal-body-content'),
  specialEventsContainer: document.getElementById('special-events-container'),
  btnCreateSpecialEventTrigger: document.getElementById('btn-create-special-event-trigger'),
  specialEventModal: document.getElementById('special-event-modal'),
  btnCloseSpecialEventModal: document.getElementById('btn-close-special-event-modal'),
  specialEventForm: document.getElementById('special-event-form'),
  seName: document.getElementById('se-name'),
  seDate: document.getElementById('se-date'),
  
  // Modal Opciones Video
  videoPlayModal: document.getElementById('video-play-modal'),
  btnCloseVideoModal: document.getElementById('btn-close-video-modal'),
  videoModalName: document.getElementById('video-modal-name'),
  btnVideoGoYoutube: document.getElementById('btn-video-go-youtube'),
  btnVideoPlayHere: document.getElementById('btn-video-play-here'),
  
  // Módulo: Programaciones
  uploadPanelContainer: document.getElementById('upload-panel-container'),
  uploadProgramForm: document.getElementById('upload-program-form'),
  uploadTitle: document.getElementById('upload-title'),
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
  teamTableBody: document.getElementById('team-table-body'),

  
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

// Indicador de modo del sistema
function initSystemModeIndicator() {
  DOM.systemModeIndicator.innerHTML = `
    <span class="status-dot green"></span>
    <span class="status-text">Modo Nube (Firebase)</span>
  `;
}

// Agregar logs al panel de auditoría (Admin)
function addAuditLog(type, message) {
  console.log(`[AUDIT LOG - ${type.toUpperCase()}] ${message}`);
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
    
    const submitBtn = document.getElementById('btn-login-submit');
    const originalHtml = submitBtn.innerHTML;
    
    // Activar spinner de carga
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px; border-color: white; border-top-color: transparent; display: inline-block; margin-right: 8px; vertical-align: middle;"></span> Iniciando Sesión...`;
    
    try {
      const user = await loginUser(username, pass);
      currentUser = user;
      sessionStorage.setItem('erp_active_user', JSON.stringify(currentUser));
      loginSuccess();
    } catch (err) {
      showAuthError(err.message);
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
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

    const submitBtn = document.getElementById('btn-register-submit');
    const originalHtml = submitBtn.innerHTML;
    
    // Activar spinner de carga
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px; border-color: white; border-top-color: transparent; display: inline-block; margin-right: 8px; vertical-align: middle;"></span> Creando Cuenta...`;

    try {
      const registeredUser = await registerUser(userData);
      
      // Auto login
      currentUser = registeredUser;
      sessionStorage.setItem('erp_active_user', JSON.stringify(currentUser));
      
      showSuccessOverlay("Registro Completado", "Tu cuenta ha sido creada exitosamente. Iniciando sesión...", () => {
        DOM.registerForm.reset();
        // Restaurar estado
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        loginSuccess();
      });
    } catch (err) {
      showAuthError(err.message);
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
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
    renderSpecialEvents();
  });
  DOM.btnNextMonth.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
    renderSpecialEvents();
  });

  // --- EVENTOS DEL CALENDARIO DE EVENTOS ESPECIALES ---
  const btnPrevMonthSpecial = document.getElementById('btn-prev-month-special');
  const btnNextMonthSpecial = document.getElementById('btn-next-month-special');
  if (btnPrevMonthSpecial) {
    btnPrevMonthSpecial.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderSpecialEvents();
    });
  }
  if (btnNextMonthSpecial) {
    btnNextMonthSpecial.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderSpecialEvents();
    });
  }

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
      title: DOM.uploadTitle.value.trim(),
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
  DOM.btnCloseReserveModal.addEventListener('click', () => {
    DOM.serviceReserveModal.classList.add('hidden');
  });

  // Publicar Anuncio
  DOM.announcementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();
    const eventDate = document.getElementById('ann-event-date').value;
    const eventTime = document.getElementById('ann-event-time').value;
    
    try {
      await createAnnouncement(title, content, currentUser, eventDate, eventTime);
      DOM.announcementForm.reset();
      DOM.announcementModal.classList.add('hidden');
      renderAnnouncements();
      addAuditLog("info", `Nuevo anuncio publicado: "${title}"`);
    } catch (err) {
      alert("Error al publicar anuncio: " + err.message);
    }
  });

  // Buscador de historial de programaciones
  DOM.searchHistory.addEventListener('input', renderProgramHistory);

  // Modales adicionales (Eventos Especiales)
  DOM.btnCreateSpecialEventTrigger.addEventListener('click', () => {
    DOM.specialEventModal.classList.remove('hidden');
  });
  DOM.btnCloseSpecialEventModal.addEventListener('click', () => {
    DOM.specialEventModal.classList.add('hidden');
  });

  DOM.btnCloseVideoModal.addEventListener('click', () => {
    DOM.videoPlayModal.classList.add('hidden');
  });

  // Crear Evento Especial
  DOM.specialEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOM.seName.value.trim();
    const date = DOM.seDate.value;
    const time = DOM.seTime.value.trim();
    
    try {
      await createSpecialEvent(name, date, time, currentUser);
      DOM.specialEventForm.reset();
      DOM.specialEventModal.classList.add('hidden');
      renderCalendar(); // Refrescar el calendario
      addAuditLog("info", `Nuevo evento especial creado: "${name}" para el ${date} a las ${time}`);
      alert("Evento especial creado con éxito.");
    } catch (err) {
      alert("Error al crear evento especial: " + err.message);
    }
  });

  // Transmisión en Vivo: Botón de señal en vivo
  const btnShowLiveStream = document.getElementById('btn-show-live-stream');
  if (btnShowLiveStream) {
    btnShowLiveStream.addEventListener('click', () => {
      const iframe = document.getElementById('main-live-iframe');
      if (iframe) {
        iframe.src = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`;
      }
    });
  }

  // Transmisión en Vivo: Botón de probar Facebook Video
  const btnPlayFacebookTest = document.getElementById('btn-play-facebook-test');
  if (btnPlayFacebookTest) {
    btnPlayFacebookTest.addEventListener('click', () => {
      const iframe = document.getElementById('main-live-iframe');
      if (iframe) {
        iframe.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent('https://www.facebook.com/share/v/1UpBbpJeqW/')}&show_text=0&width=560`;
        iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

// Muestra una notificación Toast (éxito, error, info)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  else if (type === 'info') iconClass = 'fa-circle-info';
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon"></i>
    <div class="toast-message" style="line-height:1.4;">${message}</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
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
    
    if (currentUser.role === 'admin') {
      DOM.userAreaBadge.classList.add('hidden');
    } else {
      DOM.userAreaBadge.classList.remove('hidden');
      DOM.userAreaBadge.textContent = currentUser.area;
    }
    
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
  const isLeaderOrStaff = isStaff || currentUser.role === 'lider';
  
  // Consola de Administración y Anuncios
  if (isLeaderOrStaff) {
    DOM.btnOpenAnnModal.classList.remove('hidden');
    DOM.btnCreateSpecialEventTrigger.classList.remove('hidden');
  } else {
    DOM.btnOpenAnnModal.classList.add('hidden');
    DOM.btnCreateSpecialEventTrigger.classList.add('hidden');
  }

  // Panel de Subida de Programaciones (Solo Admin/SuperLider)
  if (isStaff) {
    DOM.uploadPanelContainer.classList.remove('hidden');
  } else {
    DOM.uploadPanelContainer.classList.add('hidden');
  }

  // Columnas y botones de acción en directorio (se ocultan/muestran en el render para Admin/SuperLider)
  const staffOnlyElements = document.querySelectorAll('.staff-only');
  staffOnlyElements.forEach(el => {
    if (isStaff) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // Ocultar sección de Usuarios si es Siervo regular
  const navTeam = document.getElementById('nav-team');
  const canSeeTeam = currentUser.role === 'admin' || currentUser.role === 'slider' || currentUser.role === 'lider' || currentUser.role === 'co_lider';
  if (navTeam) {
    if (canSeeTeam) {
      navTeam.parentElement.classList.remove('hidden');
    } else {
      navTeam.parentElement.classList.add('hidden');
    }
  }

  // Ocultar bloque de notificaciones de agenda si es Siervo regular
  const agendaNotificationsCard = document.getElementById('agenda-notifications-card');
  if (agendaNotificationsCard) {
    if (canSeeTeam) {
      agendaNotificationsCard.classList.remove('hidden');
    } else {
      agendaNotificationsCard.classList.add('hidden');
    }
  }
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
  // Evitar navegación a Usuarios para siervos normales
  if (sectionId === 'sec-team') {
    const canSeeTeam = currentUser.role === 'admin' || currentUser.role === 'slider' || currentUser.role === 'lider' || currentUser.role === 'co_lider';
    if (!canSeeTeam) {
      navigateSection('sec-dashboard');
      return;
    }
  }

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
  if (sectionId === 'sec-team') title = "Usuarios";
  if (sectionId === 'sec-special-events') title = "Eventos Especiales";
  if (sectionId === 'sec-agenda') title = "Agenda de Servicio";
  if (sectionId === 'sec-programacion') title = "Programación";
  if (sectionId === 'sec-live') title = "Transmisión en Vivo";
  if (sectionId === 'sec-learn') title = "Aprende";
  
  DOM.currentSectionTitle.textContent = title;

  // Renderizar la sección cargada
  if (sectionId === 'sec-dashboard') renderDashboardHome();
  if (sectionId === 'sec-team') renderTeamDirectory();
  if (sectionId === 'sec-special-events') renderSpecialEvents();
  if (sectionId === 'sec-agenda') renderCalendar();
  if (sectionId === 'sec-programacion') renderProgramHistory();
  if (sectionId === 'sec-live') renderYouTubeLive();
}

// --- RENDERIZADO GENERAL DE DATOS ---

function renderApp() {
  renderDashboardHome();
  renderCalendar();
  renderSpecialEvents();
  renderProgramHistory();
  renderTeamDirectory();
  renderYouTubeLive();
}

// ==========================================================================
// RENDERIZADO: DASHBOARD HOME
// ==========================================================================
async function renderDashboardHome() {
  // Estadísticas
  try {
    const allUsers = await getUsers(currentUser);
    // Filtrar miembros de su área
    const areaMembers = allUsers.filter(u => u.area === currentUser.area);
    DOM.statAreaMembers.textContent = areaMembers.length;
    
    // Conteo de servicios fijos en el mes actual
    DOM.statMonthlyServices.textContent = calculateServicesInMonth(currentMonth);

    // Conteo de programaciones totales subidas
    const progs = await getProgramSheets();
    DOM.statUploadedPrograms.textContent = progs.length;
  } catch (err) {
    console.error("Error al calcular estadísticas:", err);
  }

  // Renderizar Programación Activa, Agenda Activa, Directorio de Equipo y Anuncios
  renderActiveProgram();
  renderActiveAgenda();
  renderDashboardTeam();
  renderAnnouncements();
  renderAgendaNotifications();
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
            <h4 class="active-sheet-title" style="margin-bottom: 2px;">${activeProg.title || "Servicio Técnico"}</h4>
            <span class="active-sheet-time" style="font-size: 11px; display: flex; flex-direction: column; gap: 2px; color: var(--text-muted);">
              <span><i class="fa-regular fa-calendar"></i> ${activeProg.date}</span>
              <span><i class="fa-regular fa-clock"></i> Horario: ${activeProg.time}</span>
            </span>
          </div>
          <div style="display:flex; gap:8px; margin-top: 8px;">
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
    // 1. Obtener todas las anotaciones de la base de datos
    const signups = await getAllServiceSignups();

    // 2. Filtrar solo las asignaciones futuras o activas
    const now = new Date();
    const parseDateTime = (dateStr, timeStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      let [timeVal, modifier] = timeStr.split(' ');
      let [hours, minutes] = timeVal.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return new Date(year, month - 1, day, hours, minutes);
    };

    const upcomingSignups = signups.filter(s => {
      try {
        const serviceDate = parseDateTime(s.date, s.time);
        const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000); // 2 horas de duración
        return serviceEndDate >= now;
      } catch (e) {
        return false;
      }
    });

    // Ordenar cronológicamente
    upcomingSignups.sort((a, b) => {
      try {
        return parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
      } catch (e) {
        return 0;
      }
    });

    // Actualizar cantidad de asignaciones activas
    DOM.activeAgendaBadge.textContent = `${upcomingSignups.length} Asignación${upcomingSignups.length === 1 ? '' : 'es'}`;

    // Agrupar asignaciones por Servicio (Fecha + Hora)
    const serviceGroups = {};
    upcomingSignups.forEach(s => {
      const key = `${s.date} (${s.time})`;
      if (!serviceGroups[key]) serviceGroups[key] = [];
      serviceGroups[key].push(s);
    });

    const formatKey = (keyStr) => {
      const [datePart, timePart] = keyStr.split(' (');
      const parsedDate = new Date(datePart + 'T00:00:00');
      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const formattedDate = `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} de ${monthNames[parsedDate.getMonth()]}`;
      return `${formattedDate} (${timePart.slice(0, -1)})`;
    };

    let signupsHtml = '';

    if (upcomingSignups.length === 0) {
      signupsHtml = `
        <p class="placeholder-text" style="text-align:center; padding: 20px 0;">
          <i class="fa-solid fa-users-slash" style="font-size:24px; margin-bottom:8px; display:block; color:var(--text-muted);"></i>
          Ningún siervo se ha anotado en ningún servicio aún.
        </p>
      `;
    } else {
      signupsHtml = `
        <div class="agenda-flat-list">
          ${Object.keys(serviceGroups).map(key => `
            <div class="agenda-flat-service">
              <div class="agenda-flat-service-header">
                <i class="fa-regular fa-clock"></i> ${formatKey(key).toUpperCase()}
              </div>
              <div class="agenda-flat-members">
                ${determineBackupStatus(serviceGroups[key]).map(m => {
                  const label = m.isBackup ? `${m.userArea} (Apoyo)` : m.userArea;
                  const style = m.isBackup ? 'background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2);' : '';
                  return `
                    <div class="agenda-flat-member">
                      <div class="agenda-flat-member-info">
                        <i class="fa-solid fa-user-check text-cyan" style="font-size:11px;"></i>
                        <span>${m.userName} <small style="color:var(--text-muted);">(@${m.userAlias})</small></span>
                      </div>
                      <span class="agenda-flat-member-area" style="${style}">${label}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    DOM.activeAgendaContainer.innerHTML = `
      <div class="active-agenda-card-wrapper">
        ${signupsHtml}
      </div>
    `;

  } catch (err) {
    console.error("Error al cargar la agenda activa:", err);
    DOM.activeAgendaContainer.innerHTML = '<p class="placeholder-text">Error al cargar el personal asignado.</p>';
  }
}

// Renderiza el directorio de miembros activos en el Dashboard Home de manera compacta
async function renderDashboardTeam() {
  DOM.dashboardTeamContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const rawList = await getUsers(currentUser);
    const list = rawList.filter(u => u.role !== 'admin');
    DOM.dashboardTeamBadge.textContent = `${list.length} Usuario${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
      DOM.dashboardTeamContainer.innerHTML = '<p class="placeholder-text">No hay usuarios registrados.</p>';
      return;
    }

    // Ordenar usuarios por área
    list.sort((a, b) => a.area.localeCompare(b.area));

    DOM.dashboardTeamContainer.innerHTML = `
      <div class="dashboard-team-list">
        ${list.map(u => `
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
    DOM.dashboardTeamContainer.innerHTML = '<p class="placeholder-text">Error al cargar el directorio de usuarios.</p>';
  }
}

// Renderiza lista de notificaciones de la agenda para líderes
async function renderAgendaNotifications() {
  const container = document.getElementById('agenda-notifications-container');
  if (!container) return;
  
  container.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const allSignups = await getAllServiceSignups();
    
    const now = new Date();
    const parseDateTime = (dateStr, timeStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      let [timeVal, modifier] = timeStr.split(' ');
      let [hours, minutes] = timeVal.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return new Date(year, month - 1, day, hours, minutes);
    };

    let activeSignups = allSignups.filter(s => {
      try {
        const serviceDate = parseDateTime(s.date, s.time);
        const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000);
        return serviceEndDate >= now;
      } catch (e) {
        return false;
      }
    });

    if (currentUser.role !== 'admin' && currentUser.role !== 'slider') {
      const isSwitchOrCam = currentUser.area === "Switchers" || currentUser.area === "Cámaras";
      activeSignups = activeSignups.filter(s => {
        if (isSwitchOrCam) {
          return s.userArea === "Switchers" || s.userArea === "Cámaras";
        }
        return s.userArea === currentUser.area;
      });
    }

    activeSignups.sort((a, b) => {
      const timeA = a.createdAt || '';
      const timeB = b.createdAt || '';
      return timeB.localeCompare(timeA);
    });

    if (activeSignups.length === 0) {
      container.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 20px 0;">No hay notificaciones de inscripciones recientes.</p>';
      return;
    }

    const formatKey = (dateStr) => {
      const parsedDate = new Date(dateStr + 'T00:00:00');
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} de ${monthNames[parsedDate.getMonth()]}`;
    };

    container.innerHTML = activeSignups.map(s => {
      const sameAreaAndSlot = allSignups.filter(x => x.date === s.date && x.time === s.time && x.userArea === s.userArea);
      const count = sameAreaAndSlot.length;
      
      let capacityText = '';
      if (s.userArea === 'Switchers') {
        capacityText = `(Total: ${count}/1 Switcher)`;
      } else if (s.userArea === 'Cámaras') {
        capacityText = `(Total: ${count}/3 Cámaras)`;
      } else {
        capacityText = `(Total: ${count} asignado${count === 1 ? '' : 's'})`;
      }

      const sortedSameArea = sameAreaAndSlot.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      const index = sortedSameArea.findIndex(x => x.userAlias === s.userAlias);
      let roleLabel = s.userArea;
      let badgeStyle = 'background:rgba(0,229,255,0.06); color:var(--color-cyan); border:1px solid rgba(0,229,255,0.15);';
      
      if (s.userArea === 'Switchers' && index >= 1) {
        roleLabel = 'Switcher (Apoyo)';
        badgeStyle = 'background:rgba(245,158,11,0.08); color:#f59e0b; border:1px solid rgba(245,158,11,0.18);';
      } else if (s.userArea === 'Cámaras' && index >= 3) {
        roleLabel = 'Cámara (Apoyo)';
        badgeStyle = 'background:rgba(245,158,11,0.08); color:#f59e0b; border:1px solid rgba(245,158,11,0.18);';
      }

      return `
        <div class="notification-item" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <strong style="color: white; font-size: 12px;">${s.userName} <span style="font-weight:400; color:var(--text-muted);">(@${s.userAlias})</span></strong>
            <span class="badge" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 600; ${badgeStyle}">${roleLabel}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-regular fa-clock"></i> ${formatKey(s.date)} a las ${s.time}</span>
            <span style="color: var(--color-cyan); font-weight: 500;">${capacityText}</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error("Error al renderizar notificaciones:", err);
    container.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 20px 0;">Error al cargar notificaciones.</p>';
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

    DOM.announcementsContainer.innerHTML = list.map(ann => {
      const expirationInfo = ann.eventDate 
        ? `<div style="font-size: 10px; color: var(--color-cyan); margin-top: 5px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
             <i class="fa-solid fa-clock-rotate-left"></i> ${ann.eventDate} ${ann.eventTime}
           </div>`
        : '';

      return `
        <div class="announcement-item">
          <div class="ann-item-header">
            <span><i class="fa-solid fa-user-pen"></i> ${ann.author}</span>
            <span><i class="fa-regular fa-calendar"></i> ${ann.date}</span>
          </div>
          <h4 class="ann-item-title">${ann.title}</h4>
          <p class="ann-item-content" style="white-space: pre-wrap;">${ann.content}</p>
          ${expirationInfo}
        </div>
      `;
    }).join('');
  } catch (err) {
    DOM.announcementsContainer.innerHTML = '<p class="placeholder-text">Error al cargar anuncios.</p>';
  }
}

// ==========================================================================
// RENDERIZADO: AGENDA / CALENDARIO
// ==========================================================================
// ==========================================================================
// RENDERIZADO: AGENDA / MATRIX TABLE
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
  
  // Obtener Domingos y Miércoles de este mes
  const lastDayDate = new Date(year, month + 1, 0).getDate();
  const sundays = [];
  const wednesdays = [];
  
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthShorts = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  for (let d = 1; d <= lastDayDate; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const formattedDate = `${dayNames[dayOfWeek]} ${d} de ${monthNames[month]}`;

    if (dayOfWeek === 0) {
      sundays.push({
        dayNum: d,
        monthShort: monthShorts[month],
        dateStr: dateStr,
        formattedDate: formattedDate
      });
    } else if (dayOfWeek === 3) {
      wednesdays.push({
        dayNum: d,
        monthShort: monthShorts[month],
        dateStr: dateStr,
        formattedDate: formattedDate
      });
    }
  }

  // OPTIMIZACIÓN: Traer todas las inscripciones del tirón en una sola llamada a Firestore
  const allSignups = await getAllServiceSignups();

  // --- RENDERIZAR TABLA DE DOMINGOS ---
  const sundaySlots = ["08:00 AM", "11:00 AM", "01:00 PM", "07:00 PM"];
  let sundayHtml = `
    <thead>
      <tr>
        <th>HORARIO</th>
        ${sundays.map(s => `<th>${s.dayNum} ${s.monthShort}<br><small>DOMINGO</small></th>`).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const slot of sundaySlots) {
    sundayHtml += `
      <tr>
        <td class="time-header-cell">${slot}</td>
    `;
    for (const s of sundays) {
      // Filtrar en memoria
      const signups = allSignups.filter(x => x.date === s.dateStr && x.time === slot);
      const isSignedUp = signups.some(x => x.userAlias === currentUser.alias);
      
      const dateObj = new Date(s.dateStr + 'T00:00:00');
      dateObj.setHours(0, 0, 0, 0);
      const isPast = dateObj < today;

      let buttonHtml = '';
      if (isPast) {
        buttonHtml = `
          <button class="btn btn-xs btn-matrix-reserve" disabled style="background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.05); color:var(--text-muted); opacity:0.6;">
            ${isSignedUp ? '<i class="fa-solid fa-user-check"></i> Reservado' : 'Finalizado'}
          </button>
        `;
      } else {
        buttonHtml = `
          <button class="btn btn-xs ${isSignedUp ? 'btn-success' : 'btn-outline'} btn-matrix-reserve">
            ${isSignedUp ? '<i class="fa-solid fa-user-check"></i> Reservado' : 'Reservar'}
          </button>
        `;
      }

      sundayHtml += `
        <td class="reserve-matrix-cell ${isPast ? 'past-cell' : ''}" data-date="${s.dateStr}" data-slot="${slot}" data-formatted="${s.formattedDate}">
          ${buttonHtml}
          ${signups.length > 0 ? `<span class="cell-signup-count"><i class="fa-solid fa-user"></i> ${signups.length}</span>` : ''}
        </td>
      `;
    }
    sundayHtml += `</tr>`;
  }
  sundayHtml += `</tbody>`;
  DOM.sundayMatrixTable.innerHTML = sundayHtml;

  // --- RENDERIZAR TABLA DE MIÉRCOLES ---
  const wednesdaySlots = ["07:30 PM"];
  let wednesdayHtml = `
    <thead>
      <tr>
        <th>HORARIO</th>
        ${wednesdays.map(w => `<th>${w.dayNum} ${w.monthShort}<br><small>MIÉRCOLES</small></th>`).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  for (const slot of wednesdaySlots) {
    wednesdayHtml += `
      <tr>
        <td class="time-header-cell">${slot}</td>
    `;
    for (const w of wednesdays) {
      // Filtrar en memoria
      const signups = allSignups.filter(x => x.date === w.dateStr && x.time === slot);
      const isSignedUp = signups.some(x => x.userAlias === currentUser.alias);
      
      const dateObj = new Date(w.dateStr + 'T00:00:00');
      dateObj.setHours(0, 0, 0, 0);
      const isPast = dateObj < today;

      let buttonHtml = '';
      if (isPast) {
        buttonHtml = `
          <button class="btn btn-xs btn-matrix-reserve" disabled style="background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.05); color:var(--text-muted); opacity:0.6;">
            ${isSignedUp ? '<i class="fa-solid fa-user-check"></i> Reservado' : 'Finalizado'}
          </button>
        `;
      } else {
        buttonHtml = `
          <button class="btn btn-xs ${isSignedUp ? 'btn-success' : 'btn-outline'} btn-matrix-reserve">
            ${isSignedUp ? '<i class="fa-solid fa-user-check"></i> Reservado' : 'Reservar'}
          </button>
        `;
      }

      wednesdayHtml += `
        <td class="reserve-matrix-cell ${isPast ? 'past-cell' : ''}" data-date="${w.dateStr}" data-slot="${slot}" data-formatted="${w.formattedDate}">
          ${buttonHtml}
          ${signups.length > 0 ? `<span class="cell-signup-count"><i class="fa-solid fa-user"></i> ${signups.length}</span>` : ''}
        </td>
      `;
    }
    wednesdayHtml += `</tr>`;
  }
  wednesdayHtml += `</tbody>`;
  DOM.wednesdayMatrixTable.innerHTML = wednesdayHtml;

  // --- ASOCIAR EVENTOS DE CLICK A LAS CELDAS DE LAS TABLAS ---
  const handleCellClick = async (e) => {
    const cell = e.currentTarget;
    const dateStr = cell.getAttribute('data-date');
    const slot = cell.getAttribute('data-slot');
    
    // Verificar si es fecha pasada
    const parsedDate = new Date(dateStr + 'T00:00:00');
    parsedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      showToast("Este servicio ya finalizó. No se pueden realizar cambios.", "error");
      return;
    }
    
    try {
      // 1. Obtener las inscripciones actuales para este turno
      const signups = await getServiceSignups(dateStr, slot);
      
      // 2. Comprobar si el usuario actual ya está inscrito
      const isAssigned = signups.some(x => x.userAlias === currentUser.alias);
      
      if (isAssigned) {
        // Retirarse del servicio
        await cancelSignupForService(dateStr, slot, currentUser.alias);
        showToast(`Te has retirado del servicio del ${slot}.`, "info");
      } else {
        // Inscribirse al servicio
        await signupForService(dateStr, slot, currentUser);
        showToast(`Te has inscrito exitosamente para el servicio del ${slot}.`, "success");
      }
      
      // 3. Actualizar grilla principal, agenda y notificaciones del dashboard
      renderCalendar();
      renderActiveAgenda();
      renderAgendaNotifications();
      
    } catch (err) {
      showToast("Error al actualizar la asignación: " + err.message, "error");
    }
  };

  DOM.sundayMatrixTable.querySelectorAll('.reserve-matrix-cell').forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });
  DOM.wednesdayMatrixTable.querySelectorAll('.reserve-matrix-cell').forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });
}

// Determina si las asignaciones deben considerarse de apoyo (backup)
function determineBackupStatus(signupsList) {
  // Ordenar por fecha de creación (createdAt) o id
  const sorted = [...signupsList].sort((a, b) => {
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    return timeA.localeCompare(timeB);
  });
  
  let switchersCount = 0;
  let camerasCount = 0;
  
  return sorted.map(s => {
    let isBackup = false;
    if (s.userArea === 'Switchers') {
      switchersCount++;
      if (switchersCount > 1) {
        isBackup = true;
      }
    } else if (s.userArea === 'Cámaras') {
      camerasCount++;
      if (camerasCount > 3) {
        isBackup = true;
      }
    }
    return {
      ...s,
      isBackup
    };
  });
}

// Abre el modal detallado para ver quién reservó y gestionar la reserva propia
async function openReserveModal(dateStr, slot, formattedDate) {
  DOM.reserveModalTitle.textContent = `${formattedDate} - ${slot}`;
  DOM.reserveModalBodyContent.innerHTML = '<div class="loading-spinner"></div>';
  DOM.serviceReserveModal.classList.remove('hidden');

  try {
    // 1. Obtener todos los siervos registrados
    const allUsers = await getUsers(currentUser);
    const servants = allUsers.filter(u => u.role === 'siervo');

    // 2. Obtener los anotados para esta fecha y hora
    const signups = await getServiceSignups(dateStr, slot);
    const signupsWithBackup = determineBackupStatus(signups);
    const isSignedUp = signups.some(s => s.userAlias === currentUser.alias);

    const parsedDate = new Date(dateStr + 'T00:00:00');
    parsedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = parsedDate < today;

    // Agrupar a todos los siervos registrados por su área
    const groups = {};
    servants.forEach(s => {
      if (!groups[s.area]) groups[s.area] = [];
      groups[s.area].push(s);
    });

    let signupsHtml = `
      <div class="agenda-flat-list" style="margin-top: 15px; max-height: 250px; overflow-y: auto;">
        ${Object.keys(groups).map(area => {
          return `
            <div class="agenda-flat-service" style="margin-bottom: 8px;">
              <div class="agenda-flat-service-header" style="font-size: 10px; border-bottom-color: rgba(255, 255, 255, 0.05); padding-bottom: 4px; margin-bottom: 8px;">
                <i class="fa-solid fa-people-group"></i> ${area.toUpperCase()}
              </div>
              <div class="agenda-flat-members">
                ${groups[area].map(s => {
                  const isAssigned = signups.some(x => x.userAlias === s.alias);
                  const assignedInfo = signupsWithBackup.find(x => x.userAlias === s.alias);
                  const isBackup = assignedInfo ? assignedInfo.isBackup : false;
                  
                  const backupBadge = (isAssigned && isBackup)
                    ? `<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:9px; padding:2px 4px; border:1px solid rgba(245,158,11,0.2); border-radius:3px; margin-left:5px;">Apoyo</span>`
                    : '';

                  const canToggle = !isPast && (currentUser.role === 'admin' || currentUser.role === 'slider' || currentUser.role === 'lider' || currentUser.alias === s.alias);
                  
                  let actionHtml = '';
                  if (canToggle) {
                    actionHtml = `
                      <button class="btn-modal-toggle-assignment" data-alias="${s.alias}" data-assigned="${isAssigned}" style="background:none; border:none; padding:2px 6px; cursor:pointer; color:${isAssigned ? 'var(--color-cyan)' : 'var(--text-muted)'}; font-size:12px; display:flex; align-items:center;">
                        <i class="${isAssigned ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}"></i>
                      </button>
                    `;
                  } else {
                    actionHtml = `
                      <span style="color:${isAssigned ? 'var(--color-cyan)' : 'var(--text-muted)'}; font-size:12px; padding:2px 6px; display:flex; align-items:center;">
                        <i class="${isAssigned ? 'fa-solid fa-check' : 'fa-solid fa-minus'}"></i>
                      </span>
                    `;
                  }

                  return `
                    <div class="agenda-flat-member">
                      <div class="agenda-flat-member-info">
                        <i class="fa-solid fa-user-check text-cyan" style="font-size:11px;"></i>
                        <span style="${isAssigned ? 'font-weight:600; color:white;' : 'color:var(--text-muted);'}">${s.name} <small style="color:var(--text-muted);">(@${s.alias})</small>${backupBadge}</span>
                      </div>
                      ${actionHtml}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    let actionPanelHtml = '';
    if (isPast) {
      actionPanelHtml = `
        <div style="background:rgba(255,255,255,0.02); padding:10px 15px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
          <span style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Servicio finalizado. Registro cerrado.</span>
        </div>
      `;
    } else {
      actionPanelHtml = `
        <div style="background:rgba(255,255,255,0.02); padding:10px 15px; border-radius:6px; border:1px solid var(--border-glass); text-align:center;">
          <span style="font-size:12px; color:white; font-weight:500;"><i class="fa-solid fa-user-clock"></i> Administra el personal del servicio activo abajo:</span>
        </div>
      `;
    }

    DOM.reserveModalBodyContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:15px;">
        ${actionPanelHtml}
        
        <div>
          <h4 style="font-size:12px; font-weight:600; color:white; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px; margin-bottom:10px;"><i class="fa-solid fa-users"></i> Lista de Siervos del Turno:</h4>
          ${signupsHtml}
        </div>
      </div>
    `;

    // Asociar eventos click a los botones de check del modal
    if (!isPast) {
      DOM.reserveModalBodyContent.querySelectorAll('.btn-modal-toggle-assignment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const alias = btn.getAttribute('data-alias');
          const assigned = btn.getAttribute('data-assigned') === 'true';
          const targetServant = servants.find(x => x.alias === alias);
          
          try {
            if (assigned) {
              await cancelSignupForService(dateStr, slot, alias);
            } else {
              await signupForService(dateStr, slot, targetServant);
            }
            // Volver a cargar el modal
            openReserveModal(dateStr, slot, formattedDate);
            // Actualizar la grilla principal
            renderCalendar();
            // Actualizar la agenda activa del dashboard
            renderActiveAgenda();
            renderAgendaNotifications();
          } catch (err) {
            showToast("Error al actualizar la asignación: " + err.message, "error");
          }
        });
      });
    }

  } catch (err) {
    console.error("Error al abrir modal de reservas:", err);
    DOM.reserveModalBodyContent.innerHTML = '<p class="placeholder-text">Error al cargar datos del servicio.</p>';
  }
}

// Renderiza la lista de eventos especiales creados para el mes activo
async function renderSpecialEvents() {
  DOM.specialEventsContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const yearMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const specialMonthYearEl = document.getElementById('special-month-year');
    if (specialMonthYearEl) {
      specialMonthYearEl.textContent = `${monthNames[month]} ${year}`;
    }
    
    // Obtener eventos especiales de este mes
    const events = await getSpecialEvents(yearMonthStr);
    
    if (events.length === 0) {
      DOM.specialEventsContainer.innerHTML = `
        <p class="placeholder-text" style="text-align:center; padding: 20px 0;">
          <i class="fa-regular fa-star" style="font-size:24px; margin-bottom:8px; display:block; color:var(--text-muted);"></i>
          No hay eventos especiales programados para este mes.
        </p>
      `;
      return;
    }

    // Ordenar cronológicamente por fecha y hora
    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    const isStaff = currentUser.role === 'admin' || currentUser.role === 'slider' || currentUser.role === 'lider';

    let html = `
      <table class="agenda-matrix-table">
        <thead>
          <tr>
            <th>Evento Especial</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Estado / Personal</th>
            <th class="actions-col">Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const ev of events) {
      // Obtener el personal anotado para este evento especial
      const signups = await getServiceSignups(ev.date, ev.time);
      const isUserSignedUp = signups.some(s => s.userAlias === currentUser.alias);
      
      const parsedDate = new Date(ev.date + 'T00:00:00');
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const formattedDateLabel = `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} ${monthNames[parsedDate.getMonth()]}`;

      // Determinar si ya pasó el evento
      parsedDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      const isPast = parsedDate < today;

      let actionBtn = '';
      if (isPast) {
        actionBtn = `<span style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Cerrado</span>`;
      } else {
        actionBtn = `
          <button class="btn btn-outline btn-xs btn-reserve-special" data-date="${ev.date}" data-time="${ev.time}" data-name="${ev.name}" style="${isUserSignedUp ? 'border-color:var(--color-cyan); color:white;' : ''}">
            <i class="fa-regular fa-calendar-check"></i> ${isUserSignedUp ? 'Ver / Anotado' : 'Ver / Anotarse'}
          </button>
        `;
      }

      // Botón para eliminar (solo coordinadores)
      let deleteBtn = '';
      if (isStaff) {
        deleteBtn = `
          <button class="btn btn-danger btn-xs btn-delete-special" data-id="${ev.id}" title="Eliminar Evento Especial" style="margin-left: 6px; padding: 4px 6px;">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        `;
      }

      html += `
        <tr>
          <td><strong style="color:white; font-size:12px;">${ev.name}</strong></td>
          <td><span style="font-size:12px; color:var(--text-muted);">${formattedDateLabel}</span></td>
          <td><span style="font-size:12px; color:var(--text-muted);">${ev.time}</span></td>
          <td>
            <span class="badge ${signups.length > 0 ? 'badge-success' : 'badge-role'}" style="font-size:10px;">
              ${signups.length} Anotado${signups.length === 1 ? '' : 's'}
            </span>
          </td>
          <td>
            <div style="display:flex; align-items:center;">
              ${actionBtn}
              ${deleteBtn}
            </div>
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;

    DOM.specialEventsContainer.innerHTML = html;

    // Asociar eventos click a los botones de inscripción
    DOM.specialEventsContainer.querySelectorAll('.btn-reserve-special').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.getAttribute('data-date');
        const time = btn.getAttribute('data-time');
        const name = btn.getAttribute('data-name');
        
        const parsedDate = new Date(date + 'T00:00:00');
        const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const formattedDate = `${dayNames[parsedDate.getDay()]} ${parsedDate.getDate()} - Evento: ${name}`;
        
        openReserveModal(date, time, formattedDate);
      });
    });

    // Asociar eventos click a los botones de eliminar
    DOM.specialEventsContainer.querySelectorAll('.btn-delete-special').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm("¿Estás seguro de que deseas eliminar este evento especial? Se perderán las reservas asociadas.")) {
          try {
            await deleteSpecialEvent(id, currentUser);
            alert("Evento especial eliminado con éxito.");
            renderCalendar();
            renderSpecialEvents();
            renderActiveAgenda();
          } catch (err) {
            alert("Error al eliminar evento especial: " + err.message);
          }
        }
      });
    });

  } catch (err) {
    console.error("Error al renderizar eventos especiales:", err);
    DOM.specialEventsContainer.innerHTML = '<p class="placeholder-text">Error al cargar eventos especiales.</p>';
  }
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
    const filterText = DOM.searchHistory.value.trim().toLowerCase();
    const filtered = progs.filter(p => 
      p.date.includes(filterText) || 
      p.time.toLowerCase().includes(filterText) ||
      (p.title && p.title.toLowerCase().includes(filterText))
    );
    
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
          <div class="program-card-info" style="display:flex; flex-direction:column; gap:2px;">
            <h4 style="font-size:12px; font-weight:600; color:white; margin:0 0 4px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.title || 'Servicio Técnico'}">${p.title || 'Servicio Técnico'}</h4>
            <span class="prog-date" style="font-size:10px; color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${p.date}</span>
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
    
    // Filtrar al Administrador Supremo del directorio de miembros del servicio
    let filtered = list.filter(u => u.role !== 'admin');

    if (filtered.length === 0) {
      DOM.teamTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-text" style="text-align:center;">No se encontraron usuarios.</td></tr>';
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
              alert(`Usuario @${alias} eliminado del sistema.`);
              addAuditLog("warning", `Eliminado el usuario @${alias} del sistema.`);
              renderTeamDirectory();
              renderDashboardHome();
            } catch (err) {
              alert("Error al eliminar usuario: " + err.message);
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
// VISOR DE ARCHIVOS INTEGRADO (MODAL PREVIEW)
// ==========================================================================
function openFileViewer(progObj) {
  DOM.viewerModalTitle.textContent = `${progObj.title || "Programación"} - ${progObj.date} (Servicio ${progObj.time})`;
  
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

// Renderiza el reproductor de YouTube Live y las últimas 3 publicaciones
async function renderYouTubeLive() {
  const iframe = document.getElementById('main-live-iframe');
  const recentGrid = document.getElementById('youtube-recent-grid');
  
  if (!iframe || !recentGrid) return;
  
  // Si no tiene src configurado (primera carga), poner el en vivo por defecto
  if (!iframe.src || iframe.src === window.location.href) {
    iframe.src = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`;
  }
  
  recentGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 20px;">
      <div class="loading-spinner"></div>
    </div>
  `;
  
  try {
    const feedUrl = encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
    const data = await res.json();
    
    if (data.status !== 'ok' || !data.items || data.items.length === 0) {
      recentGrid.innerHTML = '<p class="placeholder-text" style="grid-column: 1/-1;">No se pudieron cargar las transmisiones anteriores.</p>';
      return;
    }
    
    const items = data.items.slice(0, 3);
    
    recentGrid.innerHTML = items.map(item => {
      const videoId = item.link.split('v=')[1];
      const pubDate = new Date(item.pubDate);
      const formattedDate = `${pubDate.getDate()}/${pubDate.getMonth() + 1}/${pubDate.getFullYear()}`;
      
      return `
        <div class="program-card glass-panel btn-play-recorded" data-id="${videoId}" data-title="${item.title.replace(/"/g, '&quot;')}" style="padding: 10px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer;">
          <div>
            <div style="aspect-ratio: 16/9; background: #000; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.05);">
              <img src="${item.thumbnail}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
              <span class="badge badge-role" style="position: absolute; bottom: 5px; right: 5px; font-size: 8px; background: rgba(0,0,0,0.6);">Grabado</span>
            </div>
            <h5 style="color: white; font-size: 12px; font-weight: 500; margin: 8px 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 32px; line-height: 1.3;" title="${item.title}">${item.title}</h5>
            <span style="font-size: 10px; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');
    
    // Asignar click a las tarjetas de reproducir
    recentGrid.querySelectorAll('.btn-play-recorded').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const title = card.getAttribute('data-title');
        
        // Configurar contenido del modal
        DOM.videoModalName.textContent = title;
        DOM.btnVideoGoYoutube.href = `https://www.youtube.com/watch?v=${id}`;
        
        // Manejar reproducción local
        DOM.btnVideoPlayHere.onclick = () => {
          DOM.videoPlayModal.classList.add('hidden');
          iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
          iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        
        // Mostrar el modal
        DOM.videoPlayModal.classList.remove('hidden');
      });
    });
    
  } catch (err) {
    console.error("Error al cargar videos de YouTube:", err);
    recentGrid.innerHTML = '<p class="placeholder-text" style="grid-column: 1/-1;">Error de conexión con YouTube.</p>';
  }
}
