import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BrandingProvider } from './theme/BrandingProvider';
import { AdminUiProvider } from './admin-ui/AdminUiContext';
import { AuthProvider, RequireAuth } from './auth/AuthProvider';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LearningHomePage } from './pages/student/LearningHomePage';
import { CoursePlayerPage } from './pages/student/CoursePlayerPage';
import { CoursesPage } from './pages/courses/CoursesPage';
import { CourseContentPage } from './pages/courses/CourseContentPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { StudentDetailPage } from './pages/students/StudentDetailPage';
import { EnrollmentsPage } from './pages/enrollments/EnrollmentsPage';
import { SchedulePage } from './pages/schedule/SchedulePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { BrandingSettingsPage } from './pages/admin/BrandingSettingsPage';
import { UsersRolesPage } from './pages/users/UsersRolesPage';
import { ProfileSettingsPage } from './pages/admin/ProfileSettingsPage';

/**
 * Provider order matters:
 *   BrandingProvider  — fetches + applies the tenant theme (splash until ready)
 *     AdminUiProvider — shell UI state (theme/collapse), drives `data-admin-theme`
 *       AuthProvider  — session; RequireAuth guards the shell
 */
export default function App() {
  return (
    <BrandingProvider>
      <AdminUiProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />

                {/* Student learning portal */}
                <Route path="learn" element={<LearningHomePage />} />
                <Route path="learn/:courseId" element={<CoursePlayerPage />} />

                {/* Academics */}
                <Route path="students" element={<StudentsPage />} />
                <Route path="students/:studentId" element={<StudentDetailPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="courses/:courseId" element={<CourseContentPage />} />
                <Route path="enrollments" element={<EnrollmentsPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="reports" element={<ReportsPage />} />

                {/* Administration */}
                <Route path="admin/branding" element={<BrandingSettingsPage />} />
                <Route path="admin/users" element={<UsersRolesPage />} />
                <Route path="admin/billing" element={<PlaceholderPage description="Subscription and fee settings." />} />
                <Route path="admin/settings" element={<PlaceholderPage description="General portal configuration." />} />
                <Route path="admin/profile" element={<ProfileSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-card)',
                color: 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--card-shadow)',
              },
            }}
          />
        </AuthProvider>
      </AdminUiProvider>
    </BrandingProvider>
  );
}
