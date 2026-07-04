import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CreditCard, UploadCloud, Calendar, User, Phone, Hash, DollarSign } from 'lucide-react';
import { Tenant } from '../types';
import { syncSubscriptionRequestToFirebase } from '../lib/db';

interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  isOpen,
  onClose,
  tenant,
  showToast,
}) => {
  const [payerName, setPayerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountPaid, setAmountPaid] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Calculate default cost based on request plan
    if (tenant) {
      const isAnnual = tenant.subscriptionRequestPlan === 'annual';
      const userSeats = tenant.subscriptionRequestUserLimit || 5;
      const calculated = isAnnual
        ? (2999 + userSeats * 100) * 12
        : (2999 + userSeats * 100);
      setAmountPaid(calculated.toString());
    }
  }, [tenant]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast('Proof of payment image size must be less than 3MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !contactNumber.trim() || !referenceNumber.trim() || !amountPaid.trim()) {
      showToast('Please fill out all required text fields.', 'error');
      return;
    }
    if (!proofImage) {
      showToast('Please upload an image as proof of payment.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const reqId = `sub-req-${tenant.id}`;
      const updatedReq = {
        id: reqId,
        tenantId: tenant.id,
        name: payerName,
        companyName: tenant.name,
        address: tenant.address || '',
        contactNumber: contactNumber,
        proofOfPaymentBase64: proofImage,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
        plan: tenant.subscriptionRequestPlan || 'monthly',
        users: tenant.subscriptionRequestUserLimit || 5,
        paymentMethod,
        referenceNumber,
        paymentDate,
        amountPaid: Number(amountPaid) || 0,
        paymentConfirmed: true,
      };

      await syncSubscriptionRequestToFirebase(updatedReq);
      showToast('Payment details & proof of payment submitted successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to submit payment confirmation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white text-left">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-200" />
              Confirm Subscription Payment
            </h2>
            <p className="text-xs text-indigo-100 mt-1">
              Please enter your payment transaction details and upload your receipt screenshot.
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1.5"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left overflow-y-auto custom-scrollbar flex-1">
            <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 text-xs space-y-1">
              <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Plan to Pay</span>
              <p className="text-zinc-700 dark:text-zinc-300">
                Plan: <strong className="capitalize">{tenant.subscriptionRequestPlan || 'Monthly'} Premium</strong> with <strong>{tenant.subscriptionRequestUserLimit || 5} user seats</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payer Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" /> Payer Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Juan dela Cruz"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" /> Contact Number *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 09171234567"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Payment Method / Channel *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="BDO Bank Transfer">BDO Bank Transfer</option>
                  <option value="BPI Bank Transfer">BPI Bank Transfer</option>
                  <option value="Metrobank">Metrobank</option>
                  <option value="UnionBank">UnionBank</option>
                  <option value="Other">Other Wallet/Bank</option>
                </select>
              </div>

              {/* Reference / Transaction ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" /> Ref / Transaction No. *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 10023456789"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Payment Date *
                </label>
                <input
                  required
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Amount Paid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-400" /> Amount Paid (PHP) *
                </label>
                <input
                  required
                  type="number"
                  step="any"
                  placeholder="e.g. 3500.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Proof of Payment File Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-zinc-400" /> Upload Receipt / Proof of Payment Image *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-250 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/70 rounded-2xl p-5 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-all cursor-pointer min-h-[140px]"
              >
                {proofImage ? (
                  <div className="relative group max-w-full">
                    <img src={proofImage} alt="Uploaded Proof" className="max-h-28 object-contain rounded-xl shadow border border-zinc-200 dark:border-zinc-800" />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white font-bold text-xs">
                      Change Image
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-zinc-400 mb-2" />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Click to upload Receipt Photo</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Supports PNG, JPG (Max 3MB)</span>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Submit Button */}
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Submitting details...' : 'Submit Payment Details'}
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
