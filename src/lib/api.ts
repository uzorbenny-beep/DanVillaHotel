import { Hotel, Room, Booking, RoomAvailabilityResponse, SystemSettings } from '../types';
import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  query, 
  where, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Client-side integration interface talking to our custom Node/Express backend APIs,
 * with real-time automatic client-side Firebase fallback for fully static environments (e.g., Vercel / GitHub Pages).
 */

// Helper: Dates difference calculator
function getDatesArray(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Create absolute dates to avoid local timezone issues
  while (start < end) {
    dates.push(start.toISOString().split('T')[0]);
    start.setDate(start.getDate() + 1);
  }
  return dates;
}

// Local fallback calculation for hotel room availability when express server is not reachable
async function calcAvailabilityFallback(hotelId: string, checkIn: string, checkOut: string): Promise<RoomAvailabilityResponse[]> {
  const roomsQ = query(collection(db, 'rooms'), where('hotelId', '==', hotelId));
  const roomsSnap = await getDocs(roomsQ);
  const rooms: Room[] = [];
  roomsSnap.forEach(d => {
    rooms.push({ ...d.data(), id: d.id } as Room);
  });

  const bookingsQ = query(collection(db, 'bookings'), where('hotelId', '==', hotelId));
  const bookingsSnap = await getDocs(bookingsQ);
  const activeBookings: Booking[] = [];
  bookingsSnap.forEach(d => {
    const b = d.data() as Booking;
    if (b.status !== 'cancelled') {
      activeBookings.push({ ...b, id: d.id });
    }
  });

  const requestedDates = getDatesArray(checkIn, checkOut);

  return rooms.map(room => {
    const conflicting = activeBookings.filter(b => {
      if (b.roomId !== room.id) return false;
      return b.checkIn < checkOut && b.checkOut > checkIn;
    });

    let maxBookedOnAnyNight = 0;
    for (const date of requestedDates) {
      let bookedOnNight = 0;
      for (const cb of conflicting) {
        if (date >= cb.checkIn && date < cb.checkOut) {
          bookedOnNight += cb.roomCount;
        }
      }
      if (bookedOnNight > maxBookedOnAnyNight) {
        maxBookedOnAnyNight = bookedOnNight;
      }
    }

    const availableCount = Math.max(0, room.totalInventory - maxBookedOnAnyNight);

    return {
      roomId: room.id,
      name: room.name,
      totalInventory: room.totalInventory,
      bookedCount: maxBookedOnAnyNight,
      availableCount,
      pricePerNight: room.pricePerNight
    };
  });
}

export async function fetchHotels(): Promise<Hotel[]> {
  try {
    const response = await fetch('/api/hotels');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend /api/hotels failed or unavailable, trying direct Firestore fallback', err);
  }
  
  // Fallback direct to Firestore
  try {
    const snap = await getDocs(collection(db, 'hotels'));
    const list: Hotel[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Hotel);
    });
    return list;
  } catch (err: any) {
    console.error('Firestore fetchHotels fallback failed:', err);
    throw new Error('Failed to fetch premium hotels directory.');
  }
}

export async function fetchRooms(hotelId: string): Promise<Room[]> {
  try {
    const response = await fetch(`/api/hotels/${hotelId}/rooms`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Backend /api/hotels/${hotelId}/rooms failed, trying direct Firestore fallback`, err);
  }

  // Fallback direct to Firestore
  try {
    const q = query(collection(db, 'rooms'), where('hotelId', '==', hotelId));
    const snap = await getDocs(q);
    const list: Room[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Room);
    });
    return list;
  } catch (err) {
    console.error('Firestore fetchRooms fallback failed:', err);
    throw new Error('Failed to retrieve hotel configuration structures.');
  }
}

export async function fetchAvailability(
  hotelId: string,
  checkIn: string,
  checkOut: string
): Promise<RoomAvailabilityResponse[]> {
  try {
    const params = new URLSearchParams({ hotelId, checkIn, checkOut });
    const response = await fetch(`/api/rooms/availability?${params.toString()}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend availability failed or unavailable, trying client-side Firestore calculate fallback', err);
  }

  try {
    return await calcAvailabilityFallback(hotelId, checkIn, checkOut);
  } catch (err: any) {
    console.error('Firestore evaluate availability calculation failed:', err);
    throw new Error(err.message || 'Unable to update live dates inventory status.');
  }
}

interface CreateBookingPayload {
  userId: string;
  userEmail: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  guestName: string;
  guestEmail: string;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  try {
    const response = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return await response.json();
    }
    const errObj = await response.json().catch(() => ({}));
    if (errObj.error) throw new Error(errObj.error);
  } catch (err: any) {
    console.warn('Backend createBooking failed or offline, fallback to direct client-side Firestore write', err);
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('Load failed')) {
      throw err;
    }
  }

  // Fallback: Validate availability on client, then generate booking document
  try {
    const currentAvailability = await calcAvailabilityFallback(payload.hotelId, payload.checkIn, payload.checkOut);
    const roomAvail = currentAvailability.find(a => a.roomId === payload.roomId);
    if (!roomAvail || roomAvail.availableCount < payload.roomCount) {
      throw new Error('Not enough rooms available for the selected dates.');
    }

    const bookingId = `b_${Math.random().toString(36).substring(2, 11)}`;
    const newBooking: Booking = {
      id: bookingId,
      userId: payload.userId,
      userEmail: payload.userEmail,
      hotelId: payload.hotelId,
      roomId: payload.roomId,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      roomCount: payload.roomCount,
      guestName: payload.guestName,
      guestEmail: payload.guestEmail,
      status: 'pending',
      paymentStatus: 'pending',
      totalPrice: (roomAvail.pricePerNight * payload.roomCount * getDatesArray(payload.checkIn, payload.checkOut).length),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = doc(db, 'bookings', bookingId);
    await setDoc(docRef, newBooking);
    return newBooking;
  } catch (err: any) {
    console.error('Firestore createBooking fallback failed:', err);
    throw new Error(err.message || 'Server rejected creation of reservation files.');
  }
}

