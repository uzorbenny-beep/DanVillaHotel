import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelGrid } from './components/HotelGrid';
import { RoomSelector } from './components/RoomSelector';
import { PaymentForm } from './components/PaymentForm';
import { MyBookings } from './components/MyBookings';
import { AdminPanel } from './components/AdminPanel';
import { AuthBarrierMock } from './components/AuthBarrierMock';
import { fetchHotels, createBooking } from './lib/api';
import { Hotel, Room, Booking } from './types';
import { Globe, PlaneTakeoff, ShieldAlert, Sparkles, LogOut, Loader2, Sparkle, Search, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function BookingAppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Navigation and operational states
  const [currentView, setCurrentView] = useState<'hotels' | 'rooms' | 'checkout' | 'bookings' | 'success' | 'admin'>('hotels');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Buffer state passed to checkout pipeline
  const [stayMeta, setStayMeta] = useState<{
    checkIn: string;
    checkOut: string;
    roomCount: number;
  } | null>(null);

  const [creatingReserve, setCreatingReserve] = useState(false);

  // Support quick direct admin access via query parameter ?view=admin or ?admin=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'admin' || params.get('admin') === 'true') {
      setCurrentView('admin');
    }
  }, []);

  // Download listings on mount
  useEffect(() => {
    const loadHotelsData = async () => {
      setLoadingHotels(true);
      setErrorMsg('');
      try {
        const data = await fetchHotels();
        setHotels(data);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to download properties directory.');
      } finally {
        setLoadingHotels(false);
      }
    };
    loadHotelsData();
  }, []);

  // Filter listings based on criteria
  const filteredHotels = hotels.filter((hotel) => {
    const matchesKeyword =
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedLocation === 'all') {
      return matchesKeyword;
    }
    return matchesKeyword && hotel.location.includes(selectedLocation);
  });

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setCurrentView('rooms');
  };

  // Handles moving from selection card to checkout phase
  const handleInitiateReserve = async (
    room: Room,
    checkIn: string,
    checkOut: string,
    roomCount: number
  ) => {
    if (!user) {
      // Prompt logins
      alert("Authentication required. Please sign in or use standard mock credentials first.");
      return;
    }

    setCreatingReserve(true);
    setErrorMsg('');
    try {
      // Write the secure temporary booking on the server
      const bookingRecord = await createBooking({
        userId: user.uid,
        userEmail: user.email,
        hotelId: room.hotelId,
        roomId: room.id,
        checkIn,
        checkOut,
        roomCount,
        guestName: user.displayName,
        guestEmail: user.email
      });

      setSelectedRoom(room);
      setStayMeta({ checkIn, checkOut, roomCount });
      setActiveBooking(bookingRecord);
      setCurrentView('checkout');
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to acquire inventory lock for selected suite.");
    } finally {
      setCreatingReserve(false);
    }
  };

  const handlePaymentSuccess = (confirmedBooking: Booking) => {
    setActiveBooking(confirmedBooking);
    setCurrentView('success');
  };

  const handleCancelBookingFlow = () => {
    // Release view targets
    setActiveBooking(null);
    setCurrentView('rooms');
  };

  const handleResetCatalog = () => {
    setSelectedHotel(null);
    setSelectedRoom(null);
    setActiveBooking(null);
    setStayMeta(null);
    setCurrentView('hotels');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-4" />
        <p className="text-xs text-gray-500 font-mono">Initializing user auth channels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F6] text-[#33332D]">
      
      {/* Dynamic top ticker info of sandbox modes */}
      <div className="bg-[#5B6D5B] text-[#F9F8F6] py-3 px-6 text-[11px] text-center font-serif uppercase tracking-widest font-medium">
        Extended summer stays currently receive up to 10% in complimentary resort credits. Explore luxury suites.
      </div>

      {/* Primary header branding and navigation dashboard */}
      <header className="sticky top-0 z-40 bg-[#F9F8F6]/95 backdrop-blur-md border-b border-[#E5E2DA] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[5rem] py-3 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4">
          <div onClick={handleResetCatalog} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 bg-[#5B6D5B] rounded-full flex items-center justify-center text-[#F9F8F6] font-serif italic text-sm transition-all group-hover:scale-105">
              D
            </div>
            <div>
              <span className="font-serif italic font-bold text-xl tracking-tight text-[#33332D] block">
                danvilla
              </span>
              <span className="text-[9px] font-sans font-medium text-[#8E8E82] tracking-widest uppercase block leading-none">
                HOTEL & RESORTS
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4 sm:gap-8 text-[11px] sm:text-xs font-semibold uppercase tracking-widest">
            <button
              onClick={handleResetCatalog}
              className={`hover:text-[#5B6D5B] transition-colors cursor-pointer ${
                currentView === 'hotels' ? 'text-[#33332D] underline underline-offset-4' : 'text-[#8E8E82]'
              }`}
            >
              Wings & Towers
            </button>
            {user && (
              <button
                onClick={() => setCurrentView('bookings')}
                className={`inline-flex items-center gap-1.5 hover:text-[#5B6D5B] transition-colors cursor-pointer ${
                  currentView === 'bookings' ? 'text-[#33332D] underline underline-offset-4' : 'text-[#8E8E82]'
                }`}
              >
                <span>My Itineraries</span>
              </button>
            )}
            <button
              onClick={() => setCurrentView('admin')}
              className={`inline-flex items-center gap-1.5 hover:text-[#5B6D5B] transition-colors cursor-pointer ${
                currentView === 'admin' ? 'text-[#33332D] underline underline-offset-4' : 'text-[#8E8E82]'
              }`}
            >
              <span>Admin Portal</span>
            </button>
          </nav>

          {/* User Sign status widget */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-white border border-[#E5E2DA] p-1.5 rounded-full shadow-xs">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || '')}`}
                  alt={user.displayName || ''}
                  className="w-7 h-7 rounded-full border border-[#E5E2DA]"
                />
                <div className="text-left text-[10px] sm:text-[11px] font-sans pr-2 max-w-[100px] sm:max-w-[120px]">
                  <span className="font-bold text-[#33332D] block truncate leading-tight">{user.displayName}</span>
                  <span className="text-[#8E8E82] block truncate leading-none mt-0.5">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 bg-white hover:bg-[#F9F8F6] text-[#8E8E82] hover:text-red-600 rounded-full border border-[#E5E2DA] cursor-pointer transition-all"
                  title="Sign Out Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-serif italic text-[#8E8E82] px-4 py-2 bg-white border border-[#E5E2DA] rounded-full shadow-2xs">
                No active session
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        
        {/* Global actions loaders / confirmations */}
        {creatingReserve && (
          <div className="fixed inset-0 z-50 bg-[#33332D]/40 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="bg-[#F9F8F6] px-8 py-7 rounded-3xl border border-[#E5E2DA] shadow-xl text-center space-y-4 max-w-sm">
              <Loader2 className="w-9 h-9 text-[#5B6D5B] animate-spin mx-auto" />
              <div>
                <h4 className="font-serif font-bold text-[#33332D] text-sm">Securing Inventory Slot...</h4>
                <p className="text-xs text-[#8E8E82] mt-1.5 leading-relaxed font-sans">
                  Locking selected room allocations and building travel dossiers securely on server nodes. Please wait while checking availability.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMsg && currentView !== 'rooms' && (
          <div className="mb-8 p-4 bg-red-50/55 border border-red-200 text-red-800 rounded-2xl text-xs font-sans flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Booking engine warning</span>
              <span className="text-[#8E8E82] mt-0.5 block">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* VIEW CONDITIONAL RENDERING */}
        <AnimatePresence mode="wait">
          
          {/* ADMIN PORTAL PANEL */}
          {currentView === 'admin' && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <AdminPanel onBack={handleResetCatalog} />
            </motion.div>
          )}

          {/* CATALOGUE VIEW */}
          {currentView === 'hotels' && (
            <motion.div
              key="hotels-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {/* Grand Banner welcome message */}
              <div className="relative rounded-3xl overflow-hidden bg-[#5B6D5B] text-white min-h-[340px] flex items-center px-8 md:px-16" id="welcome-banner-hero">
                {/* Background asset */}
                <div className="absolute inset-0 z-0 opacity-25 mix-blend-multiply">
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"
                    alt="Luxury hospitality preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="relative z-10 max-w-2xl space-y-6">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#F9F8F6]/10 backdrop-blur-xs rounded-full border border-white/20 text-xs text-[#E8F0E8] font-semibold">
                    <Sparkle className="w-3.5 h-3.5 fill-current text-[#E8F0E8]" />
                    <span className="font-serif italic tracking-wide">Real-Time Availability Checked Live</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-serif italic tracking-tight leading-tight md:leading-none text-[#F9F8F6]">
                      Bespoke luxury <br /><span className="font-sans font-bold not-italic tracking-normal text-white">at DanVilla Hotel</span>
                    </h1>
                    <p className="text-[#E5E2DA] text-xs md:text-sm font-light max-w-md leading-relaxed">
                      Experience five-star hospitality, real-time slot bookings, and guaranteed suite locks. Explore our signature luxury wings, garden terraces, and executive corporate layouts below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-[#E5E2DA] rounded-3xl shadow-xs">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8E8E82]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search wings, towers, suites, or amenities..."
                    className="w-full pl-10 pr-4 py-2.5 border border-[#E5E2DA] rounded-xl text-xs text-[#33332D] bg-[#F9F8F6] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium placeholder-[#8E8E82]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8E8E82] font-semibold uppercase tracking-widest font-serif italic hidden lg:inline">Section filter:</span>
                  <div className="inline-flex flex-wrap border border-[#E5E2DA] bg-[#F9F8F6] p-1 rounded-2xl md:rounded-full gap-1">
                    {[
                      ['all', 'All Sections'],
                      ['Rooms', 'Accommodations'],
                      ['Dining', 'Dining & Clubs'],
                      ['Snooker', 'Billiards'],
                      ['Pool', 'Relaxation Pool']
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSelectedLocation(val)}
                        className={`py-1.5 px-3 md:py-1.5 md:px-4 rounded-full text-[10px] md:text-xs font-semibold cursor-pointer transition-all ${
                          selectedLocation === val
                            ? 'bg-[#5B6D5B] text-white shadow-xs font-bold'
                            : 'text-[#8E8E82] hover:text-[#33332D]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hotels display list */}
              {loadingHotels ? (
                <div className="py-24 text-center">
                  <Loader2 className="w-9 h-9 text-[#5B6D5B] animate-spin mx-auto mb-4" />
                  <p className="text-xs text-[#8E8E82] font-mono">Synchronizing database assets...</p>
                </div>
              ) : filteredHotels.length === 0 ? (
                <div className="text-center py-20 bg-white border border-[#E5E2DA] rounded-3xl">
                  <p className="text-xs text-[#8E8E82] font-mono">No matching locations found for "{searchQuery}". Try editing filters.</p>
                </div>
              ) : (
                <HotelGrid hotels={filteredHotels} onSelectHotel={handleSelectHotel} />
              )}
            </motion.div>
          )}

          {/* ROOM SELECTOR SCREEN */}
          {currentView === 'rooms' && selectedHotel && (
            <motion.div
              key="rooms-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RoomSelector
                hotel={selectedHotel}
                onBack={handleResetCatalog}
                onBookRoom={handleInitiateReserve}
              />
            </motion.div>
          )}

          {/* SECURE CHECKOUT PAYMENT PLATFORM */}
          {currentView === 'checkout' && activeBooking && selectedRoom && (
            <motion.div
              key="checkout-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <PaymentForm
                booking={activeBooking}
                room={selectedRoom}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={handleCancelBookingFlow}
              />
            </motion.div>
          )}

          {/* PERSONAL BOOKINGS ARCHIVE */}
          {currentView === 'bookings' && (
            <motion.div
              key="bookings-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {user ? (
                <MyBookings userId={user.uid} hotels={hotels} onBack={handleResetCatalog} />
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  <AuthBarrierMock />
                </div>
              )}
            </motion.div>
          )}

          {/* TRANSACTION SUCCESS SCREEN */}
          {currentView === 'success' && activeBooking && selectedRoom && selectedHotel && (
            <motion.div
              key="success-view"
              className="max-w-xl mx-auto bg-white border border-[#E5E2DA] p-8 rounded-3xl text-center shadow-sm space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-14 h-14 bg-[#E8F0E8] rounded-full flex items-center justify-center text-[#5B6D5B] mx-auto border border-[#5B6D5B]/20 shadow-2xs">
                <CheckCircle className="w-7 h-7" />
              </div>
              
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#5B6D5B] block uppercase">
                  Transaction Approved
                </span>
                <h2 className="text-2xl font-serif italic text-[#33332D] font-bold tracking-tight mt-1">
                  Lodging secured!
                </h2>
                <p className="text-xs text-[#8E8E82] mt-2 leading-relaxed">
                  Your payment has cleared the gateway securely, and room availability records have been locked globally in real-time. Feel free to access your printable active travel vouchers.
                </p>
              </div>

              {/* Quick Card Details */}
              <div className="p-5 bg-[#F9F8F6] rounded-2xl border border-[#E5E2DA] text-left space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E8E82]">Reservation Ticket</span>
                  <span className="font-mono font-semibold text-[#33332D]">{activeBooking.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E8E82]">Hotel Location</span>
                  <span className="font-semibold text-[#33332D]">{selectedHotel.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E8E82]">Assigned Suite</span>
                  <span className="font-semibold text-[#33332D]">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E8E82]">Secure Charge Amount</span>
                  <span className="font-bold text-[#5B6D5B] font-serif text-sm">${activeBooking.totalPrice}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleResetCatalog}
                  className="flex-1 py-3 px-4 border border-[#E5E2DA] hover:border-[#8E8E82] text-[#8E8E82] hover:text-[#33332D] rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Return to Catalogue
                </button>
                <button
                  onClick={() => setCurrentView('bookings')}
                  className="flex-1 py-3 px-4 bg-[#5B6D5B] hover:bg-[#4a584a] text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-xs"
                >
                  Access Travel Vouchers
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Elegant high-contrast site footer */}
      <footer className="bg-white border-t border-[#E5E2DA] py-12 text-center text-xs text-[#8E8E82] mt-24">
        <div className="max-w-7xl mx-auto px-6 space-y-3">
          <p className="font-serif italic font-medium tracking-wide text-[#33332D]">
            DanVilla Hotel &copy; 2026. Custom built database-synchronized catalog.
          </p>
          <p className="text-[10px] text-[#8E8E82] leading-normal max-w-lg mx-auto">
            Incorporates server-side multi-layer availability algorithms to prevent double bookings. Real-time Firebase Firestore transactions linked securely.
          </p>
        </div>
      </footer>

    </div>
  );
}

// Logo SVG
function PlatformLogo() {
  return (
    <svg className="w-5 h-5 text-[#5B6D5B] fill-current" viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2zm0 3.99L18.47 19H5.53L12 5.99z" />
    </svg>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BookingAppContent />
    </AuthProvider>
  );
}
