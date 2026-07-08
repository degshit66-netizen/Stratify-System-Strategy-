const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace synchronous imports with lazy imports
content = content.replace("import { EntryModal } from './components/EntryModal';", "const EntryModal = React.lazy(() => import('./components/EntryModal').then(module => ({ default: module.EntryModal })));");
content = content.replace("import { SettingsModal } from './components/SettingsModal';", "const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));");
content = content.replace("import { Auth } from './components/Auth';", "const Auth = React.lazy(() => import('./components/Auth').then(module => ({ default: module.Auth })));");
content = content.replace("import { SuperAdminDashboard } from './components/SuperAdminDashboard';", "const SuperAdminDashboard = React.lazy(() => import('./components/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));");

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx for lazy loading');
