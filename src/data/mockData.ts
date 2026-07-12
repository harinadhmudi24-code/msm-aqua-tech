import { PrawnListing } from '../types';

export const INITIAL_LISTINGS: PrawnListing[] = [
  {
    id: 'list-1',
    sellerName: 'Coastal Aquatics India',
    sellerPhone: '+919876543210',
    sellerWhatsApp: '+919876543210',
    sellerFacebook: 'https://facebook.com/coastal-aquatics-in',
    sellerLocation: 'Nellore, Andhra Pradesh',
    state: 'Andhra Pradesh',
    prawnType: 'Vanamei',
    sizeCount: 40, // 40 count is prime Vanamei size
    pricePerKg: 420, // INR
    minOrderQty: 500, // 500 kg
    totalQuantity: 3500, // 3.5 Tonnes
    harvestDate: '2026-06-28',
    isAntibioticFree: true,
    isBapCertified: true,
    cultureType: 'Semi-Intensive',
    notes: 'Premium grade Vanamei. Excellent shell hardness and color. Harvesting tomorrow morning. Buyers looking for prompt transport please contact immediately.',
    createdAt: '2026-06-28T09:15:00.000Z'
  },
  {
    id: 'list-2',
    sellerName: 'Sagar Prawn Hatchery & Farm',
    sellerPhone: '+919848022331',
    sellerWhatsApp: '+919848022331',
    sellerLocation: 'Bhimavaram, Andhra Pradesh',
    state: 'Andhra Pradesh',
    prawnType: 'Tiger',
    sizeCount: 20, // Tiger prawns are larger, 20 count is huge
    pricePerKg: 780, // INR
    minOrderQty: 200,
    totalQuantity: 1500,
    harvestDate: '2026-06-29',
    isAntibioticFree: true,
    isBapCertified: false,
    cultureType: 'Traditional',
    notes: 'Wild-cultured giant Tiger prawns. Absolutely zero chemicals used. Fresh water salinity managed. Perfect for premium exports or domestic high-end hospitality.',
    createdAt: '2026-06-29T14:30:00.000Z'
  },
  {
    id: 'list-3',
    sellerName: 'Gujarat Marine Farms',
    sellerPhone: '+919924511223',
    sellerWhatsApp: '+919924511223',
    sellerLocation: 'Surat, Gujarat',
    state: 'Gujarat',
    prawnType: 'Vanamei',
    sizeCount: 60, // 60 count
    pricePerKg: 340,
    minOrderQty: 1000,
    totalQuantity: 8000,
    harvestDate: '2026-06-25',
    isAntibioticFree: true,
    isBapCertified: true,
    cultureType: 'Biofloc',
    notes: 'Biofloc-harvested sustainable Vanamei prawns. Uniform sizing across all batches. Tested negative for WSSV (White Spot Syndrome Virus) and IHHNV.',
    createdAt: '2026-06-25T11:00:00.000Z'
  },
  {
    id: 'list-4',
    sellerName: 'Bengal Aqua Culture Enterprise',
    sellerPhone: '+919007123456',
    sellerWhatsApp: '+919007123456',
    sellerLocation: 'Contai (Purba Medinipur), West Bengal',
    state: 'West Bengal',
    prawnType: 'Tiger',
    sizeCount: 30, // 30 count Tiger prawns
    pricePerKg: 650,
    minOrderQty: 300,
    totalQuantity: 2200,
    harvestDate: '2026-06-27',
    isAntibioticFree: false,
    isBapCertified: false,
    cultureType: 'Semi-Intensive',
    notes: 'High vigor Black Tiger prawns. Feed: High protein organic pellets. Direct farm pickup available. Rates slightly negotiable for orders above 1.5 tons.',
    createdAt: '2026-06-27T16:45:00.000Z'
  },
  {
    id: 'list-5',
    sellerName: 'Marina Blue Hatcheries',
    sellerPhone: '+919444098765',
    sellerWhatsApp: '+919444098765',
    sellerLocation: 'Nagapattinam, Tamil Nadu',
    state: 'Tamil Nadu',
    prawnType: 'Vanamei',
    sizeCount: 80, // 80 count is smaller
    pricePerKg: 280,
    minOrderQty: 1000,
    totalQuantity: 12000, // 12 Tonnes
    harvestDate: '2026-06-29',
    isAntibioticFree: true,
    isBapCertified: true,
    cultureType: 'Intensive',
    notes: 'Bulk availability of 80-count Vanamei. Perfect for processing units, peeling, and block freezing. Cold chain transport can be arranged up to Chennai.',
    createdAt: '2026-06-29T08:00:00.000Z'
  },
  {
    id: 'list-6',
    sellerName: 'Mahanadi Aqua Estates',
    sellerPhone: '+919178001122',
    sellerLocation: 'Balasore, Odisha',
    state: 'Odisha',
    prawnType: 'Tiger',
    sizeCount: 15, // Extremely large premium tiger prawns
    pricePerKg: 950,
    minOrderQty: 100,
    totalQuantity: 800,
    harvestDate: '2026-06-30',
    isAntibioticFree: true,
    isBapCertified: true,
    cultureType: 'Traditional',
    notes: 'Jumbo Tiger prawns (15 pcs/kg). Hand-sorted selection, highly demanding grade. Perfect for live export market or high-end seafood distributors.',
    createdAt: '2026-06-30T06:00:00.000Z'
  }
];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Gujarat',
  'West Bengal',
  'Tamil Nadu',
  'Odisha',
  'Karnataka',
  'Kerala',
  'Maharashtra'
];
