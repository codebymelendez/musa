// Pure date helpers for the calendar views — moved verbatim from
// app/(tabs)/calendar.tsx. All arithmetic is UTC-based on date-only values;
// timezone interpretation stays in the screen via businessTz/Intl.

export function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

export function getTodayInTZ(tz: string): Date {
  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date())
  return new Date(todayStr + 'T00:00:00Z')
}

export function formatWeekday(d: Date): string {
  return cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(d))
}
export function formatFullDate(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}
export function formatTime(iso: string, tz = 'America/Caracas'): string {
  return new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
  }).format(new Date(iso))
}
export function isToday(d: Date, tz: string): boolean {
  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date())
  const dayStr = d.toISOString().split('T')[0]
  return todayStr === dayStr
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime())
  r.setUTCDate(r.getUTCDate() + n)
  return r
}
export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime())
  r.setUTCMonth(r.getUTCMonth() + n)
  return r
}
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getTime())
  r.setUTCHours(0, 0, 0, 0)
  const day = r.getUTCDay()
  r.setUTCDate(r.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return r
}
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
export function monthCells(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1))
  const last  = new Date(Date.UTC(year, month + 1, 0))
  const firstDay = first.getUTCDay()
  const offset = (firstDay === 0 ? 7 : firstDay) - 1
  const cells: Date[] = []
  for (let i = offset; i > 0; i--) cells.push(addDays(first, -i))
  for (let d = 1; d <= last.getUTCDate(); d++) cells.push(new Date(Date.UTC(year, month, d)))
  let extra = 1
  while (cells.length % 7 !== 0) cells.push(addDays(last, extra++))
  return cells
}
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
export function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const sm = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(monday)
  const em = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(sunday)
  const yr = sunday.getUTCFullYear()
  if (monday.getUTCMonth() === sunday.getUTCMonth())
    return `${monday.getUTCDate()} – ${sunday.getUTCDate()} ${em} ${yr}`
  return `${monday.getUTCDate()} ${sm} – ${sunday.getUTCDate()} ${em} ${yr}`
}
export function monthLabel(d: Date): string {
  return cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d))
}

export const WLABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
