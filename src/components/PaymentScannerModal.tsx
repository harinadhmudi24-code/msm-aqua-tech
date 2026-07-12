import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  X, 
  QrCode, 
  Scan, 
  Coins, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface PaymentScannerModalProps {
  onClose: () => void;
  onScanSuccess: (amount: number, newAdminBalance: number) => void;
}

export default function PaymentScannerModal({ onClose, onScanSuccess }: PaymentScannerModalProps) {
  const [amount, setAmount] = useState<string>('500');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{ amount: number; balance: number } | null>(null);

  const presets = ['100', '500', '1000', '2500', '5000'];

  const handleProcessScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const scanAmount = parseFloat(amount);
    if (isNaN(scanAmount) || scanAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to execute a secure scan.');
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/payments/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: scanAmount })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Backend failed to process the payment scan.');
      }

      const data = await response.json();
      setSuccessData({ amount: scanAmount, balance: data.revenueBalance });
      setSuccess(true);
      
      // Notify parent app of success to update state & real-time sync immediately
      onScanSuccess(scanAmount, data.revenueBalance);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during payment processing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-fade-in">
        {/* Banner */}
        <div className="bg-slate-900 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <QrCode className="h-3 w-3 animate-pulse" />
              Secure Scanner Interface
            </span>
          </div>
          <h3 className="text-xl font-display font-bold mt-2 text-white">
            Visual Payment Scanner
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Scan a billing document or simulate a QR payment capture to credit the central admin account.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {success && successData ? (
            /* Success State View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce border border-emerald-200">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Authorized & Credited</h4>
                <p className="text-xs text-slate-500 mt-1">
                  The scanned amount was securely routed and deposited into the central treasury.
                </p>
              </div>

              {/* Transaction Statement */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-left space-y-2 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Credited Amount:</span>
                  <strong className="text-slate-900 font-mono">₹{successData.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Recipient Account:</span>
                  <strong className="text-slate-900">Global Admin Treasury</strong>
                </div>
                <div className="flex justify-between text-xs text-slate-600 border-t border-dashed border-emerald-200 pt-2 mt-1">
                  <span>New Admin Balance:</span>
                  <strong className="text-emerald-700 font-mono">₹{successData.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-xl inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>tax paid sucessfully</span>
              </div>

              <div>
                <button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  Close Scanner
                </button>
              </div>
            </div>
          ) : (
            /* Active Scanner Form */
            <form onSubmit={handleProcessScan} className="space-y-5">
              
              {/* Viewfinder Camera Box */}
              <div className="relative h-[200px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
                {/* Visual Camera/Scan brackets in corners */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-teal-400"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-teal-400"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-teal-400"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-teal-400"></div>

                {/* Sweeping Scanning Laser */}
                {!loading && (
                  <div className="absolute top-0 left-4 right-4 h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-scan z-10"></div>
                )}

                {/* Animated Scanner Box Overlay */}
                <div className="w-36 h-36 border border-teal-500/30 rounded-lg flex items-center justify-center bg-teal-500/5 backdrop-blur-[0.5px]">
                  <QrCode className="h-16 w-16 text-teal-400/60 animate-pulse" />
                </div>

                {/* Overlay Text / Status indicator */}
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="bg-black/60 text-[10px] text-teal-300 font-mono px-2.5 py-1 rounded-full inline-flex items-center gap-1 backdrop-blur-sm border border-white/5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping"></span>
                    CAMERA_VIEWFINDER_LIVE
                  </span>
                </div>
              </div>

              {/* Scanned Amount Detection Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Enter Scan Amount (₹)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Invoice Reader Mode</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    disabled={loading}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter detected payment amount"
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D] bg-white text-slate-800 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detected Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={loading}
                      onClick={() => setAmount(preset)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        amount === preset
                          ? 'bg-teal-500 border-teal-500 text-white font-extrabold shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Block */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-250 text-slate-700 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="flex-2 bg-[#00A3A3] hover:bg-[#008f8f] text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing Scan...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="h-3.5 w-3.5" />
                      <span>Process Scan</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
