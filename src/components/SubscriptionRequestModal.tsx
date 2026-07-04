import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Camera, Building, User, MapPin, Phone, UploadCloud } from 'lucide-react';
import { Tenant } from '../types';
import { syncSubscriptionRequestToFirebase, syncTenantToFirebase } from '../lib/db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  plan?: 'monthly' | 'annual';
  users?: number;
  onUpdateTenant?: (tenant: Tenant) => void;
}

export const SubscriptionRequestModal: React.FC<Props> = ({ isOpen, onClose, tenant, showToast, plan = 'monthly', users = 5, onUpdateTenant }) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState(tenant.name || '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [proof, setProof] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || !address || !phone) {
      showToast('Please fill all text fields.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const request = {
        id: `sub-req-${Date.now()}`,
        tenantId: tenant.id,
        name,
        companyName: company,
        address,
        contactNumber: phone,
        proofOfPaymentBase64: proof,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
        plan,
        users
      };
      
      await syncSubscriptionRequestToFirebase(request);

      const updatedTenant: Tenant = {
        ...tenant,
        subscriptionRequestStatus: 'pending',
        subscriptionRequestPlan: plan,
        subscriptionRequestUserLimit: users
      };
      
      await syncTenantToFirebase(updatedTenant);
      if (onUpdateTenant) {
        onUpdateTenant(updatedTenant);
      }

      showToast('Subscription request submitted successfully!', 'success');
      
      // Also open FB Messenger or Page in new tab
      window.open('https://www.facebook.com/share/1BVqhwRTeW/', '_blank');
      
      onClose();
    } catch (err) {
      showToast('Failed to submit request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
            <h2 className="text-xl font-bold font-display tracking-tight">Request Subscription</h2>
            <p className="text-xs text-blue-100 mt-1">Avail your premium plan today.</p>
          </div>
          
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1.5">
            <X className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Full Name
              </label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Building className="w-3 h-3" /> Company Name
              </label>
              <input required type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Address
              </label>
              <input required type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Contact Number
              </label>
              <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Camera className="w-3 h-3" /> Proof of Payment (Optional)
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
              >
                {proof ? (
                  <img src={proof} alt="Proof" className="h-20 object-contain rounded-lg" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 mb-2" />
                    <span className="text-xs">Click to upload image</span>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Sending Request...' : 'Send Request to Admin & Messenger'}
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
