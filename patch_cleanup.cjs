const fs = require('fs');

// Fix SettingsModal.tsx duplicate state and multiple SubscriptionRequestModal instances
let settings = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
settings = settings.replace(
  "const [showSubRequestModal, setShowSubRequestModal] = useState(false);\n  const [showSubRequestModal, setShowSubRequestModal] = useState(false);",
  "const [showSubRequestModal, setShowSubRequestModal] = useState(false);"
);
settings = settings.replace(
  /\{currentTenant && <SubscriptionRequestModal isOpen=\{showSubRequestModal\} onClose=\{\(\) => setShowSubRequestModal\(false\)\} tenant=\{currentTenant\} showToast=\{showToast\} \/>\}\s*\{currentTenant && <SubscriptionRequestModal isOpen=\{showSubRequestModal\} onClose=\{\(\) => setShowSubRequestModal\(false\)\} tenant=\{currentTenant\} showToast=\{showToast\} \/>\}/g,
  "{currentTenant && <SubscriptionRequestModal isOpen={showSubRequestModal} onClose={() => setShowSubRequestModal(false)} tenant={currentTenant} showToast={showToast} />}"
);
fs.writeFileSync('src/components/SettingsModal.tsx', settings);

// Fix App.tsx defaults
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const emptyTasks = `        const defaults: SchedulerTask[] = [];
        setStratifyTasks(defaults);
        localStorage.setItem('stratify_tasks', JSON.stringify(defaults));`;

appCode = appCode.replace(
  /const defaults: SchedulerTask\[\] = \[\s*\{ id: 1[\s\S]*?\];\s*setStratifyTasks\(defaults\);\s*localStorage\.setItem\('stratify_tasks', JSON\.stringify\(defaults\)\);/,
  emptyTasks
);

fs.writeFileSync('src/App.tsx', appCode);
