# Screen: Settings (`/settings`)

**Owner:** P3 (`src/features/settings/SettingsPage.tsx`) · **Feature:** F2 · **Wireframe:** `wireframes/settings.html`

## Purpose
Tell FocusPlan how much the student can study and how the timer should run. It is a single form that saves with one button (`settings-save`). Saving triggers the automatic plan rebuild.

## Layout regions (`max-w-form mx-auto flex flex-col gap-6 pb-28`, bottom padding for the sticky footer)
1. **Header:** h1 `Settings`. Subtitle `text-lead text-muted`: `How much you can study, and how your timer runs. Your plan rebuilds when you save.`
2. **Card: Weekly capacity** (`section aria-labelledby`)
   - Heading `Weekly capacity`. Helper: `Pomodoros you can do each day. Set 0 for a day off.`
   - `grid grid-cols-7 gap-2` (375: `grid-cols-4 gap-3`, wrapping to 2 rows). One field per day **in the order Mon, Tue, Wed, Thu, Fri, Sat, Sun**, with test ids `capacity-1`, `capacity-2`, `capacity-3`, `capacity-4`, `capacity-5`, `capacity-6`, `capacity-0` (JS weekday index). Each field has its label above (`Mon`) and an input `h-11 text-center font-mono tabular-nums`, `min=0 max=16`.
   - Summary line (`capacity-summary`, `text-small text-muted`): `38 pomodoros a week · about 15 h 50 min of focus` (from the focus length in the form).
   - Seed values: Mon–Fri `6`, Sat `8`, Sun `4`.
3. **Card: Timer**
   - Heading `Timer`
   - `grid md:grid-cols-2 gap-4`:
     - `Focus length` (`focus-minutes`, suffix `min`, default 25, 5–120)
     - `Short break` (`short-break-minutes`, `min`, 5, 1–30)
     - `Long break` (`long-break-minutes`, `min`, 15, 5–60)
     - `Long break every` (`long-break-every`, suffix `focus sessions`, 4, 2–8)
   - `Default timer mode` (`timer-mode-default`): a radio card pair:
     - `Classic` (`timer-mode-default-classic`): `Fixed focus and break lengths.`
     - `Flowtime` (`timer-mode-default-flowtime`): `Focus until you stop; the break is a fifth of your focus time.`
4. **Card: Daily goal**
   - Heading `Daily goal`
   - `Pomodoros per day` (`daily-goal`, 1–16, default 4). Helper: `Hit this many focus sessions in a day to keep your streak going.`
5. **Card: Blackout dates**
   - Heading `Blackout dates`. Helper: `Days you can't study at all. Nothing gets scheduled on them.`
   - Row: `Date` (`blackout-date-input`, min = today) + secondary `Add date` (`blackout-add`)
   - List `blackout-list` of `blackout-item`: `Sat 3 Oct` (`font-medium`) + optional `Not saved yet` (`text-caption text-warning`) + ghost sm `Remove` (`blackout-remove`, aria-label `Remove Sat 3 Oct`). Sorted ascending.
   - Empty: `No blackout dates.` (`text-small text-muted`, `blackout-empty`)
