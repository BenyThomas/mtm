import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import WindiCSS from 'vite-plugin-windicss';

// Vite config: React + WindiCSS + /api dev proxy to Fineract.
export default defineConfig(({ mode }) => {
  // Load only VITE_* variables
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_API_URL || 'https://localhost:8443/fineract-provider';

  return {
    plugins: [react(), WindiCSS()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false, // allow self-signed certs locally
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    define: {
      // Provide the current mode as a string
      __APP_ENV__: JSON.stringify(mode),
    },
  };
});
