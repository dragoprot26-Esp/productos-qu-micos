/**
 * cloud.ts — Capa de nube (Supabase) para Productos Químicos.
 * Molde del ecosistema CyC: base compartida + Auth real + RLS por membresía.
 * Reutiliza validar_licencia / reclamar_tienda / tl_miembros y las funciones
 * propias de esta app (quim_*). Prefijo de licencia: QUIM-...
 */

export const SB_URL = 'https://pcxlhgdpxfuybzfsquem.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeGxoZ2RweGZ1eWJ6ZnNxdWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDIyOTQsImV4cCI6MjA5NjE3ODI5NH0.HJWpFO8TkRsmUx15GtSsUusjvVEhUsi5b_QGoPoPU00';

const SESS_KEY = 'quim_sb_sess';
const MAIL_DOM = '@tiendalibre.app';

export interface CloudData {
  tenant?: any;
  products?: any[];
  orders?: any[];
  clients?: any[];
  notifications?: any[];
  collaborators?: any[];
}

interface SbSession {
  access_token: string;
  refresh_token: string;
  user_id: string | null;
  expira: number;
}

// ── email / sesión ─────────────────────────────────────────────────────
export function emailDe(usuario: string, codigo: string): string {
  const base = ((usuario || '') + '.' + (codigo || '')).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return base + MAIL_DOM;
}
function sessGet(): SbSession | null {
  try { return JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) { return null; }
}
function sessSet(s: SbSession | null) {
  if (s) localStorage.setItem(SESS_KEY, JSON.stringify(s)); else localStorage.removeItem(SESS_KEY);
}
export function estaLogueado(): boolean { return !!sessGet(); }
export function authUserId(): string | null { const s = sessGet(); return s ? s.user_id : null; }

function guardarSesion(d: any): SbSession | null {
  if (!d || !d.access_token) return null;
  const s: SbSession = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || '',
    user_id: (d.user && d.user.id) || d.user_id || null,
    expira: Date.now() + ((d.expires_in || 3600) * 1000) - 60000,
  };
  sessSet(s);
  return s;
}

async function authPost(path: string, body: any) {
  const res = await fetch(SB_URL + path, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = { raw: txt }; }
  return { ok: res.ok, status: res.status, data };
}

async function signUp(email: string, password: string): Promise<SbSession | null> {
  const r = await authPost('/auth/v1/signup', { email, password });
  if (r.ok && r.data && r.data.access_token) return guardarSesion(r.data);
  return null;
}
async function signIn(email: string, password: string): Promise<SbSession | null> {
  const r = await authPost('/auth/v1/token?grant_type=password', { email, password });
  if (r.ok && r.data && r.data.access_token) return guardarSesion(r.data);
  return null;
}
async function refresh(): Promise<SbSession | null> {
  const s = sessGet(); if (!s || !s.refresh_token) return null;
  const r = await authPost('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token });
  if (r.ok && r.data && r.data.access_token) return guardarSesion(r.data);
  return null;
}
export async function authToken(): Promise<string | null> {
  const s = sessGet(); if (!s) return null;
  if (Date.now() < (s.expira || 0)) return s.access_token;
  const ns = await refresh();
  return ns ? ns.access_token : null;
}
export function signOut() { sessSet(null); }

export async function signOutGlobal() {
  try {
    const tok = await authToken();
    if (tok) {
      await fetch(`${SB_URL}/auth/v1/logout?scope=global`, {
        method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tok },
      });
    }
  } catch (e) { /* noop */ }
  signOut();
}

// ── RPC ─────────────────────────────────────────────────────────────────
async function rpc(fn: string, body: any, conAuth = true): Promise<any> {
  const tok = conAuth ? await authToken() : null;
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (tok || SB_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || ('rpc ' + fn + ' ' + res.status));
  try { return txt ? JSON.parse(txt) : null; } catch (e) { return txt; }
}

