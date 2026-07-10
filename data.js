import { firebaseConfig } from './firebase-config.js';

// Variables para Firebase
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

const DEFAULT_USERS = [
  {
    alias: "admin",
    name: "Administrador Supremo",
    email: "admin@produccion.com",
    phone: "+51 987654321",
    district: "Lima Centro",
    area: "Otros",
    role: "admin",
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

// Cargar Firebase dinámicamente desde CDN
export const dbPromise = (async () => {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const { getFirestore, collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, addDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

    firebaseApp = initializeApp(firebaseConfig);
    firebaseDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    
    // Intentar sincronizar datos por defecto si la base de datos de Firebase está vacía
    const usersCol = collection(firebaseDb, "users");
    const usersSnapshot = await getDocs(usersCol);
    
    if (usersSnapshot.empty) {
      console.log("🔥 Inicializando Firebase con datos semilla...");
      for (const u of DEFAULT_USERS) {
        await setDoc(doc(firebaseDb, "users", u.alias), u);
      }
      const annCol = collection(firebaseDb, "announcements");
      for (const a of DEFAULT_ANNOUNCEMENTS) {
        await setDoc(doc(firebaseDb, "announcements", a.id), a);
      }
    }
    
    return { firebaseDb, firebaseAuth, firestore: { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, addDoc } };
  } catch (err) {
    console.error("❌ Error fatal al inicializar Firebase:", err);
    throw err;
  }
})();

// --- API DE DATOS UNIFICADA (Firebase Directo) ---

/**
 * Autentica a un usuario por Alias/Correo y Contraseña.
 * @param {string} usernameOrEmail Alias o correo electrónico del usuario.
 * @param {string} password Contraseña en texto plano.
 * @returns {Promise<Object>} Datos del usuario autenticado.
 */
export async function loginUser(usernameOrEmail, password) {
  const fb = await dbPromise;
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
  
  // LIMPIEZA AUTOMÁTICA SILENCIOSA DE USUARIOS ANTIGUOS EXCEPTO EL ADMIN
  // Se ejecuta una sola vez por sesión del Admin para evitar problemas de permisos durante el arranque
  if (userData.role === "admin" && !sessionStorage.getItem("admin_firestore_cleaned")) {
    setTimeout(async () => {
      try {
        const allDocs = await fb.firestore.getDocs(usersRef);
        for (const userDoc of allDocs.docs) {
          if (userDoc.id !== "admin") {
            await fb.firestore.deleteDoc(userDoc.ref);
            console.log(`🔥 Limpieza: Borrado usuario antiguo de Firestore: ${userDoc.id}`);
          }
        }
        sessionStorage.setItem("admin_firestore_cleaned", "true");
      } catch (err) {
        console.warn("⚠️ No se pudo realizar la limpieza de Firestore:", err.message);
      }
    }, 500);
  }
  
  return userData;
}

/**
 * Registra un nuevo usuario directamente activo.
 * @param {Object} userData Datos del registro del usuario.
 */
export async function registerUser(userData) {
  const newUser = {
    ...userData,
    role: "siervo" // Por defecto es Siervo hasta que el Admin/SLíder lo modifique
  };

  const fb = await dbPromise;
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
}

/**
 * Obtiene la lista de usuarios del sistema, aplicando las reglas estrictas de visibilidad del Admin.
 * Regla: El Admin es 100% invisible para todos los demás roles (incluyendo S-Líderes).
 * @param {Object} currentUser El usuario activo que realiza la consulta.
 * @returns {Promise<Array>} Lista de usuarios visibles para el rol correspondiente.
 */
export async function getUsers(currentUser) {
  const fb = await dbPromise;
  const usersCol = fb.firestore.collection(fb.firebaseDb, "users");
  const snapshot = await fb.firestore.getDocs(usersCol);
  const allUsers = snapshot.docs.map(doc => doc.data());

  // REGLAS DE VISIBILIDAD ESTRICTAS
  if (currentUser.role === "admin") {
    return allUsers;
  }
  if (currentUser.role === "slider") {
    return allUsers.filter(u => u.role !== "admin");
  }
  return allUsers.filter(u => u.role !== "admin" && u.area === currentUser.area);
}

/**
 * Cambia el rol de un usuario.
 * @param {string} alias Alias del usuario a modificar.
 * @param {string} newRole Nuevo rol asignado.
 * @param {Object} currentUser Usuario que realiza el cambio.
 */
export async function updateUserRole(alias, newRole, currentUser) {
  if (currentUser.role !== "admin" && currentUser.role !== "slider") {
    throw new Error("No tienes permisos suficientes para cambiar roles.");
  }

  const fb = await dbPromise;
  const userRef = fb.firestore.doc(fb.firebaseDb, "users", alias);
  const userSnap = await fb.firestore.getDoc(userRef);
  if (userSnap.exists()) {
    const targetData = userSnap.data();
    if (targetData.role === "admin" && currentUser.role !== "admin") {
      throw new Error("No puedes modificar a un Administrador.");
    }
    await fb.firestore.updateDoc(userRef, { role: newRole });
  }
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

  const fb = await dbPromise;
  const userRef = fb.firestore.doc(fb.firebaseDb, "users", alias);
  const userSnap = await fb.firestore.getDoc(userRef);
  if (userSnap.exists()) {
    const targetData = userSnap.data();
    if (targetData.role === "admin" && currentUser.role !== "admin") {
      throw new Error("No puedes eliminar a un Administrador.");
    }
    await fb.firestore.deleteDoc(userRef);
  }
}

// --- PROGRAMACIONES DE SERVICIOS (ARCHIVOS JPG/PDF) ---

/**
 * Obtiene todas las programaciones registradas en el sistema.
 * @returns {Promise<Array>} Lista de programaciones.
 */
export async function getProgramSheets() {
  const fb = await dbPromise;
  const progCol = fb.firestore.collection(fb.firebaseDb, "programming");
  const snap = await fb.firestore.getDocs(progCol);
  return snap.docs.map(doc => doc.data());
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

  const fb = await dbPromise;
  const docRef = fb.firestore.doc(fb.firebaseDb, "programming", id);
  await fb.firestore.setDoc(docRef, newProg);
  return newProg;
}

/**
 * Obtiene la programación actualmente activa (la más inminente o en curso).
 * @returns {Promise<Object|null>} Programación activa o null.
 */
export async function getActiveProgramSheet() {
  const allProgs = await getProgramSheets();
  if (allProgs.length === 0) return null;

  const now = new Date();
  
  const parseServiceDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return new Date(year, month - 1, day, hours, minutes);
  };

  const activeCandidates = allProgs.filter(p => {
    const serviceDate = parseServiceDateTime(p.date, p.time);
    const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000); // Duración de 2 horas
    return serviceEndDate >= now;
  });

  if (activeCandidates.length === 0) return null;

  activeCandidates.sort((a, b) => {
    const dateA = parseServiceDateTime(a.date, a.time);
    const dateB = parseServiceDateTime(b.date, b.time);
    return dateA - dateB;
  });

  return activeCandidates[0];
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

  const history = allProgs.filter(p => {
    const serviceDate = parseServiceDateTime(p.date, p.time);
    const serviceEndDate = new Date(serviceDate.getTime() + 2 * 60 * 60 * 1000);
    return serviceEndDate < now;
  });

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
  const fb = await dbPromise;
  const annCol = fb.firestore.collection(fb.firebaseDb, "announcements");
  const snap = await fb.firestore.getDocs(annCol);
  const list = snap.docs.map(doc => doc.data());
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

  const fb = await dbPromise;
  const docRef = fb.firestore.doc(fb.firebaseDb, "announcements", id);
  await fb.firestore.setDoc(docRef, newAnn);
  return newAnn;
}

