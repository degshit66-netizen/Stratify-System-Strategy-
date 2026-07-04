const fs = require('fs');

const appPath = 'src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');
appCode = appCode.replace(/mock_tenants/g, 'stratify_tenants');
appCode = appCode.replace(/mock_users/g, 'stratify_users');
fs.writeFileSync(appPath, appCode);

const settingsPath = 'src/components/SettingsModal.tsx';
let settingsCode = fs.readFileSync(settingsPath, 'utf8');
settingsCode = settingsCode.replace(/mock databases/g, 'local databases');
fs.writeFileSync(settingsPath, settingsCode);
