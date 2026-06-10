const noop = (..._args: unknown[]) => {}

class Observability {
  /** Errores: siempre se registran, sin datos de usuario en el mensaje. */
  logError(context: string, error: any) {
    console.error(`[Musa Error] [${context}]:`, error)
  }

  /** Logs de debug: no-op en producción. */
  debug: (...args: unknown[]) => void = __DEV__
    ? (...args: unknown[]) => console.log('[Musa]', ...args)
    : noop

  logPerformance(screenName: string, durationMs: number) {
    this.debug(`[Perf] Screen "${screenName}" rendered in ${durationMs}ms`)
  }

  trackTime(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }
}

export const ob = new Observability()
