import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { handleQuery } from './server/handleQuery.js';

// `virtual:bg-frames`: the URLs of the 145 background frames in
// src/assets/quill-anim/ (frame_001.webp …, numbered without gaps). A build
// publishes each as assets/frame_NNN-<content hash>.webp; the module ships just
// the hashes and rebuilds the URLs, which is about a tenth of the size of the
// path-to-URL table an import.meta.glob would put in the bundle.
function bgFrames(): Plugin {
  const dir = fileURLToPath(new URL('./src/assets/quill-anim', import.meta.url));
  const id = 'virtual:bg-frames';
  let command = 'build';
  let base = '/';
  return {
    name: 'bg-frames',
    configResolved(config) {
      command = config.command;
      base = config.base;
    },
    resolveId: (source) => (source === id ? '\0' + id : undefined),
    load(loadId) {
      if (loadId !== '\0' + id) return;
      const files = readdirSync(dir).filter((f) => /^frame_\d{3}\.webp$/.test(f)).sort();
      if (command === 'serve') {
        return `export default ${JSON.stringify(files.map((f) => `/src/assets/quill-anim/${f}`))};`;
      }
      const hashes = files.map((f) => {
        const source = readFileSync(join(dir, f));
        const hash = createHash('sha256').update(source).digest('base64url').slice(0, 8);
        this.emitFile({ type: 'asset', fileName: `assets/${f.replace('.webp', `-${hash}.webp`)}`, source });
        return hash;
      });
      return `const h = ${JSON.stringify(hashes.join(''))};
export default h.match(/.{8}/g).map((x, i) => ${JSON.stringify(base)} + 'assets/frame_' + String(i + 1).padStart(3, '0') + '-' + x + '.webp');`;
    },
  };
}

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
    plugins: [react(), apiDevMiddleware(env.DATABASE_URL), bgFrames()],
    build: {
      // lists each page's chunk, so scripts/prerender.mjs can preload it (then deletes it)
      manifest: true,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
