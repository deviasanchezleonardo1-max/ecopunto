import { createHash } from 'node:crypto';

const CODE_RE = /^[a-z0-9._-]{3,32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function send(res, status, body) {
  return res.status(status).json(body);
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw Object.assign(
      new Error('Falta configurar SUPABASE_URL y/o SUPABASE_ANON_KEY en Vercel. Agrégalas en Settings > Environment Variables para Production y vuelve a desplegar.'),
      { status: 503 }
    );
  }
  return { url: url.replace(/\/+$/, ''), key };
}

async function supabaseRequest(path, { method = 'GET', key, token, body } = {}) {
  const config = supabaseConfig();
  const response = await fetch(`${config.url}${path}`, {
    method,
    headers: {
      apikey: key || config.key,
      Authorization: `Bearer ${token || key || config.key}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.msg || data.message || data.error_description || data.error || 'No se pudo completar la operación con Supabase.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function accountEmail(code) {
  const encodedCode = Buffer.from(code, 'utf8').toString('base64url');
  return `student-${encodedCode}@students.ecopunto.invalid`;
}

function validEmail(value) {
  return typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function profileCode(body) {
  return createHash('sha256').update(body.email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

function validProfile(body) {
  return body &&
    validEmail(body.email) &&
    typeof body.password === 'string' &&
    body.password.length >= 8 &&
    body.password.length <= 128 &&
    typeof body.names === 'string' && body.names.trim().length > 0 && body.names.trim().length <= 80 &&
    typeof body.surnames === 'string' && body.surnames.trim().length > 0 && body.surnames.trim().length <= 80 &&
    ['Mañana', 'Tarde'].includes(body.shift) &&
    /^[0-9]{3,4}$/.test(body.grade);
}

function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw Object.assign(
      new Error('Falta configurar RESEND_API_KEY y RESEND_FROM en Vercel para enviar el mensaje de creación de cuenta.'),
      { status: 503 }
    );
  }
  return { apiKey, from };
}

async function sendAccountCreatedEmail({ apiKey, from, email, names }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Tu cuenta de EcoPunto ya fue creada',
      text: `Hola ${names},\n\nTu cuenta de EcoPunto se creó correctamente. Ya puedes iniciar sesión con este correo y la contraseña que registraste.\n\n¡Bienvenido a EcoPunto!`
    })
  });
  if (!response.ok) {
    const error = new Error('El proveedor de correo no aceptó el mensaje.');
    error.status = response.status;
    throw error;
  }
}

function localizedAccountError(error, action) {
  const providerMessage = String(error.message || '');
  if (/database error saving new user|error saving user|database error.*user/i.test(providerMessage)) {
    return 'Supabase no pudo crear el perfil. Ejecuta completo el archivo supabase/schema.sql en SQL Editor del mismo proyecto Supabase y vuelve a intentarlo. Si ya lo ejecutaste, revisa los logs de Auth de Supabase.';
  }
  if (/signup is disabled|signups not allowed|new signups are disabled/i.test(providerMessage)) {
    return 'Supabase tiene desactivados los registros. Activa los registros por correo en Authentication > Providers > Email.';
  }
  if (/invalid email|email address.*invalid|email.*not valid/i.test(providerMessage)) {
    return 'Supabase rechazó el correo electrónico. Revisa que esté escrito correctamente y que el proveedor Email esté habilitado.';
  }
  if (/already registered|already exists|duplicate key|unique constraint/i.test(providerMessage)) {
    return 'Ya existe una cuenta con este correo. Inicia sesión con esa cuenta.';
  }
  if (/email not confirmed|email confirmation|confirm your email/i.test(providerMessage)) {
    return 'La confirmación de correo sigue activa en Supabase. Desactívala en Authentication > Providers > Email y vuelve a intentarlo.';
  }
  if (/invalid login credentials|invalid.*credentials/i.test(providerMessage)) {
    return 'Los datos o la contraseña no coinciden con una cuenta.';
  }
  if (/ecopunto_profiles|schema cache|relation .* does not exist|could not find the table/i.test(providerMessage)) {
    return 'Falta instalar el esquema de EcoPunto en Supabase. Ejecuta supabase/schema.sql en el SQL Editor.';
  }
  if (action === 'register' && /password|weak/i.test(providerMessage)) {
    return 'Supabase rechazó la contraseña. Usa una contraseña de al menos 8 caracteres.';
  }
  if (error.status === 401) return 'La sesión venció o los datos de acceso no son correctos. Inicia sesión de nuevo.';
  if (error.status === 403) return 'Supabase no autorizó esta operación. Revisa la configuración del proyecto y las políticas de acceso.';
  if (error.status >= 500 || !error.status) return 'No se pudo completar el registro en Supabase. Revisa que el esquema SQL esté instalado y que el proyecto esté activo.';
  return 'No se pudo completar la operación con la cuenta. Revisa los datos e inténtalo de nuevo.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
  try {
    const config = supabaseConfig();
    const body = req.body || {};

    if (body.action === 'register') {
      if (!validProfile(body)) return send(res, 400, { error: 'Revisa nombre, apellido, correo, jornada, grado y contraseña (mínimo 8 caracteres).' });
      const mail = mailConfig();
      const studentCode = profileCode(body);
      const data = await supabaseRequest('/auth/v1/signup', {
        method: 'POST',
        key: config.key,
        body: {
          email: body.email.trim().toLowerCase(),
          password: body.password,
          data: {
            ecopunto_account: true,
            student_code: studentCode,
            names: body.names.trim(),
            surnames: body.surnames.trim(),
            shift: body.shift,
            grade: body.grade
          }
        }
      });
      if (!data.access_token || !data.user) {
        return send(res, 409, { error: 'Supabase no creó la sesión. Desactiva la confirmación de correo para este proyecto y vuelve a intentarlo.' });
      }
      const profiles = await supabaseRequest(`/rest/v1/ecopunto_profiles?id=eq.${encodeURIComponent(data.user.id)}&select=*`, { token: data.access_token });
      if (!profiles[0]) return send(res, 503, { error: 'La cuenta se creó, pero falta instalar el esquema SQL de EcoPunto en Supabase.' });
      let emailNoticeSent = true;
      let notice;
      try {
        await sendAccountCreatedEmail({ ...mail, email: body.email.trim().toLowerCase(), names: body.names.trim() });
      } catch (error) {
        emailNoticeSent = false;
        notice = 'La cuenta se creó y ya puedes usarla, pero no se pudo enviar el mensaje al correo. Contacta al administrador de EcoPunto.';
        console.error('EcoPunto: no se pudo enviar el aviso de cuenta creada.', { status: error.status || 'network error' });
      }
      return send(res, 201, { accessToken: data.access_token, refreshToken: data.refresh_token, profile: profiles[0], emailNoticeSent, notice });
    }

    if (body.action === 'login') {
      const legacyCode = typeof body.studentCode === 'string' ? body.studentCode.trim().toLowerCase() : '';
      const legacyLogin = Boolean(legacyCode);
      if (legacyLogin && (!CODE_RE.test(legacyCode) || typeof body.password !== 'string' || !body.password)) {
        return send(res, 400, { error: 'Ingresa un código anterior válido y su contraseña.' });
      }
      if (!legacyLogin && (!validEmail(body.email) || typeof body.password !== 'string' || !body.password)) {
        return send(res, 400, { error: 'Ingresa un correo electrónico válido y tu contraseña.' });
      }
      const data = await supabaseRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        key: config.key,
        body: { email: legacyLogin ? accountEmail(legacyCode) : body.email.trim().toLowerCase(), password: body.password }
      });
      if (!data.access_token || !data.user) return send(res, 401, { error: 'Correo/código o contraseña incorrectos.' });
      const profiles = await supabaseRequest(`/rest/v1/ecopunto_profiles?id=eq.${encodeURIComponent(data.user.id)}&select=*`, { token: data.access_token });
      if (!profiles[0] || (legacyLogin && profiles[0].student_code !== legacyCode)) return send(res, 403, { error: 'No se encontró el perfil asociado a esta cuenta.' });
      return send(res, 200, { accessToken: data.access_token, refreshToken: data.refresh_token, profile: profiles[0] });
    }

    if (body.action === 'refresh') {
      if (typeof body.refreshToken !== 'string' || !body.refreshToken) return send(res, 400, { error: 'La sesión expiró. Inicia sesión de nuevo.' });
      const data = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        key: config.key,
        body: { refresh_token: body.refreshToken }
      });
      return send(res, 200, { accessToken: data.access_token, refreshToken: data.refresh_token });
    }

    if (body.action === 'profile') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!token) return send(res, 401, { error: 'Inicia sesión para cargar tu perfil.' });
      const profiles = await supabaseRequest('/rest/v1/ecopunto_profiles?select=*', { token });
      if (!profiles[0]) return send(res, 404, { error: 'No se encontró el perfil asociado a esta cuenta.' });
      return send(res, 200, { profile: profiles[0] });
    }

    if (body.action === 'scan') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!token) return send(res, 401, { error: 'Inicia sesión para sincronizar los puntos.' });
      if (!UUID_RE.test(body.eventId || '') || typeof body.className !== 'string') {
        return send(res, 400, { error: 'El escaneo no tiene datos válidos.' });
      }
      const result = await supabaseRequest('/rest/v1/rpc/record_ecopunto_scan', {
        method: 'POST',
        token,
        body: { p_event_id: body.eventId, p_class_name: body.className }
      });
      return send(res, 200, result);
    }

    return send(res, 400, { error: 'Operación de cuenta no reconocida.' });
  } catch (error) {
    const status = error.status || 500;
    const message = status === 503 && (error.message.startsWith('Falta configurar SUPABASE_URL') || error.message.startsWith('Falta configurar RESEND_'))
      ? error.message
      : localizedAccountError(error, req.body?.action);
    return send(res, status, { error: message });
  }
}
