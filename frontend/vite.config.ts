import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    // Disable source maps in production for security and performance
    sourcemap: process.env.GENERATE_SOURCEMAP === 'true' ? true : false,
    
    // Enable minification
    minify: 'terser',
    
    // Optimize chunk size for better loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // UI library chunk
          mui: ['@mui/material', '@mui/icons-material'],
          
          // Redux chunk
          redux: ['@reduxjs/toolkit', 'react-redux'],
          
          // Utilities chunk
          utils: ['axios', 'formik', 'yup'],
        },
        
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // Enable gzip compression
    reportCompressedSize: true,
    
    // Optimize chunk size limits
    chunkSizeWarningLimit: 1000,
    
    // Target modern browsers for better optimization
    target: 'esnext',
  },
  
  // Enable performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material'],
  },
}); 