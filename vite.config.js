import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import WindiCSS from 'vite-plugin-windicss';

// Vite config: React + WindiCSS + dev proxies.
export default defineConfig(({ mode }) => {
  // Load only VITE_* variables
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const fineractTarget = env.VITE_API_URL || 'https://localhost:8443/fineract-provider';
  const gatewayTarget = env.VITE_GATEWAY_API_URL || 'http://localhost:8084';

  return {
    plugins: [react(), WindiCSS()],
    server: {
      host: '127.0.0.1',
      port: Number(env.VITE_DEV_PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': {
          target: fineractTarget,
          changeOrigin: true,
          secure: false, // allow self-signed certs locally
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        // Gateway (digital-platform) backend
        '/gw': {
          target: gatewayTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/gw/, ''),
        },
      },
    },
    define: {
      // Provide the current mode as a string
      __APP_ENV__: JSON.stringify(mode),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});
