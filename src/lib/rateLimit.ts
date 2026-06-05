// Rate Limiting en memoria para Next.js API Routes (Edge / Serverless compatible a nivel de contenedor)
const tracker = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitOptions {
  limit: number;      // Número máximo de peticiones permitidas en la ventana
  windowMs: number;   // Tamaño de la ventana de tiempo en milisegundos
}

/**
 * Evalúa si una IP ha excedido el límite de peticiones en la ventana de tiempo dada.
 * @returns true si la petición está permitida, false si ha sido limitada.
 */
export function rateLimit(ip: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const key = ip;
  
  // Limpieza periódica automática del mapa para evitar fugas de memoria
  if (tracker.size > 10000) {
    const cleanTime = Date.now();
    for (const [k, v] of tracker.entries()) {
      if (cleanTime > v.resetTime) {
        tracker.delete(k);
      }
    }
  }

  const record = tracker.get(key);

  if (!record) {
    tracker.set(key, { count: 1, resetTime: now + options.windowMs });
    return true;
  }

  // Si la ventana de tiempo ya expiró, reiniciar contador
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + options.windowMs;
    return true;
  }

  record.count++;
  if (record.count > options.limit) {
    return false;
  }

  return true;
}
