import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, ShieldCheck, Flame, Loader2, Play } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthBarrierMock: React.FC = () => {
  const { loginWithGoogle, loginAsMock, loading } = useAuth();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [triggeringGoogle, setTriggeringGoogle] = useState(false);
  const [triggeringMock, setTriggeringMock] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const handleGoogleLogin = async () => {
    setErrorLocal('');
    setTriggeringGoogle(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorLocal('Could not initialize Google popup window. Ensure popups are authorized.');
    } finally {
      setTriggeringGoogle(false);
    }
  };

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail) {
      setErrorLocal('Please complete guest profile credentials.');
      return;
    }
    setErrorLocal('');
    setTriggeringMock(true);
    setTimeout(() => {
      loginAsMock(guestName, guestEmail);
      setTriggeringMock(false);
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-150 rounded-2xl p-6 md:p-8 text-center shadow-xs" id="auth-barrier-pnl">
      <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-800 mb-4">
        <ShieldCheck className="w-6 h-6" />
      </div>

      <h3 className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">
        Authenticate traveler portal
      </h3>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
        Unlock direct booking confirmations, real-time availability processing, and direct checkout transactions.
      </p>

      {errorLocal && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-sans text-left">
          {errorLocal}
        </div>
      )}

      {/* Google Sign In option */}
      <div className="mt-6 space-y-4">
        <button
          disabled={loading || triggeringGoogle || triggeringMock}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-gray-200 hover:border-gray-300 text-gray-700 bg-white rounded-xl text-xs font-semibold font-sans transition-all shadow-2xs hover:shadow-xs cursor-pointer select-none"
        >
          {triggeringGoogle ? (
            <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.76 14.93 1 12 1 7.35 1 3.4 3.65 1.51 7.5l3.6 2.8C6.03 6.94 8.78 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.6 2.8c2.1-1.94 3.31-4.8 3.31-8.46z"
              />
              <path
                fill="#FBBC05"
                d="M5.11 10.3C4.88 10.96 4.75 11.67 4.75 12.4s.13 1.44.36 2.1l-3.6 2.8C.54 15.65 0 14.09 0 12.4s.54-3.25 1.51-4.9l3.6 2.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.8c-1.1.74-2.52 1.18-4.36 1.18-3.22 0-5.97-1.9-6.97-4.46l-3.6 2.8C3.4 20.35 7.35 23 12 23z"
              />
            </svg>
          )}
          <span>Access using actual Google Account</span>
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px bg-gray-150 flex-grow" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">or</span>
          <div className="h-px bg-gray-155 flex-grow" />
        </div>

        {/* Guest sandbox option */}
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4.5 text-left">
          <div className="flex items-center gap-1 text-amber-800 text-xs font-bold leading-none mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-700 fill-amber-700/10 shrink-0" />
            <span>Developer Sandbox Quick Access</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-normal mb-3.5">
            Authenticate instantly using a sandbox mock profile. Real Firestore synchronization is fully maintained.
          </p>

          <form onSubmit={handleMockLogin} className="space-y-3">
            <div>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full guest name"
                className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="relative">
              <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email connection address"
                className="w-full pl-3 pr-8 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading || triggeringGoogle || triggeringMock}
              className="w-full inline-flex items-center justify-center gap-1 py-2 px-4 bg-gray-900 hover:bg-amber-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer select-none"
            >
              {triggeringMock ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Initialize Fast Sandbox Session</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
