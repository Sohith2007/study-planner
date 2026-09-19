import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type WheelEvent,
} from 'react'
import { Button, Field, Input, LoadingBlock, Skeleton, Switch, useToast } from '@/components/ui'
import { getSettings, saveSettings } from '@/db'
import { MONDAY_FIRST_WEEKDAYS, WEEKDAY_SHORT, formatShortDate, todayISO } from '@/lib'
import type { Settings, TimerMode } from '@/types'
import {
  DEFAULT_REVIEW_OFFSETS,
  FIELD_ORDER,
  capacitySummary,
  formFromSettings,
  formsEqual,
  getFieldValue,
  isDefaultReviewOffsets,
  reviewText,
  ruleFor,
  setFieldValue,
  statusText,
  toPatch,
  validateAll,
  validateBlackout,
  validateField,
  type FieldErrors,
  type NumericFieldKey,
  type SettingsForm,
} from './settingsLogic'

/** /settings (screens/settings.md, F2): one form, saved with `settings-save`. */
export default function SettingsPage() {
  const stored = useLiveQuery(() => getSettings(), [])
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Settings</h1>
        <p className="text-lead text-muted">
          How much you can study, and how your timer runs. Your plan rebuilds when you save.
        </p>
      </div>
      {stored ? (
        <SettingsFormView stored={stored} />
      ) : (
        <LoadingBlock testId="settings-loading">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </LoadingBlock>
      )}
    </div>
  )
}

