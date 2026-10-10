const RESIDUES = {
  Botella_plastica: {
    name: 'Botella plástica',
    bin: 'Blanco',
    points: 10,
    info: 'Envase plástico aprovechable. Entrégalo limpio y seco.'
  },
  Lata: {
    name: 'Lata',
    bin: 'Blanco',
    points: 10,
    info: 'Envase metálico aprovechable. Entrégalo limpio y seco.'
  },
  Papel_carton: {
    name: 'Papel o cartón',
    bin: 'Blanco',
    points: 10,
    info: 'Papel o cartón aprovechable cuando está limpio y seco.'
  },
  Organico: {
    name: 'Residuo orgánico',
    bin: 'Verde',
    points: 10,
    info: 'Restos de comida y otros residuos orgánicos.'
  },
  No_aprovechable: {
    name: 'No aprovechable',
    bin: 'Negro',
    points: 10,
    info: 'Residuo que no se puede aprovechar mediante reciclaje convencional.'
  },
  Otro: {
    name: 'No identificado',
    bin: 'Ninguno',
    points: 0,
    info: 'No se identificó un residuo con suficiente seguridad.'
  }
};

const CLASS_NAMES = Object.keys(RESIDUES);
const MAX_IMAGE_LENGTH = 5_500_000;

function send(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return send(res, 503, { error: 'Gemini no está configurado en Vercel. Agrega GEMINI_API_KEY y vuelve a desplegar.' });

  const image = req.body?.image;
  const match = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > MAX_IMAGE_LENGTH) {
    return send(res, 400, { error: 'La imagen no es válida o es demasiado grande. Vuelve a capturar el residuo.' });
  }

  const prompt = 'Clasifica solo el residuo principal que se vea en la imagen. Elige exactamente una className de la lista. Si no hay suficiente certeza, usa Otro. No inventes objetos. Devuelve el nombre de la categoría, una confidence entre 0 y 1, e info breve en español.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: match[1], data: match[2] } }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                className: { type: 'STRING', enum: CLASS_NAMES },
                confidence: { type: 'NUMBER' },
                info: { type: 'STRING' }
              },
              required: ['className', 'confidence', 'info']
            },
            temperature: 0.1
          }
        })
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Gemini API request failed:', response.status, data?.error?.message || 'Unknown provider error');
      return send(res, 502, { error: 'Gemini no pudo analizar la imagen. Revisa la configuración de la API e inténtalo de nuevo.' });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text;
    if (!raw) return send(res, 502, { error: 'Gemini no devolvió una clasificación. Inténtalo de nuevo.' });
    let classification;
    try {
      classification = JSON.parse(raw);
    } catch {
      return send(res, 502, { error: 'Gemini devolvió una respuesta que no se pudo interpretar. Inténtalo de nuevo.' });
    }
    if (!classification || typeof classification !== 'object' ||
        !CLASS_NAMES.includes(classification.className) ||
        typeof classification.confidence !== 'number' ||
        !Number.isFinite(classification.confidence) ||
        classification.confidence < 0 ||
        classification.confidence > 1) {
      return send(res, 502, { error: 'Gemini devolvió una clasificación no válida. Inténtalo de nuevo.' });
    }

    const residue = RESIDUES[classification.className];
    return send(res, 200, {
      className: classification.className,
      ...residue,
      info: typeof classification.info === 'string' ? classification.info.slice(0, 240) : residue.info,
      confidence: classification.confidence
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return send(res, 504, { error: 'Gemini tardó demasiado en responder. Inténtalo de nuevo.' });
    }
    console.error('Gemini classification failed:', error);
    return send(res, 502, { error: 'No se pudo analizar la imagen con Gemini.' });
  } finally {
    clearTimeout(timeout);
  }
}
