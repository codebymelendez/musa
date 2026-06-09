class Observability {
  logError(context: string, error: any) {
    console.error(`[Musa Error] [${context}]:`, error)
  }

  logPerformance(screenName: string, durationMs: number) {
    console.log(`[Musa Perf] Screen "${screenName}" rendered in ${durationMs}ms`)
  }

  trackTime(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }
}

export const ob = new Observability()
