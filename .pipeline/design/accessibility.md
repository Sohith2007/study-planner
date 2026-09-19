# FocusPlan Accessibility Spec

Target: **WCAG 2.2 AA**. The ratios below were computed with the WCAG relative-luminance formula for the token hex values in `tokens.json` (rounded down to 1 decimal). Text needs 4.5:1 (3:1 for ≥24px, or ≥18.66px bold). UI components and graphics need 3:1.

## 1. Contrast: light theme

| Foreground | Background | Ratio | Use | Result |
|---|---|---|---|---|
| `text` #1C1B19 | `bg` #F6F4EF | 15.6 | body | AA/AAA |
| `text` #1C1B19 | `surface` #FFFDF9 | 16.9 | body on cards | AAA |
| `text` #1C1B19 | `sunken` #EFECE4 | 14.5 | done rows, summary | AAA |
| `muted` #5F5B53 | `bg` #F6F4EF | 6.1 | secondary text | AA |
| `muted` #5F5B53 | `surface` #FFFDF9 | 6.6 | secondary on cards | AA |
| `muted` #5F5B53 | `sunken` #EFECE4 | 5.7 | skeleton labels, stub labels | AA |
| `on-primary` #FFFFFF | `primary` #1F5C4A | 7.8 | primary buttons | AAA |
| `primary` #1F5C4A | `bg` #F6F4EF | 7.1 | links, ghost buttons | AAA |
| `primary` #1F5C4A | `primary-soft` #DCEBE4 | 6.3 | New badge, active nav | AA |
| `on-accent` #FFFFFF | `accent` #C23E22 | 5.2 | timer Start | AA |
| `accent` #C23E22 | `bg` #F6F4EF | 4.7 | exam TODAY label | AA |
| `on-accent` #FFFFFF | `accent-hover` #A3321A | 6.9 | hover | AA |
| `success` #45700F | `success-soft` #E4EFD3 | 4.9 | Done/Covered badge | AA |
| `success` #45700F | `surface` #FFFDF9 | 5.7 | "Goal met" text | AA |
| `warning` #9A5B00 | `warning-soft` #FBEBC8 | 4.6 | Partial badge | AA |
| `warning` #9A5B00 | `surface` #FFFDF9 | 5.3 | capacity over, hints | AA |
| `text` #1C1B19 | `warning-soft` #FBEBC8 | 14.6 | banner body | AAA |
| `danger` #A8233A | `surface` #FFFDF9 | 6.9 | errors | AA |
| `danger` #A8233A | `danger-soft` #F8DEE2 | 5.5 | import error | AA |
| `on-primary` #FFFFFF | `danger` #A8233A | 7.0 | danger buttons | AAA |
| `break` #2D5B86 | `break-soft` #DCE7F2 | 5.6 | Review badge, catch-up | AA |
| `text` #1C1B19 | `break-soft` #DCE7F2 | 13.7 | Focus page during breaks | AAA |
| `on-primary` #FFFFFF | `break` #2D5B86 | 7.1 | Start break, timer pill on break | AAA |
| `bg` #F6F4EF | `text` #1C1B19 | 15.6 | toast (inverted) | AAA |
| **Non-text** `border-strong` #8A8478 | `surface` #FFFDF9 | 3.6 | input outlines | ≥3:1 |
| **Non-text** `border-strong` #8A8478 | `bg` #F6F4EF | 3.3 | segmented/checkbox outlines | ≥3:1 |
| **Non-text** `primary` focus ring | `bg` / `surface` | 7.1 / 7.6 | focus indicator | ≥3:1 |
| **Non-text** `accent` burn line / pips | `sunken` #EFECE4 | 4.4 | progress | ≥3:1 |

## 2. Contrast: dark theme

