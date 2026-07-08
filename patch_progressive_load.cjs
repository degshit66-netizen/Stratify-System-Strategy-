const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace lazy imports with static imports for the critical modules
content = content.replace("const Dashboard = React.lazy(() => import('./components/Dashboard'));", "import Dashboard from './components/Dashboard';");
content = content.replace("const LedgerTable = React.lazy(() => import('./components/LedgerTable'));", "import LedgerTable from './components/LedgerTable';");
content = content.replace("const SalesModule = React.lazy(() => import('./components/SalesModule'));", "import SalesModule from './components/SalesModule';");
content = content.replace("const PurchaseModule = React.lazy(() => import('./components/PurchaseModule'));", "import PurchaseModule from './components/PurchaseModule';");

// Inject prefetching in App component
if (!content.includes('// Progressive Loading Strategy: Prefetch secondary modules')) {
  content = content.replace("useEffect(() => {", `useEffect(() => {\n    // Progressive Loading Strategy: Prefetch secondary modules in background\n    const prefetchTimer = setTimeout(() => {\n      import('./components/EcommerceModule');\n      import('./components/PayrollModule');\n      import('./components/AuditTrailModule');\n      import('./components/HRModule');\n      import('./components/ReportsModule');\n      import('./components/InventoryModule');\n      import('./components/FSModule');\n      import('./components/COAModule');\n      import('./components/BooksModule');\n      import('./components/ReconciliationModule');\n      import('./components/SchedulerModule');\n      import('./components/ContactsModule');\n      import('./components/FixedAssetsModule');\n      import('./components/AICopilot');\n    }, 3000);\n\n`);
}

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx for progressive loading');
