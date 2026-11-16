// Echoes of Space · Cloudflare entry point.
// Wraps the original Sites worker (dist/server/index.js) and replaces the identity that
// The original Sites host used to inject: sign-in with Google and/or GitHub, a signed session cookie,
// and the same `oai-authenticated-user-*` headers the atlas worker already reads.
// Files go to R2 (binding BUCKET) when it exists, otherwise to Workers KV (binding FILES).
import atlas from '../dist/server/index.js';
import * as community from './community.js';
import { words } from '../src/data.js';
import { atlasCopy } from '../src/atlas-copy.js';
import * as social from './social.js';
import { sharedStory } from '../src/pages.js';

const COOKIE = 'eos_session';
const STATE_COOKIE = 'eos_oauth';
const SESSION_DAYS = 30;
const security = {
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store'
};

const encoder = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function seal(secret, value) {
  const body = b64url(encoder.encode(JSON.stringify(value)));
  return `${body}.${await hmac(secret, body)}`;
}
async function unseal(secret, token) {
  if (!secret || !token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !sameText(signature, await hmac(secret, body))) return null;
  try {
    const value = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return value.exp > Date.now() ? value : null;
  } catch { return null; }
}
function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}
const cookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

function safeReturn(value) {
  // Only same-site relative paths, never another host.
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/';
}
function redirect(location, setCookies = []) {
  const headers = new Headers({ ...security, Location: location });
  for (const value of setCookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}

const providers = {
  google: {
    label: 'Google',
    enabled: env => env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
    authorize: (env, redirectUri, state) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account'
    }),
    async identity(env, code, redirectUri) {
      const token = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' })
      }).then(r => r.json());
      if (!token.access_token) return null;
      const user = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } }).then(r => r.json());
      if (!user.sub) return null;
      return { id: `google:${user.sub}`, email: user.email_verified ? user.email : '', name: user.name || user.email || 'Google', provider: 'google' };
    }
  },
  github: {
    label: 'GitHub',
    enabled: env => env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET,
    authorize: (env, redirectUri, state) => 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID, redirect_uri: redirectUri, scope: 'read:user user:email', state, allow_signup: 'true'
    }),
    async identity(env, code, redirectUri) {
      const token = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, redirect_uri: redirectUri })
      }).then(r => r.json());
      if (!token.access_token) return null;
      const headers = { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'echoes-of-space', Accept: 'application/vnd.github+json' };
      const user = await fetch('https://api.github.com/user', { headers }).then(r => r.json());
      if (!user.id) return null;
      const emails = await fetch('https://api.github.com/user/emails', { headers }).then(r => r.ok ? r.json() : []).catch(() => []);
      const primary = Array.isArray(emails) ? emails.find(item => item.primary && item.verified) : null;
      return { id: `github:${user.id}`, email: primary?.email || '', name: user.login || 'GitHub', provider: 'github' };
    }
  }
};

const isLocal = url => ['localhost', '127.0.0.1'].includes(url.hostname);
const devLogin = (env, url) => env.ALLOW_DEV_LOGIN === '1' && isLocal(url);