| Foreground | Background | Ratio | Result |
|---|---|---|---|
| `text` #EDEAE2 | `bg` #161512 | 15.1 | AAA |
| `text` #EDEAE2 | `surface` #1F1E1A | 13.8 | AAA |
| `muted` #A8A294 | `bg` #161512 | 7.1 | AAA |
| `muted` #A8A294 | `surface` #1F1E1A | 6.5 | AA |
| `muted` #A8A294 | `sunken` #292823 | 5.8 | AA |
| `on-primary` #0F2A22 | `primary` #6FC2A6 | 7.2 | AAA |
| `primary` #6FC2A6 | `bg` #161512 | 8.6 | AAA |
| `primary` #6FC2A6 | `primary-soft` #1E3B32 | 5.7 | AA |
| `on-accent` #1C0B06 | `accent` #F07A5C | 7.0 | AAA |
| `accent` #F07A5C | `bg` #161512 | 6.6 | AA |
| `success` #9CCB5E | `surface` #1F1E1A | 8.8 | AAA |
| `success` #9CCB5E | `success-soft` #26341A | 6.9 | AA |
| `warning` #E8B04A | `warning-soft` #3D3017 | 6.5 | AA |
| `danger` #F2788C | `surface` #1F1E1A | 6.2 | AA |
| `danger` #F2788C | `danger-soft` #3E1F25 | 5.6 | AA |
| `break` #7FB0DE | `break-soft` #1C2C3C | 6.2 | AA |
| `on-primary` #0F2A22 | `break` #7FB0DE | 6.6 | AA (Start break in dark) |
| Non-text `border-strong` #77726A | `surface` #1F1E1A | 3.5 | ≥3:1 |

