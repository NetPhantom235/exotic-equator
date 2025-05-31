// @ts-check
import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  server: {
    host: true,
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4321'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    }
  },
  vite: {
    build: {
      assetsInlineLimit: 0
    },
    server: {
      fs: {
        strict: false
      }
    }
  },
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  })
});
