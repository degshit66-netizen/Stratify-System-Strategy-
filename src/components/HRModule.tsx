import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, Briefcase, Plus, X, Edit, Trash2, Clock, Calendar, LogOut, ShieldCheck, Network } from 'lucide-react';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  basicSalary: number;
  tin: string;
  sss: string;
  philHealth: string;
  pagIbig: string;
  dateHired: string;
}

interface HRModuleProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'stratify_hr_employees';

export const HRModule: React.FC<HRModuleProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'Directory' | 'Time' | 'Leaves' | 'Performance' | 'Documents' | 'Enterprise'>('Directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: 'Active',
    dateHired: new Date().toISOString().slice(0, 10),
  });

  // Time Management state
  const [timeLogs, setTimeLogs] = useState<{ id: string; empId: string; date: string; timeIn: string; timeOut: string; type: string }[]>([]);
  
  // Leaves state
  const [leaveRequests, setLeaveRequests] = useState<{ id: string; empId: string; type: string; startDate: string; endDate: string; status: 'Pending' | 'Approved' | 'Rejected' }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEmployees(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse employees', e);
      }
    }
    
    // Load HR stored data
    try {
      const storedTime = localStorage.getItem('stratify_hr_time');
      if (storedTime) setTimeLogs(JSON.parse(storedTime));
      
      const storedLeaves = localStorage.getItem('stratify_hr_leaves');
      if (storedLeaves) setLeaveRequests(JSON.parse(storedLeaves));
    } catch(e) {}
  }, []);

  const saveEmployees = (list: Employee[]) => {
    setEmployees(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const openDrawer = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData(emp);
    } else {
      setEditingEmployee(null);
      setFormData({
        status: 'Active',
        dateHired: new Date().toISOString().slice(0, 10),
      });
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingEmployee(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.basicSalary) {
      showToast('Name, Role, and Basic Salary are required.', 'error');
      return;
    }

    if (editingEmployee) {
      const updated = employees.map(emp => 
        emp.id === editingEmployee.id ? { ...emp, ...formData } as Employee : emp
      );
      saveEmployees(updated);
      showToast('Employee updated successfully.', 'success');
    } else {
      const newEmp: Employee = {
        ...(formData as any),
        id: `EMP-${Date.now().toString().slice(-6)}`,
        basicSalary: Number(formData.basicSalary) || 0,
      };
      saveEmployees([...employees, newEmp]);
      showToast('Employee added successfully.', 'success');
    }
    closeDrawer();
  };

  const deleteEmployee = (id: string) => {
    const updated = employees.filter(emp => emp.id !== id);
    saveEmployees(updated);
    showToast('Employee removed.', 'success');
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">HR Management</h2>
          <p className="text-sm text-zinc-500">Employee records, time management, and leave requests.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex-wrap justify-end">
            <button onClick={() => setActiveTab('Directory')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Directory' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Directory</button>
            <button onClick={() => setActiveTab('Time')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Time' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Time & Attendance</button>
            <button onClick={() => setActiveTab('Leaves')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Leaves' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Leave Management</button>
            <button onClick={() => setActiveTab('Performance')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Performance' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Performance</button>
            <button onClick={() => setActiveTab('Documents')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Documents' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Documents</button>
            
          </div>
          {activeTab === 'Directory' && (
            <button
              onClick={() => openDrawer()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>
      
      {activeTab === 'Directory' && (
        <>
          {employees.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
              <Users className="w-12 h-12 text-zinc-400 mb-4" />
              <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">No Employees Found</h3>
              <p className="text-sm text-zinc-500 max-w-md mt-2">Add your first employee to start managing HR records and payroll.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-400 transition-colors group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openDrawer(emp)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{emp.name}</h3>
                    <p className="text-xs text-zinc-500">{emp.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : emp.status === 'On Leave' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {emp.status}
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  PHP {Number(emp.basicSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
                </span>
              </div>

              <div className="space-y-2 flex-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.role} &bull; {emp.department}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.phone || 'No phone provided'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {activeTab === 'Time' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Daily Time Records</h3>
            
          </div>
          <div className="flex-1 overflow-x-auto p-4">
            {timeLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <p>No time records found.</p>
                <button 
                  onClick={() => {
                    const sampleTime = employees.slice(0,2).map((e, i) => ({
                      id: `T-${Date.now()}-${i}`, empId: e.id, date: new Date().toISOString().slice(0, 10), timeIn: '08:00 AM', timeOut: '05:00 PM', type: 'Regular'
                    }));
                    setTimeLogs(sampleTime);
                    localStorage.setItem('stratify_hr_time', JSON.stringify(sampleTime));
                    showToast('Sample time logs added', 'info');
                  }}
                  className="mt-4 text-blue-600 hover:underline text-xs"
                >
                  Load Sample Logs
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-bold uppercase">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2 text-center">Time In</th>
                    <th className="px-4 py-2 text-center">Time Out</th>
                    <th className="px-4 py-2 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {timeLogs.map(log => {
                    const emp = employees.find(e => e.id === log.empId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="px-4 py-3">{log.date}</td>
                        <td className="px-4 py-3 font-bold">{emp ? emp.name : log.empId}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-bold">{log.timeIn}</td>
                        <td className="px-4 py-3 text-center text-rose-600 font-bold">{log.timeOut}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">{log.type}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Leaves' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Leave Requests</h3>
            
          </div>
          <div className="flex-1 overflow-x-auto p-4">
            {leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <p>No leave requests found.</p>
                <button 
                  onClick={() => {
                    const sampleLeaves = employees.slice(0,1).map((e, i) => ({
                      id: `L-${Date.now()}-${i}`, empId: e.id, type: 'Vacation Leave', startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), status: 'Pending' as const
                    }));
                    setLeaveRequests(sampleLeaves);
                    localStorage.setItem('stratify_hr_leaves', JSON.stringify(sampleLeaves));
                    showToast('Sample leave added', 'info');
                  }}
                  className="mt-4 text-blue-600 hover:underline text-xs"
                >
                  Load Sample Leave
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-bold uppercase">
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-center">Dates</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {leaveRequests.map(leave => {
                    const emp = employees.find(e => e.id === leave.empId);
                    return (
                      <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-bold">{emp ? emp.name : leave.empId}</td>
                        <td className="px-4 py-3">{leave.type}</td>
                        <td className="px-4 py-3 text-center">{leave.startDate} to {leave.endDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase ${
                            leave.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {leave.status === 'Pending' && (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  const updated = leaveRequests.map(l => l.id === leave.id ? { ...l, status: 'Approved' as const } : l);
                                  setLeaveRequests(updated);
                                  localStorage.setItem('stratify_hr_leaves', JSON.stringify(updated));
                                }}
                                className="px-2 py-1 bg-emerald-600 text-white rounded font-bold"
                              >Approve</button>
                              <button 
                                onClick={() => {
                                  const updated = leaveRequests.map(l => l.id === leave.id ? { ...l, status: 'Rejected' as const } : l);
                                  setLeaveRequests(updated);
                                  localStorage.setItem('stratify_hr_leaves', JSON.stringify(updated));
                                }}
                                className="px-2 py-1 bg-rose-600 text-white rounded font-bold"
                              >Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Performance' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Performance Evaluations</h3>
            
          </div>
          <div className="flex-1 overflow-x-auto p-4 flex flex-col items-center justify-center text-zinc-400">
            <p>No performance records found.</p>
            <p className="text-xs mt-2 max-w-sm text-center">Track KPIs, semi-annual reviews, and issue regular feedback directly integrated with employee files.</p>
          </div>
        </div>
      )}

      {activeTab === 'Documents' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Document Repository</h3>
            
          </div>
          <div className="flex-1 overflow-x-auto p-4 flex flex-col items-center justify-center text-zinc-400">
            <p>No documents found.</p>
            <p className="text-xs mt-2 max-w-sm text-center">Store contracts, IDs, clearance forms, and compliance documents safely per employee.</p>
          </div>
        </div>
      )}

      {activeTab === 'Enterprise' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Enterprise HR System</h3>
              <p className="text-xs text-zinc-500">Comprehensive capabilities for scaling your HR operations.</p>
            </div>
            <button onClick={() => showToast('Upgrading to Enterprise Edition...', 'info')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              Upgrade System
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* 1. Core HR */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                <Network className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">1. Core HR & Org Structure</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> Employment Status Lifecycle (Active, Suspended, Separated)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> Hierarchy & Reporting (Manager self-referencing)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> Salary Audit Trail & History Tracking</li>
              </ul>
              <button onClick={() => showToast('Opening Org Structure Management...', 'info')} className="text-left text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Manage Org Structure →</button>
            </div>

            {/* 2. Timekeeping */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">2. Timekeeping & Attendance</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Crossing-Midnight Shifts & Grace Periods</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Hierarchy of Hours (ND, Regular OT, Holiday OT)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Auto-Resolve Missing Punches workflow</li>
              </ul>
              <button onClick={() => showToast('Opening Timekeeping Settings...', 'info')} className="text-left text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">Timekeeping Settings →</button>
            </div>

            {/* 3. Leaves */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">3. Leave Management & Accruals</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" /> Automated Accrual System (e.g. 1.25 VL/month)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" /> Multi-level Leave Workflow (Manager & HR)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" /> Negative Balances & Leave Without Pay (LWOP)</li>
              </ul>
              <button onClick={() => showToast('Opening Leave Accruals Configuration...', 'info')} className="text-left text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400">Configure Accruals →</button>
            </div>

            {/* 6. Offboarding */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg flex items-center justify-center mb-3">
                <LogOut className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">6. Final Pay & Offboarding</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Clearance Routing (IT, Finance, Manager)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Backpay & 13th Month Pro-ration Inclusion</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Automated Leave Conversions & Liability Deductions</li>
              </ul>
              <button onClick={() => showToast('Opening Offboarding Engine...', 'info')} className="text-left text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400">Offboarding Engine →</button>
            </div>

            {/* 7. Security & Data Privacy */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">7. Security & Data Privacy</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" /> Data Masking for Net Pay & Gov IDs</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" /> Role-Based Permissions (HR Admin vs Manager)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" /> Immutable Audit Logs for all profile/salary changes</li>
              </ul>
              <button onClick={() => showToast('Opening Security Settings...', 'info')} className="text-left text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400">Security Settings →</button>
            </div>

          </div>
        </div>
      )}

      {/* Slide-over Drawer for Employee Form */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl relative flex flex-col animate-in slide-in-from-right">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingEmployee ? 'Edit Employee' : 'New Employee'}
              </h2>
              <button onClick={closeDrawer} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role/Position *</label>
                    <input
                      type="text"
                      required
                      value={formData.role || ''}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Accountant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Finance"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Basic Salary (Monthly) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">₱</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.basicSalary || ''}
                      onChange={(e) => setFormData({...formData, basicSalary: Number(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date Hired</label>
                    <input
                      type="date"
                      value={formData.dateHired || ''}
                      onChange={(e) => setFormData({...formData, dateHired: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Contact Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="09xx-xxx-xxxx"
                    />
                  </div>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Statutory / Government IDs</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">TIN</label>
                    <input
                      type="text"
                      value={formData.tin || ''}
                      onChange={(e) => setFormData({...formData, tin: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="000-000-000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">SSS No.</label>
                    <input
                      type="text"
                      value={formData.sss || ''}
                      onChange={(e) => setFormData({...formData, sss: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00-0000000-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">PhilHealth No.</label>
                    <input
                      type="text"
                      value={formData.philHealth || ''}
                      onChange={(e) => setFormData({...formData, philHealth: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0000-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pag-IBIG No.</label>
                    <input
                      type="text"
                      value={formData.pagIbig || ''}
                      onChange={(e) => setFormData({...formData, pagIbig: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0000-0000-0000"
                    />
                  </div>
                </div>
                
                {/* Spacer for bottom padding */}
                <div className="h-10"></div>
              </form>
            </div>
            
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex gap-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-form"
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
              >
                Save Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

