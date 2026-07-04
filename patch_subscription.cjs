const fs = require('fs');

const path = '/app/applet/src/components/SubscriptionPrompt.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "import { ShieldAlert, Mail, Phone } from 'lucide-react';",
  "import { ShieldAlert, Mail, Phone, Facebook } from 'lucide-react';"
);

const newContact = `<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Contact Administrator</h3>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Facebook className="w-4 h-4 text-blue-400" />
              </div>
              <a href="https://www.facebook.com/share/1BVqhwRTeW/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Facebook Page</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <a href="mailto:stratify2026@gmail.com" className="hover:text-blue-400 transition-colors">stratify2026@gmail.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Phone className="w-4 h-4 text-blue-400" />
              </div>
              <span>0966-235-2256</span>
            </div>`;

code = code.replace(
  /<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Contact Administrator<\/h3>[\s\S]*?<span>\+63 \(917\) 123-4567<\/span>\s*<\/div>/,
  newContact
);

fs.writeFileSync(path, code);
