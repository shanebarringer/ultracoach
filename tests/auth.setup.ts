import { test as setup } from '@playwright/test'
import path from 'path'

import { setupAuthentication } from './utils/auth-setup-helpers'
import { TEST_RUNNER_EMAIL, TEST_RUNNER_PASSWORD } from './utils/test-helpers'

const authFile = path.join(__dirname, '../playwright/.auth/runner.json')

setup('authenticate @setup', async ({ page, context }) => {
  await setupAuthentication(page, context, {
    role: 'runner',
    email: TEST_RUNNER_EMAIL,
    password: TEST_RUNNER_PASSWORD,
    authFile,
    dashboardPath: '/dashboard/runner',
  })
})