6. **Card: Review schedule** (read-only)
   - Heading `Review schedule`
   - Text: `Each topic gets short reviews +1, +3 and +7 days after you first study it.` (from `reviewOffsets`; if it's empty: `Reviews are turned off.`)
   - Helper: `Trim reviews from the banner when your plan doesn't fit.`
   - Ghost sm `Restore default reviews` (`review-offsets-reset`), visible only when the offsets are not `[1,3,7]`. It sets them in the form, and they are saved with Save settings.
7. **Card: Sound & notifications**
   - Switch `sound-toggle`: `Play a chime when a phase ends`
   - Switch `notifications-toggle`: `Show a browser notification when a phase ends`
   - If `Notification.permission === 'denied'`: `notifications-blocked` hint `text-small text-warning`: `Your browser is blocking notifications for this site. Allow them in the site settings to use this.`
8. **Sticky footer** (`fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-border`, inner `max-w-form mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3`):
   - Left status (`settings-status`, `text-small`, `aria-live="polite"`): `All changes saved` (muted) / `You have unsaved changes` (text) / `Fix 2 fields to save.` (danger)
   - Right: ghost `Discard` (`settings-discard`, disabled when clean) + primary `Save settings` (`settings-save`, **always enabled**). While saving it reads `Saving…`.

## Validation (on blur and on save; `<testid>-error` under the field; nothing is saved if any field is invalid)
| Field | Range | Message |
|---|---|---|
| capacity-N | integer 0–16 | `Use 0–16.` (short, because the columns are narrow) |
| focus-minutes | 5–120 | `Focus must be 5–120 minutes.` |
| short-break-minutes | 1–30 | `Short break must be 1–30 minutes.` |
| long-break-minutes | 5–60 | `Long break must be 5–60 minutes.` |
| long-break-every | 2–8 | `Choose 2–8 focus sessions.` |
| daily-goal | 1–16 | `Goal must be 1–16 pomodoros.` |
| blackout-date-input | present | `Pick a date.` |
| blackout-date-input | ≥ today | `Blackout dates can't be in the past.` |
| blackout-date-input | not a duplicate | `That date is already blacked out.` |

Empty or non-integer input counts as invalid (`Use 0–16.` / the range message). On a failed save: focus moves to the first invalid field, the footer reads `Fix N field(s) to save.`, and no toast is shown.

## States
| State | UI |
|---|---|
| Loading | `settings-loading`: 5 card skeletons (`h-40`, `h-56`, `h-28`, `h-32`, `h-28`). The footer is hidden |
| Clean | footer `All changes saved`, Discard disabled |
| Dirty | footer `You have unsaved changes`. The browser `beforeunload` prompt is on |
| Saving | `Save settings` → `Saving…` (disabled) |
| Success | toast **`Settings saved`**. The footer reads `All changes saved`. The plan rebuilds about 0.5 s later (the status bar shows `Updating plan…`) |
| Invalid | inline errors plus the footer message. Nothing is written |
| Error (write) | error toast `Couldn't save settings. Please try again.` The form keeps its values |
| Error (read) | `page-error` |

There is no empty state. Settings always exist (seeded, or defaults after Clear all).

## Responsive
- **375:** the capacity grid is 4 + 3 columns. The timer fields are one column. The radio cards stack. The footer shows the status on top with the buttons full width in a row (`Discard` 1/3, `Save settings` 2/3).
- **768:** capacity is 7 columns. Timer fields in 2 columns. The footer is on one row.
- **1280:** same as 768 within `max-w-form`.

## Interactions
- The form state is local (`useState` seeded from `getSettings()` once). Live-query changes after load don't overwrite a dirty form. The one exception: if `reviewOffsets` changes externally (Trim reviews) while the form is clean, re-seed.
- `Add date` validates and appends to the local list (marked `Not saved yet`). `Remove` removes it from the local list. Both mark the form dirty. **Blackout changes are saved with `Save settings`.**
- `Discard` resets to the stored settings.
- Save: `saveSettings(patch)`, then the toast. Timer lengths apply to the next idle timer phase (a running phase keeps its length).
- Number inputs: the arrow keys step by 1, mouse-wheel changes are disabled (`onWheel={e => e.currentTarget.blur()}`), and the value is selected on focus.

## data-testid
`capacity-0` … `capacity-6`, `capacity-summary`, `focus-minutes`, `short-break-minutes`, `long-break-minutes`, `long-break-every`, `timer-mode-default`, `timer-mode-default-classic`, `timer-mode-default-flowtime`, `daily-goal`, `blackout-date-input`, `blackout-add`, `blackout-list`, `blackout-item`, `blackout-remove`, `blackout-empty`, `review-offsets-reset`, `sound-toggle`, `notifications-toggle`, `notifications-blocked`, `settings-status`, `settings-discard`, `settings-save`, `settings-loading`, and `<testid>-error` for each field.
