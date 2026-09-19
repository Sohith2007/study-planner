import { Navigate, Route, Routes } from 'react-router'
import { lazy } from 'react'
import { Layout } from './Layout'

// Pages are code-split (one chunk each); Layout wraps <Outlet/> in <Suspense> with a LoadingBlock fallback.
const TodayPage = lazy(() => import('@/features/planner/TodayPage'))
const WeekPage = lazy(() => import('@/features/planner/WeekPage'))
const FocusPage = lazy(() => import('@/features/focus/FocusPage'))
const SetupPage = lazy(() => import('@/features/setup/SetupPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const DataPage = lazy(() => import('@/features/data/DataPage'))

export { NAV_ITEMS } from './nav'

/**
 * Routes (master-plan 4.3): / -> /today, /today, /week?start=YYYY-MM-DD, /focus?blockId=<id>,
 * /setup, /settings, /dashboard, /data. Unknown routes redirect to /today. Query params are read by the pages via useSearchParams.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="week" element={<WeekPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  )
}
