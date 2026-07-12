import React, { useState, useEffect } from 'react';
import { PrawnListing, FilterState, PrawnType } from './types';
import { INITIAL_LISTINGS, INDIAN_STATES } from './data/mockData';
import AddListingModal from './components/AddListingModal';
import ContactModal from './components/ContactModal';
import msmLogo from './assets/images/msm_logo_1782918428282.jpg';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';
import PaymentScannerModal from './components/PaymentScannerModal';
import { 
  Anchor, 
  Search, 
  Filter, 
  Plus, 
  BookOpen, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  MapPin, 
  Scale, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  Database,
  ArrowUpDown,
  Tag,
  Calculator,
  Check,
  X,
  AlertCircle,
  Lock,
  Cloud,
  LogOut,
  User,
  QrCode,
  Coins,
  Scan
} from 'lucide-react';

// Your Firebase Config (Auto-filled by Google AI Studio / loaded from Env)
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment12345678",
  authDomain: firebaseConfigJson.authDomain || (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || `${window.location.hostname}.firebaseapp.com`,
  projectId: firebaseConfigJson.projectId || (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "msm-aqua-tech",
  appId: firebaseConfigJson.appId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId
};

const fbApp = initializeApp(firebaseConfig);
export const db = getFirestore(fbApp, firebaseConfigJson.firestoreDatabaseId);
export const auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();


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

export default function App() {
  // Listings state (stored in localStorage for real-time persistence)
  const [listings, setListings] = useState<PrawnListing[]>(() => {
    const saved = localStorage.getItem('msm_aqua_listings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading saved listings', e);
      }
    }
    return INITIAL_LISTINGS;
  });

  // State controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [openModalAfterSignIn, setOpenModalAfterSignIn] = useState(false);
  const [activeContactListing, setActiveContactListing] = useState<PrawnListing | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc' | 'countAsc'>('newest');

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    prawnType: 'All',
    minSize: 10,
    maxSize: 120,
    state: 'All',
    maxPrice: 1000,
    certifiedOnly: false,
    antibioticFreeOnly: false
  });

  // Billing and Flat Tax Calculator State (Rule: 2 Rupees flat tax per 1 kg)
  const [calcWeight, setCalcWeight] = useState<string>('2');
  const [calcPrice, setCalcPrice] = useState<string>('400');

  const [registrationNotification, setRegistrationNotification] = useState<string | null>(null);
  const [pendingListing, setPendingListing] = useState<Omit<PrawnListing, 'id' | 'createdAt'> | null>(null);

  // Firebase Auth and Notebook States
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [taxAccountBalance, setTaxAccountBalance] = useState<number>(0);
  const [taxSuccessAlert, setTaxSuccessAlert] = useState<string | null>(null);
  const [notebookTitle, setNotebookTitle] = useState('');
  const [notebookContent, setNotebookContent] = useState('');
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [taxRate, setTaxRate] = useState<string>('18');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [dbSyncLoading, setDbSyncLoading] = useState(false);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<'buy' | 'notebook'>('buy');
  const [userRole, setUserRole] = useState<'farmer' | 'admin'>('farmer');
  const [adminRevenueBalance, setAdminRevenueBalance] = useState<number>(0);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  // Monitor Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        fetchUserPosts(currentUser);
        fetchUserBalance(currentUser);
      } else {
        setPosts([]);
        setTaxAccountBalance(0);
        setUserRole('farmer');
        setAdminRevenueBalance(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Open modal after successful sign in if requested
  useEffect(() => {
    if (firebaseUser && openModalAfterSignIn) {
      setShowAddModal(true);
      setOpenModalAfterSignIn(false);
    }
  }, [firebaseUser, openModalAfterSignIn]);

  const handleSignIn = () => {
    setDbSyncLoading(true);
    setDbSyncError(null);
    signInWithPopup(auth, provider)
      .catch(err => setDbSyncError(err.message))
      .finally(() => setDbSyncLoading(false));
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  // Fetch Direct Tax Account Balance and Role
  const fetchUserBalance = async (currentUser: FirebaseUser) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Fetch balance error response:', errText);
        throw new Error(`Failed to fetch tax balance: ${errText}`);
      }
      const data = await response.json();
      setTaxAccountBalance(data.taxAccountBalance || 0);
      setUserRole(data.role || 'farmer');
    } catch (err: any) {
      console.error('Error fetching balance:', err.message);
    }
  };

  // Toggle user role simulation
  const handleToggleUserRole = async () => {
    if (!firebaseUser) return;
    setDbSyncLoading(true);
    setDbSyncError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/user/toggle-role', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to toggle role: ${errText}`);
      }
      const data = await response.json();
      setUserRole(data.role || 'farmer');
      setTaxAccountBalance(data.taxAccountBalance || 0);
    } catch (err: any) {
      setDbSyncError(err.message);
    } finally {
      setDbSyncLoading(false);
    }
  };

  // Listen to Admin Revenue Balance in real-time
  useEffect(() => {
    if (!firebaseUser || userRole !== 'admin') {
      setAdminRevenueBalance(0);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'system_config', 'admin_profile'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminRevenueBalance(docSnap.data().revenueBalance || 0);
      } else {
        setAdminRevenueBalance(0);
      }
    }, (error) => {
      console.error('Real-time admin balance listener error:', error);
    });

    return () => unsubscribe();
  }, [firebaseUser, userRole]);

  // Securely Fetch Posts using JWT Token
  const fetchUserPosts = async (currentUser: FirebaseUser) => {
    setDbSyncLoading(true);
    setDbSyncError(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch synchronized notebook entries: ${errText}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err: any) {
      setDbSyncError(err.message);
    } finally {
      setDbSyncLoading(false);
    }
  };

  // Securely Submit New Entry (supports both Create and Update)
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notebookTitle || !notebookContent) return;

    setDbSyncLoading(true);
    setDbSyncError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No authenticated user session found");
      const token = await currentUser.getIdToken();

      const payload = {
        title: notebookTitle,
        content: notebookContent,
        grossAmount: grossAmount ? parseFloat(grossAmount) : 0,
        taxRate: taxRate ? parseFloat(taxRate) : 0
      };

      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save notebook entry to secure cloud`);
      }
      
      const savedPost = await response.json();
      if (editingPostId) {
        setPosts(prev => prev.map(p => p.id === editingPostId ? savedPost : p));
      } else {
        setPosts(prev => [savedPost, ...prev]); // Optimistic UI Update
        if (savedPost.newBalance !== undefined) {
          setTaxAccountBalance(savedPost.newBalance);
        }
        if (savedPost.taxAmount > 0) {
          setTaxSuccessAlert(`Success: ₹${savedPost.taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} in tax rewards credited directly to your account!`);
          // Auto clear after 6 seconds
          setTimeout(() => {
            setTaxSuccessAlert(null);
          }, 6000);
        }
      }

      // Reset form fields
      setNotebookTitle('');
      setNotebookContent('');
      setGrossAmount('');
      setTaxRate('18');
      setEditingPostId(null);
    } catch (err: any) {
      setDbSyncError(err.message);
    } finally {
      setDbSyncLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNotebookTitle('');
    setNotebookContent('');
    setGrossAmount('');
    setTaxRate('18');
    setEditingPostId(null);
  };

  // Persist listings to localStorage
  useEffect(() => {
    localStorage.setItem('msm_aqua_listings', JSON.stringify(listings));
  }, [listings]);

  // Aggregate stats calculations
  const totalBiomass = listings.reduce((sum, item) => sum + item.totalQuantity, 0);
  
  const vanameiListings = listings.filter(l => l.prawnType === 'Vanamei');
  const avgVanameiPrice = vanameiListings.length > 0
    ? Math.round(vanameiListings.reduce((sum, item) => sum + item.pricePerKg, 0) / vanameiListings.length)
    : 0;

  const tigerListings = listings.filter(l => l.prawnType === 'Tiger');
  const avgTigerPrice = tigerListings.length > 0
    ? Math.round(tigerListings.reduce((sum, item) => sum + item.pricePerKg, 0) / tigerListings.length)
    : 0;

  // Computed values for Prawn Billing & Specific Tax (₹2 flat tax per kg)
  const calcWeightNum = parseFloat(calcWeight) || 0;
  const calcPriceNum = parseFloat(calcPrice) || 0;
  const calcBasePrice = Number((calcWeightNum * calcPriceNum).toFixed(2));
  const calcTax = Number((calcWeightNum * 2).toFixed(2));
  const calcTotal = Number((calcBasePrice + calcTax).toFixed(2));

  // Handle adding a new listing
  const handleAddListing = (newListingData: Omit<PrawnListing, 'id' | 'createdAt'>) => {
    setShowAddModal(false);

    const finalizedListing: PrawnListing = {
      ...newListingData,
      id: `list-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setListings(prev => [finalizedListing, ...prev]);

    const totalValue = newListingData.totalQuantity * newListingData.pricePerKg;

    setRegistrationNotification(
      `Prawns Listing Registration Successful.\nItem: Prawns\nTotal Quantity: ${newListingData.totalQuantity} kg\nTotal Registered Value: ${totalValue.toLocaleString()} Rupees`
    );
  };

  // Filter & Sort Logic
  const filteredListings = listings.filter(listing => {
    // Search query matching
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = 
      listing.sellerName.toLowerCase().includes(searchLower) ||
      listing.sellerLocation.toLowerCase().includes(searchLower) ||
      (listing.notes && listing.notes.toLowerCase().includes(searchLower));

    // Type filter
    const matchesType = filters.prawnType === 'All' || listing.prawnType === filters.prawnType;

    // Size count filter
    const matchesSize = listing.sizeCount >= filters.minSize && listing.sizeCount <= filters.maxSize;

    // State filter
    const matchesState = filters.state === 'All' || listing.state === filters.state;

    // Price limit
    const matchesPrice = listing.pricePerKg <= filters.maxPrice;

    return matchesSearch && matchesType && matchesSize && matchesState && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'priceAsc') {
      return a.pricePerKg - b.pricePerKg;
    }
    if (sortBy === 'priceDesc') {
      return b.pricePerKg - a.pricePerKg;
    }
    if (sortBy === 'countAsc') {
      return a.sizeCount - b.sizeCount;
    }
    return 0;
  });

  const resetFilters = () => {
    setFilters({
      search: '',
      prawnType: 'All',
      minSize: 10,
      maxSize: 120,
      state: 'All',
      maxPrice: 1000,
      certifiedOnly: false,
      antibioticFreeOnly: false
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Upper Status Line */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-8 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A3A3] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A3A3]"></span>
          </span>
          <span>B2B Peer-to-Peer Aqua Marketplace • Commission-Free</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-400 font-medium">
          <span>Active Biomass: <strong className="text-white">{(totalBiomass / 1000).toFixed(1)} Tons</strong></span>
          <span>Vanamei Avg: <strong className="text-emerald-400">₹{avgVanameiPrice}/kg</strong></span>
          <span>Tiger Avg: <strong className="text-orange-400">₹{avgTigerPrice}/kg</strong></span>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="h-16 sticky top-0 z-40 bg-[#075E7D] text-white flex items-center justify-between px-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-inner border border-white/20">
            <img 
              src={msmLogo} 
              alt="MSM Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none font-display">MSM Aqua Tech</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold mt-0.5">PRAWNS MARKET RULLED BY FARMERS</p>
          </div>
        </div>

        {/* Navigation Middle tab links from design mockup */}
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <button 
            onClick={() => { setActiveNavTab('buy'); resetFilters(); }}
            className={`pb-1 font-semibold cursor-pointer border-b-2 transition-all ${
              activeNavTab === 'buy' ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white'
            }`}
          >
            Buy Prawns
          </button>
          <button 
            onClick={() => {
              if (firebaseUser) {
                setShowAddModal(true);
              } else {
                setOpenModalAfterSignIn(true);
                handleSignIn();
              }
            }}
            className="text-white/80 hover:text-white transition-opacity font-semibold cursor-pointer"
          >
            Sell Prawns
          </button>
        </nav>

        {/* Action Hub */}
        <div className="flex items-center gap-3">
          {firebaseUser ? (
            <div className="flex items-center gap-2.5 bg-black/15 border border-white/10 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {firebaseUser.photoURL ? (
                <img 
                  src={firebaseUser.photoURL} 
                  alt={firebaseUser.displayName || 'User'} 
                  className="w-5.5 h-5.5 rounded-full border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5.5 h-5.5 bg-[#00A3A3] rounded-full flex items-center justify-center text-[10px] font-bold text-white whitespace-nowrap">
                  {firebaseUser.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-semibold text-slate-100 max-w-[100px] truncate whitespace-nowrap">
                {firebaseUser.displayName?.split(' ')[0] || 'Farmer'}
              </span>
              {/* Header Balance Badge */}
              <span className="hidden sm:inline bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" title="Direct Tax Balance">
                ₹{taxAccountBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </span>
              {/* Header Admin Balance Badge */}
              {userRole === 'admin' && (
                <span className="hidden sm:inline bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1" title="Real-time Admin Revenue Balance">
                  👑 ₹{adminRevenueBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              )}
              <button 
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-300 hover:text-white transition-colors cursor-pointer p-0.5 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition-all border border-slate-200 cursor-pointer whitespace-nowrap"
            >
              <Lock className="h-3.5 w-3.5 text-[#075E7D]" />
              <span className="whitespace-nowrap">Google Sign-In</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero & Market Ticker Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#075E7D] to-[#043e53] text-white py-10 px-8 border-b border-slate-200">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <span className="text-teal-200 text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/10 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Verified Trade Network for Aqua Farmers
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-3 tracking-tight">
              Connect Directly. <span className="text-teal-300">0% Commission.</span>
            </h2>
            <p className="text-xs sm:text-sm text-sky-100/90 mt-2 max-w-xl leading-relaxed whitespace-nowrap">
              Sell smarter. Earn better. Grow with MSM.
            </p>
            <p className="text-xs sm:text-sm text-sky-100/90 mt-1 max-w-xl leading-relaxed">
              Where quality products meet the right buyers.
            </p>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="bg-black/20 border border-white/10 p-3.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[9px] uppercase font-bold tracking-wider text-sky-200 block">Vanamei Avg</span>
              <span className="text-base font-mono font-bold text-emerald-300 block mt-0.5">₹{avgVanameiPrice}/kg</span>
            </div>
            <div className="bg-black/20 border border-white/10 p-3.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[9px] uppercase font-bold tracking-wider text-sky-200 block">Tiger Avg</span>
              <span className="text-base font-mono font-bold text-orange-300 block mt-0.5">₹{avgTigerPrice}/kg</span>
            </div>
            <div className="bg-black/20 border border-white/10 p-3.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[9px] uppercase font-bold tracking-wider text-sky-200 block">Available</span>
              <span className="text-base font-mono font-bold text-white block mt-0.5">{(totalBiomass / 1000).toFixed(1)} Tons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Reward Credited Visual Alert Banner */}
      {taxSuccessAlert && (
        <div className="max-w-7xl mx-auto px-8 mt-6">
          <div className="bg-emerald-500 text-white rounded-xl p-4 flex items-center justify-between gap-3 shadow-md border border-emerald-600 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="text-xs font-bold leading-relaxed">{taxSuccessAlert}</p>
            </div>
            <button 
              onClick={() => setTaxSuccessAlert(null)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Direct Contact Flow Active */}
      {registrationNotification && (
        <div className="max-w-7xl mx-auto px-8 mt-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium whitespace-pre-wrap text-emerald-700">{registrationNotification}</p>
              </div>
            </div>
            <button 
              onClick={() => setRegistrationNotification(null)}
              className="p-1 rounded-lg transition-colors cursor-pointer shrink-0 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Core Directory Layout */}
      {activeNavTab === 'notebook' ? (
        <main className="max-w-7xl mx-auto px-8 py-8 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Dashboard Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-100 mb-8">
              <div>
                <span className="text-[10px] text-teal-600 font-bold uppercase tracking-widest bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  {userRole === 'admin' ? 'Central Administration Sync' : 'P2P Cloud Storage Sync'}
                </span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2">
                  {userRole === 'admin' ? '👑 System Administration Dashboard' : "Farmer's Secure Notebook"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {userRole === 'admin'
                    ? 'Manage global administrative operations, view real-time audit ledger payments, and run the billing scanner.'
                    : 'Maintain secure private notes, pricing targets, or crop journals. Synced to Firestore database via our backend engine.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {firebaseUser && (
                  <>
                    {/* Simulator Role Selector Button */}
                    <button
                      onClick={handleToggleUserRole}
                      disabled={dbSyncLoading}
                      className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-755 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Click to toggle between Farmer and Admin roles"
                    >
                      <span className="text-[9px] uppercase font-bold text-slate-400">Simulator Role:</span>
                      <strong className="text-slate-800 font-extrabold">{userRole === 'admin' ? '👑 Admin' : '🌾 Farmer'}</strong>
                    </button>

                    {/* Direct Tax Account Balance Widget */}
                    <div className="bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                      <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 block leading-none">Direct Tax Balance</span>
                        <span className="text-xs font-mono font-bold text-emerald-800 block mt-0.5 leading-none">
                          ₹{taxAccountBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>

                    {/* Real-time Admin Revenue Balance Widget */}
                    {userRole === 'admin' && (
                      <div className="bg-blue-50 border border-blue-200/80 px-4 py-1.5 rounded-xl flex items-center gap-2.5 shadow-sm animate-fade-in">
                        <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                          <Coins className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-blue-600 block leading-none">Admin Revenue Balance</span>
                          <span className="text-xs font-mono font-bold text-blue-800 block mt-0.5 leading-none">
                            ₹{adminRevenueBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Simulate Scan trigger */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setShowScannerModal(true)}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Scan className="h-3.5 w-3.5" />
                        <span>Simulate Scan Payment</span>
                      </button>
                    )}

                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                      <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Logged in as <strong className="text-slate-800">{firebaseUser.email}</strong></span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error Notifications */}
            {dbSyncError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-4 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{dbSyncError}</span>
                </div>
                <button 
                  onClick={() => setDbSyncError(null)}
                  className="text-rose-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {!firebaseUser ? (
              /* Unauthorized State Card */
              <div className="max-w-md mx-auto text-center py-12 px-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 my-8">
                <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center text-[#075E7D] mx-auto mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Secure Access Verification</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Authentication is required to access your cloud-synchronized crop journal. Authenticate securely using your Google account to read, write, and manage your private data records.
                </p>
                <button
                  onClick={handleSignIn}
                  disabled={dbSyncLoading}
                  className="mt-6 bg-[#075E7D] hover:bg-[#054a63] text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {dbSyncLoading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Lock className="h-4 w-4 text-teal-300" />
                  )}
                  <span>Authenticate with Google</span>
                </button>
              </div>
            ) : (
              /* Fully Authenticated Dashboard Workspace */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-5 bg-slate-50/80 border border-slate-100 rounded-xl p-5 shadow-inner">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700 font-display">
                      {editingPostId ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                          <span>Edit Log Entry</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 text-[#075E7D]" />
                          <span>Record New Entry</span>
                        </>
                      )}
                    </span>
                    {editingPostId && (
                      <button 
                        type="button" 
                        onClick={handleCancelEdit} 
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold border border-rose-200 hover:border-rose-300 px-2 py-0.5 rounded bg-rose-50 cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </h3>
                  
                  <form onSubmit={handleSubmitPost} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Entry Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Harvest Batch #3 pricing target, salinity notes..."
                        value={notebookTitle}
                        onChange={(e) => setNotebookTitle(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D] text-slate-800 placeholder-slate-400 font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Detailed Contents</label>
                      <textarea
                        placeholder="Type private notes, feed logs, water parameter records, or supplier contacts..."
                        rows={5}
                        value={notebookContent}
                        onChange={(e) => setNotebookContent(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D] text-slate-800 placeholder-slate-400 leading-relaxed font-medium"
                        required
                      />
                    </div>

                    {/* Financial Transaction Info */}
                    <div className="border-t border-slate-200/60 pt-4 mt-2 space-y-3">
                      <div className="flex items-center gap-1.5 text-[#075E7D] font-bold text-xs uppercase tracking-wider">
                        <Calculator className="h-3.5 w-3.5" />
                        <span>Financial Data & Tax Tracking</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Record sales, harvest income, or expenses to dynamically track and calculate tax deductions.</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Gross Amount (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g. 50000"
                            value={grossAmount}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.startsWith('0') && !val.startsWith('0.')) {
                                val = val.replace(/^0+/, '');
                                if (val === '') {
                                  val = '0';
                                }
                              }
                              setGrossAmount(val);
                            }}
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D] text-slate-800 placeholder-slate-400 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Tax Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="e.g. 18"
                            value={taxRate}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.startsWith('0') && !val.startsWith('0.')) {
                                val = val.replace(/^0+/, '');
                                if (val === '') {
                                  val = '0';
                                }
                              }
                              setTaxRate(val);
                            }}
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D] text-slate-800 placeholder-slate-400 font-medium"
                          />
                        </div>
                      </div>

                      {/* Quick select tax rates */}
                      <div className="flex gap-1 items-center">
                        <span className="text-[10px] text-slate-400 mr-1">Preset Rates:</span>
                        {[5, 12, 18, 24].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setTaxRate(rate.toString())}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all border cursor-pointer ${
                              parseFloat(taxRate) === rate
                                ? 'bg-[#075E7D] border-[#075E7D] text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>

                      {/* Live Tax Deduction breakdown card */}
                      {parseFloat(grossAmount) > 0 && (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 space-y-2 mt-2">
                          <div className="flex justify-between text-[11px] font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5 mb-1.5">
                            <span>Tax Breakdown Summary</span>
                            <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">Live Calc</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-600 font-medium">
                            <div className="flex justify-between">
                              <span>Gross Total:</span>
                              <span className="font-semibold text-slate-800">₹ {(parseFloat(grossAmount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax Rate Applied:</span>
                              <span className="font-semibold text-slate-800">{(parseFloat(taxRate) || 0)}%</span>
                            </div>
                            <div className="flex justify-between text-amber-700 font-semibold">
                              <span>Tax Deduction amount:</span>
                              <span>₹ {Math.round(((parseFloat(grossAmount) || 0) * ((parseFloat(taxRate) || 0) / 100)) * 100 / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between text-[#075E7D] font-bold border-t border-dashed border-emerald-100 pt-1.5 mt-1">
                              <span>Net Amount (After Tax):</span>
                              <span>₹ {Math.round(((parseFloat(grossAmount) || 0) - ((parseFloat(grossAmount) || 0) * ((parseFloat(taxRate) || 0) / 100))) * 100 / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={dbSyncLoading || !notebookTitle || !notebookContent}
                      className={`w-full text-white py-3 rounded-lg text-xs font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        editingPostId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#00A3A3] hover:bg-[#008f8f]'
                      }`}
                    >
                      {dbSyncLoading ? (
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <Cloud className="h-4 w-4 text-white/80" />
                      )}
                      <span>{editingPostId ? 'Update Entry' : 'Save and Sync to Cloud'}</span>
                    </button>
                  </form>
                </div>

                {/* List Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-[#075E7D]" />
                      Synchronized Notebook Logs ({posts.length})
                    </h3>
                    <button 
                      onClick={() => fetchUserPosts(firebaseUser)}
                      disabled={dbSyncLoading}
                      className="text-xs text-[#075E7D] hover:text-[#00A3A3] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {dbSyncLoading ? (
                        <span className="h-3 w-3 border-2 border-[#075E7D]/30 border-t-[#075E7D] rounded-full animate-spin"></span>
                      ) : (
                        <span>🔄 Reload</span>
                      )}
                    </button>
                  </div>

                  {dbSyncLoading && posts.length === 0 ? (
                    /* Loading Skeletons */
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-slate-150 rounded-xl p-5 space-y-3 bg-slate-50/20 animate-pulse">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50/20">
                      <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-700">Notebook is Empty</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Submit your first crop entry using the left form to record securely on the Firestore database.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {posts.map((post) => (
                        <div 
                          key={post.id} 
                          className={`border rounded-xl p-5 transition-all bg-white shadow-sm hover:shadow ${
                            editingPostId === post.id ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-[#075E7D]'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">{post.title}</h4>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setNotebookTitle(post.title || '');
                                  setNotebookContent(post.content || '');
                                  setGrossAmount(post.grossAmount ? post.grossAmount.toString() : '');
                                  setTaxRate(post.taxRate ? post.taxRate.toString() : '18');
                                  setEditingPostId(post.id);
                                }}
                                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 px-2 py-0.5 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                ✏️ Edit
                              </button>
                              <span className="text-[9px] font-mono font-bold text-[#00A3A3] bg-teal-50 border border-teal-100 px-2 py-0.5 rounded">
                                Verified Sync
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-medium mb-3">
                            {post.content}
                          </p>

                          {/* Render Financial ledger card if transaction data is saved */}
                          {post.grossAmount > 0 && (
                            <div className="bg-slate-50 border border-slate-200/85 rounded-lg p-3 my-2 text-[11px] space-y-1.5">
                              <div className="flex justify-between font-bold text-slate-700 border-b border-slate-200 pb-1 font-display">
                                <span>🧾 Financial Transaction Record</span>
                                <span className="font-mono text-[9px] text-[#075E7D] bg-sky-50 px-1.5 rounded">Tax Tracked</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 font-medium font-sans">
                                <div className="flex justify-between">
                                  <span>Gross Amount:</span>
                                  <span className="font-bold text-slate-800">₹ {(post.grossAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Tax Rate:</span>
                                  <span className="font-bold text-slate-800">{(post.taxRate || 0)}%</span>
                                </div>
                                <div className="flex justify-between text-amber-700">
                                  <span>Tax Deduction:</span>
                                  <span className="font-bold">₹ {(post.taxAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-teal-800">
                                  <span>Net Income:</span>
                                  <span className="font-bold">₹ {(post.netAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Author UID: {post.userId ? `${post.userId.substring(0, 8)}...` : 'N/A'}</span>
                            <span>{post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Just now'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Sidebar Filters */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-[#075E7D]" />
                    Filters
                  </h3>
                  <button 
                    onClick={resetFilters}
                    className="text-xs text-[#075E7D] hover:text-[#00A3A3] font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                {/* Prawn Type toggle */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Species Variety</h3>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, prawnType: 'All' }))}
                      className={`py-1.5 px-2 text-xs font-semibold rounded transition-all ${
                        filters.prawnType === 'All'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, prawnType: 'Vanamei' }))}
                      className={`py-1.5 px-2 text-xs font-bold rounded transition-all ${
                        filters.prawnType === 'Vanamei'
                          ? 'bg-[#075E7D] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Vanamei
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, prawnType: 'Tiger' }))}
                      className={`py-1.5 px-2 text-xs font-bold rounded transition-all ${
                        filters.prawnType === 'Tiger'
                          ? 'bg-[#00A3A3] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tiger
                    </button>
                  </div>
                </div>

                {/* Count Size Quick Ranges from design spec */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sizing Class (Pcs/Kg)</h3>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                    <button 
                      onClick={() => setFilters(prev => ({ ...prev, minSize: 10, maxSize: 25 }))}
                      className={`p-2 border rounded transition-colors text-left ${
                        filters.minSize === 10 && filters.maxSize === 25
                          ? 'border-[#075E7D] bg-sky-50 text-[#075E7D]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      10 - 25 count
                    </button>
                    <button 
                      onClick={() => setFilters(prev => ({ ...prev, minSize: 25, maxSize: 45 }))}
                      className={`p-2 border rounded transition-colors text-left ${
                        filters.minSize === 25 && filters.maxSize === 45
                          ? 'border-[#075E7D] bg-sky-50 text-[#075E7D]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      25 - 45 count
                    </button>
                    <button 
                      onClick={() => setFilters(prev => ({ ...prev, minSize: 45, maxSize: 65 }))}
                      className={`p-2 border rounded transition-colors text-left ${
                        filters.minSize === 45 && filters.maxSize === 65
                          ? 'border-[#075E7D] bg-sky-50 text-[#075E7D]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      45 - 65 count
                    </button>
                    <button 
                      onClick={() => setFilters(prev => ({ ...prev, minSize: 65, maxSize: 120 }))}
                      className={`p-2 border rounded transition-colors text-left ${
                        filters.minSize === 65 && filters.maxSize === 120
                          ? 'border-[#075E7D] bg-sky-50 text-[#075E7D]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      65 - 120 count
                    </button>
                  </div>
                </div>

                {/* Exact size manual controls */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Manual Size Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1 text-[9px] text-slate-400 uppercase font-mono">Min</span>
                      <input
                        type="number"
                        value={filters.minSize}
                        onChange={(e) => setFilters(prev => ({ ...prev, minSize: parseInt(e.target.value) || 0 }))}
                        className="w-full text-xs pl-2.5 pr-2 py-3 border border-slate-200 rounded pt-4 font-mono font-semibold"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1 text-[9px] text-slate-400 uppercase font-mono">Max</span>
                      <input
                        type="number"
                        value={filters.maxSize}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxSize: parseInt(e.target.value) || 0 }))}
                        className="w-full text-xs pl-2.5 pr-2 py-3 border border-slate-200 rounded pt-4 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* State Select */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Location State</h3>
                  <select
                    value={filters.state}
                    onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded p-2 focus:ring-[#075E7D] focus:border-[#075E7D] bg-white text-slate-700"
                  >
                    <option value="All">All Regions</option>
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Rate ceiling */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Price Limit (Fixed)</span>
                    <span className="font-mono text-[#075E7D] font-bold">₹{filters.maxPrice}/kg</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1000"
                    step="25"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#075E7D]"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
                  <p className="text-[11px] text-slate-500 italic leading-relaxed">
                    Showing {filteredListings.length} verified prawn listings in this zone.
                  </p>
                </div>
              </div>

              {/* Prawn Billing & Order Value Calculator (Internal flat rate adjustment applied silently) */}
              <div id="prawn-billing-calculator" className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Calculator className="h-4 w-4 text-[#075E7D]" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Billing Calculator
                  </h3>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal bg-[#075E7D]/5 border border-[#075E7D]/10 rounded-lg p-2.5">
                  Calculate the final total price of your prawn shipment. All logistics and weight-based rate adjustments are calculated silently.
                </p>

                <div className="space-y-3.5">
                  {/* Weight Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex justify-between">
                      <span>Quantity (kg)</span>
                      <span className="font-mono text-xs text-[#075E7D]">{calcWeight || '0'} kg</span>
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={calcWeight}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.startsWith('0') && !val.startsWith('0.')) {
                          val = val.replace(/^0+/, '');
                          if (val === '') {
                            val = '0';
                          }
                        }
                        setCalcWeight(val);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded focus:ring-[#075E7D] focus:border-[#075E7D] bg-white text-slate-800 font-mono font-semibold"
                    />
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-1">
                      {[0.5, 1, 2, 5, 10, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCalcWeight(preset.toString())}
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold transition-colors ${
                            parseFloat(calcWeight) === preset
                              ? 'bg-[#075E7D] text-white border-[#075E7D]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex justify-between">
                      <span>Price per Kg (₹)</span>
                      <span className="font-mono text-xs text-[#075E7D]">₹{calcPrice || '0'}/kg</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={calcPrice}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.startsWith('0') && !val.startsWith('0.')) {
                          val = val.replace(/^0+/, '');
                          if (val === '') {
                            val = '0';
                          }
                        }
                        setCalcPrice(val);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded focus:ring-[#075E7D] focus:border-[#075E7D] bg-white text-slate-800 font-mono font-semibold"
                    />
                  </div>

                  {/* Calculation Output Sheet */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2 mt-2">
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-bold text-slate-800">Total Price</span>
                      <span className="font-mono font-bold text-sm text-[#075E7D]">₹{calcTotal.toLocaleString()} Rupees</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Listings Main Body */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Top Search Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by hatchery, town, region or notes..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 focus:border-[#075E7D]"
                  />
                </div>

                {/* Sorter / Info block */}
                <div className="flex items-center gap-3 shrink-0 justify-between w-full md:w-auto text-xs">
                  <span className="text-slate-500 font-medium">
                    Active Listings: <strong className="text-slate-900 font-bold">{filteredListings.length}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-[#075E7D]/20 text-slate-700"
                    >
                      <option value="newest">Sort: Newest First</option>
                      <option value="priceAsc">Price: Low to High</option>
                      <option value="priceDesc">Price: High to Low</option>
                      <option value="countAsc">Size: Large to Small</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Listings Grid */}
              {filteredListings.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto">
                  <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-display font-bold text-slate-900 text-sm">No Active Crops Found</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Adjust your counts filter or state search query to expand your search radius.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-4 px-3 py-1.5 text-xs font-bold text-[#075E7D] bg-sky-50 rounded hover:bg-sky-100 border border-sky-100 transition-colors"
                  >
                    Show All Listings
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredListings.map((listing) => (
                    <div 
                      key={listing.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-[#075E7D] transition-colors group"
                    >
                      {/* Badge header */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            listing.prawnType === 'Vanamei' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {listing.prawnType} Prawns
                          </span>
                          {listing.cultureType && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {listing.cultureType}
                            </span>
                          )}
                        </div>

                        <span className="text-slate-400 text-[10px] font-mono flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Est. {listing.harvestDate}
                        </span>
                      </div>

                      {/* Crop stats & content */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-[#075E7D] transition-colors">
                            {listing.sellerName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#075E7D] shrink-0" />
                            <span>{listing.sellerLocation}</span>
                          </p>
                        </div>

                        {/* Dimensions metric block */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Sizing Count</span>
                            <span className="text-sm font-bold text-slate-800">
                              {listing.sizeCount} Count <span className="text-[10px] font-normal text-slate-500">pcs/kg</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Biomass Volume</span>
                            <span className="text-sm font-bold text-slate-800">
                              {listing.totalQuantity.toLocaleString()} kg
                            </span>
                          </div>
                        </div>

                        {listing.notes && cleanText(listing.notes).trim() && (
                          <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                            "{cleanText(listing.notes)}"
                          </p>
                        )}
                      </div>

                      {/* Price and contact footer inside card */}
                      <div className="flex justify-between items-end pt-4 mt-4 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Fixed Rate</p>
                          <p className="text-2xl font-black text-[#075E7D]">
                            ₹{listing.pricePerKg} <span className="text-xs font-normal text-slate-500">/ kg</span>
                          </p>
                        </div>

                        {/* Direct-Contact Action trigger */}
                        <button 
                          onClick={() => setActiveContactListing(listing)}
                          className="bg-[#075E7D] hover:bg-[#054a63] text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:shadow shadow-blue-900/10 transition-colors cursor-pointer"
                        >
                          <Phone className="h-3.5 w-3.5 text-teal-300" />
                          <span>Contact Seller</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Trust Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-8 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/5 border border-white/10 rounded flex items-center justify-center text-[#075E7D]">
                <Anchor className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-wider">MSM Aqua Tech</h4>
                <p className="text-xs text-slate-500">Peer-to-Peer Aqua Marketplace</p>
              </div>
            </div>
            <div className="flex gap-6 text-xs font-semibold">
              <span className="text-slate-400">Direct-to-Farmer Connection</span>
              <span className="text-slate-800">|</span>
              <span className="text-slate-500">Active Sellers: {Array.from(new Set(listings.map(l => l.sellerName))).length}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-normal">
            Disclaimer: MSM Aqua Tech operates strictly as an informational bulletin board. No transaction escrow or payment handling occurs on this server. Buyers arrange direct truck transport and check weight parameters on-site with farmers in their respective state territories.
          </p>
        </div>
      </footer>

      {/* Add Listing Modal popup */}
      {showAddModal && (
        <AddListingModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddListing}
        />
      )}

      {/* Contact Seller Panel modal */}
      {activeContactListing && (
        <ContactModal
          listing={activeContactListing}
          onClose={() => setActiveContactListing(null)}
        />
      )}

      {/* Visual Payment Scanner modal */}
      {showScannerModal && (
        <PaymentScannerModal
          onClose={() => setShowScannerModal(false)}
          onScanSuccess={(amount, newAdminBalance) => {
            setAdminRevenueBalance(newAdminBalance);
          }}
        />
      )}
    </div>
  );
}
