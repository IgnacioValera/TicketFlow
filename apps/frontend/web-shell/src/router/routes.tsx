import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPlaceholderPage } from '@/pages/dashboard/DashboardPlaceholderPage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ReportsPlaceholderPage } from '@/pages/reports/ReportsPlaceholderPage'
import { TicketsPlaceholderPage } from '@/pages/tickets/TicketsPlaceholderPage'
import { UserCreatePage } from '@/pages/users/UserCreatePage'
import { UserEditPage } from '@/pages/users/UserEditPage'
import { UsersListPage } from '@/pages/users/UsersListPage'
import { ProtectedRoute } from '@/router/ProtectedRoute'
import { RoleRoute } from '@/router/RoleRoute'
import { HomeRedirect } from '@/router/HomeRedirect'

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            path: 'dashboard',
            element: (
              <RoleRoute path="/dashboard">
                <DashboardPlaceholderPage />
              </RoleRoute>
            ),
          },
          {
            path: 'tickets',
            children: [
              {
                index: true,
                element: (
                  <RoleRoute permission={PERMISSIONS.TICKET_VIEW_OWN}>
                    <TicketsPlaceholderPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'create',
                element: (
                  <RoleRoute permission={PERMISSIONS.TICKET_CREATE}>
                    <TicketsPlaceholderPage />
                  </RoleRoute>
                ),
              },
              {
                path: ':id',
                element: (
                  <RoleRoute permission={PERMISSIONS.TICKET_VIEW_OWN}>
                    <TicketsPlaceholderPage />
                  </RoleRoute>
                ),
              },
            ],
          },
          {
            path: 'users',
            children: [
              {
                index: true,
                element: (
                  <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
                    <UsersListPage />
                  </RoleRoute>
                ),
              },
              {
                path: 'create',
                element: (
                  <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
                    <UserCreatePage />
                  </RoleRoute>
                ),
              },
              {
                path: ':id/edit',
                element: (
                  <RoleRoute permission={PERMISSIONS.USER_MANAGE}>
                    <UserEditPage />
                  </RoleRoute>
                ),
              },
            ],
          },
          {
            path: 'reports',
            element: (
              <RoleRoute path="/reports">
                <ReportsPlaceholderPage />
              </RoleRoute>
            ),
          },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'forbidden', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
