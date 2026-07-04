const fs = require('fs');
let code = fs.readFileSync('src/components/EntryModal.tsx', 'utf8');

if (!code.includes("import { createRoot } from 'react-dom/client'")) {
  code = code.replace(/import html2pdf/, "import { createRoot } from 'react-dom/client';\nimport html2pdf");
  
  const target = `    import("react-dom/client").then(({ createRoot }) => {
      const root = createRoot(container);
      root.render(
        <Form2307Sheet
          periodFrom={periodFromStr}
          periodTo={periodToStr}
          payee={payeeObj}
          payor={payorObj}
          transactions={[tx]}
          grandTotals={grandTotals}
        />,
      );`;
  
  const repl = `    const root = createRoot(container);
    root.render(
      <Form2307Sheet
        periodFrom={periodFromStr}
        periodTo={periodToStr}
        payee={payeeObj}
        payor={payorObj}
        transactions={[tx]}
        grandTotals={grandTotals}
      />
    );`;

  // Actually since regex is tricky for multiline, let's just replace the exact lines
  code = code.replace(/import\("react-dom\/client"\)\.then\(\(\{\s*createRoot\s*\}\) => \{/, '');
  // need to remove the closing } of the .then too.
  code = code.replace(/\n\s*\}\);\s*\/\/\s*Cleanup after PDF generation/g, '\n      // Cleanup after PDF generation');

  fs.writeFileSync('src/components/EntryModal.tsx', code);
}
