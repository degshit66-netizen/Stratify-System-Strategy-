const fs = require('fs');

const path = 'src/components/SettingsModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "import { SubscriptionPrompt } from './SubscriptionPrompt';", 
  "import { SubscriptionPrompt } from './SubscriptionPrompt';\nimport { SubscriptionRequestModal } from './SubscriptionRequestModal';"
);

if (!code.includes("SubscriptionRequestModal")) {
  code = code.replace(
    "import React, { useState } from 'react';",
    "import React, { useState } from 'react';\nimport { SubscriptionRequestModal } from './SubscriptionRequestModal';"
  );
}

code = code.replace(
  "const [billingPlan, setBillingPlan] = useState<'monthly' | 'annual'>('monthly');",
  "const [billingPlan, setBillingPlan] = useState<'monthly' | 'annual'>('monthly');\n  const [showSubRequestModal, setShowSubRequestModal] = useState(false);"
);

const pricingSection = `                  {/* Pricing / Plan Configurator Form */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Avail Premium Access</span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                      Get full access to all STRATIFY modules. Request a subscription and our admin will review it immediately.
                    </p>
                    <button
                      onClick={() => setShowSubRequestModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                    >
                      Request Subscription
                    </button>
                  </div>`;

// Replace the configurator form with the button
code = code.replace(
  /<span className="text-\[10px\] font-bold text-zinc-400 uppercase tracking-wider block">Modify Subscription Plan<\/span>[\s\S]*?<button[\s\S]*?Update Subscription[\s\S]*?<\/button>[\s\S]*?<\/div>/,
  pricingSection
);

// Add the modal at the end of the component
code = code.replace(
  "        </motion.div>",
  "        </motion.div>\n        {currentTenant && <SubscriptionRequestModal isOpen={showSubRequestModal} onClose={() => setShowSubRequestModal(false)} tenant={currentTenant} showToast={showToast} />}"
);

fs.writeFileSync(path, code);
