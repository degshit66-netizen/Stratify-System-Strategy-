const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
  /const \[companyConfig, setCompanyConfig\] = useState<CompanyConfig>\(\{[\s\S]*?\}\);/,
  `const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    companyName: 'STRATIFY System',
    tin: '',
    address: '',
    registeredVat: true,
    secPermitNo: '',
    ptuNo: '',
    authorizedPIN: '1234',
    logoUrl: ''
  });`
);

fs.writeFileSync('src/App.tsx', appCode);
