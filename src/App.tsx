import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelGrid } from './components/HotelGrid';
import { RoomSelector } from './components/RoomSelector';
import { PaymentForm } from './components/PaymentForm';
import { MyBookings } from './components/MyBookings';
import { AdminPanel } from './components/AdminPanel';
import { AuthBarrierMock } from './components/AuthBarrierMock';
import { PropertyMapModal } from './components/PropertyMapModal';
import { fetchHotels, createBooking, fetchSettings } from './lib/api';
import { Hotel, Room, Booking, SystemSettings } from './types';
import { Globe, PlaneTakeoff, ShieldAlert, Sparkles, LogOut, Loader2, Sparkle, Search, CheckCircle, X, MessageSquare, Landmark, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function BookingAppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Load dynamic system configurations on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await fetchSettings();
        setSettings(s);
      } catch (e) {
        console.error("Failed to fetch system settings", e);
      }
    };
    loadSettings();
  }, []);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Navigation and operational states
  const [currentView, setCurrentView] = useState<'hotels' | 'rooms' | 'checkout' | 'bookings' | 'success' | 'admin'>('hotels');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [activeMapHotel, setActiveMapHotel] = useState<Hotel | null>(null);

  // Buffer state passed to checkout pipeline
  const [stayMeta, setStayMeta] = useState<{
    checkIn: string;
    checkOut: string;
    roomCount: number;
  } | null>(null);

  const [creatingReserve, setCreatingReserve] = useState(false);

  // Resume reservation buffer
  const [pendingReserve, setPendingReserve] = useState<{
    room: Room;
    checkIn: string;
    checkOut: string;
    roomCount: number;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Resume booking when credentials are synchronized
  useEffect(() => {
    if (user && pendingReserve) {
      handleInitiateReserve(
        pendingReserve.room,
        pendingReserve.checkIn,
        pendingReserve.checkOut,
        pendingReserve.roomCount
      );
      setPendingReserve(null);
      setShowAuthModal(false);
    }
  }, [user, pendingReserve]);

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
      setPendingReserve({ room, checkIn, checkOut, roomCount });
      setShowAuthModal(true);
      return;
    }

    setCreatingReserve(true);
    setErrorMsg('');
    try {
      // Write the secure temporary booking on the server
      const bookingRecord = await createBooking({
        userId: user.uid,
        userEmail: user.email || '',
        hotelId: room.hotelId,
        roomId: room.id,
        checkIn,
        checkOut,
        roomCount,
        guestName: user.displayName || 'Guest User',
        guestEmail: user.email || 'guest@example.com'
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
      <div className="bg-black border-b-2 border-red-600 text-white py-3 px-6 text-[10px] text-center font-sans font-black uppercase tracking-[0.25em]">
        Extended summer stays currently receive up to 10% in complimentary resort credits. Explore luxury suites.
      </div>

      {/* Primary header branding and navigation dashboard */}
      <header className="sticky top-0 z-40 bg-[#F9F8F6]/95 backdrop-blur-md border-b border-[#E5E2DA] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[5rem] py-3 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4">
          <div onClick={handleResetCatalog} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 bg-[#1E3A8A] border-2 border-red-600 rounded-full flex items-center justify-center text-white font-serif font-black italic text-base transition-all group-hover:scale-110 group-hover:rotate-6">
              D
            </div>
            <div>
              <span className="font-serif italic font-bold text-xl tracking-tight text-black block">
                danvilla
              </span>
              <span className="text-[9px] font-sans font-black text-red-600 tracking-[0.2em] block leading-none">
                HOTEL & RESORTS
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4 sm:gap-8 text-[11px] sm:text-xs font-semibold uppercase tracking-widest">
            <button
              onClick={handleResetCatalog}
              className={`hover:text-red-600 transition-colors cursor-pointer ${
                currentView === 'hotels' ? 'text-black font-extrabold border-b-2 border-red-600' : 'text-[#8E8E82]'
              }`}
            >
              Wings & Towers
            </button>
            {user && (
              <button
                onClick={() => setCurrentView('bookings')}
                className={`inline-flex items-center gap-1.5 hover:text-red-600 transition-colors cursor-pointer ${
                  currentView === 'bookings' ? 'text-black font-extrabold border-b-2 border-red-600' : 'text-[#8E8E82]'
                }`}
              >
                <span>My Itineraries</span>
              </button>
            )}
            <button
              onClick={() => setCurrentView('admin')}
              className={`inline-flex items-center gap-1.5 hover:text-red-600 transition-colors cursor-pointer ${
                currentView === 'admin' ? 'text-black font-extrabold border-b-2 border-red-600' : 'text-[#8E8E82]'
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
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[11px] font-sans font-bold text-white bg-[#1E3A8A] hover:bg-black px-4 py-2 rounded-full shadow-md transition-all cursor-pointer inline-flex items-center gap-1 hover:scale-105"
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Sign In / Enter Sandbox</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        
        {/* Global actions loaders / confirmations */}
        {creatingReserve && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="bg-white px-8 py-7 rounded-3xl border-2 border-blue-900/15 shadow-xl text-center space-y-4 max-w-sm">
              <Loader2 className="w-9 h-9 text-[#1E3A8A] animate-spin mx-auto animate-pulse" />
              <div>
                <h4 className="font-serif font-bold text-black text-sm">Securing Inventory Slot...</h4>
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
              <AdminPanel 
                onBack={handleResetCatalog} 
                settings={settings}
                onUpdateSettings={setSettings}
              />
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
              <div className="relative rounded-3xl overflow-hidden bg-[#1E3A8A] text-white min-h-[340px] flex items-center px-8 md:px-16 border-b-4 border-red-600 shadow-xl" id="welcome-banner-hero">
                {/* Background asset */}
                <div className="absolute inset-0 z-0 opacity-30 mix-blend-multiply bg-black">
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"
                    alt="Luxury hospitality preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="relative z-10 max-w-2xl space-y-6">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-black/40 backdrop-blur-xs rounded-full border border-red-500/30 text-xs text-red-400 font-extrabold tracking-wider uppercase">
                    <Sparkle className="w-3.5 h-3.5 fill-current" />
                    <span>Real-Time Availability Checked Live</span>
                  </div>
                  
                  <div className="space-y-4">
                    <h1 className="text-3xl md:text-5xl font-serif italic tracking-tight leading-tight md:leading-none text-white">
                      Bespoke luxury <br /><span className="font-sans font-black not-italic tracking-normal text-white uppercase block mt-1 text-2xl md:text-4xl bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-transparent">at DanVilla Hotel</span>
                    </h1>
                    <p className="text-gray-100 text-xs md:text-sm font-light max-w-xl leading-relaxed">
                      Experience premium five-star hospitality, real-time slot bookings, and guaranteed suite locks. Explore our signature luxury wings, garden terraces, and executive corporate layouts below.
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
                    className="w-full pl-10 pr-4 py-2.5 border border-[#E5E2DA] rounded-xl text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] font-medium placeholder-[#8E8E82]"
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
                        className={`py-1.5 px-3 md:py-1.5 md:px-4 rounded-full text-[10px] md:text-xs font-bold cursor-pointer transition-all ${
                          selectedLocation === val
                            ? 'bg-black text-white border-b-2 border-red-600 shadow-md'
                            : 'text-[#8E8E82] hover:text-black'
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
                  <Loader2 className="w-9 h-9 text-[#1E3A8A] animate-spin mx-auto mb-4" />
                  <p className="text-xs text-[#8E8E82] font-mono">Synchronizing database assets...</p>
                </div>
              ) : filteredHotels.length === 0 ? (
                <div className="text-center py-20 bg-white border border-[#E5E2DA] rounded-3xl">
                  <p className="text-xs text-[#8E8E82] font-mono">No matching locations found for "{searchQuery}". Try editing filters.</p>
                </div>
              ) : (
                <HotelGrid 
                  hotels={filteredHotels} 
                  onSelectHotel={handleSelectHotel} 
                  onOpenMap={(hotel) => setActiveMapHotel(hotel)}
                />
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
                settings={settings}
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
                <MyBookings 
                  userId={user.uid} 
                  hotels={hotels} 
                  onBack={handleResetCatalog} 
                  settings={settings}
                />
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
              <div className="w-15 h-15 bg-blue-50 rounded-full flex items-center justify-center text-red-600 mx-auto border border-red-200 shadow-md">
                <CheckCircle className="w-8 h-8" />
              </div>
              
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#1E3A8A] block uppercase flex items-center justify-center gap-1.5">
                  {activeBooking.paymentMethod === 'bank_transfer' ? (
                    <>
                      <Landmark className="w-3.5 h-3.5 text-amber-700" />
                      <span>Transfer Verification Pending</span>
                    </>
                  ) : activeBooking.paymentMethod === 'cash' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Cash Reservation Blocked</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-700" />
                      <span>Transaction Approved Securely</span>
                    </>
                  )}
                </span>
                <h2 className="text-2xl font-serif italic text-black font-extrabold tracking-tight mt-1.5">
                  {activeBooking.paymentMethod === 'bank_transfer'
                    ? "Verify Bank Transfer Details"
                    : activeBooking.paymentMethod === 'cash'
                    ? "Lodging reserved!"
                    : (settings?.receiptSuccessTitle || "Lodging secured!")}
                </h2>
                <p className="text-xs text-[#8E8E82] mt-2.5 leading-relaxed font-sans">
                  {activeBooking.paymentMethod === 'bank_transfer' ? (
                    <span>Your room is holding-locked. Since you chose <strong>Bank Transfer</strong>, please transfer the exact naira fee to {settings?.bankName || "Sterling Bank"} ({settings?.bankAccountNumber || "1024589364"}) and tap the green button below to forward your payment receipt to us on WhatsApp.</span>
                  ) : activeBooking.paymentMethod === 'cash' ? (
                    <span>Your room dates have been secured. Since you chose <strong>Pay Cash on Arrival</strong>, you will settle the bill of ₦{activeBooking.totalPrice.toLocaleString()} at check-in. Please tap the green WhatsApp alert below to register your itinerary details with coordinators.</span>
                  ) : (
                    <span>{settings?.receiptSuccessMessage || "Your card transaction cleared securely and rooms have been locked in real-time. Feel free to view your vouchers. Kindly tap the green WhatsApp button below to forward your confirmation details to our guest liaison desk."}</span>
                  )}
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
                  <span className="text-[#8E8E82]">Payment Preference</span>
                  <span className="font-bold text-gray-700 uppercase tracking-widest text-[9px]">
                    {activeBooking.paymentMethod === 'bank_transfer' ? 'Sterling Bank Transfer' : activeBooking.paymentMethod === 'cash' ? 'Cash on Arrival' : 'Secure Credit Card'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E8E82]">Account Settle Fee</span>
                  <span className="font-bold text-red-600 font-serif text-sm">₦{activeBooking.totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Company WhatsApp Forward Trigger (Crucial Requirement) */}
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const payModeMap = {
                      card: 'Credit/Debit Card (Approved Online)',
                      bank_transfer: 'Bank Transfer (Pending Verification)',
                      cash: 'Cash / Pay on Arrival (At Desk)'
                    };
                    const payMethodStr = payModeMap[activeBooking.paymentMethod || 'card'] || 'Not Specified';

                    const text = `Hello DanVilla Resorts, I have successfully locked a reservation:
• *Booking ID / Ticket:* ${activeBooking.id}
• *Guest Name:* ${activeBooking.guestName}
• *Liaison Email:* ${activeBooking.guestEmail}
• *Hotel Location:* ${selectedHotel.name} (${selectedRoom.name})
• *Scheduled stay duration:* ${activeBooking.checkIn} to ${activeBooking.checkOut}
• *Selected Suites quantity:* ${activeBooking.roomCount} room(s)
• *Total due settlement:* ₦${activeBooking.totalPrice.toLocaleString()}
• *Selected Payment Mode:* ${payMethodStr}

Kindly review and confirm my vacation booking. Thank you!`;

                    const url = `https://wa.me/2348123456789?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
                  title="Send booking details & screenshot receipt direct to corporate WhatsApp"
                >
                  <MessageSquare className="w-4 h-4 text-white shrink-0 animate-pulse" />
                  <span>Send Receipt to Company WhatsApp</span>
                </button>
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
                  className="flex-1 py-3 px-4 bg-black hover:bg-neutral-800 border-b-2 border-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-xs"
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
          <p className="font-serif italic font-bold tracking-wide text-black uppercase text-[10px] tracking-widest leading-none border-b border-red-600 inline-block pb-1 mb-2">
            DanVilla Hotel &copy; 2026. Custom built database-synchronized catalog.
          </p>
          <p className="text-[10px] text-[#8E8E82] leading-normal max-w-lg mx-auto">
            Incorporates server-side multi-layer availability algorithms to prevent double bookings. Real-time Firebase Firestore transactions linked securely.
          </p>
        </div>
      </footer>

      {activeMapHotel && (
        <PropertyMapModal
          hotel={activeMapHotel}
          onClose={() => setActiveMapHotel(null)}
        />
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl relative shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setPendingReserve(null);
              }}
              className="absolute top-4 right-4 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-full cursor-pointer transition-all z-50"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-1">
              <AuthBarrierMock />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Logo SVG
function PlatformLogo() {
  return (
    <svg className="w-5 h-5 text-[#1E3A8A] fill-current" viewBox="0 0 24 24">
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
