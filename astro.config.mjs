import { defineConfig } from 'astro/config';

// Absolute URLs (canonical, share previews). On Vercel the production domain comes from its build-time
// system env var, so forks get their own; elsewhere set SITE_URL.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.SITE_URL || 'http://localhost:4321';

export default defineConfig({ site });