function Section({ title, helper, children, className }: { title: string; helper?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={clsx('flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card md:p-5', className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-heading font-semibold text-text">
          {title}
        </h2>
        {helper ? <p className="text-small text-muted">{helper}</p> : null}
      </div>
      {children}
    </section>
  )
}

const notificationsBlocked = () => typeof Notification !== 'undefined' && Notification.permission === 'denied'

function SettingsFormView({ stored }: { stored: Settings }) {
  const toast = useToast()
  const today = todayISO()
  const storedForm = useMemo(() => formFromSettings(stored), [stored])
  const [form, setForm] = useState<SettingsForm>(storedForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [blackoutDraft, setBlackoutDraft] = useState('')
  const [blackoutError, setBlackoutError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // External changes (e.g. "Trim reviews" in the status bar) re-seed the form only while it is clean.
  const [seenStored, setSeenStored] = useState(storedForm)
  if (!formsEqual(seenStored, storedForm)) {
    setSeenStored(storedForm)
    if (formsEqual(form, seenStored)) setForm(storedForm)
  }

  const dirty = !formsEqual(form, storedForm)
  const errorCount = Object.keys(errors).length
  const status = statusText(errorCount, dirty)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const update = (patch: Partial<SettingsForm>) => setForm((f) => ({ ...f, ...patch }))

  const setError = (key: NumericFieldKey, msg: string | null) =>
    setErrors((prev) => {
      if ((prev[key] ?? null) === msg) return prev
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })

  const numberProps = (key: NumericFieldKey): NumberInputProps => {
    const r = ruleFor(key)
    return {
      type: 'number',
      inputMode: 'numeric',
      min: r.min,
      max: r.max,
      step: 1,
      value: getFieldValue(form, key),
      onWheel: (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
      onFocus: (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const next = setFieldValue(form, key, e.target.value)
        setForm(next)
        if (errors[key]) setError(key, validateField(next, key))
      },
      onBlur: () => setError(key, validateField(form, key)),
    }
  }

  const addBlackout = () => {
    const err = validateBlackout(blackoutDraft, today, form.blackoutDates)
    setBlackoutError(err)
    if (err) return
    update({ blackoutDates: [...form.blackoutDates, blackoutDraft].sort() })
    setBlackoutDraft('')
  }

  const discard = () => {
    setForm(storedForm)
    setErrors({})
    setBlackoutError(null)
    setBlackoutDraft('')
  }

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const all = validateAll(form)
    setErrors(all)
    const first = FIELD_ORDER.find((k) => all[k])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-testid="${first}"]`)?.focus()
      return
    }
    setSaving(true)
    try {
      await saveSettings(toPatch(form))
      toast.show('Settings saved')
    } catch (err) {
      console.error(err)
      toast.show("Couldn't save settings. Please try again.", 'error')
    } finally {
      setSaving(false)
    }
  }

  const fallbackFocus = stored.focusMinutes

  return (
    <form ref={formRef} noValidate onSubmit={save} className="flex flex-col gap-6">
      <Section title="Weekly capacity" helper="Pomodoros you can do each day. Set 0 for a day off.">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-7 md:gap-2">
          {MONDAY_FIRST_WEEKDAYS.map((wd) => {
            const key = `capacity-${wd}` as NumericFieldKey
            return (
              <Field key={wd} label={WEEKDAY_SHORT[wd]} testId={key} error={errors[key]}>
                {(p) => <Input {...p} {...numberProps(key)} className="px-1 font-mono text-center!" />}
              </Field>
            )
          })}
        </div>
        <p data-testid="capacity-summary" className="text-small text-muted">
          {capacitySummary(form, fallbackFocus)}
        </p>
      </Section>

      <Section title="Timer">
        <div className="grid gap-4 md:grid-cols-2">
          <MinutesField label="Focus length" field="focus-minutes" suffix="min" error={errors['focus-minutes']} props={numberProps('focus-minutes')} />
          <MinutesField label="Short break" field="short-break-minutes" suffix="min" error={errors['short-break-minutes']} props={numberProps('short-break-minutes')} />
          <MinutesField label="Long break" field="long-break-minutes" suffix="min" error={errors['long-break-minutes']} props={numberProps('long-break-minutes')} />
          <MinutesField
            label="Long break every"
            field="long-break-every"
            suffix="focus sessions"
            error={errors['long-break-every']}
            props={numberProps('long-break-every')}
          />
        </div>
        <fieldset data-testid="timer-mode-default" className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium text-text">Default timer mode</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <ModeCard
              mode="classic"
              title="Classic"
              description="Fixed focus and break lengths."
              checked={form.timerMode === 'classic'}
              onSelect={(m) => update({ timerMode: m })}
            />
            <ModeCard
              mode="flowtime"
              title="Flowtime"
              description="Focus until you stop; the break is a fifth of your focus time."
              checked={form.timerMode === 'flowtime'}
              onSelect={(m) => update({ timerMode: m })}
            />
          </div>
        </fieldset>
      </Section>

      <Section title="Daily goal">
        <Field
          label="Pomodoros per day"
          testId="daily-goal"
          error={errors['daily-goal']}
          hint="Hit this many focus sessions in a day to keep your streak going."
        >
          {(p) => <Input {...p} {...numberProps('daily-goal')} className="w-24! font-mono" />}
        </Field>
      </Section>

      <Section title="Blackout dates" helper="Days you can't study at all. Nothing gets scheduled on them.">
        <div className="flex flex-col gap-2 md:flex-row md:items-start">
          <Field label="Date" testId="blackout-date-input" error={blackoutError} className="flex-1">
            {(p) => (
              <Input
                {...p}
                type="date"
                min={today}
                value={blackoutDraft}
                onChange={(e) => {
                  setBlackoutDraft(e.target.value)
                  if (blackoutError) setBlackoutError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addBlackout()
                  }
                }}
              />
            )}
          </Field>
          <Button variant="secondary" data-testid="blackout-add" onClick={addBlackout} className="md:mt-6.5">
            Add date
          </Button>
        </div>
        {form.blackoutDates.length === 0 ? (
          <p data-testid="blackout-empty" className="text-small text-muted">
            No blackout dates.
          </p>
        ) : (
          <ul data-testid="blackout-list" className="flex flex-col divide-y divide-border rounded-md border border-border">
            {form.blackoutDates.map((d) => {
              const label = formatShortDate(d)
              return (
                <li key={d} data-testid="blackout-item" data-date={d} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 text-body font-medium text-text">{label}</span>
                  {stored.blackoutDates.includes(d) ? null : (
                    <span className="text-caption text-warning">Not saved yet</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="blackout-remove"
                    aria-label={`Remove ${label}`}
                    onClick={() => update({ blackoutDates: form.blackoutDates.filter((x) => x !== d) })}
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <section
        aria-labelledby="settings-review-h"
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card md:p-5"
      >
        <h2 id="settings-review-h" className="text-heading font-semibold text-text">
          Review schedule
        </h2>
        <p className="text-body text-text">{reviewText(form.reviewOffsets)}</p>
        <p className="text-small text-muted">Trim reviews from the banner when your plan doesn't fit.</p>
        {isDefaultReviewOffsets(form.reviewOffsets) ? null : (
          <Button
            variant="ghost"
            size="sm"
            data-testid="review-offsets-reset"
            className="w-fit"
            onClick={() => update({ reviewOffsets: [...DEFAULT_REVIEW_OFFSETS] })}
          >
            Restore default reviews
          </Button>
        )}
      </section>

      <Section title="Sound & notifications">
        <Switch
          testId="sound-toggle"
          checked={form.soundEnabled}
          onChange={(v) => update({ soundEnabled: v })}
          label="Play a chime when a phase ends"
        />
        <Switch
          testId="notifications-toggle"
          checked={form.notificationsEnabled}
          onChange={(v) => update({ notificationsEnabled: v })}
          label="Show a browser notification when a phase ends"
        />
        {notificationsBlocked() ? (
          <p data-testid="notifications-blocked" className="text-small text-warning">
            Your browser is blocking notifications for this site. Allow them in the site settings to use this.
          </p>
        ) : null}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-form flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <p
            data-testid="settings-status"
            aria-live="polite"
            className={clsx(
              'text-small',
              status.tone === 'danger' ? 'text-danger' : status.tone === 'text' ? 'text-text' : 'text-muted',
            )}
          >
            {status.text}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              data-testid="settings-discard"
              disabled={!dirty || saving}
              onClick={discard}
              className="flex-1 md:flex-none"
            >
              Discard
            </Button>
            <Button type="submit" data-testid="settings-save" loading={saving} className="flex-2 md:flex-none">
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

type NumberInputProps = InputHTMLAttributes<HTMLInputElement>

function MinutesField({
  label,
  field,
  suffix,
  error,
  props,
}: {
  label: string
  field: NumericFieldKey
  suffix: string
  error?: string
  props: NumberInputProps
}) {
  return (
    <Field label={label} testId={field} error={error}>
      {(p) => (
        <div className="flex items-center gap-2">
          <Input {...p} {...props} className="w-24! font-mono" />
          <span className="text-small text-muted">{suffix}</span>
        </div>
      )}
    </Field>
  )
}

function ModeCard({
  mode,
  title,
  description,
  checked,
  onSelect,
}: {
  mode: TimerMode
  title: string
  description: string
  checked: boolean
  onSelect: (m: TimerMode) => void
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-start gap-3 rounded-md p-3 transition-colors duration-150',
        checked ? 'border-2 border-primary bg-primary-soft' : 'border border-border-strong bg-surface hover:bg-sunken',
      )}
    >
      <input
        type="radio"
        name="timer-mode-default"
        value={mode}
        checked={checked}
        onChange={() => onSelect(mode)}
        data-testid={`timer-mode-default-${mode}`}
        className="mt-1 size-4 accent-primary"
      />
      <span className="flex flex-col">
        <span className="text-body font-medium text-text">{title}</span>
        <span className="text-small text-muted">{description}</span>
      </span>
    </label>
  )
}
