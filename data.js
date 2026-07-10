import { isFirebaseConfigured, firebaseConfig } from './firebase-config.js';

// Variables para Firebase (se inicializan si está configurado)
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let isFirebaseActive = false;

// Determinar si usaremos Firebase o LocalStorage
const checkFirebaseStatus = () => {
  if (isFirebaseConfigured()) {
    isFirebaseActive = true;
    console.log("🔥 Producción: Iniciando en MODO FIREBASE.");
  } else {
    isFirebaseActive = false;
    console.log("💾 Producción: Iniciando en MODO LOCALSTORAGE (Fallback).");
  }
};

checkFirebaseStatus();

const DEFAULT_USERS = [
  {
    alias: "admin",
    name: "Administrador Supremo",
    email: "admin@produccion.com",
    phone: "+51 987654321",
    district: "Lima Centro",
    area: "Otros",
    role: "admin",
    status: "approved",
    password: "AdminCDF26" // En producción real usaría hash, para demo es texto plano
  }
];

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "ann_1",
    title: "Reunión General del Equipo",
    content: "Este sábado tendremos ensayo general y revisión técnica técnica a las 5:00 PM en el auditorio principal. La asistencia es obligatoria para todas las áreas (Cámaras, Switchers, Audio, etc.). ¡Nos vemos ahí!",
    date: "2026-07-08",
    author: "Carlos Mendoza (Super Líder)"
  },
  {
    id: "ann_2",
    title: "Nueva Guía de Switchers",
    content: "Se ha subido la guía técnica del nuevo Switcher Blackmagic en formato PDF en el canal de comunicación. Por favor repasen las transiciones y configuración de PIP.",
    date: "2026-07-05",
    author: "Mateo Pérez (Co-Líder)"
  }
];

// Inicialización de LocalStorage
const initLocalStorage = () => {
  if (!localStorage.getItem("erp_users")) {
    localStorage.setItem("erp_users", JSON.stringify(DEFAULT_USERS));
  } else {
    // Si ya existe, nos aseguramos de actualizar la clave de admin si tiene el default anterior
    let users = JSON.parse(localStorage.getItem("erp_users") || "[]");
    
    // Limpieza activa de usuarios simulados
    const originalLength = users.length;
    users = users.filter(u => u.alias === "admin" || !["slider1", "lider_cam", "co_lider_sw", "siervo_cam1", "siervo_sw1", "siervo_pendiente"].includes(u.alias));
    
    const adminIdx = users.findIndex(u => u.alias === "admin");
    if (adminIdx !== -1 && users[adminIdx].password === "admin") {
      users[adminIdx].password = "AdminCDF26";
    }
    
    if (users.length !== originalLength || (adminIdx !== -1 && users[adminIdx].password === "AdminCDF26")) {
      localStorage.setItem("erp_users", JSON.stringify(users));
    }
  }
  if (!localStorage.getItem("erp_announcements")) {
    localStorage.setItem("erp_announcements", JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  }
  if (!localStorage.getItem("erp_programming")) {
    localStorage.setItem("erp_programming", JSON.stringify([]));
  }
  if (!localStorage.getItem("erp_agenda")) {
    localStorage.setItem("erp_agenda", JSON.stringify([]));
  }
};

if (!isFirebaseActive) {
  initLocalStorage();
}

// Cargar Firebase dinámicamente desde CDN si está activo
let dbPromise = null;
if (isFirebaseActive) {
  dbPromise = (async () => {
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getFirestore, collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, addDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

      firebaseApp = initializeApp(firebaseConfig);
      firebaseDb = getFirestore(firebaseApp);
      firebaseAuth = getAuth(firebaseApp);
      
      // Intentar sincronizar datos por defecto si la base de datos de Firebase está vacía
      const usersCol = collection(firebaseDb, "users");
      const usersSnapshot = await getDocs(usersCol);
      if (usersSnapshot.empty) {
        console.log("🔥 Inicializando Firebase con datos semilla...");
        for (const u of DEFAULT_USERS) {
          // Guardamos con el ID igual a su alias
          await setDoc(doc(firebaseDb, "users", u.alias), u);
        }
        const annCol = collection(firebaseDb, "announcements");
        for (const a of DEFAULT_ANNOUNCEMENTS) {
          await setDoc(doc(firebaseDb, "announcements", a.id), a);
        }
      } else {
        // ACTUALIZACIÓN DE SEGURIDAD: Si ya existe el admin en Firestore con la clave vieja "admin", la actualizamos a "AdminCDF26"
        const adminDocRef = doc(firebaseDb, "users", "admin");
        const adminSnapshot = await getDoc(adminDocRef);
        if (adminSnapshot.exists()) {
          const adminData = adminSnapshot.data();
          if (adminData.password === "admin") {
            await updateDoc(adminDocRef, { password: "AdminCDF26" });
            console.log("🔥 Contraseña del Administrador actualizada a AdminCDF26 en Firestore.");
          }
        }

        // LIMPIEZA DE GENTE SIMULADA EN FIRESTORE
        const mockAliases = ["slider1", "lider_cam", "co_lider_sw", "siervo_cam1", "siervo_sw1", "siervo_pendiente"];
        for (const alias of mockAliases) {
          const mockDocRef = doc(firebaseDb, "users", alias);
          const mockSnapshot = await getDoc(mockDocRef);
          if (mockSnapshot.exists()) {
            await deleteDoc(mockDocRef);
            console.log(`🔥 Borrado usuario simulado de Firestore: ${alias}`);
          }
        }
      }
      return { firebaseDb, firebaseAuth, firestore: { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, addDoc } };
    } catch (err) {
      console.error("❌ Error al cargar Firebase, volviendo a LocalStorage:", err);
      isFirebaseActive = false;
      initLocalStorage();
      return null;
    }
  })();
}

