const fs = require('fs');

const path = 'src/types.ts';
let code = fs.readFileSync(path, 'utf8');

code += `

export interface SubscriptionRequest {
  id: string;
  tenantId: string;
  name: string;
  companyName: string;
  address: string;
  contactNumber: string;
  proofOfPaymentBase64?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
`;

fs.writeFileSync(path, code);
