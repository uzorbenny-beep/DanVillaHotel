import React, { useState } from 'react';
import { CreditCard, Calendar, ShieldCheck, HelpCircle, Loader2, Sparkles, CheckCircle2, AlertTriangle, Landmark, Wallet, Copy, Check, Info } from 'lucide-react';
import { Booking, Room, SystemSettings } from '../types';
import { processPayment } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

interface PaymentFormProps {
  booking: Booking;
  room: Room;
  onPaymentSuccess: (confirmedBooking: Booking) => void;
  onCancel: () => void;
  settings?: SystemSettings | null;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ booking, room, onPaymentSuccess, onCancel, settings }) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(booking.guestName || '');
  
  const [processing, setProcessing] = useState(false);
  const [gatewayError, setGatewayError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  // Bank transfer copy indicators
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Auto recovery selector when payment methods are toggleable
  useEffect(() => {
    if (settings) {
      if (paymentMethod === 'card' && !settings.cardMethodsEnabled) {
        if (settings.transferMethodsEnabled) setPaymentMethod('bank_transfer');
        else if (settings.cashMethodsEnabled) setPaymentMethod('cash');
      } else if (paymentMethod === 'bank_transfer' && !settings.transferMethodsEnabled) {
        if (settings.cardMethodsEnabled) setPaymentMethod('card');
        else if (settings.cashMethodsEnabled) setPaymentMethod('cash');
      } else if (paymentMethod === 'cash' && !settings.cashMethodsEnabled) {
        if (settings.cardMethodsEnabled) setPaymentMethod('card');
        else if (settings.transferMethodsEnabled) setPaymentMethod('bank_transfer');
      }
    }
  }, [settings]);

  const copyToClipboard = (text: string, type: 'num' | 'ref') => {
    navigator.clipboard.writeText(text);
    if (type === 'num') {
      setCopiedNum(true);
      setTimeout(() => setCopiedNum(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  // Formatting helpers for credit card inputs
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
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc || !cardName)) {
      setGatewayError('Please complete all required payment details.');
      return;
    }

    setGatewayError('');
    setProcessing(true);

    try {
      // Execute call to our secure Express payment router
      const result = await processPayment({
        bookingId: booking.id,
        paymentMethod,
        cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
        cardExpiry: paymentMethod === 'card' ? cardExpiry : undefined,
        cardCvc: paymentMethod === 'card' ? cardCvc : undefined
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
            Checkout Booking Settle
          </h2>
          <p className="text-xs text-[#8E8E82] mt-1 font-sans">
            Choose your preferred approach to lock this premium suite offering
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-[#1E3A8A] rounded-full text-[11px] font-bold uppercase tracking-widest border border-[#1E3A8A]/20 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
          <span>AES-256 Protected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Summary */}
        <div className="lg:col-span-5 space-y-5 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl p-5 self-start">
          <h3 className="text-xs font-bold text-[#8E8E82] uppercase tracking-widest font-serif italic">
            Reservation Overview
          </h3>

          {/* Hotel & room details */}
          <div className="space-y-3.5 pb-4 border-b border-[#E5E2DA]">
            <div>
              <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Suite Configuration</span>
              <span className="text-xs font-bold text-[#33332D] font-serif italic block mt-0.5">{room.name}</span>
              <span className="text-[10px] text-[#8E8E82] block mt-0.5">Premium curated lodging layout</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pb-2 pt-1 font-sans">
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Check-In</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Check-Out</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.checkOut}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 font-sans">
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Lodging Units</span>
                <span className="text-xs font-semibold text-[#33332D]">{booking.roomCount} {booking.roomCount === 1 ? 'Room' : 'Rooms'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E8E82] font-bold uppercase tracking-wider block font-serif italic">Lead Guest</span>
                <span className="text-xs font-semibold text-[#33332D] truncate block">{booking.guestName}</span>
              </div>
            </div>
          </div>

          {/* Pricing ledger */}
          <div className="pt-2 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8E8E82]">Nightly Rate</span>
              <span className="text-[#33332D] font-semibold">₦{room.pricePerNight.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8E8E82]">Service Fee & Taxes (10%)</span>
              <span className="text-white bg-red-600 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-sans">Included</span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-[#E5E2DA]">
              <span className="text-xs font-bold text-[#8E8E82] tracking-wider uppercase font-serif italic">Total Charge</span>
              <span className="text-xl font-bold text-red-600 font-serif italic">₦{booking.totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Payment Modes */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Segmented Payment Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-[#F5F3ED] p-1.5 rounded-2xl border border-[#E5E2DA]/65">
            {(!settings || settings.cardMethodsEnabled) ? (
              <button
                type="button"
                onClick={() => { setPaymentMethod('card'); setGatewayError(''); }}
                className={`py-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-white text-[#1E3A8A] shadow-xs ring-1 ring-black/5 font-extrabold'
                    : 'text-[#8E8E82] hover:text-black hover:bg-white/40'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Card Pay</span>
              </button>
            ) : (
              <div className="py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center flex flex-col items-center justify-center bg-gray-100 rounded-xl opacity-50 select-none">
                <CreditCard className="w-4 h-4 shrink-0 text-gray-300" />
                <span>Card (Disabled)</span>
              </div>
            )}

            {(!settings || settings.transferMethodsEnabled) ? (
              <button
                type="button"
                onClick={() => { setPaymentMethod('bank_transfer'); setGatewayError(''); }}
                className={`py-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-white text-[#1E3A8A] shadow-xs ring-1 ring-black/5 font-extrabold'
                    : 'text-[#8E8E82] hover:text-black hover:bg-white/40'
                }`}
              >
                <Landmark className="w-4 h-4 shrink-0" />
                <span>Transfer</span>
              </button>
            ) : (
              <div className="py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center flex flex-col items-center justify-center bg-gray-100 rounded-xl opacity-50 select-none">
                <Landmark className="w-4 h-4 shrink-0 text-gray-300" />
                <span>Transfer (Disabled)</span>
              </div>
            )}

            {(!settings || settings.cashMethodsEnabled) ? (
              <button
                type="button"
                onClick={() => { setPaymentMethod('cash'); setGatewayError(''); }}
                className={`py-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-white text-[#1E3A8A] shadow-xs ring-1 ring-black/5 font-extrabold'
                    : 'text-[#8E8E82] hover:text-black hover:bg-white/40'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Pay on Arrival</span>
              </button>
            ) : (
              <div className="py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center flex flex-col items-center justify-center bg-gray-100 rounded-xl opacity-50 select-none">
                <Wallet className="w-4 h-4 shrink-0 text-gray-300" />
                <span>Cash (Disabled)</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {paymentMethod === 'card' && (
                <motion.div
                  key="card-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* SECURE GATEWAY sandbox advice card */}
                  <div className="p-4 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-[#33332D] flex items-center gap-1.5 font-serif italic">
                      <Sparkles className="w-4 h-4 text-[#1E3A8A] shrink-0" />
                      Sandbox Simulator Active
                    </h4>
                    <p className="text-[11px] text-[#8E8E82] leading-normal font-sans">
                      Complete transaction with any standard mockup sequence (e.g., <code className="bg-[#E5E2DA] px-1 py-0.5 rounded font-mono font-semibold text-[#33332D]">4111 2222 3333 4444</code>).
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
                  <div className="perspective-1000 w-full max-w-[340px] h-[190px] mx-auto hidden sm:block">
                    <div
                      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.6s' }}
                      className={`relative w-full h-full cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      {/* CSS transform helper */}
                      <style>{`
                        .rotate-y-180 { transform: rotateY(180deg); }
                        .backface-hidden { backface-visibility: hidden; }
                      `}</style>

                      {/* Front side */}
                      <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#1E3A8A] via-[#102A6A] to-slate-900 border-b-4 border-red-600 p-5 flex flex-col justify-between text-white backface-hidden shadow-md">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold tracking-widest text-slate-100 font-mono uppercase">Secure Pay</span>
                          <div className="w-10 h-6 bg-white/10 rounded border border-white/20 flex items-center justify-center font-bold font-sans text-[8px] text-white">
                            CV
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-base font-mono tracking-widest block py-1.5 text-white">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <div>
                            <span className="text-[7px] text-[#E5E2DA]/80 block uppercase font-bold tracking-wider">Card Owner</span>
                            <span className="text-[11px] font-medium tracking-tight text-white block truncate max-w-[150px]">
                              {cardName || 'Guest Name'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7px] text-[#E5E2DA]/80 block uppercase font-bold tracking-wider">Expires</span>
                            <span className="text-[11px] font-mono tracking-tight text-white block">
                              {cardExpiry || 'MM/YY'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Back side */}
                      <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#102A6A] via-slate-900 to-black py-5 text-white backface-hidden rotateY-180 shadow-md flex flex-col justify-between" style={{ transform: 'rotateY(180deg)' }}>
                        <div className="w-full h-9 bg-black/60 mt-1" />
                        <div className="px-5 flex items-center justify-end">
                          <div className="w-full max-w-[140px] bg-slate-100 h-7 rounded flex items-center justify-end px-3 text-[#33332D] font-mono text-[11px] font-semibold text-right select-none skew-x-3">
                            {cardCvc || '•••'}
                          </div>
                        </div>
                        <div className="px-5 text-[7px] text-[#E5E2DA]/80 tracking-widest flex justify-between uppercase">
                          <span>SSL Encrypted</span>
                          <span>Simulation sandbox</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1 font-sans">Cardholder Name</label>
                      <input
                        type="text"
                        required={paymentMethod === 'card'}
                        value={cardName}
                        onFocus={() => setIsFlipped(false)}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-3.5 py-2.5 border border-[#E5E2DA] bg-white rounded-lg text-xs text-black focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1 font-sans">Credit Card Number</label>
                      <div className="relative font-mono">
                        <CreditCard className="absolute left-3 top-3 w-4.5 h-4.5 text-[#8E8E82]" />
                        <input
                          type="text"
                          required={paymentMethod === 'card'}
                          value={cardNumber}
                          onFocus={() => setIsFlipped(false)}
                          onChange={handleCardNumberChange}
                          placeholder="4111 2222 3333 4444"
                          className="w-full pl-9 pr-3 py-2.5 border border-[#E5E2DA] rounded-lg text-xs text-black focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1 font-sans">Expiry Date</label>
                        <div className="relative font-mono">
                          <Calendar className="absolute left-3 top-3 w-4.5 h-4.5 text-[#8E8E82]" />
                          <input
                            type="text"
                            required={paymentMethod === 'card'}
                            value={cardExpiry}
                            onFocus={() => setIsFlipped(false)}
                            onChange={handleExpiryChange}
                            placeholder="12/28"
                            className="w-full pl-9 pr-3 py-2.5 border border-[#E5E2DA] rounded-lg text-xs text-black focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1 font-sans">CVC Code</label>
                        <input
                          type="password"
                          required={paymentMethod === 'card'}
                          value={cardCvc}
                          onFocus={() => setIsFlipped(true)}
                          onChange={handleCvcChange}
                          placeholder="•••"
                          className="w-full px-3 py-2.5 border border-[#E5E2DA] rounded-lg text-xs font-mono text-black tracking-widest focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] font-semibold text-center"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <motion.div
                  key="transfer-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="bg-[#E8F0E8]/50 border border-[#5B6D5B]/25 rounded-2xl p-4.5 flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#5B6D5B] shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-700 leading-normal">
                      <span className="font-bold block text-black mb-1">Direct Bank Account Transfer</span>
                      Please transfer the exact amount of <strong className="text-red-600">₦{booking.totalPrice.toLocaleString()}</strong> to our corporate reservation account details below. Use your <strong>Reservation Token</strong> as the transfer description/narration.
                    </div>
                  </div>

                  {/* Bank Details Card */}
                  <div className="border border-[#E5E2DA] bg-[#F9F8F6] rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-[#E5E2DA]/60">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E82]">Beneficiary Bank</span>
                      <span className="text-xs font-bold text-black font-sans">{settings?.bankName || "Sterling Bank Plc"}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2.5 border-b border-[#E5E2DA]/60">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E82]">Account Name</span>
                      <span className="text-xs font-bold text-black font-mono">{settings?.bankAccountName || "DanVilla Res. & Leisure Ltd"}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2.5 border-b border-[#E5E2DA]/60">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E82]">Account Number</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-xs font-extrabold text-[#1E3A8A]">{settings?.bankAccountNumber || "1024589364"}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(settings?.bankAccountNumber || "1024589364", 'num')}
                          className="p-1 hover:bg-gray-200 text-gray-500 rounded-md cursor-pointer transition-all"
                          title="Copy Account Number"
                        >
                          {copiedNum ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E82]">Narration / Ref</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-xs font-bold text-gray-700 bg-gray-200/60 px-1.5 rounded">{booking.id}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(booking.id, 'ref')}
                          className="p-1 hover:bg-gray-200 text-gray-500 rounded-md cursor-pointer transition-all"
                          title="Copy Reference ID"
                        >
                          {copiedRef ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4.5 bg-amber-50/50 border border-amber-200 rounded-xl">
                    <p className="text-[11px] text-amber-800 leading-relaxed font-sans">
                      ⚠️ <strong>WhatsApp Proof of Payment</strong>: Once the transfer is completed, click <strong>"Confirm Bank Transfer"</strong> below. On the success screen, you'll be prompted to immediately forward the payment screenshot receipt to our company WhatsApp for priority processing.
                    </p>
                  </div>
                </motion.div>
              )}

              {paymentMethod === 'cash' && (
                <motion.div
                  key="cash-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="bg-[#E8F0E8]/50 border border-[#5B6D5B]/25 rounded-2xl p-4.5 flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#5B6D5B] shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-700 leading-normal">
                      <span className="font-bold block text-black mb-1">Pay Cash / Settle Upon Arrival</span>
                      Reserve your lodging immediately and lock your room inventory dates now. You will settle the bill of <strong className="text-red-600">₦{booking.totalPrice.toLocaleString()}</strong> in cash (or local cards) upon checking in at the hotel's front desk.
                    </div>
                  </div>

                  <div className="border border-[#E5E2DA] bg-[#F9F8F6] p-4.5 rounded-l-2xl border-l-4 border-l-red-600 space-y-2">
                    <span className="text-[10px] tracking-widest font-bold uppercase text-[#8E8E82] block">Reservation Lock Guarantees</span>
                    <p className="text-[11.5px] text-black leading-relaxed font-sans">
                      Our live double-booking safeguards will hold your selected rooms for the check-in date. No immediate charging is compiled.
                    </p>
                    <ul className="list-disc pl-4.5 text-[11px] text-gray-500 space-y-1 pt-1 font-sans">
                      <li>Free cancellations are supported prior to 24 hours of check-in</li>
                      <li>Government ID required at desk registration</li>
                      <li>Standard check-in hours apply</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                    <p className="text-[11px] text-amber-800 leading-relaxed font-sans">
                      💬 <strong>WhatsApp Record Booking</strong>: Clicking <strong>"Confirm Cash Booking"</strong> will secure your room. Afterward, tap the WhatsApp receipt link to notify the lodge coordinators of your planned arrival time.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {gatewayError && (
              <div className="p-4 bg-red-50/55 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-sans font-medium">{gatewayError}</span>
              </div>
            )}

            {/* Form action buttons */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#E5E2DA]">
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-6 border border-[#E5E2DA] bg-white hover:bg-[#F9F8F6] text-[#8E8E82] hover:text-black rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
                disabled={processing}
              >
                Cancel Booking
              </button>
              
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#1E3A8A] hover:bg-black disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 text-white rounded-full text-xs font-bold uppercase tracking-widest border-b-2 border-red-600 transition-all cursor-pointer shadow-md"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Reserving Suite...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {paymentMethod === 'card' && `Pay ₦${booking.totalPrice.toLocaleString()} Securely`}
                      {paymentMethod === 'bank_transfer' && 'Confirm Bank Transfer'}
                      {paymentMethod === 'cash' && 'Confirm Cash Booking'}
                    </span>
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
