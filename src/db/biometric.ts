/**
 * biometric.ts — Ingreso con huella / Face ID (WebAuthn) para este dispositivo.
 * Guarda las credenciales del usuario en este equipo, protegidas detrás de la
 * verificación biométrica del sistema (huella, rostro o PIN del teléfono).
 * Sirve tanto para Dueño como para Colaborador, así no hay que tipear la
 * licencia/usuario/contraseña cada vez.
 */

const KEY = 'quim_bio';

export interface BioCreds {
  codigo: string;
  usuario: string;
  password: string;
  role: 'admin' | 'colaborador';
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// ¿El dispositivo tiene autenticador biométrico (huella/rostro)?
export async function bioSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !(window as any).PublicKeyCredential) return false;
    return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
}

export function bioEnabled(): boolean {
  return !!localStorage.getItem(KEY);
}

export function bioDisable() {
  localStorage.removeItem(KEY);
}

// Registra la huella en este equipo y guarda las credenciales (contraseña ofuscada).
export async function bioEnable(creds: BioCreds): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred: any = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Productos Químicos' },
      user: { id: userId, name: creds.usuario || 'usuario', displayName: creds.usuario || 'Usuario' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    },
  });
  if (!cred) throw new Error('No se pudo registrar la huella');
  localStorage.setItem(KEY, JSON.stringify({
    credId: toB64(cred.rawId),
    creds: { ...creds, password: btoa(creds.password || '') },
  }));
  return true;
}

// Pide la huella y, si valida, devuelve las credenciales guardadas.
export async function bioLogin(): Promise<BioCreds | null> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion: any = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: fromB64(data.credId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!assertion) return null;
  return { ...data.creds, password: atob(data.creds.password || '') };
}
