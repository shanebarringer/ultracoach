# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project settings (Project Settings → Environment Variables):

### Database & Supabase Configuration

```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
```

### Better Auth Configuration

```
BETTER_AUTH_SECRET=your-production-secret-here
BETTER_AUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-app-name.vercel.app
```

### Production Settings

```
NODE_ENV=production
PORT=3000
```

## MCP Environment Variables (if using)

```
GITHUB_TOKEN=your-github-token
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

## Important Notes:

1. **Replace YOUR_PROJECT_REF** with your actual Supabase project reference
2. **BETTER_AUTH_URL will be auto-assigned** - update after first deployment
3. **Use production Supabase keys** - don't use development keys
4. **Generate new BETTER_AUTH_SECRET** for production (use the rotation script)

## Security Checklist:

- [ ] All secrets are different from development
- [ ] Database password is strong and unique
- [ ] BETTER_AUTH_SECRET is cryptographically secure
- [ ] No localhost URLs in production variables
- [ ] All NEXT*PUBLIC* variables contain no sensitive data