const PBKDF2_ITERATIONS = 60000; // Fits the Workers Free CPU budget. Raise on a paid plan; each account stores its own count.
const USERNAME = /^[a-z0-9._-]{3,30}$/i;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pageCopy = {
  es: {
    title: 'Iniciar sesión', createTitle: 'Crear cuenta',
    lead: 'Inicia sesión para publicar relatos y sincronizar tu pasaporte. Leer no requiere cuenta.',
    createLead: 'Elige un nombre de usuario y una contraseña. No pedimos correo ni datos personales.',
    with: 'Continuar con', back: 'Volver al atlas', or: 'o con tu usuario',
    user: 'Nombre de usuario', pass: 'Contraseña', pass2: 'Repite la contraseña',
    enter: 'Entrar', create: 'Crear cuenta', haveNo: '¿No tienes cuenta?', createLink: 'Crea una aquí',
    have: '¿Ya tienes cuenta?', loginLink: 'Inicia sesión',
    userHelp: '3 a 30 caracteres: letras, números, punto, guion o guion bajo.',
    passHelp: 'Mínimo 8 caracteres. Guárdala bien: sin correo no se puede recuperar.',
    errors: {
      bad_login: 'Usuario o contraseña incorrectos.', bad_user: 'El nombre de usuario no es válido.',
      bad_pass: 'La contraseña debe tener entre 8 y 128 caracteres.', mismatch: 'Las contraseñas no coinciden.',
      taken: 'Ese nombre de usuario ya existe.', too_many: 'Demasiados intentos. Espera unos minutos.',
      unavailable: 'No se pudo completar. Inténtalo de nuevo.', suspended: 'Esta cuenta está suspendida por incumplir las Normas de la comunidad.', terms: 'Para crear una cuenta debes confirmar tu edad y aceptar los documentos.'
    },
    accept: 'Tengo 13 años o más y acepto los <a href="/terminos">Términos de uso</a>, las <a href="/normas">Normas de la comunidad</a> y el <a href="/privacidad">Aviso de privacidad</a>.',
    consent: 'Al continuar aceptas los <a href="/terminos">Términos de uso</a> y el <a href="/privacidad">Aviso de privacidad</a>.'
  },
  en: {
    title: 'Sign in', createTitle: 'Create account',
    lead: 'Sign in to publish stories and sync your passport. Reading needs no account.',
    createLead: 'Choose a username and a password. No email or personal details needed.',
    with: 'Continue with', back: 'Back to the atlas', or: 'or with your username',
    user: 'Username', pass: 'Password', pass2: 'Repeat password',
    enter: 'Sign in', create: 'Create account', haveNo: 'No account yet?', createLink: 'Create one',
    have: 'Already have an account?', loginLink: 'Sign in',
    userHelp: '3 to 30 characters: letters, numbers, dot, dash or underscore.',
    passHelp: 'At least 8 characters. Keep it safe: without email it cannot be recovered.',
    errors: {
      bad_login: 'Wrong username or password.', bad_user: 'That username is not valid.',
      bad_pass: 'The password must be 8 to 128 characters.', mismatch: 'The passwords do not match.',
      taken: 'That username is already taken.', too_many: 'Too many attempts. Wait a few minutes.',
      unavailable: 'Could not complete that. Try again.', suspended: 'This account is suspended for breaking the Community guidelines.', terms: 'To create an account you must confirm your age and accept the documents.'
    },
    accept: 'I am 13 or older and I accept the <a href="/terminos">Terms of use</a>, the <a href="/normas">Community guidelines</a> and the <a href="/privacidad">Privacy notice</a>.',
    consent: 'By continuing you accept the <a href="/terminos">Terms of use</a> and the <a href="/privacidad">Privacy notice</a>.'
  }
};

