import React, { useState } from 'react';
import { PrawnListing, PrawnType } from '../types';
import { INDIAN_STATES } from '../data/mockData';
import { X, Check, Save, Plus, AlertCircle } from 'lucide-react';

interface AddListingModalProps {
  onClose: () => void;
  onSave: (listing: Omit<PrawnListing, 'id' | 'createdAt'>) => void;
}

export default function AddListingModal({ onClose, onSave }: AddListingModalProps) {
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerWhatsApp, setSellerWhatsApp] = useState('');
  const [sellerFacebook, setSellerFacebook] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [prawnType, setPrawnType] = useState<PrawnType>('Vanamei');
  const [sizeCount, setSizeCount] = useState<number>(40);
  const [pricePerKg, setPricePerKg] = useState<number>(350);
  const [minOrderQty, setMinOrderQty] = useState<number>(500);
  const [totalQuantity, setTotalQuantity] = useState<number>(2000);
  const [harvestDate, setHarvestDate] = useState('2026-07-02');
  const [notes, setNotes] = useState('');
  const [taxPaid, setTaxPaid] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setSellerPhone(cleaned);
    }
  };

  const handleWhatsAppChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setSellerWhatsApp(cleaned);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sellerName.trim()) {
      setError('Please provide a seller or farm name');
      return;
    }
    if (!sellerPhone.trim()) {
      setError('Phone number is required for buyers to call you');
      return;
    }
    if (sellerPhone.length !== 10) {
      setError('Direct Mobile Number must be exactly 10 digits');
      return;
    }
    if (sellerWhatsApp && sellerWhatsApp.length !== 10) {
      setError('WhatsApp Number must be exactly 10 digits');
      return;
    }
    if (!sellerLocation.trim()) {
      setError('Please specify the exact harvest location (town/district)');
      return;
    }
    if (sizeCount <= 0 || sizeCount > 200) {
      setError('Please specify a valid size count (e.g., 20 to 150 count per kg)');
      return;
    }
    if (pricePerKg <= 0) {
      setError('Please set a valid price per kg');
      return;
    }
    if (totalQuantity <= 0) {
      setError('Please specify the total available quantity');
      return;
    }

    onSave({
      sellerName,
      sellerPhone,
      sellerWhatsApp: sellerWhatsApp ? sellerWhatsApp : undefined,
      sellerFacebook: sellerFacebook ? sellerFacebook : undefined,
      sellerLocation,
      state,
      prawnType,
      sizeCount,
      pricePerKg,
      minOrderQty,
      totalQuantity,
      harvestDate,
      isAntibioticFree: false,
      isBapCertified: false,
      cultureType: 'Semi-Intensive',
      notes: notes.trim() ? notes : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-[#075E7D] text-white rounded-t-2xl">
          <div>
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-300" />
              Add Prawns Listing
            </h3>
            <p className="text-xs text-sky-100/90 mt-0.5">
              Enter your pond biomass details. Verified buyers will contact you directly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Contact & Location */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-100">
              1. Seller Profile & Contacts
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Farmer / Enterprise Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nellore Prawn Producers Ltd."
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Direct Mobile Number *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={sellerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    sellerPhone.length === 0
                      ? 'border-slate-200 focus:ring-[#075E7D]/20 focus:border-[#075E7D]'
                      : sellerPhone.length === 10
                      ? 'border-emerald-500 bg-emerald-50/5 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-400'
                  }`}
                />
                {sellerPhone.length > 0 && sellerPhone.length < 10 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">Must be exactly 10 digits (currently {sellerPhone.length}/10)</p>
                )}
                {sellerPhone.length === 10 && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">✓ Valid 10-digit number</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Number (Optional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="10-digit WhatsApp number"
                  value={sellerWhatsApp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    sellerWhatsApp.length === 0
                      ? 'border-slate-200 focus:ring-[#075E7D]/20 focus:border-[#075E7D]'
                      : sellerWhatsApp.length === 10
                      ? 'border-emerald-500 bg-emerald-50/5 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-400'
                  }`}
                />
                {sellerWhatsApp.length > 0 && sellerWhatsApp.length < 10 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">Must be exactly 10 digits (currently {sellerWhatsApp.length}/10)</p>
                )}
                {sellerWhatsApp.length === 10 && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">✓ Valid 10-digit number</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Facebook Page/Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://facebook.com/myfarm"
                  value={sellerFacebook}
                  onChange={(e) => setSellerFacebook(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Harvest State / Territory
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Exact Location (Town / District) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bhimavaram, near bypass"
                  value={sellerLocation}
                  onChange={(e) => setSellerLocation(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Prawn Stock Specifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 pb-1 border-b border-slate-100">
              2. Stock Sizing & Pricing Spec
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type Switcher restricted strictly to Vanamei or Tiger */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prawn Spec / Breed Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrawnType('Vanamei')}
                    className={`py-2 px-3 text-sm rounded-lg border font-bold text-center transition-all ${
                      prawnType === 'Vanamei'
                        ? 'border-[#075E7D] bg-sky-50 text-[#075E7D] ring-2 ring-[#075E7D]/15'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Vanamei Prawns
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrawnType('Tiger')}
                    className={`py-2 px-3 text-sm rounded-lg border font-bold text-center transition-all ${
                      prawnType === 'Tiger'
                        ? 'border-[#00A3A3] bg-teal-50 text-[#00A3A3] ring-2 ring-[#00A3A3]/15'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tiger Prawns
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Size Count (Prawns per kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={sizeCount}
                    onChange={(e) => setSizeCount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm pl-3 pr-16 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                    pcs/kg
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Lower counts = larger prawns. Standard is 30 to 80 counts.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Fixed Rate (Price per kg in ₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(parseInt(e.target.value) || 0)}
                    className="w-full text-sm pl-7 pr-16 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                    / kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Harvest Biomass (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
                    className="w-full text-sm pr-12 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                    kg
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g., 2000 kg is 2 Tonnes of stock.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Min. Order Acceptance Qty (kg)
                </label>
                <input
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Estimated Harvest Date
                </label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                />
              </div>
            </div>
          </div>

          {/* Live Valuation Summary */}
          <div className="bg-[#075E7D]/5 border border-[#075E7D]/10 rounded-xl p-4 space-y-1.5">
            <h5 className="text-[11px] font-bold text-[#075E7D] uppercase tracking-wider">
              Automatic Prawns Listing Registration Summary
            </h5>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Prawns Registered:</span>
              <span className="font-semibold text-slate-800">{totalQuantity.toLocaleString()} kg of {prawnType} Prawns</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Rate Per Kg:</span>
              <span className="font-semibold text-slate-800">₹{pricePerKg.toLocaleString()} / kg</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Inventory Tax (Non-Refundable):</span>
              <span className="font-semibold text-amber-600">₹{(totalQuantity * 2).toLocaleString()} Rupees</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60">
              <span className="font-semibold text-slate-800">Total Registered Value:</span>
              <span className="font-bold text-sm text-[#075E7D]">
                ₹{(totalQuantity * pricePerKg).toLocaleString()} Rupees
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {!taxPaid ? (
                <button
                  type="button"
                  onClick={() => setTaxPaid(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  💳 Pay Inventory Tax: ₹{(totalQuantity * 2).toLocaleString()} Rupees
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Tax Paid Successfully
                </span>
              )}
            </div>
            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!taxPaid}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 ${
                  !taxPaid
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200'
                    : 'bg-[#075E7D] hover:bg-[#054a63] hover:shadow-lg cursor-pointer'
                }`}
                title={!taxPaid ? "Please pay inventory tax to publish listing" : "Publish Listing"}
              >
                <Save className="h-4 w-4" />
                Publish Listing
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
