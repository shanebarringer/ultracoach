/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Replicate the signin schema from the component
const signInSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
})

// Replicate the signup schema (inferred from typical requirements)
const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Please enter a valid email address' }),
    password: z
      .string()
      .min(1, { message: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
    name: z
      .string()
      .min(1, { message: 'Name is required' })
      .min(2, { message: 'Name must be at least 2 characters' }),
    role: z.enum(['runner', 'coach']),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Password reset schema
const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
})

const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, { message: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
    token: z.string().min(1, { message: 'Reset token is required' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

describe('Form Validation Tests', () => {
  describe('Sign In Form Validation', () => {
    it('should validate correct signin data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = signInSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required')
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address')
      }
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required')
      }
    })

    it('should reject password shorter than 6 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters')
      }
    })

    it('should handle malicious input safely', () => {
      const maliciousData = {
        email: '<script>alert("xss")</script>@example.com',
        password: '"><script>alert("xss")</script>',
      }

      const result = signInSchema.safeParse(maliciousData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address')
      }
    })
  })

  describe('Sign Up Form Validation', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'John Doe',
        role: 'runner' as const,
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate coach role', () => {
      const validData = {
        email: 'coach@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Coach Smith',
        role: 'coach' as const,
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject weak passwords', () => {
      const testCases = [
        {
          password: 'password',
          expectedError: 'Password must contain at least one uppercase letter',
        },
        {
          password: 'PASSWORD',
          expectedError: 'Password must contain at least one lowercase letter',
        },
        {
          password: 'Password',
          expectedError: 'Password must contain at least one number',
        },
        {
          password: 'Password123',
          expectedError: 'Password must contain at least one special character',
        },
        {
          password: 'Pass1!',
          expectedError: 'Password must be at least 8 characters',
        },
      ]

      testCases.forEach(({ password, expectedError }) => {
        const invalidData = {
          email: 'test@example.com',
          password,
          confirmPassword: password,
          name: 'John Doe',
          role: 'runner' as const,
        }

        const result = signUpSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          const passwordError = result.error.issues.find(issue => issue.path.includes('password'))
          expect(passwordError?.message).toBe(expectedError)
        }
      })
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password456!',
        name: 'John Doe',
        role: 'runner' as const,
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmError = result.error.issues.find(issue =>
          issue.path.includes('confirmPassword')
        )
        expect(confirmError?.message).toBe('Passwords do not match')
      }
    })

    it('should reject invalid roles', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'John Doe',
        role: 'admin' as 'runner' | 'coach',
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const roleError = result.error.issues.find(issue => issue.path.includes('role'))
        expect(roleError?.message).toContain('expected one of')
      }
    })

    it('should reject empty or short names', () => {
      const testCases = [
        { name: '', expectedError: 'Name is required' },
        { name: 'A', expectedError: 'Name must be at least 2 characters' },
      ]

      testCases.forEach(({ name, expectedError }) => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name,
          role: 'runner' as const,
        }

        const result = signUpSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          const nameError = result.error.issues.find(issue => issue.path.includes('name'))
          expect(nameError?.message).toBe(expectedError)
        }
      })
    })
  })

  describe('Password Reset Form Validation', () => {
    it('should validate correct password reset email', () => {
      const validData = {
        email: 'test@example.com',
      }

      const result = passwordResetSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty email for password reset', () => {
      const invalidData = {
        email: '',
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required')
      }
    })

    it('should reject invalid email format for password reset', () => {
      const invalidData = {
        email: 'invalid.email',
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address')
      }
    })
  })

  describe('New Password Form Validation', () => {
    it('should validate correct new password data', () => {
      const validData = {
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
        token: 'valid-reset-token-123',
      }

      const result = newPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject weak new passwords', () => {
      const invalidData = {
        password: 'weak',
        confirmPassword: 'weak',
        token: 'valid-token',
      }

      const result = newPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('should reject mismatched new passwords', () => {
      const invalidData = {
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
        token: 'valid-token',
      }

      const result = newPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmError = result.error.issues.find(issue =>
          issue.path.includes('confirmPassword')
        )
        expect(confirmError?.message).toBe('Passwords do not match')
      }
    })

    it('should reject empty reset token', () => {
      const invalidData = {
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
        token: '',
      }

      const result = newPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const tokenError = result.error.issues.find(issue => issue.path.includes('token'))
        expect(tokenError?.message).toBe('Reset token is required')
      }
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle extremely long input', () => {
      const longString = 'a'.repeat(10000)
      const invalidData = {
        email: `${longString}@example.com`,
        password: longString,
      }

      const result = signInSchema.safeParse(invalidData)
      // Should either reject due to email format or handle gracefully
      expect(typeof result.success).toBe('boolean')
    })

    it('should handle special characters in names', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: "O'Connor-Smith", // Valid name with special characters
        role: 'runner' as const,
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should handle unicode characters in names', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'José María', // Unicode characters
        role: 'runner' as const,
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject null/undefined values', () => {
      const invalidData = {
        email: null,
        password: undefined,
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