// ── Licencia ──────────────────────────────────────────────────────────
export async function validarLicencia(codigo: string): Promise<any | null> {
  try {
    const d = await rpc('validar_licencia', { p_codigo: codigo }, false);
    if (!d || typeof d !== 'object' || !d.codigo) return null;
    if (d.activa === false) return null;
    if (d.fecha_vencimiento && new Date(d.fecha_vencimiento) < new Date()) return null;
    return d;
  } catch (e) { return null; }
}

// ── Cuentas seguras ─────────────────────────────────────────────────────
export async function asegurarCuentaSeguraDueno(usuario: string, password: string, codigo: string) {
  if (!usuario || !password || !codigo) return { ok: false, msg: 'Faltan datos' };
  const email = emailDe(usuario, codigo);
  let sess = await signIn(email, password);
  if (!sess) {
    await signUp(email, password);
    sess = await signIn(email, password);
  }
  if (!sess) return { ok: false, msg: 'No se pudo crear la cuenta segura (la contraseña debe tener 6+ caracteres).' };
  try { await rpc('sincronizar_clave_dueno', { p_codigo: codigo, p_usuario: usuario, p_pass: password }, false); } catch (e) { /* noop */ }
  try { await rpc('reclamar_tienda', { p_codigo: codigo, p_usuario: usuario }); }
  catch (e: any) { return { ok: false, msg: 'Cuenta creada, pero no se pudo vincular: ' + (e.message || e) }; }
  return { ok: true };
}

export async function asegurarCuentaSeguraColab(usuario: string, password: string, codigo: string) {
  if (!usuario || !password || !codigo) return { ok: false, msg: 'Faltan datos' };
  const email = emailDe(usuario, codigo);
  let sess = await signIn(email, password);
  if (!sess) {
    let ok = false;
    try { ok = await rpc('quim_verificar_colab', { p_codigo: codigo, p_usuario: usuario, p_pass: password }, false); }
    catch (e) { ok = false; }
    if (!ok) return { ok: false, msg: 'Usuario o contraseña de colaborador incorrectos.' };
    await signUp(email, password);
    sess = await signIn(email, password);
  }
  if (!sess) return { ok: false, msg: 'No se pudo crear la cuenta del colaborador (clave de 6+).' };
  try { await rpc('quim_unir_colab', { p_codigo: codigo, p_usuario: usuario }); }
  catch (e: any) { return { ok: false, msg: 'No se pudo unir: ' + (e.message || e) }; }
  return { ok: true };
}

export async function miMembresia(): Promise<{ tenant_id: string; rol: string; usuario: string } | null> {
  const tok = await authToken(); if (!tok) return null;
  const uid = authUserId(); if (!uid) return null;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/tl_miembros?select=tenant_id,rol,usuario&user_id=eq.${uid}`,
      { cache: 'no-store', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tok } });
    const rows = r.ok ? await r.json() : [];
    return (rows && rows.length) ? rows[0] : null;
  } catch (e) { return null; }
}

// ── Sync de datos (tabla quim_backups, RLS por membresía) ───────────────
export async function cloudLoad(codigo: string): Promise<CloudData | null> {
  const bearer = (await authToken()) || SB_KEY;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/quim_backups?tenant_id=eq.${encodeURIComponent(codigo)}&select=datos&limit=1`,
      { cache: 'no-store', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + bearer } });
    if (!res.ok) return null;
    const rows = await res.json();
    return (rows && rows.length && rows[0].datos) ? rows[0].datos as CloudData : {};
  } catch (e) { return null; }
}

export async function cloudSave(codigo: string, datos: CloudData): Promise<boolean> {
  const bearer = (await authToken()) || SB_KEY;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/quim_backups`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + bearer,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ tenant_id: codigo, datos, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch (e) { return false; }
}

// ── Público (tienda) y escrituras públicas ──────────────────────────────
export async function quimPublica(codigo: string): Promise<CloudData | null> {
  try { return await rpc('quim_publica', { p_codigo: codigo }, false) as CloudData; }
  catch (e) { return null; }
}
export async function quimAgregarPedido(codigo: string, pedido: any): Promise<void> {
  try { await rpc('quim_agregar_pedido', { p_codigo: codigo, p_pedido: pedido }, false); } catch (e) { /* noop */ }
}
