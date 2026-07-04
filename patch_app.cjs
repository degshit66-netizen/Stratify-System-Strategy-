const fs = require('fs');

const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes("OnboardingWelcome")) {
  code = code.replace(
    "import { SubscriptionPrompt } from './components/SubscriptionPrompt';",
    "import { SubscriptionPrompt } from './components/SubscriptionPrompt';\nimport { OnboardingWelcome } from './components/OnboardingWelcome';"
  );
}

if (!code.includes("const [showTenantOnboarding, setShowTenantOnboarding] = useState(false);")) {
  code = code.replace(
    "const [showOnboarding, setShowOnboarding] = useState(false);",
    "const [showOnboarding, setShowOnboarding] = useState(false);\n  const [showTenantOnboarding, setShowTenantOnboarding] = useState(false);"
  );
}

// Check where login happens
const loginReplace = `    if (tenant) {
      localStorage.setItem('current_tenant_id', tenant.id);
      setCurrentTenant(tenant);
      
      const onboardedKey = \`stratify_onboarded_tenant_\${tenant.id}\`;
      if (!localStorage.getItem(onboardedKey)) {
        setShowTenantOnboarding(true);
      }
      `;
      
code = code.replace(
  /if \(tenant\) \{\s*localStorage\.setItem\('current_tenant_id', tenant\.id\);\s*setCurrentTenant\(tenant\);/,
  loginReplace
);

// Add the render
const renderReplace = `      {showTenantOnboarding && currentTenant && (
        <OnboardingWelcome 
          tenant={currentTenant} 
          onComplete={() => {
            localStorage.setItem(\`stratify_onboarded_tenant_\${currentTenant.id}\`, 'true');
            setShowTenantOnboarding(false);
          }} 
        />
      )}
      <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">`;

code = code.replace(
  /<div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">/,
  renderReplace
);

fs.writeFileSync(path, code);
