const fs = require('fs');

const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const refreshReplace = `               if (t) {
                  await loadStorageFromFirebase(tid);
                  setCurrentTenant(t);
                  
                  const onboardedKey = \`stratify_onboarded_tenant_\${t.id}\`;
                  if (!localStorage.getItem(onboardedKey)) {
                    setShowTenantOnboarding(true);
                  }`;
                  
code = code.replace(
  /if \(t\) \{\s*await loadStorageFromFirebase\(tid\);\s*setCurrentTenant\(t\);/,
  refreshReplace
);

fs.writeFileSync(path, code);
