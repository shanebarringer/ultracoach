# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
The dev server uses Turbopack for faster builds and runs on http://localhost:3000

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

**Run linting:**
```bash
npm run lint
```

## Architecture

This is a Next.js 15 application using the App Router with the following structure:

- **Framework**: Next.js 15.3.5 with App Router
- **Styling**: Tailwind CSS v4
- **TypeScript**: Full TypeScript support with strict mode
- **Fonts**: Uses Geist Sans and Geist Mono fonts via `next/font/google`
- **Path aliases**: `@/*` maps to `./src/*`

### Key Files

- `src/app/layout.tsx` - Root layout with font configuration
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global styles
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases

The application is currently a fresh Next.js installation with the default landing page.