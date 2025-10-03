import { test as setup } from '@playwright/test'
import path from 'path'

import { setupAuthentication } from './utils/auth-setup-helpers'
import { TEST_COACH_EMAIL, TEST_COACH_PASSWORD } from './utils/test-helpers'

const authFile = path.join(__dirname, '../playwright/.auth/coach.json')

setup('authenticate as coach @setup', async ({ page, context }) => {
  await setupAuthentication(page, context, {
    role: 'coach',
    email: TEST_COACH_EMAIL,
    password: TEST_COACH_PASSWORD,
    authFile,
    dashboardPath: '/dashboard/coach',
  })
})
