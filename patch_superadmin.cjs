const fs = require('fs');
const path = 'src/components/SuperAdminDashboard.tsx';

let code = fs.readFileSync(path, 'utf8');

const oldHeaderStr = `<div className="h-screen bg-gradient-to-br from-white to-blue-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-cyan-50 dark:text-slate-900 dark:text-cyan-50 flex flex-col font-sans overflow-hidden selection:bg-blue-500/30 relative">
      {/* Background grid & glows for command center feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan-600/10 pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 pointer-events-none rounded-full" />

      {/* Header */}
      <header className="relative bg-white/80 dark:bg-slate-950 border-b border-blue-200 dark:border-blue-200 dark:border-blue-900/50 px-6 py-4 flex items-center justify-between shadow-[0_0_30px_rgba(8,145,178,0.1)] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" alt="STRATIFY Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-zinc-950 animate-pulse shadow-[0_0_10px_rgba(34,211,238,1)]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase text-slate-900 dark:text-cyan-50 ">
              STRATIFY Command Center
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-900 dark:text-cyan-50 font-mono tracking-widest uppercase">Global Control Node</span>
              <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              <span className="text-[10px] text-slate-900 dark:text-cyan-50 font-mono">SYS_ONLINE</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900/50 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-900 dark:text-cyan-50 " />
              <span className="text-xs font-mono text-slate-900 dark:text-cyan-50 ">99.99% UPTIME</span>
            </div>
            <div className="w-px h-4 bg-blue-100 dark:bg-blue-900/50" />
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-900 dark:text-cyan-50 " />
              <span className="text-xs font-mono text-slate-900 dark:text-cyan-50 ">12 NODES</span>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 hover:border-blue-500/50 text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 rounded-xl transition-all shadow-[0_0_15px_rgba(8,145,178,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] text-sm font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">`;

const newHeaderStr = `<div className="h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans overflow-hidden relative">
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b border-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0 z-40">
        <div className="flex items-center gap-4">
          <img src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" alt="STRATIFY Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-white">STRATIFY Admin Center</h1>
            <p className="text-[10px] font-semibold text-blue-300 tracking-wide">SYSTEM MANAGEMENT</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all shadow-sm text-sm font-bold tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">`;

code = code.replace(oldHeaderStr, newHeaderStr);

// General color replacements
code = code.replace(/text-slate-900 dark:text-cyan-50 /g, 'text-zinc-900 dark:text-white ');
code = code.replace(/text-slate-900/g, 'text-zinc-900');
code = code.replace(/dark:text-cyan-50/g, 'dark:text-white');
code = code.replace(/bg-slate-900/g, 'bg-zinc-900');
code = code.replace(/bg-slate-950/g, 'bg-zinc-950');
code = code.replace(/bg-slate-50/g, 'bg-zinc-50');
code = code.replace(/border-blue-900\/30/g, 'border-zinc-800');
code = code.replace(/border-blue-200/g, 'border-zinc-200');
code = code.replace(/border-blue-900\/50/g, 'border-zinc-800');

// Replace tabs wrapper to be cleaner
code = code.replace(
  /<div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-2">[\s\S]*?System Logs\s*<\/button>\s*<\/div>/,
  `        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('tenants')}
            className={\`px-4 py-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all \${activeTab === 'tenants' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            Tenant Management
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={\`px-4 py-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 \${activeTab === 'requests' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            Subscription Requests
            {subRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{subRequests.filter(r => r.status === 'pending').length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={\`px-4 py-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all \${activeTab === 'announcements' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={\`px-4 py-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all \${activeTab === 'system' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}\`}
          >
            System Logs
          </button>
        </div>`
);

// Add auto-tab to requests
const hookStr = `  useEffect(() => {
    import('../lib/db').then(({ loadSubscriptionRequestsFromFirebase }) => {
      loadSubscriptionRequestsFromFirebase().then(reqs => setSubRequests(reqs));
    });
  }, []);`;
  
code = code.replace(hookStr, hookStr + `
  useEffect(() => {
    if (subRequests.filter(r => r.status === 'pending').length > 0) {
      setActiveTab('requests');
    }
  }, [subRequests]);`);

fs.writeFileSync(path, code);
