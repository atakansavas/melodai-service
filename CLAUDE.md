# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint to check code quality
```

### Installation
```bash
npm install      # Install dependencies
```

## Architecture

This is a Next.js 15.4.4 application using the App Router architecture.

### Key Technologies
- **Next.js 15.4.4** with App Router
- **React 19.1.0**
- **TypeScript** with strict mode
- **Tailwind CSS v4** for styling
- **ESLint** for code quality

### Project Structure
- `/app` - App Router directory containing pages and layouts
  - Components here are React Server Components by default
  - Use `'use client'` directive for client components
- `/public` - Static assets served from root path
- `@/*` - Path alias configured for imports from root

### Styling
- Tailwind CSS v4 with PostCSS
- Global styles in `app/globals.css`
- Dark mode support via CSS media queries
- Custom CSS properties for theming

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Target: ES2017 with ESNext lib features

## Important Notes
- This is a fresh Next.js installation with no custom business logic yet
- Server Components are used by default in the `/app` directory
- Font optimization is configured using `next/font` with Geist font family
- No testing framework is currently set up