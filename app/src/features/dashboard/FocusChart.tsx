import { useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate, parseISODate, WEEKDAY_SHORT } from '@/lib'
import type { ISODate } from '@/types'
import { minuteTicks, type WeekSeries } from './stats'

const MD_QUERY = '(min-width: 768px)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(MD_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** True at the md breakpoint (768px) and up. */
function useIsMd(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MD_QUERY).matches,
    () => true,
  )
}

/** "Sun 13", or "Today" for today. */
function dayLabel(date: ISODate, today: ISODate): string {
  if (date === today) return 'Today'
  const d = parseISODate(date)
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}`
}

interface Row {
  date: ISODate
  label: string
  total: number
  [key: string]: number | string
}

interface TooltipEntry {
  dataKey?: unknown
  value?: unknown
  payload?: Row
}

function ChartTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  series: WeekSeries
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="min-w-40 rounded-md border border-border bg-surface p-3 text-small shadow-raised">
      <p className="font-semibold text-text">{formatShortDate(row.date)}</p>
      {series.keys.map((k) => (
        <p key={k.key} className="flex items-center gap-2 text-text">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: k.color }} aria-hidden="true" />
          {k.name}
          <span className="ml-auto pl-4 font-mono tabular-nums">{Number(row[k.key] ?? 0)} min</span>
        </p>
      ))}
      <p className="mt-1 flex border-t border-border pt-1 font-medium text-text">
        Total <span className="ml-auto pl-4 font-mono tabular-nums">{row.total} min</span>
      </p>
    </div>
  )
}

const tick = { fill: 'var(--fp-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }

/**
 * Last-7-days stacked bar chart (screens/dashboard.md "Chart").
 * The Recharts SVG is aria-hidden; a visually hidden table carries the values.
 */
export function FocusChart({ series, today }: { series: WeekSeries; today: ISODate }) {
  const isMd = useIsMd()
  const ticks = minuteTicks(Math.max(0, ...series.days.map((d) => d.total)))
  const rows: Row[] = series.days.map((d) => ({ date: d.date, label: dayLabel(d.date, today), total: d.total, ...d.values }))

  return (
    <figure
      data-testid="focus-chart"
      aria-labelledby="dashboard-chart-heading"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card md:p-5"
    >
      <figcaption className="sr-only">Focus minutes by subject for the last 7 days, ending today.</figcaption>
      {series.hasData ? (
        <>
          <div aria-hidden="true" className="h-60 md:h-70">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                accessibilityLayer={false}
                margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid vertical={false} stroke="var(--fp-border)" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={tick}
                  tickMargin={8}
                />
                <YAxis
                  hide={!isMd}
                  width={64}
                  ticks={ticks}
                  domain={[0, ticks[ticks.length - 1]]}
                  interval={0}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={tick}
                  tickFormatter={(n: number) => `${n} min`}
                />
                <Tooltip
                  cursor={{ fill: 'var(--fp-sunken)' }}
                  content={(props) => (
                    <ChartTooltip active={props.active} payload={props.payload as readonly TooltipEntry[]} series={series} />
                  )}
                />
                {series.keys.map((k) => (
                  <Bar
                    key={k.key}
                    dataKey={k.key}
                    name={k.name}
                    stackId="focus"
                    fill={k.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={isMd ? 40 : 18}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul data-testid="focus-chart-legend" className="flex flex-wrap gap-x-4 gap-y-2 text-small text-muted">
            {series.keys.map((k) => (
              <li key={k.key} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: k.color }} aria-hidden="true" />
                {k.name}
              </li>
            ))}
          </ul>
          <table data-testid="focus-chart-table" className="sr-only">
            <caption>Focus minutes by subject, last 7 days</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {series.keys.map((k) => (
                  <th key={k.key} scope="col">
                    {k.name}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <th scope="row">{r.label}</th>
                  {series.keys.map((k) => (
                    <td key={k.key}>{Number(r[k.key] ?? 0)}</td>
                  ))}
                  <td>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div data-testid="chart-empty" className="grid h-60 place-items-center text-center">
          <p className="text-small text-muted">
            No focus sessions in the last 7 days. Start one from Today.
            <br />
            <Link to="/today" className="font-medium text-primary underline underline-offset-2">
              Go to Today
            </Link>
          </p>
        </div>
      )}
    </figure>
  )
}
