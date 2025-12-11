# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for avatar uploads in the UltraCoach application.

## Overview

UltraCoach uses Supabase Storage for storing user-uploaded profile avatars. This solution works seamlessly with Vercel's serverless deployment and provides:

- **1GB free storage** (Free tier)
- **2GB bandwidth/month** (Free tier)
- Built-in CDN for fast image delivery
- Image transformations (resizing, optimization)
- Row Level Security (RLS) integration

## Setup Instructions

### 1. Run Database Migration

The storage bucket and policies are automatically created via migration:

```bash
# Local development
pnpm run db:migrate:local

# Production
pnpm run prod:db:migrate
```

This creates:

- `avatars` bucket with public read access
- File size limit: 5MB
- Allowed types: JPEG, PNG, GIF, WebP
- RLS policies for user-specific uploads

### 2. Verify Bucket Creation

Check that the bucket was created successfully:

**Via Supabase Dashboard:**

1. Go to Storage section
2. Look for "avatars" bucket
3. Verify it's set to "Public"

**Via SQL:**

```sql
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

### 3. Test Upload Functionality

**Manual Test:**

1. Sign in to the application
2. Go to Profile page
3. Upload an avatar image
4. Verify the image appears and the URL contains `storage/v1/object/public/avatars/`

**Expected URL format:**

```
https://[project-ref].supabase.co/storage/v1/object/public/avatars/[user-id]/avatar-[user-id]-[timestamp].jpg
```

## Storage Structure

```text
avatars/
├── [user-id-1]/
│   └── avatar-[user-id-1]-[timestamp].jpg
├── [user-id-2]/
│   └── avatar-[user-id-2]-[timestamp].png
└── ...
```

Each user's avatars are stored in their own folder using their user ID.

## Security Policies

### Public Read Access

Anyone can view avatar images (required for profile pages).

### Authenticated Upload

Only authenticated users can upload files.

### User-Specific Access

Users can only upload/update/delete files in their own folder (`/{user-id}/`).

### File Validation

- **Size limit:** 5MB maximum
- **File types:** JPEG, JPG, PNG, GIF, WebP only
- **Magic bytes validation:** Server-side validation of actual file content
- **Mime type validation:** Enforced by Supabase Storage policies

## Image Transformations

Supabase Storage supports automatic image transformations via URL parameters:

### Resize Image

```text
{publicUrl}?width=200&height=200
```

### Quality Adjustment

```text
{publicUrl}?quality=80
```

### Format Conversion

```text
{publicUrl}?format=webp
```

### Combined

```text
{publicUrl}?width=200&height=200&quality=80&format=webp
```

## Troubleshooting

### Bucket Not Found Error

**Symptom:** `Bucket not found` error when uploading

**Solution:**

```bash
# Re-run migration
pnpm run db:migrate:local
```

Or manually create the bucket in Supabase Dashboard.

### Permission Denied Error

**Symptom:** `Permission denied` error when uploading

**Solution:** Verify RLS policies exist:

```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

If policies are missing, re-run the migration.

### Old Images Not Deleted

**Symptom:** Old avatar files remain after uploading new one

**Solution:** This is expected behavior with `upsert: true`. Old files with different filenames are intentionally kept for a short period, but the database only references the latest avatar URL.

To manually clean up old files:

```typescript
// In avatar upload route, add cleanup logic
const oldFiles = await supabaseAdmin.storage.from('avatars').list(`${session.user.id}`)

// Keep only the latest file
// Delete others...
```

## Cost Estimates

**Free Tier Limits:**

- Storage: 1GB
- Bandwidth: 2GB/month

**Estimated Usage (100 coaches):**

- Average avatar size: 500KB
- Total storage: ~50MB
- Monthly bandwidth: ~5GB (if each avatar viewed 100 times)

**Conclusion:** Free tier is sufficient for typical usage. Paid tier starts at $0.021/GB if limits are exceeded.

## Migration from Local Filesystem

If you have existing local avatar files in `/public/uploads/avatars/`, you can migrate them:

### Manual Migration Script

```typescript
// scripts/migrate-avatars-to-supabase.ts
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

import { supabaseAdmin } from '@/lib/supabase-admin'

const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
const files = readdirSync(uploadsDir)

for (const filename of files) {
  // Extract user ID from filename: avatar-{userId}-{timestamp}.{ext}
  const match = filename.match(/avatar-(.+?)-\d+\./)
  if (!match) continue

  const userId = match[1]
  const filePath = join(uploadsDir, filename)
  const buffer = readFileSync(filePath)

  await supabaseAdmin.storage.from('avatars').upload(`${userId}/${filename}`, buffer, {
    upsert: true,
  })

  console.log(`Migrated: ${filename}`)
}
```

Run with:

```bash
tsx scripts/migrate-avatars-to-supabase.ts
```

## Related Files

- `src/app/api/upload/avatar/route.ts` - Avatar upload API
- `src/lib/supabase-admin.ts` - Supabase admin client
- `supabase/migrations/20251211000000_create_avatars_storage_bucket.sql` - Storage setup migration
- `src/components/profile/AvatarUpload.tsx` - Frontend upload component

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
