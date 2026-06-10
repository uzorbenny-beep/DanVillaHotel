import React, { useState } from 'react';
import { CreditCard, Calendar, ShieldCheck, HelpCircle, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Booking, Room } from '../types';
import { processPayment } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentFormProps {
  booking: Booking;
  room: Room;
  onPaymentSuccess: (confirmedBooking: Booking) => void;
  onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ booking, room, onPaymentSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(booking.guestName || '');
  
  const [processing, setProcessing] = useState(false);
  const [gatewayError, setGatewayError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  // Formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    setCardExpiry(value);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 3);
    setCardCvc(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      setGatewayError('Please complete all required payment details.');
      return;
    }

    setGatewayError('');
    setProcessing(true);

    try {
      // Execute proxy call into server-side payment gateways secure route
      const result = await processPayment({
        bookingId: booking.id,
        cardNumber,
        cardExpiry,
        cardCvc
      });

      if (result.success) {
        onPaymentSuccess(result.updatedReservation);
      } else {
        setGatewayError(result.message || 'Transaction was declined by card operator.');
      }
    } catch (err: any) {
      setGatewayError(err.message || 'Connecting to payment infrastructure failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-[#E5E2DA] rounded-3xl p-6 md:p-8 max-w-4xl mx-auto shadow-xs font-sans" id="payment-gate-terminal">
      
      {/* Title */}
      <div className="border-b border-[#E5E2DA] pb-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#33332D] leading-tight">
            Checkout payment gateway
          </h2>
          <p className="text-xs text-[#8E8E82] mt-1 font-sans">
            Complete transaction to finalize security booking lock
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E8F0E8] text-[#5B6D5B] rounded-full text-[11px] font-bold uppercase tracking-widest border border-[#5B6D5B]/20">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5B6D5B]" />
          <span>AES-256 Protected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Summary */}
        <div className="lg:col-span-5 space-y-5 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-[#8E8E82] uppercase tracking-widest font-serif italic">
            Reservation Overview
          </h3>

          {/* Hotel & room details */}
          <div className="space-y-3.5 pb-4 border-b border-[#E5E2DA]">
            <div>
              <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Property</span>
              <span className="text-xs font-bold text-[#33332D] font-serif italic block mt-0.5">{room.name}</span>
              <span className="text-[10px] text-[#8E8E82] block mt-0.5">Suite layout at the chosen hotel location</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Check-In</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Check-Out</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.checkOut}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Total Rooms</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.roomCount} {booking.roomCount === 1 ? 'Room' : 'Rooms'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Guest Record</span>
                <span className="text-xs font-semibold text-[#33332D] truncate block">{booking.guestName}</span>
              </div>
            </div>
          </div>

          {/* Pricing ledger */}
          <div className="pt-2 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8E8E82]">Nightly Rate</span>
              <span className="text-[#33332D] font-semibold">${room.pricePerNight}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8E8E82]">Service Fee & Taxes (10%)</span>
              <span className="text-[#E8F0E8] bg-[#5B6D5B] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-sans">Included</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-[#E5E2DA]">
              <span className="text-xs font-bold text-[#8E8E82] tracking-wider uppercase font-serif italic">Total Charge</span>
              <span className="text-xl font-bold text-[#5B6D5B] font-serif italic">${booking.totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Right column: Card input form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECURE GATEWAY sandbox advice card */}
          <div className="p-4 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-[#33332D] flex items-center gap-1.5 font-serif italic">
              <Sparkles className="w-4 h-4 text-[#5B6D5B] shrink-0" />
              Sandbox Simulator Mode Active
            </h4>
            <p className="text-[11px] text-[#8E8E82] leading-normal font-sans">
              Utilize any standard mockup sequence (e.g., <code className="bg-[#E5E2DA] px-1 py-0.5 rounded font-mono font-semibold text-[#33332D]">4111 2222 3333 4444</code>) for approvals.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1 font-sans">
              <div className="flex items-center gap-1.5 text-red-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Ends with <code className="font-bold underline">4444</code>: Decline simulation</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Ends with <code className="font-bold underline">0000</code>: Expired card decline</span>
              </div>
            </div>
          </div>

          {/* Dual Face Credit Card visualization */}
          <div className="perspective-1000 w-full max-w-[360px] h-[210px] mx-auto hidden sm:block">
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              className="relative w-full h-full transform-style-3d cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front side */}
              <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-[#5B6D5B] via-[#4d5c4d] to-[#33332D] p-6 flex flex-col justify-between text-white backface-hidden shadow-xs">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-slate-100 font-mono uppercase">Secure Pay</span>
                  <div className="w-10 h-7 bg-white/15 rounded-md border border-white/20 flex items-center justify-center font-bold font-sans text-[10px] text-white">
                    CV
                  </div>
                </div>
                
                <div>
                  <span className="text-lg font-mono tracking-widest block py-2 text-white">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <div>
                    <span className="text-[8px] text-[#E5E2DA]/80 block uppercase font-bold tracking-wider">Card Owner</span>
                    <span className="text-[11px] font-medium tracking-tight text-white block truncate max-w-[150px]">
                      {cardName || 'Guest Name'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#E5E2DA]/80 block uppercase font-bold tracking-wider">Expires</span>
                    <span className="text-[11px] font-mono tracking-tight text-white block">
                      {cardExpiry || 'MM/YY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-[#4d5c4d] via-[#33332D] to-zinc-900 py-6 text-white backface-hidden rotateY-180 shadow-xs flex flex-col justify-between">
                <div className="w-full h-11 bg-black/60 mt-1" />
                <div className="px-6 flex items-center justify-end">
                  <div className="w-full max-w-[170px] bg-slate-100 h-8 rounded-md flex items-center justify-end px-3.5 text-[#33332D] font-mono text-xs font-semibold text-right select-none skew-x-3">
                    {cardCvc || '•••'}
                  </div>
                </div>
                <div className="px-6 text-[8px] text-[#E5E2DA]/80 tracking-widest flex justify-between uppercase">
                  <span>SSL Encryption safe</span>
                  <span>100% Sandbox Sandbox Mode</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Billing detail input fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic font-sans">Cardholder Name</label>
              <input
                type="text"
                required
                value={cardName}
                onFocus={() => setIsFlipped(false)}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 border border-[#E5E2DA] bg-white rounded-lg text-xs text-[#33332D] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic font-sans">Credit Card Number</label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-3 w-4.5 h-4.5 text-[#8E8E82]" />
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onFocus={() => setIsFlipped(false)}
                  onChange={handleCardNumberChange}
                  placeholder="4111 2222 3333 4444"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#E5E2DA] rounded-lg text-xs font-mono text-[#33332D] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic font-sans">Expiry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4.5 h-4.5 text-[#8E8E82]" />
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onFocus={() => setIsFlipped(false)}
                    onChange={handleExpiryChange}
                    placeholder="12/28"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#E5E2DA] rounded-lg text-xs font-mono text-[#33332D] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic font-sans">CVC / Security Code</label>
                <input
                  type="password"
                  required
                  value={cardCvc}
                  onFocus={() => setIsFlipped(true)}
                  onChange={handleCvcChange}
                  placeholder="•••"
                  className="w-full px-3.5 py-2.5 border border-[#E5E2DA] rounded-lg text-xs font-mono text-[#33332D] tracking-widest focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-semibold text-center"
                />
              </div>
            </div>

            {gatewayError && (
              <div className="p-4 bg-red-50/55 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-sans font-medium">{gatewayError}</span>
              </div>
            )}

            {/* Direct Form action elements */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#E5E2DA]">
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-6 border border-[#E5E2DA] hover:bg-[#F9F8F6] text-[#8E8E82] bg-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
              >
                Cancel booking
              </button>
              
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#5B6D5B] hover:bg-[#4a584a] disabled:bg-[#F9F8F6] disabled:text-[#8E8E82] disabled:border-[#E5E2DA] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-2xs"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Processing gate verification...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pay ${booking.totalPrice} Securely</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
