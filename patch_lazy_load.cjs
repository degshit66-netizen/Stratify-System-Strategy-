const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace lazy imports with static imports for the critical modules
content = content.replace("const Dashboard = React.lazy(() => import('./components/Dashboard'));", "import Dashboard from './components/Dashboard';");
content = content.replace("const LedgerTable = React.lazy(() => import('./components/LedgerTable'));", "import { LedgerTable } from './components/LedgerTable';");
content = content.replace("const SalesModule = React.lazy(() => import('./components/SalesModule'));", "import { SalesModule } from './components/SalesModule';");
content = content.replace("const PurchaseModule = React.lazy(() => import('./components/PurchaseModule'));", "import { PurchaseModule } from './components/PurchaseModule';");

// Check if LedgerTable is exported as default or named
// Actually I'll check first before replacing
