import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exposes which audio files exist in public/audio as `virtual:audio-index`,
 * so the browser never has to probe for files that are not there.
 */
function audioIndex(): Plugin {
  const vid = 'virtual:audio-index';
  const rid = '\0' + vid;
  const dir = path.resolve(__dirname, 'public/audio');
  const list = (d: string, ext: string) =>
    fs.existsSync(d)
      ? fs.readdirSync(d).filter((f) => f.endsWith(ext) && f !== 'manifest.json').map((f) => f.slice(0, -ext.length))
      : [];
  const scan = () => ({
    generated: list(dir, '.mp3'),
    aligned: list(dir, '.json'),
    overrides: list(path.join(dir, 'override'), '.mp3'),
    overrideAligned: list(path.join(dir, 'override'), '.json'),
  });
  return {
    name: 'audio-index',
    resolveId(id) {
      if (id === vid) return rid;
    },
    load(id) {
      if (id === rid) return `export default ${JSON.stringify(scan())};`;
    },
    configureServer(server) {
      server.watcher.add(dir);
      const refresh = (file: string) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(rid);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), audioIndex()],
});
