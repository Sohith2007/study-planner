import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog, EmptyState, LoadingBlock, Skeleton, buttonClasses, useToast } from '@/components/ui'
import { db } from '@/db'
import { todayISO } from '@/lib'
import type { Exam, Topic } from '@/types'
import { useFlash } from './hooks'
import { SubjectCard } from './SubjectCard'
import { SubjectForm } from './SubjectForm'
import {
  deleteExamCascade,
  deleteSubjectCascade,
  deleteTopic,
  examDeleteCounts,
  subjectDeleteCounts,
} from './setupRepo'
import { TOPIC_DELETE_MESSAGE, examDeleteMessage, subjectDeleteMessage, type DeleteTarget } from './setupLogic'

interface PendingDelete extends DeleteTarget {
  message: string
}

const CONFIRM_LABEL: Record<DeleteTarget['kind'], string> = {
  subject: 'Delete subject',
  exam: 'Delete exam',
  topic: 'Delete topic',
}

/** /setup (screens/setup.md, F1): subjects, then exams, then topics, with quick add. */
export default function SetupPage() {
  const data = useLiveQuery(async () => {
    const [subjects, exams, topics] = await Promise.all([db.subjects.toArray(), db.exams.toArray(), db.topics.toArray()])
    return { subjects, exams, topics }
  }, [])
  const today = todayISO()
  const toast = useToast()
  const { flashing, flash } = useFlash()
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [busy, setBusy] = useState(false)

  const view = useMemo(() => {
    if (!data) return null
    const subjects = [...data.subjects].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const examsBySubject = new Map<string, Exam[]>()
    for (const e of [...data.exams].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))) {
      const list = examsBySubject.get(e.subjectId) ?? []
      list.push(e)
      examsBySubject.set(e.subjectId, list)
    }
    const topicsByExam = new Map<string, Topic[]>()
    for (const t of [...data.topics].sort((a, b) => a.order - b.order)) {
      const list = topicsByExam.get(t.examId) ?? []
      list.push(t)
      topicsByExam.set(t.examId, list)
    }
    return { subjects, examsBySubject, topicsByExam }
  }, [data])

  const requestDelete = async (target: DeleteTarget) => {
    try {
      const message =
        target.kind === 'subject'
          ? subjectDeleteMessage(await subjectDeleteCounts(target.id))
          : target.kind === 'exam'
            ? examDeleteMessage(await examDeleteCounts(target.id))
            : TOPIC_DELETE_MESSAGE
      setPending({ ...target, message })
    } catch (err) {
      console.error(err)
      toast.show("Couldn't save. Please try again.", 'error')
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === 'subject') await deleteSubjectCascade(pending.id)
      else if (pending.kind === 'exam') await deleteExamCascade(pending.id)
      else await deleteTopic(pending.id)
      toast.show(`${pending.name} deleted`)
      setPending(null)
    } catch (err) {
      console.error(err)
      toast.show("Couldn't save. Please try again.", 'error')
    } finally {
      setBusy(false)
    }
  }

  const empty = !!view && view.subjects.length === 0

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Setup</h1>
        <p className="text-lead text-muted">
          Your subjects, exams and topics. The plan rebuilds itself a moment after you change anything.
        </p>
      </div>

      {!view ? (
        <LoadingBlock testId="setup-loading">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </LoadingBlock>
      ) : (
        <>
          <SubjectForm subjects={view.subjects} autoFocus={empty} onAdded={(id) => flash(id)} />

          {empty ? (
            <EmptyState
              testId="setup-empty"
              title="Start with a subject"
              description="Add each subject you're studying, then its exams and topics. FocusPlan works out when to study what."
              secondaryAction={
                <Link to="/data" className={buttonClasses('ghost')}>
                  Or load the demo semester
                </Link>
              }
            />
          ) : (
            <ul data-testid="subject-list" className="flex flex-col gap-6">
              {view.subjects.map((s) => (
                <SubjectCard
                  key={s.id}
                  subject={s}
                  exams={view.examsBySubject.get(s.id) ?? []}
                  topicsByExam={view.topicsByExam}
                  allSubjects={view.subjects}
                  today={today}
                  flashing={flashing}
                  flash={flash}
                  onDelete={(t) => void requestDelete(t)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending ? `Delete ${pending.name}?` : ''}
        message={pending?.message}
        confirmLabel={pending ? CONFIRM_LABEL[pending.kind] : 'Delete'}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
