/**
 * Hotel Booking system type definitions
 */

export interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  image: string;
  amenities: string[];
}

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  totalInventory: number;
  image: string;
  images?: string[];
  amenities: string[];
}

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  hotelId: string;
  roomId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  roomCount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentIntentId?: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'cash';
  guestName: string;
  guestEmail: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface RoomAvailabilityResponse {
  roomId: string;
  name: string;
  totalInventory: number;
  bookedCount: number;
  availableCount: number;
  pricePerNight: number;
}

export interface APIErrorResponse {
  error: string;
}

export interface SystemSettings {
  id: string;
  whatsappNumber: string;
  whatsappTemplate: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  cardMethodsEnabled: boolean;
  transferMethodsEnabled: boolean;
  cashMethodsEnabled: boolean;
  sandboxSimulateDecline: boolean;
  sandboxDeclineCode: string;
  sandboxDeclineMessage: string;
  receiptSuccessTitle: string;
  receiptSuccessMessage: string;
}

