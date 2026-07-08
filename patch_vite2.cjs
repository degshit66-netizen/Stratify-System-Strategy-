const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

content = content.replace("'react-vendor': ['react', 'react-dom', 'react-router-dom']", "'react-vendor': ['react', 'react-dom']");
fs.writeFileSync('vite.config.ts', content);
console.log('patched vite config 2');