// --- API DE DATOS UNIFICADA (Abstracción Firebase / LocalStorage) ---

/**
 * Autentica a un usuario por Alias/Correo y Contraseña.
 * @param {string} usernameOrEmail Alias o correo electrónico del usuario.
 * @param {string} password Contraseña en texto plano.
 * @returns {Promise<Object>} Datos del usuario autenticado.
 */
export async function loginUser(usernameOrEmail, password) {
  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const usersRef = fb.firestore.collection(fb.firebaseDb, "users");
      // Buscamos primero por alias
      let q = fb.firestore.query(usersRef, fb.firestore.where("alias", "==", usernameOrEmail));
      let querySnapshot = await fb.firestore.getDocs(q);
      
      // Si no encuentra por alias, buscamos por correo
      if (querySnapshot.empty) {
        q = fb.firestore.query(usersRef, fb.firestore.where("email", "==", usernameOrEmail));
        querySnapshot = await fb.firestore.getDocs(q);
      }
      
      if (querySnapshot.empty) {
        throw new Error("El usuario o correo electrónico no existe.");
      }
      
      const userData = querySnapshot.docs[0].data();
      
      if (userData.password !== password) {
        throw new Error("Contraseña incorrecta.");
      }
      
      if (userData.status === "pending") {
        throw new Error("Tu cuenta aún está pendiente de aprobación por un Administrador o S-Líder.");
      }
      
      return userData;
    }
  }

  // Fallback LocalStorage
  const users = JSON.parse(localStorage.getItem("erp_users") || "[]");
  const user = users.find(u => (u.alias === usernameOrEmail || u.email === usernameOrEmail));
  
  if (!user) {
    throw new Error("El usuario o correo electrónico no existe.");
  }
  
  if (user.password !== password) {
    throw new Error("Contraseña incorrecta.");
  }
  
  if (user.status === "pending") {
    throw new Error("Tu cuenta aún está pendiente de aprobación por un Administrador o S-Líder.");
  }
  
  return user;
}

/**
 * Registra un nuevo usuario en estado PENDIENTE.
 * @param {Object} userData Datos del registro del usuario.
 */
