---
description: Run a strict local production build to verify the codebase before deploying to Vercel
---
// turbo-all
1. Check for any missing environment variables needed for building
`npx vercel env pull .env.development.local || echo "Warning: Could not pull Vercel envs"`

2. Verify TypeScript types safely
`npx tsc --noEmit`

3. Verify ESLint rules
`npm run lint`

4. Run the full strict Next.js Production Build compiler
`npm run build`

5. Verify Prisma Schema formatting
`npx prisma validate`
