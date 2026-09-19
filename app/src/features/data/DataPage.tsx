import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { Button, buttonClasses, ConfirmDialog, Icon, LoadingBlock, Skeleton, useToast } from '@/components/ui'
import { clearAll, db, resetToDemo } from '@/db'
import { useTimer } from '@/logic/timer'
import {
  backupFileName,
  countsPhrase,
  downloadBackup,
  IMPORT_ERRORS,
  importedToast,
  parseBackup,
  readBackup,
  replaceAllData,
  resetTimerStorage,
  type Backup,
} from './backup'

type Action = 'export' | 'import' | 'reset' | 'clear'
type Confirm = { kind: 'import'; backup: Backup } | { kind: 'reset' } | { kind: 'clear' }

async function loadCounts() {
  const [subjects, exams, topics, blocks, sessions] = await Promise.all([
    db.subjects.count(),
    db.exams.count(),
    db.topics.count(),
    db.blocks.count(),
    db.sessions.count(),
  ])
  return { subjects, exams, topics, blocks, sessions }
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-mono tabular-nums">{n}</span> {label}
    </span>
  )
}

function DataCard({
  id,
  title,
  body,
  danger = false,
  children,
}: {
  id: string
  title: string
  body: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={clsx(
        'flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-card md:p-5',
        danger ? 'border-danger/40' : 'border-border',
      )}
    >
      <h2 id={id} className={clsx('text-heading font-semibold', danger ? 'text-danger' : 'text-text')}>
        {title}
      </h2>
      <p className="text-body text-muted">{body}</p>
      {children}
    </section>
  )
}

/** "19 Sep 2026" from an ISO timestamp, or null when missing/invalid. */
function backupDate(exportedAt: string): string | null {
  const t = Date.parse(exportedAt)
  return Number.isNaN(t) ? null : format(new Date(t), 'd MMM yyyy')
}

