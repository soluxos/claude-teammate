import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import './styles.css';
import assets from 'virtual:audio-index';
import { App } from './App';

// The CSS asks for Claude's own typefaces first and falls back to Inter and Source Serif.
// The real fonts are licensed, so they are not in this repo: drop your own copies into
// public/brand (anthropic-sans.woff2, anthropic-serif.woff2) and they are used automatically.
for (const family of assets.brand) {
  const face = new FontFace(family, `url(${import.meta.env.BASE_URL}brand/${family}.woff2)`, { weight: '300 800' });
  document.fonts.add(face);
  void face.load().catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
