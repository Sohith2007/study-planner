import { Navigate, Route, Routes } from 'react-router'
import TodayPage from '@/features/planner/TodayPage'
import WeekPage from '@/features/planner/WeekPage'
import FocusPage from '@/features/focus/FocusPage'
import SetupPage from '@/features/setup/SetupPage'
import SettingsPage from '@/features/settings/SettingsPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import DataPage from '@/features/data/DataPage'
import { Layout } from './Layout'

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
