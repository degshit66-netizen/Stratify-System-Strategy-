const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const renderBlock = `
  if (showTenantOnboarding && currentTenant) {
    return (
      <OnboardingWelcome 
        tenant={currentTenant} 
        onComplete={() => {
          localStorage.setItem(\`stratify_onboarded_tenant_\${currentTenant.id}\`, 'true');
          setShowTenantOnboarding(false);
        }} 
      />
    );
  }

  return (
`;

appCode = appCode.replace(
  /\s*return \(\s*<div className="h-screen h-\[100dvh\] overflow-hidden bg-white dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300 overscroll-none">/,
  renderBlock + '    <div className="h-screen h-[100dvh] overflow-hidden bg-white dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300 overscroll-none">'
);

fs.writeFileSync('src/App.tsx', appCode);
