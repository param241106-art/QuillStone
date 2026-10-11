import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { handleQuery } from './server/handleQuery.js';

// Serves /api/queries during `vite dev`, so the contact form works locally
// without deploying anywhere.
function apiDevMiddleware(databaseUrl: string | undefined): Plugin {
  return {
    name: 'local-api-queries',
    configureServer(server) {
      server.middlewares.use('/api/queries', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let body = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const result = await handleQuery(body, databaseUrl);
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.json));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // The site is served from the root of its custom domain (quillstones.com).
    // Set BASE_PATH=/QuillStone/ to build for the github.io project address
    // instead; the Pages workflow sets it from the repository's Pages settings.
    // `vite preview` serves the built files, so it needs the same base as the build.
    base: command === 'build' || isPreview ? env.BASE_PATH || '/' : '/',
    plugins: [react(), apiDevMiddleware(env.DATABASE_URL)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