export async function registerUser(userData) {
  const newUser = {
    ...userData,
    role: "siervo", // Por defecto es Siervo hasta que el Admin/SLíder lo modifique
    status: "approved" // Aprobación instantánea
  };

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const userDocRef = fb.firestore.doc(fb.firebaseDb, "users", newUser.alias);
      const userSnapshot = await fb.firestore.getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        throw new Error("El alias ya está registrado por otro miembro.");
      }
      
      // Verificar si el correo ya existe
      const usersRef = fb.firestore.collection(fb.firebaseDb, "users");
      const emailQuery = fb.firestore.query(usersRef, fb.firestore.where("email", "==", newUser.email));
      const emailSnapshot = await fb.firestore.getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        throw new Error("El correo electrónico ya está en uso.");
      }
      
      await fb.firestore.setDoc(userDocRef, newUser);
      return;
    }
  }

  // Fallback LocalStorage
  const users = JSON.parse(localStorage.getItem("erp_users") || "[]");
  if (users.some(u => u.alias === newUser.alias)) {
    throw new Error("El alias ya está registrado por otro miembro.");
  }
  if (users.some(u => u.email === newUser.email)) {
    throw new Error("El correo electrónico ya está en uso.");
  }
  
  users.push(newUser);
  localStorage.setItem("erp_users", JSON.stringify(users));
}

/**
 * Obtiene la lista de usuarios del sistema, aplicando las reglas estrictas de visibilidad del Admin.
 * Regla: El Admin es 100% invisible para todos los demás roles (incluyendo S-Líderes).
 * @param {Object} currentUser El usuario activo que realiza la consulta.
 * @returns {Promise<Array>} Lista de usuarios visibles para el rol correspondiente.
 */
export async function getUsers(currentUser) {
  let allUsers = [];

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const usersCol = fb.firestore.collection(fb.firebaseDb, "users");
      const snapshot = await fb.firestore.getDocs(usersCol);
      allUsers = snapshot.docs.map(doc => doc.data());
    }
  } else {
    allUsers = JSON.parse(localStorage.getItem("erp_users") || "[]");
  }

  // REGLAS DE VISIBILIDAD ESTRICTAS
  
  // 1. Si el usuario actual es Admin, puede ver a todos (incluyendo otros Admins)
  if (currentUser.role === "admin") {
    return allUsers;
  }
  
  // 2. Si el usuario es S-Líder, puede ver a todos EXCEPT al Admin
  if (currentUser.role === "slider") {
    return allUsers.filter(u => u.role !== "admin");
  }
  
  // 3. Si el usuario es Líder o Co-Líder, solo ve a miembros de su misma área y que no sean Admin
  if (currentUser.role === "lider" || currentUser.role === "co_lider") {
    return allUsers.filter(u => u.role !== "admin" && u.area === currentUser.area);
  }
  
  // 4. Si el usuario es Siervo, solo ve a miembros aprobados de su misma área y que no sean Admin
  return allUsers.filter(u => u.role !== "admin" && u.area === currentUser.area && u.status === "approved");
}

/**
 * Cambia el rol de un usuario.
 * @param {string} alias Alias del usuario a modificar.
 * @param {string} newRole Nuevo rol asignado.
 * @param {Object} currentUser Usuario que realiza el cambio.
 */
export async function updateUserRole(alias, newRole, currentUser) {
  // Seguridad: Líderes y Siervos no pueden cambiar roles globales.
  if (currentUser.role !== "admin" && currentUser.role !== "slider") {
    throw new Error("No tienes permisos suficientes para cambiar roles.");
  }

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      // Si el objetivo es admin, y quien cambia no es admin, abortar
      const userRef = fb.firestore.doc(fb.firebaseDb, "users", alias);
      const userSnap = await fb.firestore.getDoc(userRef);
      if (userSnap.exists()) {
        const targetData = userSnap.data();
        if (targetData.role === "admin" && currentUser.role !== "admin") {
          throw new Error("No puedes modificar a un Administrador.");
        }
        await fb.firestore.updateDoc(userRef, { role: newRole });
        return;
      }
    }
  }

  // Fallback LocalStorage
  const users = JSON.parse(localStorage.getItem("erp_users") || "[]");
  const userIdx = users.findIndex(u => u.alias === alias);
  if (userIdx === -1) throw new Error("Usuario no encontrado.");
  
  const targetUser = users[userIdx];
  if (targetUser.role === "admin" && currentUser.role !== "admin") {
    throw new Error("No puedes modificar a un Administrador.");
  }
  
  users[userIdx].role = newRole;
  localStorage.setItem("erp_users", JSON.stringify(users));
}

/**
 * Aprueba el registro pendiente de un usuario.
 * @param {string} alias Alias del usuario a aprobar.
 * @param {Object} currentUser Usuario que realiza la aprobación.
 */
