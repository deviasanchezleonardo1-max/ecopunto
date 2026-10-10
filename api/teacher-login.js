import { timingSafeEqual } from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const password = process.env.TEACHER_PASSWORD;
  if (!password) return res.status(503).json({ error: 'El acceso docente no está configurado. Agrega TEACHER_PASSWORD en Vercel y vuelve a desplegar.' });

  const supplied = typeof req.body?.password === 'string' ? Buffer.from(req.body.password) : Buffer.alloc(0);
  const expected = Buffer.from(password);
  const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!matches) return res.status(401).json({ error: 'Clave incorrecta.' });

  return res.status(200).json({ authenticated: true });
}
