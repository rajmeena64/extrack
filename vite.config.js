import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tailwindcss(), react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      '@sentry/react',
      'lucide-react',
      'date-fns',
      'lightweight-charts',
    ],
  },
  server: {
    port: 3000,
    strictPort: true
  },

  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (normalizedId.includes('node_modules')) {
            // Core vendors needed for the dashboard shell and initial paint
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('@tanstack/react-query') ||
              normalizedId.includes('axios')
            ) {
              return 'vendor-core'
            }

            // Heavy dependencies that are lazy-loaded or route-specific
            if (normalizedId.includes('chart.js') || normalizedId.includes('lightweight-charts')) {
              return 'vendor-charts'
            }
            if (normalizedId.includes('@mui') || normalizedId.includes('@emotion')) {
              return 'vendor-ui'
            }
            if (normalizedId.includes('react-day-picker') || normalizedId.includes('date-fns')) {
              return 'vendor-date'
            }
            
            return 'vendor'
          }
        }
      }
    }
  }
})
