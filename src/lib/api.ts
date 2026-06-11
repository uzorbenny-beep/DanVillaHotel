import { Hotel, Room, Booking, RoomAvailabilityResponse, SystemSettings } from '../types';

/**
 * Client-side integration interface talking to our custom Node/Express backend APIs
 */

export async function fetchHotels(): Promise<Hotel[]> {
  const response = await fetch('/api/hotels');
  if (!response.ok) {
    throw new Error('Failed to fetch premium hotels directory.');
  }
  return response.json();
}

export async function fetchRooms(hotelId: string): Promise<Room[]> {
  const response = await fetch(`/api/hotels/${hotelId}/rooms`);
  if (!response.ok) {
    throw new Error('Failed to retrieve hotel configuration structures.');
  }
  return response.json();
}

export async function fetchAvailability(
  hotelId: string,
  checkIn: string,
  checkOut: string
): Promise<RoomAvailabilityResponse[]> {
  const params = new URLSearchParams({ hotelId, checkIn, checkOut });
  const response = await fetch(`/api/rooms/availability?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Unable to update live dates inventory status.');
  }
  return response.json();
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
  const response = await fetch('/api/bookings/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Server rejected creation of reservation files.');
  }
  return response.json();
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
  const response = await fetch('/api/payments/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Simulated gateway transactions declined.');
  }
  return response.json();
}

export async function cancelBooking(bookingId: string, userId: string): Promise<void> {
  const response = await fetch('/api/bookings/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, userId })
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to authorize cancellation action.');
  }
}

export async function fetchSettings(): Promise<SystemSettings> {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    throw new Error('Failed to retrieve system settings configurations.');
  }
  return response.json();
}

export async function updateSettings(settings: SystemSettings): Promise<void> {
  const response = await fetch('/api/settings/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save system settings modifications.');
  }
}
