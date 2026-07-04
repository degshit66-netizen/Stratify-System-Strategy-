const fs = require('fs');

// 1. Patch SubscriptionRequestModal
const modalPath = 'src/components/SubscriptionRequestModal.tsx';
let modalCode = fs.readFileSync(modalPath, 'utf8');

modalCode = modalCode.replace(
  'showToast: (msg: string, type: \'success\' | \'error\' | \'info\') => void;\n}',
  'showToast: (msg: string, type: \'success\' | \'error\' | \'info\') => void;\n  plan?: \'monthly\' | \'annual\';\n  users?: number;\n}'
);

modalCode = modalCode.replace(
  'export const SubscriptionRequestModal: React.FC<Props> = ({ isOpen, onClose, tenant, showToast }) => {',
  'export const SubscriptionRequestModal: React.FC<Props> = ({ isOpen, onClose, tenant, showToast, plan = \'monthly\', users = 5 }) => {'
);

modalCode = modalCode.replace(
  'status: \'pending\' as const',
  'status: \'pending\' as const,\n        plan,\n        users'
);

fs.writeFileSync(modalPath, modalCode);

// 2. Patch SettingsModal
const settingsPath = 'src/components/SettingsModal.tsx';
let settingsCode = fs.readFileSync(settingsPath, 'utf8');

// Replace handleSendSubscriptionRequest
const oldHandle = `  const handleSendSubscriptionRequest = () => {
    if (!currentTenant) return;
    if (requestedUsers < 1) {
      showToast('User capacity must be at least 1.', 'error');
      return;
    }
    const updated: Tenant = {
      ...currentTenant,
      subscriptionRequestStatus: 'pending',
      subscriptionRequestPlan: billingPlan,
      subscriptionRequestUserLimit: requestedUsers
    };
    if (onUpdateTenant) onUpdateTenant(updated);
    showToast('Subscription upgrade request sent to Super Admin.', 'success');
  };`;

const newHandle = `  const handleSendSubscriptionRequest = () => {
    if (!currentTenant) return;
    if (requestedUsers < 1) {
      showToast('User capacity must be at least 1.', 'error');
      return;
    }
    setShowSubRequestModal(true);
  };`;
  
if (settingsCode.includes('handleSendSubscriptionRequest = () => {')) {
    const regex = /const handleSendSubscriptionRequest = \(\) => \{[\s\S]*?showToast\('Subscription upgrade request sent to Super Admin\.', 'success'\);\s*\};/;
    settingsCode = settingsCode.replace(regex, newHandle);
}

// Update the modal render
settingsCode = settingsCode.replace(
  '{currentTenant && <SubscriptionRequestModal isOpen={showSubRequestModal} onClose={() => setShowSubRequestModal(false)} tenant={currentTenant} showToast={showToast} />}',
  '{currentTenant && <SubscriptionRequestModal isOpen={showSubRequestModal} onClose={() => setShowSubRequestModal(false)} tenant={currentTenant} showToast={showToast} plan={billingPlan} users={requestedUsers} />}'
);

fs.writeFileSync(settingsPath, settingsCode);
