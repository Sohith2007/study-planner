# Screen: Data (`/data`)

**Owner:** P5 (`src/features/data/DataPage.tsx`, `backup.ts`) · **Feature:** F9 · **Wireframe:** `wireframes/data.html`

## Purpose
Makes USP #5 tangible: the data is the student's and lives in this browser. From here the student can back it up, restore it, load the demo semester, or wipe everything, and every destructive step is clear and confirmed.

## Layout regions (`max-w-form mx-auto flex flex-col gap-6`)
1. **Header:** h1 `Data`. Subtitle `text-lead text-muted`: `Everything lives in this browser. No account, no servers. Back it up here.`
2. **Summary strip** (`data-summary`, a sunken card `bg-sunken rounded-lg p-4 text-small text-text`, with each count in `font-mono tabular-nums`): `3 subjects · 3 exams · 12 topics · 26 blocks · 20 focus sessions`. Below it, `text-caption text-muted`: `Stored locally in IndexedDB on this device.`
3. **Card: Export backup**
   - Heading `Export a backup`
   - Body: `Download all your subjects, exams, topics, blocks, focus sessions and settings as one JSON file.`
   - Primary button `Export backup` (`export-button`, download icon) creates `focusplan-backup-YYYY-MM-DD.json` (today, local date).
   - Toast: `Backup downloaded: focusplan-backup-2026-09-19.json`
4. **Card: Import backup**
   - Heading `Import a backup`
   - Body: `Replace everything in this browser with a FocusPlan backup file.`
   - A secondary button-styled `<label>` `Choose backup file` wrapping a visually hidden `<input type="file" accept="application/json,.json" data-testid="import-input">`. It must be a real `input[type=file]` so Playwright `setInputFiles` works, so hide it with `sr-only`, not `display:none`.
   - Error (`import-error`, `role="alert"`, `rounded-md bg-danger-soft text-danger p-3 text-small`), with messages that always end with `Nothing was changed.`:
     - not JSON: `That file isn't valid JSON. Nothing was changed.`
     - wrong app or version: `This isn't a FocusPlan backup, or it's from a newer version. Nothing was changed.`
     - missing or invalid tables: `The backup is missing or has invalid topics. Nothing was changed.` (name the first failing key)
     - read failure: `Couldn't read that file. Nothing was changed.`
   - On a valid file: `confirm-dialog`
     - Title `Replace all your data?`
     - Body: `The backup from 19 Sep 2026 has 3 subjects, 3 exams and 12 topics. It will replace your current 2 subjects, 1 exam and 4 topics. This can't be undone.`
     - Secondary inline link in the body: `Export current data first` (runs the export without closing the dialog)
     - Buttons `Cancel` / **`Replace my data`** (`confirm-ok`, danger)
   - Success toast: `Backup imported: 3 subjects, 3 exams, 12 topics.` The error clears.
   - After any outcome, reset `input.value = ''` so the same file can be chosen again.
5. **Card: Demo semester**
   - Heading `Demo semester`
   - Body: `Load a sample semester (3 subjects, 3 exams, 12 topics and 5 days of focus history) to try FocusPlan out.`
   - Secondary `Reset to demo` (`reset-demo`) → confirm: title `Reset to the demo semester?`, body `Your current data will be replaced by the sample semester. This can't be undone.`, OK `Reset to demo` (danger). Toast `Demo semester loaded`.
6. **Card: Danger zone** (`border-danger/40`)
   - Heading `Clear all data` (`text-danger`)
   - Body: `Delete every subject, exam, topic, block, focus session and setting from this browser.`
   - Danger button `Clear all data` (`clear-all`) → confirm: title `Clear all data?`, body `This deletes everything FocusPlan has stored in this browser. This can't be undone.`, OK `Clear everything` (danger). Toast `All data cleared`.
7. **Privacy note** (`text-small text-muted`, with a lock icon): `FocusPlan never sends your data anywhere. Clearing your browser's site data deletes it too, so export a backup now and then.`

## States
| State | UI |
|---|---|
| Loading | `data-loading`: the summary skeleton `h-14` + 4 card skeletons `h-36` |
| Empty (after Clear all) | the summary reads `0 subjects · 0 exams · 0 topics · 0 blocks · 0 focus sessions`. `Export backup` still works (it exports empty arrays plus settings). An extra helper under the demo card: `Your planner is empty. Load the demo, import a backup, or start in Setup.` with the link `Go to Setup` |
| Working | the button being run shows `Exporting…` / `Importing…` / `Resetting…` / `Clearing…`, with every Data action disabled |
| Error (action) | import errors inline as above. Other failures use an error toast: `Couldn't reset the data. Nothing was changed.` / `Couldn't clear the data. Please try again.` / `Couldn't create the backup file.` |
| Success | toasts as above. Summary counts update live |

## Responsive
- **375:** cards are full width and buttons full width (`w-full`). The summary wraps across lines at the ` · ` separators (each count is `whitespace-nowrap`).
- **768 / 1280:** buttons are auto width and left-aligned under the card body. Cards stack in one column within `max-w-form`.

## Interactions and engineering notes
- Export: build the object `{app:'focusplan', version:1, exportedAt, subjects, exams, topics, blocks, sessions, settings}`, then `Blob` → `URL.createObjectURL` → a temporary `<a download>` click. No network.
- Import: `file.text()` → `JSON.parse` → shape validation (`app === 'focusplan'`, `version === 1`, the arrays present, the settings object present) → confirm → a single Dexie `transaction('rw', all tables)` that clears and bulk-adds. **Also reset the timer** (clear `focusplan.timer.v1`) so it doesn't point at missing blocks.
- Reset and clear also reset the timer and dismiss the catch-up notice.
- **Important for P0:** after `clearAll()`, a reload must **not** re-seed the demo. `clearAll` should write `meta {key:'seed', seededAt, version}` (or an equivalent flag) so that `seedIfEmpty()` sees the database as intentionally empty. Otherwise "Clear all" silently turns back into the demo after a reload.

## data-testid
`data-summary`, `export-button`, `import-input`, `import-error`, `reset-demo`, `clear-all`, `confirm-dialog`, `confirm-ok`, `confirm-cancel`, `data-loading`, `empty-setup-link`.