/** /data (screens/data.md, F9): export, import, reset to demo, clear all. */
export default function DataPage() {
  const counts = useLiveQuery(loadCounts, [])
  const toast = useToast()
  const timer = useTimer()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<Action | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const resetTimer = () => {
    try {
      timer.reset()
    } catch {
      // The timer is best-effort here; the stored state is removed below either way.
    }
    resetTimerStorage()
  }

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  async function exportNow() {
    setBusy('export')
    try {
      const name = downloadBackup(await readBackup(), backupFileName())
      toast.show(`Backup downloaded: ${name}`)
    } catch {
      toast.show("Couldn't create the backup file.", 'error')
    } finally {
      setBusy(null)
    }
  }

  // Export from inside the import dialog without closing it or toggling the page busy state.
  async function exportFromDialog() {
    try {
      const name = downloadBackup(await readBackup(), backupFileName())
      toast.show(`Backup downloaded: ${name}`)
    } catch {
      toast.show("Couldn't create the backup file.", 'error')
    }
  }

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    let text: string
    try {
      text = await file.text()
    } catch {
      setImportError(IMPORT_ERRORS.readFailed)
      clearInput()
      return
    }
    const res = parseBackup(text)
    if (!res.ok) {
      setImportError(res.error)
      clearInput()
      return
    }
    setImportError(null)
    setConfirm({ kind: 'import', backup: res.backup })
  }

  function cancelConfirm() {
    if (busy) return
    setConfirm(null)
    clearInput()
  }

  async function runConfirmed() {
    if (!confirm) return
    if (confirm.kind === 'import') {
      const { backup } = confirm
      setBusy('import')
      try {
        await replaceAllData(backup)
        resetTimer()
        setImportError(null)
        toast.show(
          importedToast({
            subjects: backup.subjects.length,
            exams: backup.exams.length,
            topics: backup.topics.length,
          }),
        )
      } catch {
        setImportError("Couldn't import that backup. Nothing was changed.")
      } finally {
        setBusy(null)
        setConfirm(null)
        clearInput()
      }
      return
    }
    const isReset = confirm.kind === 'reset'
    setBusy(isReset ? 'reset' : 'clear')
    try {
      if (isReset) await resetToDemo()
      else await clearAll()
      resetTimer()
      setImportError(null)
      toast.show(isReset ? 'Demo semester loaded' : 'All data cleared')
    } catch {
      toast.show(isReset ? "Couldn't reset the data. Nothing was changed." : "Couldn't clear the data. Please try again.", 'error')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="page-title">Data</h1>
      <p className="text-lead text-muted">Everything lives in this browser. No account, no servers. Back it up here.</p>
    </div>
  )

  if (!counts) {
    return (
      <div className="mx-auto flex w-full max-w-form flex-col gap-6">
        {header}
        <LoadingBlock testId="data-loading">
          <Skeleton className="h-14" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </LoadingBlock>
      </div>
    )
  }

  const disabled = busy !== null
  const empty = counts.subjects + counts.exams + counts.topics + counts.blocks + counts.sessions === 0
  const btnWidth = 'w-full md:w-fit'

  let dialog: { title: string; message: ReactNode; confirmLabel: string } | null = null
  if (confirm?.kind === 'import') {
    const b = confirm.backup
    const from = backupDate(b.exportedAt)
    const incoming = countsPhrase({ subjects: b.subjects.length, exams: b.exams.length, topics: b.topics.length })
    dialog = {
      title: 'Replace all your data?',
      confirmLabel: busy === 'import' ? 'Importing…' : 'Replace my data',
      message: (
        <>
          <p>
            {from ? `The backup from ${from} has ${incoming}.` : `The backup has ${incoming}.`} It will replace your
            current {countsPhrase(counts)}. This can&apos;t be undone.
          </p>
          <button
            type="button"
            onClick={exportFromDialog}
            disabled={disabled}
            className="w-fit rounded-sm text-small font-medium text-primary underline underline-offset-2 hover:text-primary-hover disabled:text-muted"
          >
            Export current data first
          </button>
        </>
      ),
    }
  } else if (confirm?.kind === 'reset') {
    dialog = {
      title: 'Reset to the demo semester?',
      confirmLabel: busy === 'reset' ? 'Resetting…' : 'Reset to demo',
      message: <p>Your current data will be replaced by the sample semester. This can&apos;t be undone.</p>,
    }
  } else if (confirm?.kind === 'clear') {
    dialog = {
      title: 'Clear all data?',
      confirmLabel: busy === 'clear' ? 'Clearing…' : 'Clear everything',
      message: <p>This deletes everything FocusPlan has stored in this browser. This can&apos;t be undone.</p>,
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6">
      {header}

      <div className="flex flex-col gap-1 rounded-lg bg-sunken p-4">
        <p data-testid="data-summary" className="text-small text-text" aria-live="polite">
          <Count n={counts.subjects} label={counts.subjects === 1 ? 'subject' : 'subjects'} /> ·{' '}
          <Count n={counts.exams} label={counts.exams === 1 ? 'exam' : 'exams'} /> ·{' '}
          <Count n={counts.topics} label={counts.topics === 1 ? 'topic' : 'topics'} /> ·{' '}
          <Count n={counts.blocks} label={counts.blocks === 1 ? 'block' : 'blocks'} /> ·{' '}
          <Count n={counts.sessions} label={counts.sessions === 1 ? 'focus session' : 'focus sessions'} />
        </p>
        <p className="text-caption text-muted">Stored locally in IndexedDB on this device.</p>
      </div>

      <DataCard
        id="data-export-heading"
        title="Export a backup"
        body="Download all your subjects, exams, topics, blocks, focus sessions and settings as one JSON file."
      >
        <Button data-testid="export-button" className={btnWidth} onClick={exportNow} disabled={disabled} loading={busy === 'export'}>
          <Icon.Download />
          {busy === 'export' ? 'Exporting…' : 'Export backup'}
        </Button>
      </DataCard>

      <DataCard
        id="data-import-heading"
        title="Import a backup"
        body="Replace everything in this browser with a FocusPlan backup file."
      >
        <label
          className={buttonClasses(
            'secondary',
            'md',
            clsx(
              btnWidth,
              'cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
              disabled && 'pointer-events-none cursor-not-allowed text-muted',
            ),
          )}
          aria-disabled={disabled || undefined}
        >
          <Icon.Upload />
          {busy === 'import' ? 'Importing…' : 'Choose backup file'}
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            data-testid="import-input"
            className="sr-only"
            disabled={disabled}
            onChange={onFileChosen}
            aria-describedby={importError ? 'data-import-error' : undefined}
          />
        </label>
        {importError ? (
          <p
            id="data-import-error"
            data-testid="import-error"
            role="alert"
            className="rounded-md bg-danger-soft p-3 text-small text-danger"
          >
            {importError}
          </p>
        ) : null}
      </DataCard>

      <DataCard
        id="data-demo-heading"
        title="Demo semester"
        body="Load a sample semester (3 subjects, 3 exams, 12 topics and 5 days of focus history) to try FocusPlan out."
      >
        <Button
          variant="secondary"
          data-testid="reset-demo"
          className={btnWidth}
          disabled={disabled}
          loading={busy === 'reset'}
          onClick={() => setConfirm({ kind: 'reset' })}
        >
          {busy === 'reset' ? 'Resetting…' : 'Reset to demo'}
        </Button>
        {empty ? (
          <p className="text-small text-muted">
            Your planner is empty. Load the demo, import a backup, or start in Setup.{' '}
            <Link
              to="/setup"
              data-testid="empty-setup-link"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              Go to Setup
            </Link>
          </p>
        ) : null}
      </DataCard>

      <DataCard
        id="data-clear-heading"
        title="Clear all data"
        body="Delete every subject, exam, topic, block, focus session and setting from this browser."
        danger
      >
        <Button
          variant="danger"
          data-testid="clear-all"
          className={btnWidth}
          disabled={disabled}
          loading={busy === 'clear'}
          onClick={() => setConfirm({ kind: 'clear' })}
        >
          {busy === 'clear' ? 'Clearing…' : 'Clear all data'}
        </Button>
      </DataCard>

      <p className="flex items-start gap-2 text-small text-muted">
        <Icon.Lock className="mt-0.5 size-4 shrink-0" />
        FocusPlan never sends your data anywhere. Clearing your browser&apos;s site data deletes it too, so export a
        backup now and then.
      </p>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        busy={busy !== null && busy !== 'export'}
        onConfirm={runConfirmed}
        onCancel={cancelConfirm}
      />
    </div>
  )
}
