import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Bell, Calendar, Trash2, Edit3, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { SchedulerTask, CompanyConfig, TaxpayerType } from '../types';
import { r2, cleanDate } from '../utils/helpers';

const COMMON_TAX_EVENTS = [
  { id: '2550M', formCode: '2550M', title: 'BIR 2550M (Monthly Value-Added Tax)', defaultModule: 'Value-Added Tax', type: 'monthly', dueDay: 20 },
  { id: '1601C', formCode: '1601C', title: 'BIR 1601-C (Monthly Withholding Tax on Compensation)', defaultModule: 'Withholding Tax', type: 'monthly', dueDay: 10 },
  { id: '0619E', formCode: '0619E', title: 'BIR 0619-E (Monthly Creditable Income Taxes)', defaultModule: 'Withholding Tax', type: 'monthly', dueDay: 10 },
  { id: '2551Q', formCode: '2551Q', title: 'BIR 2551Q (Quarterly Percentage Tax)', defaultModule: 'Percentage Tax', type: 'quarterly', dueDay: 25 },
  { id: '1702Q', formCode: '1702Q', title: 'BIR 1702Q (Quarterly Income Tax)', defaultModule: 'Income Tax', type: 'quarterly', dueDay: 60 }, // 60 days after quarter
  { id: '1702RT', formCode: '1702RT', title: 'BIR 1702-RT (Annual Income Tax)', defaultModule: 'Income Tax', type: 'annual', dueDay: 105 }, // April 15
  { id: 'LOOSE', formCode: 'LOOSE', title: 'Submit Bound Loose-Leaf Books (Affidavit Annex C)', defaultModule: 'Loose Leaf Compliance', type: 'annual', dueDay: 15 }, // Jan 15
  { id: 'CUSTOM', formCode: 'CUSTOM', title: 'Custom Event / Other', defaultModule: 'General Ledger', type: 'custom', dueDay: 0 }
];

export function getApplicableTaxForms(taxpayerType: TaxpayerType) {
  return COMMON_TAX_EVENTS.filter((form) => {
    if (taxpayerType === TaxpayerType.VAT_REGISTERED && form.formCode === '2551Q') {
      return false;
    }
    if (taxpayerType === TaxpayerType.NON_VAT_REGISTERED && (form.formCode === '2550M' || form.formCode === '2550Q')) {
      return false;
    }
    return true; 
  });
}

