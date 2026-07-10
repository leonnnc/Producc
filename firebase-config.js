// Configuración de Firebase Firestore y Authentication.
// Rellena estos campos con las credenciales de tu proyecto de Firebase.

export const firebaseConfig = {
  apiKey: "AIzaSyA2NRJ7-Ih0xsQw4_iCcLo2YnUT3ZgHDOQ",
  authDomain: "produccion-web-35f4d.firebaseapp.com",
  projectId: "produccion-web-35f4d",
  storageBucket: "produccion-web-35f4d.firebasestorage.app",
  messagingSenderId: "281612290224",
  appId: "1:281612290224:web:8745efd35d0ecfddde9375"
};

/**
 * Verifica si las credenciales de Firebase están configuradas.
 * @returns {boolean} True si Firebase está configurado correctamente.
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "TU_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "TU_PROJECT_ID"
  );
}