// --- AUTENTICACIÓN CON GOOGLE ---

/**
 * Autentica a un usuario utilizando Google Sign-In directo a Firebase.
 * @returns {Promise<Object>} Datos del usuario autenticado.
 */
export async function loginUserWithGoogle() {
  const fb = await dbPromise;
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
      password: "google_authenticated"
    };
    
    await fb.firestore.setDoc(fb.firestore.doc(fb.firebaseDb, "users", alias), newGoogleUser);
    return newGoogleUser;
  }
  
  const userData = querySnapshot.docs[0].data();
  return userData;
}

// --- AGENDA / INSCRIPCIONES A SERVICIOS ---

/**
 * Obtiene el listado de miembros anotados en un servicio específico (Fecha y Hora).
 * @param {string} date Fecha del servicio.
 * @param {string} time Hora del servicio.
 * @returns {Promise<Array>} Listado de asignaciones.
 */
export async function getServiceSignups(date, time) {
  const fb = await dbPromise;
  const agendaRef = fb.firestore.collection(fb.firebaseDb, "agenda");
  const q = fb.firestore.query(agendaRef, fb.firestore.where("date", "==", date), fb.firestore.where("time", "==", time));
  const querySnapshot = await fb.firestore.getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
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

  const fb = await dbPromise;
  const docRef = fb.firestore.doc(fb.firebaseDb, "agenda", entryId);
  await fb.firestore.setDoc(docRef, entry);
}

/**
 * Cancela la anotación de un miembro en un servicio.
 * @param {string} date Fecha del servicio.
 * @param {string} time Hora del servicio.
 * @param {string} userAlias Alias del usuario que cancela.
 */
export async function cancelSignupForService(date, time, userAlias) {
  const entryId = `${date}_${time.replace(/[:\s]/g, '-')}_${userAlias}`;

  const fb = await dbPromise;
  const docRef = fb.firestore.doc(fb.firebaseDb, "agenda", entryId);
  await fb.firestore.deleteDoc(docRef);
}