interface ProcessPaymentPayload {
  bookingId: string;
  paymentMethod: 'card' | 'bank_transfer' | 'cash';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
}

export async function processPayment(payload: ProcessPaymentPayload): Promise<{
  success: boolean;
  message: string;
  paymentIntentId: string;
  updatedReservation: Booking;
}> {
  try {
    const response = await fetch('/api/payments/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return await response.json();
    }
    const errObj = await response.json().catch(() => ({}));
    if (errObj.error) throw new Error(errObj.error);
  } catch (err: any) {
    console.warn('Backend payments/charge failed or offline, fallback to direct client-side Firestore write', err);
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('Load failed')) {
      throw err;
    }
  }

  // Fallback: Direct update to bookings document in Firestore
  try {
    const docRef = doc(db, 'bookings', payload.bookingId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Reservation could not be resolved.');
    }
    const booking = docSnap.data() as Booking;
    const updatedBooking: Booking = {
      ...booking,
      id: payload.bookingId,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: payload.paymentMethod,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, updatedBooking, { merge: true });
    return {
      success: true,
      message: 'Exclusive lock generated! Simulated gateway authorization approved.',
      paymentIntentId: `pi_${Math.random().toString(36).substring(2, 11)}`,
      updatedReservation: updatedBooking
    };
  } catch (err: any) {
    console.error('Firestore processPayment fallback failed:', err);
    throw new Error(err.message || 'Simulated gateway transactions declined.');
  }
}

export async function cancelBooking(bookingId: string, userId: string): Promise<void> {
  try {
    const response = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, userId })
    });
    if (response.ok) {
      return;
    }
  } catch (err) {
    console.warn('Backend bookings/cancel failed, falling back to direct Firestore update', err);
  }

  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Firestore cancelBooking fallback failed:', err);
    throw new Error('Failed to authorize cancellation action.');
  }
}

export async function fetchSettings(): Promise<SystemSettings> {
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Backend /api/settings failed or offline, trying direct Firestore fallback', err);
  }

  try {
    const docSnap = await getDoc(doc(db, 'settings', 'system'));
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    }
    const DEFAULT_SETTINGS: SystemSettings = {
      resortClosed: false,
      maintenanceMessage: 'Undergoing routine cloud architecture maintenance.',
      allowUnpaidHold: true,
      allowDirectBooking: true,
      seasonalPromoActive: true,
      promoDiscountPercent: 10,
      customBrandName: 'Dan Villa Luxury Wing'
    };
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Firestore fetchSettings fallback failed:', err);
    throw new Error('Failed to retrieve system settings configurations.');
  }
}

export async function updateSettings(settings: SystemSettings): Promise<void> {
  try {
    const response = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (response.ok) {
      return;
    }
  } catch (err) {
    console.warn('Backend updateSettings failed, falling back to direct Firestore write', err);
  }

  try {
    const docRef = doc(db, 'settings', 'system');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.error('Firestore updateSettings fallback failed:', err);
    throw new Error('Failed to save system settings modifications.');
  }
}

export async function updateHotel(hotel: Hotel): Promise<Hotel> {
  try {
    const response = await fetch(`/api/hotels/${hotel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hotel)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Backend PUT /api/hotels/${hotel.id} failed, falling back to direct Firestore write`, err);
  }

  try {
    const docRef = doc(db, 'hotels', hotel.id);
    await setDoc(docRef, hotel, { merge: true });
    return hotel;
  } catch (err: any) {
    console.error('Firestore updateHotel fallback failed:', err);
    throw new Error('Failed to update hotel wing section.');
  }
}

export async function createRoom(hotelId: string, room: Omit<Room, 'id'>): Promise<Room> {
  try {
    const response = await fetch(`/api/hotels/${hotelId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Backend POST /api/hotels/${hotelId}/rooms failed, falling back to direct client-side creation`, err);
  }

  try {
    const roomId = `r_custom_${Math.random().toString(36).substring(2, 11)}`;
    const finalRoom: Room = {
      ...room,
      id: roomId,
      hotelId
    };
    const docRef = doc(db, 'rooms', roomId);
    await setDoc(docRef, finalRoom);
    return finalRoom;
  } catch (err) {
    console.error('Firestore createRoom fallback failed:', err);
    throw new Error('Failed to create new lodging suite offering.');
  }
}

export async function updateRoom(room: Room): Promise<Room> {
  try {
    const response = await fetch(`/api/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`Backend PUT /api/rooms/${room.id} failed, falling back to direct Firestore write`, err);
  }

  try {
    const docRef = doc(db, 'rooms', room.id);
    await setDoc(docRef, room, { merge: true });
    return room;
  } catch (err) {
    console.error('Firestore updateRoom fallback failed:', err);
    throw new Error('Failed to update lodging suite offering.');
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      return;
    }
  } catch (err) {
    console.warn(`Backend DELETE /api/rooms/${roomId} failed, falling back to direct Firestore delete`, err);
  }

  try {
    const docRef = doc(db, 'rooms', roomId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteRoom fallback failed:', err);
    throw new Error('Failed to delete lodging suite offering.');
  }
}