**Pairs that are NOT allowed** (they fail AA): `accent` text on `accent-soft` (light 4.2), `muted` on `primary-soft`, and any subject colour used as text (Amber #F59E0B on surface is about 2.1). Subject colours are decorative only and always sit next to the subject name.

**Danger buttons in dark mode:** `on-primary` (#0F2A22) on `danger` #F2788C gives 5.7, which passes. Use `text-on-primary` for danger button labels in both themes (in light it resolves to white on #A8233A at 7.0).

## 3. Landmarks and headings
- `<header>` (nav) → `<nav aria-label="Main">`. The PlanStatusBar is a `<section aria-label="Plan status">`. The page content is `<main id="main">`. The toast region is `<div role="region" aria-label="Notifications">`.
- There is exactly one `<h1>` per page: `Today`, `Week`, `Focus`, `Setup`, `Settings`, `Dashboard`, `Data`. Sections use `<h2>`, and exam blocks inside a subject use `<h3>`.
- A skip link, "Skip to content", is the first tab stop.
- On route change, focus moves to the `<h1>` (`tabIndex=-1`, with no visible outline on programmatic focus: `focus:outline-none`, keeping `focus-visible` styles).

## 4. Focus order (per screen)
All tab orders follow the DOM, which follows the visual order.
- **Shell:** Skip link → wordmark → Today … Data → timer pill (if shown) → status bar: Replan → catch-up dismiss → Trim reviews → Raise daily capacity → main content.
- **Today:** Add task → Start next → for each block: Start → Done → Partial → Skip → More (menu). At 375: Start → Done → More.
- **Week:** Previous week → This week → Next week → Add task → the cards in column order (Mon top→bottom, then Tue …). Each card opens its menu with Enter.
- **Focus:** Classic/Flowtime (one tab stop, arrows inside) → primary control (Start/Pause/Resume) → End focus (Flowtime) → Skip → Reset → Change/Next block link. Initial focus on arrival is the h1. Pressing Space from there toggles the timer.
- **Setup:** Subject name → colour group (one stop) → Add subject → for each subject: Edit → Delete → each exam: Edit → Delete → topic rows (Rename → Pomodoros → Difficulty → Undo covered → Delete) → Add-topic fields → Quick add → Add exam.
- **Settings:** Mon … Sun → Focus length → Short break → Long break → Long break every → mode radios → Daily goal → Blackout date → Add date → Remove buttons → Restore default reviews → Sound switch → Notifications switch → Discard → Save settings (the footer is last in the DOM).
- **Dashboard:** there are no interactive elements except the empty-state CTA and the chart. Chart bars are not individually tabbable; the hidden data table provides the values.
- **Data:** Export backup → Choose backup file → Reset to demo → Clear all data.

## 5. ARIA notes by component
| Component | ARIA |
|---|---|
| Nav link | `aria-current="page"` on the active link |
| Timer pill | `aria-label="Timer running: 18 minutes 42 seconds left in Focus. Open Focus."` (updated each minute, not each second) |
| Plan status text | `aria-live="polite"`. Announce only `Updating plan…` → `Plan up to date` (not the relative-time changes) |
| Catch-up notice | `role="status"`. Dismiss button `aria-label="Dismiss"` |
| Over-capacity banner | `role="alert"` on first appearance, then `role="status"` |
| Block row | `<li aria-label="Derivatives, New, Mathematics, 0 of 2 pomodoros, planned">`. Pips `aria-hidden` |
| Block menu | `button aria-haspopup="menu" aria-expanded`, `role="menu"` / `menuitem`, roving focus with arrow keys, Esc closes |
| Week card | `role="button" aria-haspopup="menu"`, full `aria-label` (see week.md). `aria-grabbed` is not used (deprecated) |
| Week column | `role="listitem" aria-label="Monday 14 September, 4 of 6 pomodoros"`, and `aria-current="date"` for today |
| Countdown | `role="timer" aria-live="off"`. A separate `sr-only` `aria-live="polite"` region announces **only** phase events: `Focus started. 25 minutes.`, `Paused at 18 minutes 42 seconds.`, `Focus complete. Short break, 5 minutes.`, `Break over.` |
| Phase label | plain text. The dot is `aria-hidden` |
| Mode switch | `role="radiogroup" aria-label="Timer mode"`. Options `role="radio" aria-checked`. When disabled: `aria-disabled="true"` + the helper referenced by `aria-describedby` |
| Burn line / readiness bar | the burn line is `aria-hidden`. Readiness is `role="progressbar" aria-valuenow aria-valuemin=0 aria-valuemax=100 aria-label="Readiness for Calculus Midterm"` |
| Colour swatches | `role="radiogroup" aria-label="Subject colour"`. Each is `role="radio" aria-label="Rose" aria-checked` |
| Confidence / partial choice | `role="radiogroup"` with a visible label (`How confident are you?`) |
| Switches | `button role="switch" aria-checked` + a visible label (`aria-labelledby`) |
| Fields | `<label for>`. Errors are linked by `aria-describedby`, with `aria-invalid="true"` |
| Dialogs | `role="dialog" aria-modal="true" aria-labelledby aria-describedby`, focus trap, focus returned to the trigger |
| Toasts | `role="status"` (errors: `role="alert"`). Auto-dismiss pauses on hover and focus. Toasts with an action (Undo) stay 8 s. Every toast action is also available on the page itself (`block-undo` on the row), so the toast is never the only path |
| Chart | `<figure aria-labelledby>`, a hidden `<table>` with the data. Recharts SVG `aria-hidden="true"` |
| File input | the real `<input type=file>` is `sr-only` and focusable. The label styled as a button shows the focus ring through `:focus-within` on the label |
| Icons | decorative `aria-hidden="true"`. Icon-only buttons have `aria-label` |

## 6. Keyboard interactions
| Where | Key | Action |
|---|---|---|
| Global | Tab / Shift+Tab | move focus. The focus ring is always visible |
| Menus | Enter/Space open · ↑/↓ move · Home/End · Esc close | standard menu button |
| Dialogs | Esc | Cancel (or `Not yet` for Topic check) |
| Dialogs | Enter in a field | submit the primary action (never the destructive one) |
| Radiogroups | ←/→/↑/↓ | move and select |
| Focus page | Space (focus on body/h1/timer panel) | Start / Pause / Resume |
| Week card | Enter/Space | open the block menu (Move is the keyboard alternative to drag) |
| Setup inline edits | Enter save · Esc cancel | |
| Number inputs | ↑/↓ | ±1. Wheel changes are disabled |

## 7. Other requirements
- **Targets:** ≥44×44px at 375 (`h-11` / `size-11`). The dense `h-9` controls are used only at md and up with a mouse.
- **Reduced motion:** `motion-reduce:` removes the pulse, translate and slide animations. The Focus phase tint changes instantly.
- **Zoom / reflow:** everything works at 320px and at 200% zoom. The timer clamp minimum (88px) fits in 320px (`25:00` is about 264px).
- **Colour is never the only signal:** statuses have text badges, subjects have names, today has a `Today` label, blackout has a `Blackout` label, and done has strikethrough plus a badge.
- **Title:** `document.title` shows the timer (it is also an at-a-glance aid for sighted users). It is not announced.
- **Language:** `<html lang="en">`.
- **Notifications:** permission is requested only from a user gesture (Start), never on load.
