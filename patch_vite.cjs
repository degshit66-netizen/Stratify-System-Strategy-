const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

if (!content.includes('manualChunks')) {
  content = content.replace(
    'chunkSizeWarningLimit: 2000,',
    `chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'recharts'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          }
        }
      },`
  );
  fs.writeFileSync('vite.config.ts', content);
  console.log('patched vite config');
}