const getNextDeadline = (type: string, dueDay: number) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  if (type === 'monthly') {
    let targetMonth = month;
    let targetYear = year;
    if (date > dueDay) {
      targetMonth++;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }
    }
    return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
  } else if (type === 'quarterly') {
    const quarter = Math.floor(month / 3);
    let nextQuarterMonth = (quarter + 1) * 3; // Start of next quarter (e.g., April 1 for Jan-Mar quarter)
    let nextYear = year;
    if (nextQuarterMonth > 11) {
      nextQuarterMonth = 0;
      nextYear++;
    }
    
    const baseDate = new Date(nextYear, nextQuarterMonth, 1);
    // For 1702Q, it's 60 days after the quarter ends.
    // For 2551Q, it's 25 days after the quarter ends.
    // dueDay represents the number of days after the quarter ends.
    baseDate.setDate(baseDate.getDate() + dueDay - 1); 
    
    // Check if this date has already passed
    if (now > baseDate) {
      nextQuarterMonth += 3;
      if (nextQuarterMonth > 11) {
        nextQuarterMonth -= 12;
        nextYear++;
      }
      const newBaseDate = new Date(nextYear, nextQuarterMonth, 1);
      newBaseDate.setDate(newBaseDate.getDate() + dueDay - 1);
      return `${newBaseDate.getFullYear()}-${String(newBaseDate.getMonth() + 1).padStart(2, '0')}-${String(newBaseDate.getDate()).padStart(2, '0')}`;
    }
    
    return `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
  } else if (type === 'annual') {
    let targetMonth = 0;
    let targetDate = dueDay;
    if (dueDay === 105) { // April 15
      targetMonth = 3;
      targetDate = 15;
    } else if (dueDay === 15) { // Jan 15
      targetMonth = 0;
      targetDate = 15;
    }
    let nextYear = year;
    if (month > targetMonth || (month === targetMonth && date > targetDate)) {
      nextYear++;
    }
    return `${nextYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDate).padStart(2, '0')}`;
  }
  return '';
};

interface SchedulerModuleProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  tasks: SchedulerTask[];
  setTasks: (tasks: SchedulerTask[]) => void;
  companyConfig?: CompanyConfig;
}

export const SchedulerModule: React.FC<SchedulerModuleProps> = ({
  showToast,
  tasks,
  setTasks,
  companyConfig
}) => {
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields
  const [taskTemplate, setTaskTemplate] = useState('CUSTOM');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskModule, setTaskModule] = useState('General Ledger');
  const [taskStatus, setTaskStatus] = useState<'Open' | 'In Progress' | 'Done'>('Open');

  const handleSaveTask = () => {
    const title = taskTitle.trim();
    if (!title || !taskDue) {
      showToast('Please enter both Task Title and Due Date.', 'error');
      return;
    }

    const newTask: SchedulerTask = {
      id: editId || Date.now(),
      title,
      dueDate: taskDue,
      module: taskModule,
      status: taskStatus
    };

    let nextList = [...tasks];
    if (editId) {
      nextList = nextList.map(t => t.id === editId ? newTask : t);
      showToast('Task updated in schedule.', 'success');
      setEditId(null);
    } else {
      nextList = [newTask, ...nextList];
      showToast('New deadline added to calendar schedule.', 'success');
    }

    setTasks(nextList);
    localStorage.setItem('stratify_tasks', JSON.stringify(nextList));
    setTaskTitle('');
    setTaskDue('');
    setTaskModule('General Ledger');
    setTaskStatus('Open');
  };

  const handleTemplateChange = (id: string) => {
    setTaskTemplate(id);
    if (id === 'CUSTOM') {
      setTaskTitle('');
      setTaskDue('');
      setTaskModule('General Ledger');
      return;
    }
    
    const template = COMMON_TAX_EVENTS.find(t => t.id === id);
    if (template) {
      setTaskTitle(template.title);
      setTaskModule(template.defaultModule);
      setTaskDue(getNextDeadline(template.type, template.dueDay));
    }
  };

  const handleEdit = (task: SchedulerTask) => {
    setEditId(task.id);
    setTaskTemplate('CUSTOM');
    setTaskTitle(task.title);
    setTaskDue(task.dueDate);
    setTaskModule(task.module);
    setTaskStatus(task.status);
  };

  const handleDelete = (id: number) => {
    const nextList = tasks.filter(t => t.id !== id);
    setTasks(nextList);
    localStorage.setItem('stratify_tasks', JSON.stringify(nextList));
    showToast('Task removed from schedule.', 'success');
  };

  const triggerPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('This browser does not support push notifications.', 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      showToast('Notification permission is already enabled.', 'success');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast('Push notifications successfully authorized!', 'success');
    } else {
      showToast('Notification permission denied.', 'error');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCount = tasks.filter(t => {
    if (t.status === 'Done') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0;
  }).length;

  const activeCount = tasks.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const currentCompanyProfile = companyConfig?.registeredVat === false ? TaxpayerType.NON_VAT_REGISTERED : TaxpayerType.VAT_REGISTERED;
  const visibleForms = getApplicableTaxForms(currentCompanyProfile);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📅 Business Scheduler</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage tax filing deadlines, monthly audits, corporate reports, and setup schedules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={triggerPushPermission}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <Bell className="w-4 h-4 text-blue-500" />
            <span>Enable Push Alarms</span>
          </button>
        </div>
      </div>

      {overdueCount > 0 && (
        <motion.div variants={itemVariants} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-start sm:items-center gap-4">
          <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Action Required: Overdue Compliance Events</h3>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">There {overdueCount === 1 ? 'is' : 'are'} {overdueCount} overdue tax or compliance {overdueCount === 1 ? 'event' : 'events'}. Please resolve {overdueCount === 1 ? 'it' : 'them'} immediately to avoid potential penalties and system restrictions.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Deadlines</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{tasks.length}</div>
            <div className="text-xs text-zinc-400 font-medium">Critical events on timeline</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pending Actions</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{activeCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Tasks in progress or open</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Overdue Events</span>
            <div className={`text-lg font-extrabold ${overdueCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {overdueCount}
            </div>
            <div className="text-xs text-zinc-400 font-medium">{overdueCount > 0 ? 'Past deadline' : 'Zero items overdue'}</div>
          </div>
          <div className={`p-2.5 rounded-xl ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{editId ? 'Update Deadline' : 'Schedule New Event'}</h3>
          
          <div className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Task Title (Select Type)</label>
              <select
                value={taskTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none mb-2"
              >
                {visibleForms.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              {taskTemplate === 'CUSTOM' && (
                <input 
                  type="text" 
                  placeholder="e.g., Filing BIR Form 1702Q"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Due Date</label>
                <input 
                  type="date" 
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Task Status</label>
                <select 
                  value={taskStatus}
                  onChange={(e: any) => setTaskStatus(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Responsible Department / Tag</label>
              <input 
                type="text" 
                placeholder="Tax Compliance / General Ledger"
                value={taskModule}
                onChange={(e) => setTaskModule(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button 
              onClick={handleSaveTask}
              className="flex-1 text-center text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm"
            >
              {editId ? 'Update Deadline' : 'Schedule Deadline'}
            </button>
            {editId && (
              <button 
                onClick={() => {
                  setEditId(null);
                  setTaskTitle('');
                  setTaskDue('');
                  setTaskModule('General Ledger');
                  setTaskStatus('Open');
                }}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold px-4 py-2.5 rounded-xl transition-all text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Task Details</th>
                  <th className="px-5 py-3">Department / Class</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {tasks.length ? tasks.map(t => {
                  const due = new Date(t.dueDate);
                  due.setHours(0,0,0,0);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const diffTime = due.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isOverdue = t.status !== 'Done' && diffDays < 0;
                  const isNearDue = t.status !== 'Done' && diffDays >= 0 && diffDays <= 5;
                  return (
                    <tr key={t.id} className={`transition-colors ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10'}`}>
                      <td className={`px-5 py-3.5 font-bold ${isOverdue ? 'text-red-700 dark:text-red-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        <div className="space-y-0.5">
                          <div>{t.title}</div>
                          {isNearDue && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30 uppercase tracking-wider">
                              ⏰ Due in {diffDays} day{diffDays === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-zinc-500 dark:text-zinc-400">{t.module}</td>
                      <td className="px-5 py-3.5 font-bold font-mono text-zinc-800 dark:text-zinc-300">
                        <div className="flex flex-col">
                          <span>{cleanDate(t.dueDate)}</span>
                          {isOverdue && (
                            <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">⚠️ Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          t.status === 'Done' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : t.status === 'In Progress'
                              ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 rounded"
                            title="Edit task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No scheduled tasks logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