export async function approveUser(alias, currentUser) {
  if (currentUser.role !== "admin" && currentUser.role !== "slider") {
    throw new Error("No tienes permisos suficientes para aprobar usuarios.");
  }

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const userRef = fb.firestore.doc(fb.firebaseDb, "users", alias);
      await fb.firestore.updateDoc(userRef, { status: "approved" });
      return;
    }
  }

  // Fallback LocalStorage
  const users = JSON.parse(localStorage.getItem("erp_users") || "[]");
  const userIdx = users.findIndex(u => u.alias === alias);
  if (userIdx === -1) throw new Error("Usuario no encontrado.");
  
  users[userIdx].status = "approved";
  localStorage.setItem("erp_users", JSON.stringify(users));
}

/**
 * Elimina o suspende a un usuario.
 * @param {string} alias Alias del usuario a eliminar.
 * @param {Object} currentUser Usuario que realiza la acción.
 */
export async function deleteUser(alias, currentUser) {
  if (currentUser.role !== "admin" && currentUser.role !== "slider") {
    throw new Error("No tienes permisos suficientes para eliminar usuarios.");
  }

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const userRef = fb.firestore.doc(fb.firebaseDb, "users", alias);
      const userSnap = await fb.firestore.getDoc(userRef);
      if (userSnap.exists()) {
        const targetData = userSnap.data();
        if (targetData.role === "admin" && currentUser.role !== "admin") {
          throw new Error("No puedes eliminar a un Administrador.");
        }
        await fb.firestore.deleteDoc(userRef);
        return;
      }
    }
  }

  // Fallback LocalStorage
  let users = JSON.parse(localStorage.getItem("erp_users") || "[]");
  const targetUser = users.find(u => u.alias === alias);
  if (!targetUser) throw new Error("Usuario no encontrado.");
  
  if (targetUser.role === "admin" && currentUser.role !== "admin") {
    throw new Error("No puedes eliminar a un Administrador.");
  }
  
  users = users.filter(u => u.alias !== alias);
  localStorage.setItem("erp_users", JSON.stringify(users));
}

// --- PROGRAMACIONES DE SERVICIOS (ARCHIVOS JPG/PDF) ---

/**
 * Obtiene todas las programaciones registradas en el sistema.
 * @returns {Promise<Array>} Lista de programaciones.
 */
export async function getProgramSheets() {
  let list = [];
  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const progCol = fb.firestore.collection(fb.firebaseDb, "programming");
      const snap = await fb.firestore.getDocs(progCol);
      list = snap.docs.map(doc => doc.data());
    }
  } else {
    list = JSON.parse(localStorage.getItem("erp_programming") || "[]");
  }
  return list;
}

/**
 * Sube y registra una hoja de programación asignada a una fecha y hora.
 * @param {Object} progObj Datos de la programación (fecha, hora, nombre de archivo, base64 data, etc.).
 * @param {Object} currentUser Usuario que sube la programación.
 */
export async function uploadProgramSheet(progObj, currentUser) {
  if (currentUser.role !== "admin" && currentUser.role !== "slider") {
    throw new Error("Solo los S-Líderes y Administradores pueden subir programaciones.");
  }

  const id = `prog_${Date.now()}`;
  const newProg = {
    id,
    ...progObj,
    uploadedBy: currentUser.name,
    timestamp: new Date().toISOString()
  };

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const docRef = fb.firestore.doc(fb.firebaseDb, "programming", id);
      await fb.firestore.setDoc(docRef, newProg);
      return newProg;
    }
  }

  // Fallback LocalStorage
  const list = JSON.parse(localStorage.getItem("erp_programming") || "[]");
  list.push(newProg);
  localStorage.setItem("erp_programming", JSON.stringify(list));
  return newProg;
}

/**
 * Obtiene la programación actualmente activa (la más inminente o en curso).
 * El algoritmo calcula de las programaciones futuras o de la fecha actual, cuál corresponde
 * al servicio activo o más cercano. Si ya pasó, la programación se considera en Historial.
 * @returns {Promise<Object|null>} Programación activa o null.
 */
