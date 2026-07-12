import React, { useState } from 'react';
import { PrawnListing } from '../types';
import { X, Phone, MessageSquare, Facebook, ExternalLink, ShieldCheck, AlertCircle, Lock, Unlock } from 'lucide-react';

interface ContactModalProps {
  listing: PrawnListing;
  onClose: () => void;
}

// Clean text function to strictly strip any forbidden phrases
const cleanText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/Antibiotic-Free Certified \(Tested Negative\)/gi, '')
    .replace(/Antibiotic-Free Certified/gi, '')
    .replace(/BAP \(Best Aquaculture Practices\) Certified/gi, '')
    .replace(/BAP Certified/gi, '')
    .replace(/Culture Pond System/gi, '')
    .replace(/3\.\s*Additional Details\s*&\s*Notes/gi, '');
};

export default function ContactModal({ listing, onClose }: ContactModalProps) {
  const [isTaxPaid, setIsTaxPaid] = useState(false);

  // Clean any text details we display (such as notes or seller location/name if needed)
  const cleanedNotes = cleanText(listing.notes);
  const cleanedLocation = cleanText(listing.sellerLocation);
  const cleanedName = cleanText(listing.sellerName);

  // Calculate contact tax due: 3 Rupees per 1 kg of the total weight
  const taxDue = listing.totalQuantity * 3;

  // Generate WhatsApp message deep link
  const formattedPhone = listing.sellerPhone.replace(/\D/g, '');
  const whatsAppPhone = listing.sellerWhatsApp ? listing.sellerWhatsApp.replace(/\D/g, '') : formattedPhone;

  const defaultMessage = `Hello ${cleanedName}, I saw your listing for ${listing.sizeCount} count ${listing.prawnType} prawns on MSM Aqua Tech (fixed rate: ₹${listing.pricePerKg}/kg, total weight: ${listing.totalQuantity} kg). Is this harvest still available for booking?`;
  const encodedMessage = encodeURIComponent(defaultMessage);
  const whatsAppLink = `https://wa.me/${whatsAppPhone}?text=${encodedMessage}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        {/* Banner */}
        <div className={`${isTaxPaid ? 'bg-emerald-600' : 'bg-amber-600'} p-6 text-white relative transition-colors duration-300`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-sky-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/25 text-white border border-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            {isTaxPaid ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isTaxPaid ? 'tax paid successfully' : 'Direct Contact Locked'}
          </span>
          <h3 className="text-xl font-display font-bold mt-2 text-white">
            {isTaxPaid ? 'Tax paid successfully' : 'Contact System Restricted'}
          </h3>
          <p className="text-xs text-sky-100/90 mt-1">
            {isTaxPaid 
              ? 'Establish immediate voice or chat negotiations. No platform fees or commissions.'
              : 'Unlock secure contact access by settling the gateway inventory tax.'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Listing Brief Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  listing.prawnType === 'Vanamei' ? 'bg-sky-100 text-sky-800' : 'bg-teal-100 text-teal-800'
                }`}>
                  {listing.prawnType}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {listing.sizeCount} Count (pcs/kg)
                </span>
              </div>
              <h4 className="font-display font-bold text-slate-800 text-sm mt-1">
                {isTaxPaid ? cleanedName : '[Seller Name Redacted]'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTaxPaid ? cleanedLocation : '[Location / Address Redacted]'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Fixed Rate</span>
              <span className="text-lg font-mono font-bold text-sky-700">₹{listing.pricePerKg}</span>
              <span className="text-xs text-slate-500 block">/ kg</span>
            </div>
          </div>

          {/* Locked State Panel */}
          {!isTaxPaid ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-3 shadow-sm animate-fade-in">
                <div className="flex gap-2.5 items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900 uppercase tracking-wide">
                      Contact Status: LOCKED - AWAITING BUYER TAX PAYMENT
                    </p>
                    <p className="leading-relaxed font-medium">
                      To open this seller's contact details and proceed with this Sell Prawns listing of {listing.totalQuantity} kg, a contact tax of {taxDue} Rupees must be settled by the buyer (this will be directly credited to the developer account).
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setIsTaxPaid(true)}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-base">💳 Pay Tax: {taxDue} Rupees</span>
                <span className="text-[10px] text-amber-100 font-normal">
                  *(Completing this payment will instantly unlock the seller's details and credit the tax directly to the developer account)*
                </span>
              </button>
            </div>
          ) : (
            <>
              {/* Payment Success Alert */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex gap-2.5 animate-fade-in mb-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950 uppercase">tax paid successfully</p>
                  <p className="leading-relaxed font-medium text-emerald-700 mt-0.5">
                    tax paid sucessfully
                  </p>
                </div>
              </div>

              {/* Core Action Channels (Only visible once tax is paid) */}
              <div className="space-y-3 animate-fade-in">
                {/* Direct Dial Voice Call */}
                <a
                  href={`tel:${listing.sellerPhone}`}
                  className="flex items-center justify-between p-4 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-sky-600 text-white flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-sky-950">Call Phone Line</h5>
                      <p className="text-xs text-sky-800/80 mt-0.5">{listing.sellerPhone}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Direct WhatsApp Message with customized Template */}
                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-emerald-950 font-display">WhatsApp Chat</h5>
                      <p className="text-xs text-emerald-800/80 mt-0.5">Send specs pre-filled</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Facebook Profile if present */}
                {listing.sellerFacebook && (
                  <a
                    href={listing.sellerFacebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Facebook className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-blue-950">Facebook Profile</h5>
                        <p className="text-xs text-blue-800/80 mt-0.5">Visit social catalog</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
              </div>

              {/* Preformatted Template preview (Message Input Box) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs animate-fade-in">
                <span className="font-semibold text-slate-500 block mb-1">Pre-filled Inquiry Text:</span>
                <p className="text-slate-600 font-serif italic">"{defaultMessage}"</p>
              </div>
            </>
          )}

          {/* Secure Trade Advisory */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 flex gap-2.5 items-start">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-amber-950">Safe Trade Advisory</h5>
              <p className="text-[10px] text-amber-800/90 leading-normal mt-0.5">
                We advocate visiting the farm site or utilizing verified transport agents to verify the biomass weight and quality parameters prior to final remittance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
