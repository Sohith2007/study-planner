/**
 * Timer engine contract (master-plan 4.3). The frozen names are TimerPhase, TimerSnapshot, TimerApi,
 * TimerProvider and useTimer; everything else here is an added P2 export.
 */
export type { TimerPhase, TimerSnapshot, TimerLink, TimerNotice, TimerModeValue, TimerConfig } from './engine'
export { formatClock, formatTitle, displayMs, PHASE_TEXT, STORAGE_KEY as TIMER_STORAGE_KEY } from './engine'
export type { TimerApi, TimerDetails, NotificationHint } from './context'
export { TimerProvider } from './TimerProvider'
export { useTimer, useTimerDetails } from './hooks'
