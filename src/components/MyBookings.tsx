import React, { useEffect, useState } from 'react';
import { Calendar, Tag, UserCheck, AlertOctagon, Undo, Loader2, Sparkles, Building2, MessageSquare, Landmark, Wallet, CreditCard } from 'lucide-react';
import { Booking, Room, Hotel, SystemSettings } from '../types';
import { cancelBooking } from '../lib/api';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface MyBookingsProps {
  userId: string;
  hotels: Hotel[];
  onBack: () => void;
  settings?: SystemSettings | null;
}

export const MyBookings: React.FC<MyBookingsProps> = ({ userId, hotels, onBack, settings }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Sync bookings in real-time using Firestore Snapshot listeners
  useEffect(() => {
    setLoading(true);
    const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const records: Booking[] = [];
      snapshot.forEach(doc => {
        records.push(doc.data() as Booking);
      });
      // Sort bookings chronologically: newest created first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(records);
      setLoading(false);
    }, (error) => {
      console.error("Failed to snapshot user bookings:", error);
      setLoading(false);
    });

    // Populate all rooms dictionary to display room details in listings
    const loadRoomsDict = async () => {
      try {
        const snap = await getDocs(collection(db, 'rooms'));
        const roomsList: Room[] = [];
        snap.forEach(d => {
          roomsList.push(d.data() as Room);
        });
        setRooms(roomsList);
      } catch (err) {
        console.error(err);
      }
    };
    loadRoomsDict();

    return () => unsubscribe();
  }, [userId]);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm("Are you certain you wish to cancel this hotel booking and release your reserved room slot back to the public pool?")) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId, userId);
    } catch (error: any) {
      alert(error.message || "Failed to cancel your reservation. Please consult administration.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleWhatsAppSend = (booking: Booking, roomName: string, hotelName: string) => {
    const payModeMap = {
      card: 'Credit/Debit Card (Approved Online)',
      bank_transfer: 'Bank Transfer (Pending Verification)',
      cash: 'Cash / Pay on Arrival (At Desk)'
    };
    const payMethodStr = payModeMap[booking.paymentMethod || 'card'] || 'Not Specified';

    const template = settings?.whatsappTemplate || `Hello DanVilla Resorts, I have successfully locked a reservation:
• *Booking ID / Ticket:* {id}
• *Guest Name:* {guestName}
• *Liaison Email:* {guestEmail}
• *Hotel Location:* {hotelName} ({roomName})
• *Scheduled stay duration:* {checkIn} to {checkOut}
• *Selected Suites quantity:* {roomCount} room(s)
• *Total due settlement:* ₦{totalPrice}
• *Selected Payment Mode:* {paymentMethod}

Kindly review and confirm my vacation booking. Thank you!`;

    const text = template
      .replace(/{id}/g, booking.id || '')
      .replace(/{guestName}/g, booking.guestName || '')
      .replace(/{guestEmail}/g, booking.guestEmail || '')
      .replace(/{hotelName}/g, hotelName || '')
      .replace(/{roomName}/g, roomName || '')
      .replace(/{checkIn}/g, booking.checkIn || '')
      .replace(/{checkOut}/g, booking.checkOut || '')
      .replace(/{roomCount}/g, String(booking.roomCount || ''))
      .replace(/{totalPrice}/g, (booking.totalPrice || 0).toLocaleString())
      .replace(/{paymentMethod}/g, payMethodStr);

    const whatsappNum = settings?.whatsappNumber || '2348123456789';
    const url = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-4" />
        <p className="text-xs text-gray-500 font-mono">Loading your secure travel itineraries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="my-bookings-board">
      
      {/* Search Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-gray-150 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">Your Reserved Itineraries</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage details and cancel reservations</p>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-semibold py-2 px-4.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          &larr; Return to main wings overview
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center bg-white border border-gray-150 p-12 sm:p-16 rounded-3xl max-w-xl mx-auto space-y-5">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">No active bookings found</h4>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              You currently hold no active lodging reservations. Return to the suite wings catalog and choose an available luxury suite.
            </p>
          </div>
          <button
            onClick={onBack}
            className="py-2 px-5 bg-amber-800 text-white rounded-lg text-xs font-medium hover:bg-amber-900 transition-colors cursor-pointer"
          >
            Browse premium wings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {bookings.map((booking) => {
            const hotel = hotels.find((h) => h.id === booking.hotelId);
            const rType = rooms.find((r) => r.id === booking.roomId);

            return (
              <motion.div
                key={booking.id}
                layoutId={`booking-card-${booking.id}`}
                className="bg-white border border-gray-150 rounded-2xl overflow-hidden flex flex-col md:flex-row"
              >
                {/* Left side: Voucher representation with clean barcode */}
                <div className="p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-gray-200 w-full md:w-80 shrink-0 bg-gray-50/50">
                  <div className="space-y-4">
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-gray-400 tracking-widest uppercase">Travel Voucher</span>
                        
                        {/* Status indicator pill */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                          booking.status === 'cancelled'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : booking.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-150 font-semibold'
                        }`}>
                          {booking.status === 'cancelled'
                            ? 'Cancelled & Void'
                            : booking.paymentStatus === 'paid'
                            ? 'Paid (Checked)'
                            : 'Pending Verification'
                          }
                        </span>
                      </div>

                      {/* Payment method selection tag */}
                      {booking.status !== 'cancelled' && (
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-sans border-t border-gray-100/60 pt-1.5">
                          <span className="text-gray-400 text-[8px] font-semibold uppercase tracking-wider">Method:</span>
                          <span className="font-bold flex items-center gap-1 text-gray-700">
                            {booking.paymentMethod === 'bank_transfer' ? (
                              <>
                                <Landmark className="w-3.5 h-3.5 text-amber-700" />
                                <span>Bank Transfer</span>
                              </>
                            ) : booking.paymentMethod === 'cash' ? (
                              <>
                                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Cash (At Arrival)</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                                <span>Card Pay</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 block pt-2 border-t border-gray-100">
                      <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Reservation Token</h4>
                      <span className="text-xs font-mono font-medium text-gray-700 block select-all">{booking.id}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Checked Guest</h4>
                      <span className="text-xs font-semibold text-gray-800 block truncate">{booking.guestName}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Total Charge (₦)</h4>
                      <span className="text-sm font-bold text-amber-800 block">₦{booking.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* HTML/CSS Barcode */}
                  <div className="pt-6">
                    <div className="h-10 flex items-center gap-[1px] justify-center bg-white border border-gray-200 p-1.5 rounded-sm">
                      {[2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 4, 1, 2, 1].map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-800 h-full"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-center font-mono text-gray-400 tracking-[0.2em] block mt-1.5 uppercase">
                      * {booking.id.toUpperCase()} *
                    </span>
                  </div>
                </div>

                {/* Right side: Detailed Travel Details */}
                <div className="p-6 md:p-8 flex-grow flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block font-sans">
                      {hotel ? hotel.name : 'Premium Hotel Resort'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-1 leading-tight">
                      {rType ? rType.name : 'Loading Room Details...'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-6 border-y border-gray-100 py-5">
                      <div className="space-y-1.5 flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase block">Dates Bound</span>
                          <span className="text-xs text-gray-700 font-medium block">
                            {booking.checkIn} &rarr; {booking.checkOut}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 flex items-start gap-2.5">
                        <Tag className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase block">Lodging Units</span>
                          <span className="text-xs text-gray-700 font-medium block">
                            {booking.roomCount} {booking.roomCount === 1 ? 'Suite' : 'Suites'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 flex items-start gap-2.5">
                        <UserCheck className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase block">Guest Liaison</span>
                          <span className="text-xs text-gray-700 font-medium block truncate max-w-[150px]">
                            {booking.guestEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
                    <p className="text-[10.5px] text-gray-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Created at {new Date(booking.createdAt).toLocaleString()}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleWhatsAppSend(booking, rType?.name || 'Exclusive Suite', hotel?.name || 'DanVilla Resort')}
                          className="inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs focus:outline-hidden"
                          title="Forward booking proof details direct to company WhatsApp reception desk"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-white animate-pulse" />
                          <span>Send WhatsApp Receipt</span>
                        </button>
                      )}

                      {booking.status !== 'cancelled' ? (
                        <button
                          disabled={cancellingId === booking.id}
                          onClick={() => handleCancel(booking.id)}
                          className="inline-flex items-center gap-2 py-2 px-4.5 border border-red-200/50 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl transition-all cursor-pointer select-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          {cancellingId === booking.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Releasing...</span>
                            </>
                          ) : (
                            <>
                              <Undo className="w-3.5 h-3.5" />
                              <span>Cancel Voucher</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="text-xs font-mono font-medium text-red-600 bg-red-50 border border-red-100 py-1.5 px-3 rounded-lg flex items-center gap-1.5 select-none uppercase">
                          <AlertOctagon className="w-4 h-4" />
                          <span>Inventory voided</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
