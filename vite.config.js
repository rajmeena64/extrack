// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//     // base: '/extrack/', 
//   plugins: [react()],
//   server: {
//     port: 3000,       // yaha apna fixed port
//     strictPort: true, // agar port busy ho, error throw kare, auto change na ho
//   },
// });




import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('chart.js') || id.includes('lightweight-charts')) {
              return 'vendor-charts'
            }
            if (id.includes('@mui')) {
              return 'vendor-ui'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            return 'vendor'  // all other node_modules
          }
        }
      }
    }
  }
})