function signInPage(request, env, url, returnTo, { mode = 'login', error = url.searchParams.get('error') || '', username = '', status = 200 } = {}) {
  const lang = /^es\b/i.test(url.searchParams.get('lang') || request.headers.get('accept-language') || '') ? 'es' : 'en';
  const copy = pageCopy[lang];
  const create = mode === 'register';
  const back = encodeURIComponent(returnTo);
  const buttons = create ? [] : Object.entries(providers).filter(([, p]) => p.enabled(env))
    .map(([id, p]) => `<a class="btn" href="/auth/${id}/start?return_to=${back}">${copy.with} ${p.label}</a>`);
  if (!create && devLogin(env, url)) buttons.push(`<a class="btn" href="/auth/dev/start?return_to=${back}">Dev login (local)</a>`);
  const form = env.DB ? `${buttons.length ? `<p class="or">${copy.or}</p>` : ''}
<form method="post" action="/auth/password/${create ? 'register' : 'login'}?return_to=${back}">
${error ? `<p class="error" role="alert">${copy.errors[error] || copy.errors.unavailable}</p>` : ''}
<label>${copy.user}<input name="username" autocomplete="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9._\\-]{3,30}" value="${escapeHtml(username)}"></label>
${create ? `<small>${copy.userHelp}</small>` : ''}
<label>${copy.pass}<input name="password" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" required minlength="8" maxlength="128"></label>
${create ? `<label>${copy.pass2}<input name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label><small>${copy.passHelp}</small><label class="accept"><input type="checkbox" name="accept" value="1" required><span>${copy.accept}</span></label>` : ''}
<button class="btn" type="submit">${create ? copy.create : copy.enter}</button>
</form>
<p class="switch">${create ? `${copy.have} <a href="/signin?return_to=${back}">${copy.loginLink}</a>` : `${copy.haveNo} <a href="/signup?return_to=${back}">${copy.createLink}</a>`}</p>` : '';
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${create ? copy.createTitle : copy.title} · Echoes of Space</title>
<style>@font-face{font-family:Jost;src:url(/fonts/jost-300.woff2) format('woff2');font-weight:300}@font-face{font-family:Jost;src:url(/fonts/jost-400.woff2) format('woff2');font-weight:400}@font-face{font-family:Jost;src:url(/fonts/jost-500.woff2) format('woff2');font-weight:500}body{margin:0;min-height:100svh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 110%,#1c2a33,#0a0b0d 65%);color:#ece9e2;font:300 16px Jost,'Segoe UI',system-ui,sans-serif}
main{width:min(420px,calc(100% - 40px));padding:34px;margin:30px 0;border:1px solid #b6d6ff29;border-radius:12px;background:#121315e6}
h1{font:300 2rem Jost,sans-serif;margin:0 0 10px;letter-spacing:.12em;text-transform:uppercase}p{color:#a3adc0;line-height:1.5;margin:0 0 20px}
.btn{display:block;width:100%;box-sizing:border-box;text-align:center;padding:12px;margin-bottom:10px;border:0;border-radius:999px;background:#e9e4d8;color:#111;font-family:inherit;font-weight:600;font-size:1rem;text-decoration:none;cursor:pointer}
.or{text-align:center;font-size:.85rem;margin:14px 0}form{display:grid;gap:10px}label{display:grid;gap:5px;font-size:.88rem;color:#dbe4f3}
input{font:inherit;padding:10px 12px;border-radius:6px;border:1px solid #ffffff2a;background:#0e0f11;color:#ece9e2}input:focus{outline:2px solid #9fe3df;outline-offset:1px}
small{color:#a3adc0;font-size:.78rem;margin-top:-4px}.error{color:#ffb4a8;background:#3a1612;border:1px solid #ff8a7a55;border-radius:6px;padding:9px 12px;margin:0}
.switch{font-size:.9rem;margin:16px 0 14px}.accept{display:flex;gap:10px;align-items:flex-start;font-size:.82rem;color:#c9d3e3;line-height:1.5}.accept input{margin-top:4px}.consent{font-size:.76rem;color:#8f9bb0;margin:6px 0 14px}a{color:#9fe3df}.back{font-size:.9rem}</style></head><body><main><h1>${create ? copy.createTitle : copy.title}</h1><p>${create ? copy.createLead : copy.lead}</p>
${buttons.join('')}${form}<p class="consent">${copy.consent}</p><a class="back" href="${escapeHtml(returnTo)}">← ${copy.back}</a> · <a class="back" href="/privacidad">${lang === 'es' ? 'Privacidad' : 'Privacy'}</a></main></body></html>`;
  return new Response(html, { status, headers: { ...security, 'Content-Type': 'text/html; charset=utf-8' } });
}

async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(salt), iterations }, key, 256);
  return b64url(bits);
}

async function tooManyAttempts(env, key, limit, windowMs) {
  const since = Date.now() - windowMs;
  await env.DB.prepare('DELETE FROM auth_attempts WHERE at < ?').bind(Date.now() - 24 * 3600 * 1000).run();
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND at > ?').bind(key, since).first();
  return (row?.n || 0) >= limit;
}
const recordAttempt = (env, key) => env.DB.prepare('INSERT INTO auth_attempts (key, at) VALUES (?, ?)').bind(key, Date.now()).run();

async function passwordAuth(request, env, url, mode) {
  const returnTo = safeReturn(url.searchParams.get('return_to'));
  const again = (error, username = '', status = 400) => signInPage(request, env, url, returnTo, { mode, error, username, status });
  if (request.method !== 'POST') return redirect(`/${mode === 'register' ? 'signup' : 'signin'}?return_to=${encodeURIComponent(returnTo)}`);
  if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers: security });
  if (!env.DB) return again('unavailable', '', 503);
  const form = await request.formData().catch(() => null);
  const username = String(form?.get('username') || '').trim();
  const password = String(form?.get('password') || '');
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!USERNAME.test(username)) return again(mode === 'register' ? 'bad_user' : 'bad_login', username);
  if (password.length < 8 || password.length > 128) return again(mode === 'register' ? 'bad_pass' : 'bad_login', username);

  if (mode === 'register') {
    if (password !== String(form?.get('password2') || '')) return again('mismatch', username);
    if (form?.get('accept') !== '1') return again('terms', username);
    if (await tooManyAttempts(env, `register:${ip}`, 5, 3600 * 1000)) return again('too_many', username, 429);
    await recordAttempt(env, `register:${ip}`);
    const exists = await env.DB.prepare('SELECT 1 FROM local_accounts WHERE username = ?').bind(username).first();
    if (exists) return again('taken', username, 409);
    const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const id = `local:${crypto.randomUUID()}`;
    const hash = await hashPassword(password, salt, PBKDF2_ITERATIONS);
    try {
      await env.DB.prepare('INSERT INTO local_accounts (username, id, salt, hash, iterations, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(username, id, salt, hash, PBKDF2_ITERATIONS, Date.now()).run();
    } catch { return again('taken', username, 409); }
    await community.touchAccount(env, { id, name: username, provider: 'local' }, { acceptedTerms: true });
    return startSession(env, { id, name: username, provider: 'local' }, returnTo);
  }

  const throttle = `login:${username.toLowerCase()}:${ip}`;
  if (await tooManyAttempts(env, throttle, 10, 15 * 60 * 1000)) return again('too_many', username, 429);
  const account = await env.DB.prepare('SELECT id, username, salt, hash, iterations FROM local_accounts WHERE username = ?').bind(username).first();
  const check = await hashPassword(password, account?.salt || 'AAAAAAAAAAAAAAAAAAAAAA', account?.iterations || PBKDF2_ITERATIONS);
  if (!account || !sameText(check, account.hash)) {
    await recordAttempt(env, throttle);
    return again('bad_login', username, 401);
  }
  const status = await community.touchAccount(env, { id: account.id, name: account.username, provider: 'local' });
  if (status?.suspended_at) return again('suspended', username, 403);
  return startSession(env, { id: account.id, name: account.username, provider: 'local' }, returnTo);
}

async function startSession(env, identity, returnTo) {
  // Password accounts never carry an email: they can never be the moderator.
  const session = await seal(env.SESSION_SECRET, { ...identity, email: '', exp: Date.now() + SESSION_DAYS * 864e5 });
  return new Response(null, { status: 303, headers: (() => {
    const headers = new Headers({ ...security, Location: returnTo });
    headers.append('Set-Cookie', cookie(COOKIE, session, SESSION_DAYS * 86400));
    return headers;
  })() });
}

async function startLogin(env, url, provider) {
  const returnTo = safeReturn(url.searchParams.get('return_to'));
  const state = b64url(crypto.getRandomValues(new Uint8Array(18)));
  const pending = await seal(env.SESSION_SECRET, { state, provider, returnTo, exp: Date.now() + 10 * 60 * 1000 });
  if (provider === 'dev') {
    return redirect(`/auth/dev/callback?state=${state}`, [cookie(STATE_COOKIE, pending, 600)]);
  }
  const redirectUri = `${url.origin}/auth/${provider}/callback`;
  return redirect(providers[provider].authorize(env, redirectUri, state), [cookie(STATE_COOKIE, pending, 600)]);
}

async function finishLogin(request, env, url, provider) {
  const pending = await unseal(env.SESSION_SECRET, cookies(request)[STATE_COOKIE]);
  const clear = cookie(STATE_COOKIE, '', 0);
  if (!pending || pending.provider !== provider || pending.state !== url.searchParams.get('state')) {
    return redirect('/signin', [clear]);
  }
  let identity = null;
  if (provider === 'dev') {
    identity = { id: 'dev:local', email: env.ATLAS_MODERATOR_EMAIL || 'dev@localhost', name: 'dev', provider: 'dev' };
  } else {
    const code = url.searchParams.get('code');
    if (code) identity = await providers[provider].identity(env, code, `${url.origin}/auth/${provider}/callback`).catch(() => null);
  }
  if (!identity) return redirect(`/signin?return_to=${encodeURIComponent(pending.returnTo)}`, [clear]);
  const registry = await community.touchAccount(env, identity);
  if (registry?.suspended_at) return redirect('/signin?error=suspended', [clear]);
  const session = await seal(env.SESSION_SECRET, { ...identity, exp: Date.now() + SESSION_DAYS * 864e5 });
  return redirect(pending.returnTo, [clear, cookie(COOKIE, session, SESSION_DAYS * 86400)]);
}


const accountCopy = {
  es: {
    title: 'Tu cuenta', signedAs: 'Sesión iniciada como', via: { local: 'usuario y contraseña', github: 'GitHub', google: 'Google', dev: 'prueba local' },
    changeTitle: 'Cambiar contraseña', current: 'Contraseña actual', next: 'Nueva contraseña', repeat: 'Repite la nueva contraseña', save: 'Guardar contraseña',
    changed: 'Tu contraseña se cambió.', deleteTitle: 'Borrar mi cuenta',
    deleteBody: 'Se borran tu cuenta, tus relatos con sus archivos y portadas, y tu pasaporte. No se puede deshacer.',
    deleteBodyExternal: 'Se borran de Echoes of Space tus relatos con sus archivos y portadas, y tu pasaporte. Tu cuenta externa no se toca. No se puede deshacer.',
    confirm: 'Escribe BORRAR para confirmar', confirmWord: 'BORRAR', deleteBtn: 'Borrar definitivamente', signOut: 'Cerrar sesión', back: 'Volver al atlas',
    errors: { bad_current: 'La contraseña actual no es correcta.', bad_pass: 'La nueva contraseña debe tener entre 8 y 128 caracteres.', mismatch: 'Las contraseñas nuevas no coinciden.', confirm: 'Escribe BORRAR exactamente para confirmar.', too_many: 'Demasiados intentos. Espera unos minutos.', unavailable: 'No se pudo completar. Inténtalo de nuevo.' }
  },
  en: {
    title: 'Your account', signedAs: 'Signed in as', via: { local: 'username and password', github: 'GitHub', google: 'Google', dev: 'local test' },
    changeTitle: 'Change password', current: 'Current password', next: 'New password', repeat: 'Repeat new password', save: 'Save password',
    changed: 'Your password was changed.', deleteTitle: 'Delete my account',
    deleteBody: 'This deletes your account, your stories with their files and covers, and your passport. It cannot be undone.',
    deleteBodyExternal: 'This deletes your stories with their files and covers, and your passport, from Echoes of Space. Your external account is not touched. It cannot be undone.',
    confirm: 'Type DELETE to confirm', confirmWord: 'DELETE', deleteBtn: 'Delete permanently', signOut: 'Sign out', back: 'Back to the atlas',
    errors: { bad_current: 'The current password is not correct.', bad_pass: 'The new password must be 8 to 128 characters.', mismatch: 'The new passwords do not match.', confirm: 'Type DELETE exactly to confirm.', too_many: 'Too many attempts. Wait a few minutes.', unavailable: 'Could not complete that. Try again.' }
  }
};

function accountPage(request, url, session, { error = '', notice = '', status = 200 } = {}) {
  const lang = /^es\b/i.test(request.headers.get('accept-language') || '') ? 'es' : 'en';
  const c = accountCopy[lang];
  const local = session.provider === 'local';
  const err = error ? `<p class="error" role="alert">${c.errors[error] || c.errors.unavailable}</p>` : '';
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.title} · Echoes of Space</title>
<style>@font-face{font-family:Jost;src:url(/fonts/jost-300.woff2) format('woff2');font-weight:300}@font-face{font-family:Jost;src:url(/fonts/jost-400.woff2) format('woff2');font-weight:400}@font-face{font-family:Jost;src:url(/fonts/jost-500.woff2) format('woff2');font-weight:500}body{margin:0;min-height:100svh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 110%,#1c2a33,#0a0b0d 65%);color:#ece9e2;font:300 16px Jost,'Segoe UI',system-ui,sans-serif}
main{width:min(460px,calc(100% - 40px));padding:34px;margin:30px 0;border:1px solid #b6d6ff29;border-radius:12px;background:#121315e6}
h1{font:300 2rem Jost,sans-serif;margin:0 0 6px;letter-spacing:.12em;text-transform:uppercase}h2{font-size:1.05rem;margin:26px 0 10px}p{color:#a3adc0;line-height:1.5;margin:0 0 14px}strong{color:#f2f5fc}
form{display:grid;gap:10px}label{display:grid;gap:5px;font-size:.88rem;color:#dbe4f3}input{font:inherit;padding:10px 12px;border-radius:6px;border:1px solid #ffffff2a;background:#0e0f11;color:#ece9e2}
.btn{display:block;width:100%;box-sizing:border-box;text-align:center;padding:11px;border:0;border-radius:999px;background:#e9e4d8;color:#111;font-family:inherit;font-weight:600;font-size:.95rem;cursor:pointer;text-decoration:none}
.danger{background:#ff8a7a;color:#2a0b06}.ghost{background:none;border:1px solid #b6d6ff40;color:#9fe3df}.error{color:#ffb4a8;background:#3a1612;border:1px solid #ff8a7a55;border-radius:6px;padding:9px 12px}
.notice{color:#bfeccf;background:#12301f;border:1px solid #7ad0a055;border-radius:6px;padding:9px 12px}hr{border:0;border-top:1px solid #b6d6ff29;margin:24px 0 0}a{color:#9fe3df}.row{display:flex;gap:10px;margin-top:22px}.row>*{flex:1}</style></head>
<body><main><h1>${c.title}</h1><p>${c.signedAs} <strong>${escapeHtml(session.name || '—')}</strong> · ${c.via[session.provider] || session.provider || ''}</p>
${notice ? `<p class="notice" role="status">${c[notice]}</p>` : ''}${err}
${local ? `<h2>${c.changeTitle}</h2><form method="post" action="/auth/password/change">
<label>${c.current}<input name="current" type="password" autocomplete="current-password" required></label>
<label>${c.next}<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
<label>${c.repeat}<input name="password2" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
<button class="btn" type="submit">${c.save}</button></form><hr>` : ''}
<h2>${c.deleteTitle}</h2><p>${local ? c.deleteBody : c.deleteBodyExternal}</p>
<form method="post" action="/auth/account/delete"><label>${c.confirm}<input name="confirm" autocomplete="off" required></label>
<button class="btn danger" type="submit">${c.deleteBtn}</button></form>
<div class="row"><a class="btn ghost" href="/">${c.back}</a><a class="btn ghost" href="/signout?return_to=%2F">${c.signOut}</a></div></main></body></html>`;
  return new Response(html, { status, headers: { ...security, 'Content-Type': 'text/html; charset=utf-8' } });
}

async function changePassword(request, env, url, session) {
  const again = (error, status = 400) => accountPage(request, url, session, { error, status });
  if (session.provider !== 'local') return redirect('/cuenta');
  const form = await request.formData().catch(() => null);
  const current = String(form?.get('current') || '');
  const password = String(form?.get('password') || '');
  if (password.length < 8 || password.length > 128) return again('bad_pass');
  if (password !== String(form?.get('password2') || '')) return again('mismatch');
  const throttle = `change:${session.id}`;
  if (await tooManyAttempts(env, throttle, 10, 15 * 60 * 1000)) return again('too_many', 429);
  const account = await env.DB.prepare('SELECT salt, hash, iterations FROM local_accounts WHERE id = ?').bind(session.id).first();
  if (!account || !sameText(await hashPassword(current, account.salt, account.iterations), account.hash)) {
    await recordAttempt(env, throttle);
    return again('bad_current', 401);
  }
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt, PBKDF2_ITERATIONS);
  await env.DB.prepare('UPDATE local_accounts SET salt = ?, hash = ?, iterations = ? WHERE id = ?').bind(salt, hash, PBKDF2_ITERATIONS, session.id).run();
  return accountPage(request, url, session, { notice: 'changed' });
}

async function deleteAccount(request, env, url, session, ctx) {
  const form = await request.formData().catch(() => null);
  const word = String(form?.get('confirm') || '').trim().toUpperCase();
  if (word !== 'BORRAR' && word !== 'DELETE') return accountPage(request, url, session, { error: 'confirm', status: 400 });
  const atlasEnv = withFiles(env);
  const { results } = await env.DB.prepare('SELECT id FROM stories WHERE author = ? AND (deleted_at IS NULL OR attachment IS NOT NULL)').bind(session.id).all();
  for (const { id } of results || []) {
    const headers = new Headers({ origin: url.origin, 'oai-authenticated-user-id': session.id });
    const response = await atlas.fetch(new Request(`${url.origin}/api/stories/${id}/delete`, { method: 'POST', headers }), atlasEnv, ctx);
    if (!response.ok) return accountPage(request, url, session, { error: 'unavailable', status: 503 });
  }
  await env.DB.batch([
    ...social.forgetAccount(env, session.id),
    env.DB.prepare('DELETE FROM explorer_progress WHERE owner = ?').bind(session.id),
    env.DB.prepare('DELETE FROM local_accounts WHERE id = ?').bind(session.id),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(session.id)
  ]);
  return redirect('/', [cookie(COOKIE, '', 0)]);
}

const withFiles = env => ({ ...env, BUCKET: env.BUCKET || (env.FILES ? kvBucket(env.FILES) : undefined) });


function kvBucket(kv) {
  return {
    put: (key, value) => kv.put(key, value),
    async get(key) {
      const body = await kv.get(key, { type: 'stream' });
      return body ? { body } : null;
    },
    delete: keys => Promise.all([].concat(keys).map(key => kv.delete(key)))
  };
}

// The page is filled in by JavaScript; prerender the same text on the server so links, buttons,
// labels and the title already carry words in the visitor's language before any script runs.
const pageTitles = { stories:'storiesNav', expeditions:'expeditions', map:'mapShort', passport:'passportShort' };
const pageDescriptions = {
  es: 'Atlas bilingüe donde la comunidad escribe relatos inspirados en el equipo que la NASA dejó en la Luna, Marte y más allá.',
  en: 'A bilingual atlas where the community writes stories inspired by the hardware NASA left on the Moon, Mars and beyond.'
};
function prerender(response, request, story = null) {
  const lang = /^\s*es\b/i.test(request.headers.get('accept-language') || '') ? 'es' : 'en';
  // A shared story link (/relato/<id>) previews that story: its title, author, synopsis and cover.
  const origin = new URL(request.url).origin;
  const storyTitle = story ? `${story.title} · Echoes of Space` : null;
  const storyText = story ? (story.synopsis || (lang === 'es' ? `Un relato de ${story.byline} en Echoes of Space.` : `A story by ${story.byline} on Echoes of Space.`)) : null;
  const text = key => {
    const value = atlasCopy[lang]?.[key] ?? words[lang]?.[key];
    return typeof value === 'string' ? value : null;
  };
  let page = 'home';
  return new HTMLRewriter()
    .on('html', { element(node) { node.setAttribute('lang', lang); page = node.getAttribute('data-atlas-page') || 'home'; } })
    .on('title', { element(node) { if (storyTitle) node.setInnerContent(storyTitle); else if (pageTitles[page]) node.setInnerContent(`${text(pageTitles[page])} · Echoes of Space`); } })
    .on('meta[name="description"], meta[property="og:description"]', { element(node) { node.setAttribute('content', storyText || pageDescriptions[lang]); } })
    .on('meta[property="og:title"]', { element(node) { if (storyTitle) node.setAttribute('content', storyTitle); } })
    .on('meta[property="og:type"]', { element(node) { if (story) node.setAttribute('content', 'article'); } })
    .on('meta[property="og:image"]', { element(node) { if (story?.cover) node.setAttribute('content', `${origin}/api/covers/${encodeURIComponent(story.id)}`); } })
    .on('meta[property="og:image:width"], meta[property="og:image:height"]', { element(node) { if (story?.cover) node.remove(); } })
    .on('meta[name="twitter:card"]', { element(node) { if (story?.cover) node.setAttribute('content', 'summary'); } })
    .on('[data-t]', { element(node) { const value = text(node.getAttribute('data-t')); if (value !== null) node.setInnerContent(value); } })
    .on('[data-label]', { element(node) { const value = text(node.getAttribute('data-label')); if (value !== null) node.setAttribute('aria-label', value); } })
    .on('[data-close]', { element(node) { node.setAttribute('aria-label', text('close') || 'Close'); } })
    .on('[data-placeholder]', { element(node) { const value = text(node.getAttribute('data-placeholder')); if (value !== null) node.setAttribute('placeholder', value); } })
    .transform(response);
}

// Headers every response carries: the site cannot be framed by another page, the browser does not
// get access to camera, microphone or location, and HTTPS is remembered once a visitor has used it.
const hardening = {
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

export default {
  async fetch(request, env, ctx) {
    const response = await route(request, env, ctx);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(hardening)) headers.set(name, value);
    if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};

async function route(request, env, ctx) {
  {
    const url = new URL(request.url);
    if (!env.SESSION_SECRET) return new Response('SESSION_SECRET is not configured.', { status: 500, headers: security });

    // Old links from the first host still work, but every page now points at /signin and /signout.
    if (url.pathname === '/signin-with-chatgpt' || url.pathname === '/signout-with-chatgpt') {
      return redirect(url.pathname.replace('-with-chatgpt', '') + url.search);
    }
    if (url.pathname === '/signin' || url.pathname === '/signup') {
      return signInPage(request, env, url, safeReturn(url.searchParams.get('return_to')), { mode: url.pathname === '/signup' ? 'register' : 'login' });
    }
    const password = url.pathname.match(/^\/auth\/password\/(login|register)$/);
    if (password) return passwordAuth(request, env, url, password[1]);
    const session = await unseal(env.SESSION_SECRET, cookies(request)[COOKIE]);
    const moderatorSession = Boolean(session?.email && env.ATLAS_MODERATOR_EMAIL && session.provider !== 'local' &&
      session.email.toLowerCase() === env.ATLAS_MODERATOR_EMAIL.toLowerCase());
    if (url.pathname === '/reportar') {
      if (!env.DB) return community.notFoundPage(request);
      if (request.method === 'POST') {
        if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers: security });
        if (!session?.id || await community.isSuspended(env, session.id)) return redirect('/signin?error=suspended');
        return community.submitUserReport(request, env, session, url, async (key, limit, windowMs) => {
          if (await tooManyAttempts(env, key, limit, windowMs)) return true;
          await recordAttempt(env, key);
          return false;
        });
      }
      return community.reportUserPage(request, env, session, url);
    }
    if (url.pathname === '/moderacion' || url.pathname.startsWith('/moderacion/')) {
      // Same 404 for visitors and non-moderators: the route reveals nothing without a moderator session.
      if (!session?.id || !moderatorSession || !env.DB) return community.notFoundPage(request);
      if (request.method === 'POST') {
        if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers: security });
        return community.moderationAction(request, env, url);
      }
      return community.moderationPage(request, env, url, url.searchParams.get('aviso') || '');
    }
    if (url.pathname === '/api/me') {
      return Response.json(session?.id ? { signedIn: true, name: session.name || '', provider: session.provider || '', moderator: moderatorSession } : { signedIn: false },
        { headers: { ...security, 'Cache-Control': 'private, no-store' } });
    }
    if (url.pathname === '/cuenta' || url.pathname === '/account' || url.pathname === '/auth/password/change' || url.pathname === '/auth/account/delete') {
      if (!session?.id) return redirect(`/signin?return_to=${encodeURIComponent('/cuenta')}`);
      if (request.method === 'POST') {
        if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403, headers: security });
        if (!env.DB) return accountPage(request, url, session, { error: 'unavailable', status: 503 });
        if (url.pathname === '/auth/password/change') return changePassword(request, env, url, session);
        if (url.pathname === '/auth/account/delete') return deleteAccount(request, env, url, session, ctx);
      }
      return accountPage(request, url, session);
    }
    if (Object.hasOwn(community.legalSlugs, url.pathname)) return community.legalPage(request, env, community.legalSlugs[url.pathname]);
    if (url.pathname === '/signout') {
      return redirect(safeReturn(url.searchParams.get('return_to')), [cookie(COOKIE, '', 0)]);
    }
    const auth = url.pathname.match(/^\/auth\/(google|github|dev)\/(start|callback)$/);
    if (auth) {
      const [, provider, step] = auth;
      const allowed = provider === 'dev' ? devLogin(env, url) : providers[provider].enabled(env);
      if (!allowed) return new Response('Not found', { status: 404, headers: security });
      return step === 'start' ? startLogin(env, url, provider) : finishLogin(request, env, url, provider);
    }

    // Never trust identity headers from the outside; set them only from a valid session.
    const headers = new Headers(request.headers);
    headers.delete('oai-authenticated-user-id');
    headers.delete('oai-authenticated-user-email');
    let active = Boolean(session?.id);
    if (active && url.pathname.startsWith('/api/') && env.DB) {
      // A deleted password account or a suspended account must not keep acting through an old cookie.
      if (session.provider === 'local') active = Boolean(await env.DB.prepare('SELECT 1 FROM local_accounts WHERE id = ?').bind(session.id).first());
      if (active && await community.isSuspended(env, session.id)) active = false;
    }
    if (url.pathname.startsWith('/api/social/')) {
      return social.handle(request, env, active ? session : null, url, active && moderatorSession);
    }
    if (active) {
      headers.set('oai-authenticated-user-id', session.id);
      if (session.email) headers.set('oai-authenticated-user-email', session.email);
    }
    const forwarded = new Request(request, { headers });
    const response = await atlas.fetch(forwarded, withFiles(env), ctx);
    if (response.status === 404 && request.method === 'GET' && !url.pathname.startsWith('/api/') && (request.headers.get('accept') || '').includes('text/html')) {
      return community.notFoundPage(request);
    }
    if ((response.headers.get('content-type') || '').startsWith('text/html') && request.method === 'GET') {
      // Share previews need an absolute image URL: always point it at the domain being visited.
      const sharedId = sharedStory(url.pathname);
      let story = null;
      if (sharedId && env.DB) {
        try { story = await env.DB.prepare('SELECT id, title, byline, synopsis, cover FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL').bind(sharedId).first(); } catch {}
      }
      const rendered = prerender(response, request, story);
      const html = (await rendered.text()).replaceAll('https://echoes-of-space.diegodavidmunguia.workers.dev', url.origin);
      const headers = new Headers(response.headers);
      headers.append('Vary', 'Accept-Language');
      return new Response(html, { status: response.status, headers });
    }
    return response;
  }
}
