// @ts-check
import { defineConfig } from 'astro/config';
// import node from '@astrojs/node';
import netlify from '@astrojs/netlify';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify({
    edge: false,
    includeFiles: [
      path.resolve(__dirname, 'node_modules/@jimp/plugin-print/dist/fonts/**/*')
    ]
  })
});