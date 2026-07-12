export type PrawnType = 'Vanamei' | 'Tiger';

export interface PrawnListing {
  id: string;
  sellerName: string;
  sellerPhone: string;
  sellerWhatsApp?: string;
  sellerFacebook?: string;
  sellerLocation: string; // e.g., "Nellore, Andhra Pradesh"
  state: string; // for filtering
  prawnType: PrawnType;
  sizeCount: number; // e.g. 30, 40, 60 (pcs per kg)
  pricePerKg: number; // Price in INR or USD
  minOrderQty: number; // in kg
  totalQuantity: number; // in kg
  harvestDate: string; // YYYY-MM-DD
  isAntibioticFree: boolean;
  isBapCertified: boolean; // Best Aquaculture Practices
  cultureType: 'Intensive' | 'Semi-Intensive' | 'Traditional' | 'Biofloc';
  notes?: string;
  createdAt: string;
}

export interface FilterState {
  search: string;
  prawnType: PrawnType | 'All';
  minSize: number;
  maxSize: number;
  state: string;
  maxPrice: number;
  certifiedOnly: boolean;
  antibioticFreeOnly: boolean;
}
