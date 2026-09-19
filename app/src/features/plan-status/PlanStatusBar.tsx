/**
 * P0 STAND-IN (P1 owns this file): status row + Replan button only.
 * P1 adds "Updating plan…", relative rebuilt time, catchup-notice and overcapacity-banner
 * (design-system 4.6). Layout does not render this on /focus.
 */
import { useState } from 'react'
import { Button, Icon, useToast } from '@/components/ui'
import { replan } from '@/logic/scheduler/planService'

export default function PlanStatusBar() {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 pt-3 md:px-6 xl:px-8">
      <div data-testid="plan-status" className="flex items-center justify-between gap-3 text-small text-muted">
        <span aria-live="polite">{busy ? 'Updating plan…' : 'Plan up to date'}</span>
        <Button
          variant="secondary"
          size="sm"
          data-testid="replan-button"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await replan()
              toast.show('Plan rebuilt')
            } catch {
              toast.show("Couldn't rebuild the plan. Your blocks are unchanged. Try Replan again.", 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Icon.Refresh />
          {busy ? 'Replanning…' : 'Replan'}
        </Button>
      </div>
    </div>
  )
}