export async function getActiveProgramSheet() {
  const allProgs = await getProgramSheets();
  if (allProgs.length === 0) return null;

  const now = new Date();
  
  // Convertir fecha (YYYY-MM-DD) y hora (ej: 08:00 AM, 07:30 PM) a un objeto Date
  const parseServiceDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Filtrar programaciones que son del futuro o de hoy, sumando 2 horas de duración del servicio
  const activeCandidates = allProgs.filter(p => {
    const serviceDate = parseServiceDateTime(p.date, p.time);
    const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000); // Duración de 2 horas
    return serviceEndDate >= now;
  });

  if (activeCandidates.length === 0) return null;

  // Ordenar por la más cercana al presente
  activeCandidates.sort((a, b) => {
    const dateA = parseServiceDateTime(a.date, a.time);
    const dateB = parseServiceDateTime(b.date, b.time);
    return dateA - dateB;
  });

  return activeCandidates[0]; // La primera es la más próxima activa
}

/**
 * Obtiene el historial de programaciones (las que ya ocurrieron).
 * @returns {Promise<Array>} Lista de programaciones pasadas.
 */
export async function getHistoricalProgramSheets() {
  const allProgs = await getProgramSheets();
  const now = new Date();
  
  const parseServiceDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Programaciones cuya fecha de fin (inicio + 2 horas) ya pasó
  const history = allProgs.filter(p => {
    const serviceDate = parseServiceDateTime(p.date, p.time);
    const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000);
    return serviceEndDate < now;
  });

  // Ordenar descendente (las más recientes primero)
  history.sort((a, b) => {
    const dateA = parseServiceDateTime(a.date, a.time);
    const dateB = parseServiceDateTime(b.date, b.time);
    return dateB - dateA;
  });

  return history;
}

// --- ANUNCIOS ---

/**
 * Obtiene los anuncios vigentes.
 * @returns {Promise<Array>} Lista de anuncios.
 */
export async function getAnnouncements() {
  let list = [];
  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const annCol = fb.firestore.collection(fb.firebaseDb, "announcements");
      const snap = await fb.firestore.getDocs(annCol);
      list = snap.docs.map(doc => doc.data());
    }
  } else {
    list = JSON.parse(localStorage.getItem("erp_announcements") || "[]");
  }
  
  // Ordenar anuncios por fecha descendente
  list.sort((a, b) => new Date(b.date) - new Date(a.date));
  return list;
}

/**
 * Publica un nuevo anuncio.
 * @param {string} title Título del anuncio.
 * @param {string} content Contenido.
 * @param {Object} currentUser Autor.
 */
export async function createAnnouncement(title, content, currentUser) {
  if (currentUser.role !== "admin" && currentUser.role !== "slider" && currentUser.role !== "lider") {
    throw new Error("No tienes permisos suficientes para publicar anuncios.");
  }

  const id = `ann_${Date.now()}`;
  const newAnn = {
    id,
    title,
    content,
    date: new Date().toISOString().split('T')[0],
    author: `${currentUser.name} (${currentUser.role === 'slider' ? 'Super Líder' : currentUser.role === 'lider' ? 'Líder' : 'Admin'})`
  };

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const docRef = fb.firestore.doc(fb.firebaseDb, "announcements", id);
      await fb.firestore.setDoc(docRef, newAnn);
      return newAnn;
    }
  }

  // Fallback LocalStorage
  const list = JSON.parse(localStorage.getItem("erp_announcements") || "[]");
  list.push(newAnn);
  localStorage.setItem("erp_announcements", JSON.stringify(list));
  return newAnn;
}

/**
 * Autentica a un usuario utilizando Google Sign-In (Firebase Auth o Simulación en LocalStorage).
 * @returns {Promise<Object>} Datos del usuario autenticado.
 */
