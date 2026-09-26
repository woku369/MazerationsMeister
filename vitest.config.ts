import { defineConfig } from 'vitest/config';
import path from 'path';

// Spiegelt den "@/*" -> "./src/*" Alias aus tsconfig.json, damit Tests
// dieselben Importpfade wie der App-Code verwenden können.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
