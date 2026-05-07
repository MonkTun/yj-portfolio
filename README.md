# YJ's Portfolio

Personal portfolio for Youngje Park, plus a self-built admin layer for arranging UI elements visually (drag-and-drop, "DIY Framer"–style).

This repo replaces the previous Vite version. It lives at the same Vercel project so domain settings carry over.

## Stack

- Next.js 16 (App Router)
- React 19, TypeScript
- Tailwind CSS v4
- ESLint

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint the project

## Layout

- `src/app` — App Router routes, layouts, and global styles
- `public` — static assets

The portfolio surface and the `/admin` editor will live alongside each other under `src/app` once they're built out.
