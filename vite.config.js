// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//     // base: '/entrack/', 
//   plugins: [react()],
//   server: {
//     port: 3000,       // yaha apna fixed port
//     strictPort: true, // agar port busy ho, error throw kare, auto change na ho
//   },
// });




import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },

  server: {
    port: 3000,
    strictPort: true
  },

  build: {
    rollupOptions: {
      output: {
        // Change THIS 👇 from object to function
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
