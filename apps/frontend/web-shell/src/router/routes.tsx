import type { RouteObject } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPlaceholderPage } from '@/pages/dashboard/DashboardPlaceholderPage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { RolesPermissionsPage } from '@/pages/administration/RolesPermissionsPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { CategoriesPage } from '@/pages/catalogs/CategoriesPage'
import { PrioritiesPage } from '@/pages/catalogs/PrioritiesPage'
import { SlaPoliciesPage } from '@/pages/catalogs/SlaPoliciesPage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { TicketCreatePage } from '@/pages/tickets/TicketCreatePage'
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage'
import { TicketsListPage } from '@/pages/tickets/TicketsListPage'
import { TicketFlowPage } from '@/pages/tickets/TicketFlowPage'
import { UserCreatePage } from '@/pages/users/UserCreatePage'
import { UserEditPage } from '@/pages/users/UserEditPage'
import { UsersListPage } from '@/pages/users/UsersListPage'
import { CrmDashboardPage } from '@/pages/crm/CrmDashboardPage'
import { ClientsListPage } from '@/pages/crm/ClientsListPage'
import { Client360Page } from '@/pages/crm/Client360Page'
import { ContactsPage } from '@/pages/crm/ContactsPage'
import { OpportunitiesPage } from '@/pages/crm/OpportunitiesPage'
import { ActivitiesPage } from '@/pages/crm/ActivitiesPage'
import { SurveysPage } from '@/pages/crm/SurveysPage'
import { SurveyBuilderPage } from '@/pages/crm/SurveyBuilderPage'
import { SurveyResultsPage } from '@/pages/crm/SurveyResultsPage'
import { KnowledgePage } from '@/pages/knowledge/KnowledgePage'
import { KnowledgeDetailPage } from '@/pages/knowledge/KnowledgeDetailPage'
import { SurveyRespondPage } from '@/pages/public/SurveyRespondPage'
import { ForgotPasswordPage } from '@/pages/login/ForgotPasswordPage'
import { ChangePasswordPage } from '@/pages/login/ChangePasswordPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { RenderErrorPage } from '@/pages/errors/RenderErrorPage'
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
    path: '/forgot-password',
    element: <AuthLayout />,
    children: [{ index: true, element: <ForgotPasswordPage /> }],
  },
  {
    path: '/public/surveys/:token',
    element: <SurveyRespondPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { path: 'change-password', element: <ChangePasswordPage /> },
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
            path: 'ticket-flow',
            element: (
              <RoleRoute path="/ticket-flow">
                <TicketFlowPage />
              </RoleRoute>
            ),
          },
          {
            path: 'tickets',
            children: [
              {
                index: true,
                element: (
                  <RoleRoute permission={[PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.TICKET_VIEW_ALL]}>
                    <TicketsListPage />
                  </RoleRoute>
                ),
              },
              { path: 'create', element: <RoleRoute permission={PERMISSIONS.TICKET_CREATE}><TicketCreatePage /></RoleRoute> },
              {
                path: ':id/flow',
                element: (
                  <RoleRoute permission={[PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.TICKET_VIEW_ALL]}>
                    <TicketFlowPage />
                  </RoleRoute>
                ),
              },
              {
                path: ':id',
                element: (
                  <RoleRoute permission={[PERMISSIONS.TICKET_VIEW_OWN, PERMISSIONS.TICKET_VIEW_ALL]}>
                    <TicketDetailPage />
                  </RoleRoute>
                ),
              },
            ],
          },
          {
            path: 'crm',
            children: [
              { path: 'dashboard', element: <RoleRoute permission={PERMISSIONS.CRM_DASHBOARD}><CrmDashboardPage /></RoleRoute> },
              { path: 'clients', element: <RoleRoute permission={PERMISSIONS.CRM_CLIENT_VIEW}><ClientsListPage /></RoleRoute> },
              { path: 'clients/:id', element: <RoleRoute permission={PERMISSIONS.CRM_CLIENT_VIEW}><Client360Page /></RoleRoute> },
              { path: 'contacts', element: <RoleRoute permission={PERMISSIONS.CRM_CONTACT_VIEW}><ContactsPage /></RoleRoute> },
              { path: 'opportunities', element: <RoleRoute permission={PERMISSIONS.CRM_OPPORTUNITY_VIEW}><OpportunitiesPage /></RoleRoute> },
              { path: 'activities', element: <RoleRoute permission={PERMISSIONS.CRM_ACTIVITY_VIEW}><ActivitiesPage /></RoleRoute> },
              { path: 'surveys', element: <RoleRoute permission={PERMISSIONS.CRM_SURVEY_VIEW}><SurveysPage /></RoleRoute> },
              { path: 'surveys/:id', element: <RoleRoute permission={PERMISSIONS.CRM_SURVEY_MANAGE}><SurveyBuilderPage /></RoleRoute> },
              { path: 'surveys/:id/results', element: <RoleRoute permission={PERMISSIONS.CRM_SURVEY_RESULTS}><SurveyResultsPage /></RoleRoute> },
            ],
          },
          { path: 'knowledge', element: <RoleRoute permission={PERMISSIONS.KNOWLEDGE_MANAGE}><KnowledgePage /></RoleRoute> },
          { path: 'knowledge/:id', element: <RoleRoute permission={PERMISSIONS.KNOWLEDGE_MANAGE}><KnowledgeDetailPage /></RoleRoute> },
          {
            path: 'users',
            children: [
              { index: true, element: <RoleRoute permission={PERMISSIONS.USER_MANAGE}><UsersListPage /></RoleRoute> },
              { path: 'create', element: <RoleRoute permission={PERMISSIONS.USER_MANAGE}><UserCreatePage /></RoleRoute> },
              { path: ':id/edit', element: <RoleRoute permission={PERMISSIONS.USER_MANAGE}><UserEditPage /></RoleRoute> },
            ],
          },
          {
            path: 'catalogs',
            children: [
              { path: 'categories', element: <RoleRoute permission={PERMISSIONS.CATEGORY_MANAGE}><CategoriesPage /></RoleRoute> },
              { path: 'priorities', element: <RoleRoute permission={PERMISSIONS.PRIORITY_MANAGE}><PrioritiesPage /></RoleRoute> },
              { path: 'sla-policies', element: <RoleRoute permission={PERMISSIONS.SLA_MANAGE}><SlaPoliciesPage /></RoleRoute> },
            ],
          },
          { path: 'reports', element: <RoleRoute path="/reports"><ReportsPage /></RoleRoute> },
          {
            path: 'administration/roles-permissions',
            element: (
              <RoleRoute permission={PERMISSIONS.ROLE_PERMISSION_MANAGE}>
                <RolesPermissionsPage />
              </RoleRoute>
            ),
          },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'forbidden', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  ...(import.meta.env.VITE_USE_MOCKS === 'true'
    ? [{ path: '/__render-error', element: <RenderErrorPage /> }]
    : []),
  { path: '*', element: <NotFoundPage /> },
]
