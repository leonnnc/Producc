// Configuración de Firebase Firestore y Authentication.
// Rellena estos campos con las credenciales de tu proyecto de Firebase.
// Si se mantienen con los valores de marcador de posición (placeholder),
// el sistema cambiará de forma automática y transparente a modo LocalStorage (Base de datos local).

export const firebaseConfig = {
  apiKey: "AIzaSyA2NRJ7-Ih0xsQw4_iCcLo2YnUT3ZgHDOQ",
  authDomain: "produccion-web-35f4d.firebaseapp.com",
  projectId: "produccion-web-35f4d",
  storageBucket: "produccion-web-35f4d.firebasestorage.app",
  messagingSenderId: "281612290224",
  appId: "1:281612290224:web:8745efd35d0ecfddde9375"
};

/**
 * Verifica si las credenciales de Firebase son válidas y no son los marcadores de posición predeterminados.
 * @returns {boolean} True si Firebase está configurado correctamente, False en caso contrario.
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "TU_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "TU_PROJECT_ID"
  );
}
