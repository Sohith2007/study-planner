/** P0 STAND-IN (P1 owns this file): Replan button only. P1 adds catchup-notice and overcapacity-banner. */
import { useState } from 'react'
import { Button } from '@/components/ui'
import { replan } from '@/logic/scheduler/planService'

export default function PlanStatusBar() {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        data-testid="replan-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await replan()
          } finally {
            setBusy(false)
          }
        }}
      >
        Replan
      </Button>
    </div>
  )
}
