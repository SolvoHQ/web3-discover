import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

const SITE_URL = process.env.SITE_URL || 'https://web3-discover.vercel.app';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  integrations: [sitemap(), react()],
});