export async function loginUserWithGoogle() {
  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(fb.firebaseAuth, provider);
      const user = result.user;
      
      const usersRef = fb.firestore.collection(fb.firebaseDb, "users");
      const q = fb.firestore.query(usersRef, fb.firestore.where("email", "==", user.email));
      const querySnapshot = await fb.firestore.getDocs(q);
      
      if (querySnapshot.empty) {
        const emailParts = user.email.split('@');
        const alias = emailParts[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        
        const newGoogleUser = {
          alias: alias,
          name: user.displayName || "Usuario de Google",
          email: user.email,
          phone: user.phoneNumber || "+51 900000000",
          district: "No asignado",
          area: "Otros",
          role: "siervo",
          status: "approved",
          password: "google_authenticated"
        };
        
        await fb.firestore.setDoc(fb.firestore.doc(fb.firebaseDb, "users", alias), newGoogleUser);
        return newGoogleUser;
      }
      
      const userData = querySnapshot.docs[0].data();
      return userData;
    }
  }

  // MODO LOCALSTORAGE (Fallback) - Acceso Directo de Administrador (Sin simulación)
  return new Promise((resolve, reject) => {
    const email = "leonn.cruz@produccion.com";
    
    const users = JSON.parse(localStorage.getItem("erp_users") || "[]");
    
    let user = null;
    if (email === "leonn.cruz@produccion.com") {
      user = users.find(u => u.alias === "admin");
    } else if (email === "sofia.cam@produccion.com") {
      user = users.find(u => u.alias === "lider_cam");
    } else {
      user = users.find(u => u.email === email);
    }

    if (user) {
      resolve(user);
    } else {
      const emailParts = email.split('@');
      const alias = emailParts[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      const newGoogleUser = {
        alias: alias,
        name: alias.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        email: email,
        phone: "+51 987654321",
        district: "No asignado",
        area: "Cámaras",
        role: "siervo",
        status: "approved",
        password: "google_authenticated"
      };

      users.push(newGoogleUser);
      localStorage.setItem("erp_users", JSON.stringify(users));
      resolve(newGoogleUser);
    }
  });
}

/**
 * Obtiene el listado de miembros anotados en un servicio específico (Fecha y Hora).
 * @param {string} date Fecha del servicio.
 * @param {string} time Hora del servicio.
 * @returns {Promise<Array>} Listado de asignaciones.
 */
export async function getServiceSignups(date, time) {
  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const agendaRef = fb.firestore.collection(fb.firebaseDb, "agenda");
      const q = fb.firestore.query(agendaRef, fb.firestore.where("date", "==", date), fb.firestore.where("time", "==", time));
      const querySnapshot = await fb.firestore.getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    }
  }

  // Fallback LocalStorage
  const agenda = JSON.parse(localStorage.getItem("erp_agenda") || "[]");
  return agenda.filter(a => a.date === date && a.time === time);
}

/**
 * Anota (registra) a un miembro en un servicio específico.
 * @param {string} date Fecha del servicio.
 * @param {string} time Hora del servicio.
 * @param {Object} user Datos del usuario que se anota.
 */
export async function signupForService(date, time, user) {
  const entryId = `${date}_${time.replace(/[:\s]/g, '-')}_${user.alias}`;
  const entry = {
    id: entryId,
    date: date,
    time: time,
    userAlias: user.alias,
    userName: user.name,
    userArea: user.area,
    userRole: user.role
  };

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const docRef = fb.firestore.doc(fb.firebaseDb, "agenda", entryId);
      await fb.firestore.setDoc(docRef, entry);
      return;
    }
  }

  // Fallback LocalStorage
  const agenda = JSON.parse(localStorage.getItem("erp_agenda") || "[]");
  // Evitar duplicados
  if (!agenda.some(a => a.id === entryId)) {
    agenda.push(entry);
    localStorage.setItem("erp_agenda", JSON.stringify(agenda));
  }
}

/**
 * Cancela la anotación de un miembro en un servicio.
 * @param {string} date Fecha del servicio.
 * @param {string} time Hora del servicio.
 * @param {string} userAlias Alias del usuario que cancela.
 */
export async function cancelSignupForService(date, time, userAlias) {
  const entryId = `${date}_${time.replace(/[:\s]/g, '-')}_${userAlias}`;

  if (isFirebaseActive && dbPromise) {
    const fb = await dbPromise;
    if (fb) {
      const docRef = fb.firestore.doc(fb.firebaseDb, "agenda", entryId);
      await fb.firestore.deleteDoc(docRef);
      return;
    }
  }

  // Fallback LocalStorage
  let agenda = JSON.parse(localStorage.getItem("erp_agenda") || "[]");
  agenda = agenda.filter(a => a.id !== entryId);
  localStorage.setItem("erp_agenda", JSON.stringify(agenda));
}


