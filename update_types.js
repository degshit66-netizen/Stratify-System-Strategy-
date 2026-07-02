const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// Insert TenantModules
const tenantModulesStr = `
export interface TenantModules {
  payroll?: boolean;
  inventory?: boolean;
  ecommerce?: boolean;
  fixedAssets?: boolean;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  active: boolean;
  createdAt: string;
}
`;
code = code.replace("export interface Tenant {", tenantModulesStr + "\nexport interface Tenant {\n  modules?: TenantModules;\n");
fs.writeFileSync('src/types.ts', code);
