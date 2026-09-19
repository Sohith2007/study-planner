/**
 * Browser side effects for the timer: notifications and the Web Audio chime.
 * Every call is guarded, so a missing API, a denied permission or an autoplay block never throws.
 */

export type NotificationState = 'unsupported' | NotificationPermission

export function notificationState(): NotificationState {
  try {
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return 'unsupported'
    return window.Notification.permission
  } catch {
    return 'unsupported'
  }
}

/** Ask once (only when the state is `default`). Never blocks and never throws. */
export function requestNotificationPermission(): Promise<NotificationState> {
  try {
    if (notificationState() !== 'default') return Promise.resolve(notificationState())
    const result = window.Notification.requestPermission()
    if (result && typeof (result as Promise<NotificationPermission>).then === 'function') {
      return (result as Promise<NotificationPermission>).then(
        (p) => p,
        () => notificationState(),
      )
    }
  } catch {
    // Older browsers or a blocked context: fall through.
  }
  return Promise.resolve(notificationState())
}

/** Show a notification when permitted. Returns true if one was created. */
export function showNotification(title: string, body: string): boolean {
  try {
    if (notificationState() !== 'granted') return false
    new window.Notification(title, { body, tag: 'focusplan-timer' })
    return true
  } catch {
    // e.g. Android Chrome, where the constructor is not allowed.
    return false
  }
}

type AudioCtor = typeof AudioContext
let audioCtx: AudioContext | null = null

function getAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/** Create or resume the AudioContext. Call it inside a click handler (autoplay policy). */
export function primeAudio(): void {
  try {
    const Ctor = getAudioCtor()
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {})
  } catch {
    audioCtx = null
  }
}

/** A soft two-note chime (no audio files, so no network requests). */
export function playChime(): void {
  try {
    if (!audioCtx) primeAudio()
    const ctx = audioCtx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.02
    const notes: [number, number][] = [
      [880, 0],
      [1318.5, 0.28],
    ]
    for (const [freq, offset] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + offset)
      osc.stop(t0 + offset + 1)
    }
  } catch {
    // Audio is optional.
  }
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage full or blocked: the timer still works for this page load.
  }
}
