import React, { useState, useEffect } from 'react';
import { 
  fetchHotels, 
  fetchRooms,
  updateSettings,
  updateHotel,
  createRoom,
  updateRoom,
  deleteRoom
} from '../lib/api';
import { Hotel, Room, Booking, SystemSettings } from '../types';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Sliders, 
  Package, 
  CalendarDays, 
  Upload, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Check, 
  Loader2, 
  AlertCircle, 
  HelpCircle,
  Eye, 
  Video, 
  Image as ImageIcon, 
  Tag, 
  X, 
  ArrowLeftRight,
  Settings as SettingsIcon,
  ToggleLeft,
  ToggleRight,
  Save,
  MessageSquare,
  Landmark,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onBack: () => void;
  settings?: SystemSettings | null;
  onUpdateSettings?: (s: SystemSettings) => void;
}

export const isMediaVideo = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('video:') || 
         url.toLowerCase().endsWith('.mp4') || 
         url.toLowerCase().endsWith('.webm') || 
         url.toLowerCase().endsWith('.mov') ||
         url.includes('youtube.com') || 
         url.includes('youtu.be');
};

export const cleanMediaUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('video:')) return url.substring(6);
  return url;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'rooms' | 'bookings' | 'settings'>('overview');
  
  // Specific hotel category filter selections (Front View, Rooms, Bar, VIP Club, Snooker, Pool, Kitchen)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'front_view' | 'rooms' | 'bar' | 'vip_club' | 'snooker' | 'pool' | 'kitchen'>('all');

  // Localized System Settings edits states
  const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsappNumber || '2348123456789');
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings?.whatsappTemplate || '');
  const [bankName, setBankName] = useState(settings?.bankName || 'Sterling Bank Plc');
  const [bankAccountName, setBankAccountName] = useState(settings?.bankAccountName || 'DanVilla Res. & Leisure Ltd');
  const [bankAccountNumber, setBankAccountNumber] = useState(settings?.bankAccountNumber || '1024589364');
  const [cardMethodsEnabled, setCardMethodsEnabled] = useState(settings?.cardMethodsEnabled ?? true);
  const [transferMethodsEnabled, setTransferMethodsEnabled] = useState(settings?.transferMethodsEnabled ?? true);
  const [cashMethodsEnabled, setCashMethodsEnabled] = useState(settings?.cashMethodsEnabled ?? true);
  
  const [sandboxSimulateDecline, setSandboxSimulateDecline] = useState(settings?.sandboxSimulateDecline ?? false);
  const [sandboxDeclineCode, setSandboxDeclineCode] = useState(settings?.sandboxDeclineCode || '4444');
  const [sandboxDeclineMessage, setSandboxDeclineMessage] = useState(settings?.sandboxDeclineMessage || 'Declined: Insufficient funds on the provided card account.');

  const [receiptSuccessTitle, setReceiptSuccessTitle] = useState(settings?.receiptSuccessTitle || 'Lodging secured!');
  const [receiptSuccessMessage, setReceiptSuccessMessage] = useState(settings?.receiptSuccessMessage || '');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Sync state if settings prop changes
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsappNumber);
      setWhatsappTemplate(settings.whatsappTemplate);
      setBankName(settings.bankName);
      setBankAccountName(settings.bankAccountName);
      setBankAccountNumber(settings.bankAccountNumber);
      setCardMethodsEnabled(settings.cardMethodsEnabled);
      setTransferMethodsEnabled(settings.transferMethodsEnabled);
      setCashMethodsEnabled(settings.cashMethodsEnabled);
      setSandboxSimulateDecline(settings.sandboxSimulateDecline);
      setSandboxDeclineCode(settings.sandboxDeclineCode);
      setSandboxDeclineMessage(settings.sandboxDeclineMessage);
      setReceiptSuccessTitle(settings.receiptSuccessTitle);
      setReceiptSuccessMessage(settings.receiptSuccessMessage);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');
    
    const payload: SystemSettings = {
      id: 'system',
      whatsappNumber,
      whatsappTemplate,
      bankName,
      bankAccountName,
      bankAccountNumber,
      cardMethodsEnabled,
      transferMethodsEnabled,
      cashMethodsEnabled,
      sandboxSimulateDecline,
      sandboxDeclineCode,
      sandboxDeclineMessage,
      receiptSuccessTitle,
      receiptSuccessMessage
    };

    try {
      await updateSettings(payload);
      if (onUpdateSettings) {
        onUpdateSettings(payload);
      }
      setSettingsSuccessMsg("System settings synchronized successfully in Cloud Firestore!");
      setTimeout(() => setSettingsSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      setSettingsErrorMsg(err.message || "Failed to update system configurations.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Category mapping function corresponding to our hotel section Firestore records
  const getHotelCategory = (id: string): string => {
    if (id === 'sec_front_view') return 'front_view';
    if (id === 'sec_rooms_upstairs' || id === 'sec_rooms_downstairs') return 'rooms';
    if (id === 'sec_bar') return 'bar';
    if (id === 'sec_vip_club') return 'vip_club';
    if (id === 'sec_indoor_snooker' || id === 'sec_outdoor_snooker') return 'snooker';
    if (id === 'sec_swimming_pool') return 'pool';
    if (id === 'sec_kitchen') return 'kitchen';
    return 'other';
  };

  const getCategoryBadge = (id: string) => {
    switch (id) {
      case 'sec_front_view':
        return { label: 'Front View & Main Lobby', color: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'sec_rooms_upstairs':
      case 'sec_rooms_downstairs':
        return { label: 'Guest Rooms & Premium Suites', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
      case 'sec_bar':
        return { label: 'Beverage / Jazz Bar Lounge', color: 'bg-amber-50 text-amber-700 border border-amber-200' };
      case 'sec_vip_club':
        return { label: 'Skyline Nightlife / VIP Club', color: 'bg-purple-50 text-purple-700 border border-purple-200' };
      case 'sec_indoor_snooker':
      case 'sec_outdoor_snooker':
        return { label: 'Recreation / Snooker Yards', color: 'bg-rose-50 text-rose-700 border border-rose-200' };
      case 'sec_swimming_pool':
        return { label: 'Resort / Central Pool Campus', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200' };
      case 'sec_kitchen':
        return { label: 'Dining Open Kitchen & Chef Table', color: 'bg-orange-50 text-orange-700 border border-orange-200' };
      default:
        return { label: 'Luxury Wing', color: 'bg-gray-50 text-gray-700 border border-gray-100' };
    }
  };

  // Data lists
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Selection states
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  
  // Loading & feedback states
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit states
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // File Upload state variables
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Drag over state indicators
  const [isDraggingSection, setIsDraggingSection] = useState(false);
  const [isDraggingRoomMain, setIsDraggingRoomMain] = useState(false);
  const [isDraggingRoomGallery, setIsDraggingRoomGallery] = useState(false);

  // Fetch all administrative data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch hotels (sections)
      const hotelsData = await fetchHotels();
      setHotels(hotelsData);
      if (hotelsData.length > 0) {
        setSelectedHotelId(hotelsData[0].id);
      }

      // 2. Fetch all rooms
      const roomsSnapshot = await getDocs(collection(db, 'rooms')).catch((e) => {
        handleFirestoreError(e, OperationType.LIST, 'rooms');
      });
      const roomsList: Room[] = [];
      roomsSnapshot.forEach((doc) => {
        roomsList.push(doc.data() as Room);
      });
      setRooms(roomsList);

      // 3. Fetch all bookings securely from the Admin backend
      const bookingsResponse = await fetch('/api/admin/bookings');
      if (!bookingsResponse.ok) {
        throw new Error('Failed to retrieve bookings from the administrative API endpoint.');
      }
      const bookingsList: Booking[] = await bookingsResponse.json();
      setBookings(bookingsList);

    } catch (error: any) {
      console.error(error);
      let errObj = null;
      try {
        errObj = error.message ? JSON.parse(error.message) : null;
      } catch (e) {
        // Error message was not JSON, which is fine
      }
      if (errObj && errObj.error && errObj.error.includes('permission-denied')) {
        showFeedback('error', 'Authentication Warning: You must log in as Administrator (uzorbenny51@gmail.com) to read or modify registration files.');
      } else {
        showFeedback('error', 'Failed to retrieve cloud administrative registries.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe file uploader helper accepting clean File items
  const uploadFile = async (
    file: File,
    onComplete: (url: string, uploadedFile: File) => void
  ) => {
    if (file.size > 25 * 1024 * 1024) {
      showFeedback('error', 'File is too large. Maximum supported upload size is 25MB.');
      return;
    }

    setActionLoading('uploading');
    setUploadProgress(10);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        setUploadProgress(50);
        const base64Data = reader.result as string;
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64Data
            })
          });

          if (!response.ok) {
            throw new Error('Server rejected uploading processes.');
          }

          const result = await response.json();
          setUploadProgress(100);
          showFeedback('success', `File: "${file.name}" uploaded successfully!`);
          onComplete(result.url, file);
        } catch (err) {
          showFeedback('error', 'Server failed to write file to local disk.');
        } finally {
          setActionLoading(null);
          setUploadProgress(null);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Failed to read local media assets.');
      setActionLoading(null);
      setUploadProgress(null);
    }
  };

  // Safe traditional file-picker upload hook
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onComplete: (url: string, file: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, onComplete);
  };

  // Reset function to default seeder elements
  const handleFactoryReset = async () => {
    if (!window.confirm('Are you absolutely sure you want to restore all Sections and Rooms to standard factory seeds? This will NOT delete bookings but will recover standard Unsplash imagery.')) {
      return;
    }

    setActionLoading('reset');
    try {
      const response = await fetch('/api/admin/reset', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Factory restore failed.');
      }
      showFeedback('success', 'Catalog files successfully recovered to hotel presets.');
      await loadAllData();
    } catch (err) {
      showFeedback('error', 'Recovering presets crashed on backend server nodes.');
    } finally {
      setActionLoading(null);
    }
  };

  // Section Save Trigger
  const handleSaveHotel = async (hotel: Hotel) => {
    setActionLoading(hotel.id);
    try {
      await updateHotel(hotel);
      showFeedback('success', `Section: "${hotel.name}" saved successfully via API!`);
      setEditingHotel(null);
      await loadAllData();
    } catch (err: any) {
      console.error("Hotel section update failed:", err);
      showFeedback('error', `Insufficient database permissions or server error: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Amenity to Section
  const handleAddHotelAmenity = (amenity: string) => {
    if (!editingHotel || !amenity.trim()) return;
    if (editingHotel.amenities.includes(amenity.trim())) return;
    setEditingHotel({
      ...editingHotel,
      amenities: [...editingHotel.amenities, amenity.trim()]
    });
  };

  const handleRemoveHotelAmenity = (indexToRemove: number) => {
    if (!editingHotel) return;
    setEditingHotel({
      ...editingHotel,
      amenities: editingHotel.amenities.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Room Save trigger
  const handleSaveRoom = async (room: Room) => {
    setActionLoading(room.id || 'saving-room');
    try {
      const finalRoom: Room = {
        ...room,
        pricePerNight: Number(room.pricePerNight) || 0,
        capacity: Number(room.capacity) || 1,
        totalInventory: Number(room.totalInventory) || 1,
        images: room.images || [],
        amenities: room.amenities || []
      };

      if (isCreatingRoom) {
        await createRoom(selectedHotelId, {
          hotelId: selectedHotelId,
          name: finalRoom.name,
          description: finalRoom.description,
          pricePerNight: finalRoom.pricePerNight,
          capacity: finalRoom.capacity,
          totalInventory: finalRoom.totalInventory,
          image: finalRoom.image || '',
          images: finalRoom.images,
          amenities: finalRoom.amenities
        });
        showFeedback('success', `Suite / Offering: "${room.name}" created successfully via API!`);
      } else {
        await updateRoom(finalRoom);
        showFeedback('success', `Suite / Offering: "${room.name}" updated successfully via API!`);
      }

      setEditingRoom(null);
      setIsCreatingRoom(false);
      await loadAllData();
    } catch (err: any) {
      console.error("Room save operation failed: ", err);
      showFeedback('error', `Failed to save suite offering: ${err.message || 'Unknown database error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Room deletion trigger
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this accommodation offering? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${roomId}`);
    try {
      await deleteRoom(roomId);
      showFeedback('success', 'Room slot successfully deleted from database via API.');
      await loadAllData();
    } catch (err: any) {
      console.error("Room deletion failed: ", err);
      showFeedback('error', `Could not delete room slot: ${err.message || 'Unknown database error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Create empty room template
  const handleInitCreateRoom = () => {
    const freshRoom: Room = {
      id: '',
      hotelId: selectedHotelId,
      name: 'New Custom Luxury Suite',
      description: 'Describe the features, size, and occupancy variables of this new resort suite.',
      pricePerNight: 200,
      capacity: 2,
      totalInventory: 5,
      image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600',
      images: [],
      amenities: ['Room Service', 'Air Conditioning', 'Flat Screen TV', 'Complimentary WiFi']
    };
    setIsCreatingRoom(true);
    setEditingRoom(freshRoom);
  };

  // Update specific booking status securely via the Admin API
  const handleModifyBookingStatus = async (
    bookingId: string, 
    status: 'pending' | 'confirmed' | 'cancelled',
    paymentStatus: 'pending' | 'paid' | 'failed'
  ) => {
    setActionLoading(`state-${bookingId}`);
    try {
      const response = await fetch('/api/admin/bookings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookingId, status, paymentStatus })
      });
      if (!response.ok) {
        throw new Error('Failed to update user booking details.');
      }
      showFeedback('success', `Booking registration ${bookingId} updated to Status: ${status} / Payment: ${paymentStatus}`);
      await loadAllData();
    } catch (err) {
      showFeedback('error', 'Failed to update user booking details. Insufficient cloud permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateBookingFull = async (updated: Booking) => {
    setActionLoading(`state-${updated.id}`);
    try {
      const response = await fetch('/api/admin/bookings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: updated.id,
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          paymentMethod: updated.paymentMethod,
          guestName: updated.guestName,
          guestEmail: updated.guestEmail,
          checkIn: updated.checkIn,
          checkOut: updated.checkOut,
          roomCount: updated.roomCount,
          totalPrice: updated.totalPrice
        })
      });
      if (!response.ok) {
        throw new Error('Failed to update reservation details.');
      }
      showFeedback('success', `Reservation ${updated.id} updated successfully.`);
      setEditingBooking(null);
      await loadAllData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update reservation.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 bg-white border border-[#E5E2DA] p-6 sm:p-8 rounded-3xl shadow-sm transition-all" id="admin-hub-main">
      
      {/* Dynamic Notifications Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-sans ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-grow">
              <span className="font-bold block">Administrative notification</span>
              <span className="block mt-0.5 font-medium leading-relaxed">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="cursor-pointer text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2DA] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#5B6D5B]/10 rounded-full text-[10px] font-bold text-[#5B6D5B] tracking-widest uppercase font-mono">
              Admin Portal
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif italic font-bold tracking-tight text-[#33332D] mt-2">
            Interactive Control Center
          </h2>
          <p className="text-xs text-[#8E8E82] font-sans mt-1">
            Reconfigure wings, upload videos/images, add custom suites, or manage user itinerary booking files live.
          </p>
        </div>

        <button
          onClick={onBack}
          className="self-start md:self-auto px-5 py-2.5 border border-[#E5E2DA] hover:bg-[#F9F8F6] rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 text-[#33332D]"
        >
          <X className="w-4 h-4 text-red-500" />
          <span>Exit Admin Hub</span>
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-gray-100 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'System Overview', icon: Sliders },
          { id: 'sections', label: 'Manage Sections', icon: ImageIcon },
          { id: 'rooms', label: 'Manage Offerings & Suites', icon: Package },
          { id: 'bookings', label: 'Reservations Ledger', icon: CalendarDays },
          { id: 'settings', label: 'System Settings', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingHotel(null);
                setEditingRoom(null);
                setIsCreatingRoom(false);
              }}
              className={`py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#5B6D5B] text-white shadow-xs font-bold'
                  : 'text-[#8E8E82] hover:text-[#33332D] hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LOADING CHANNELS */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-[#5B6D5B] animate-spin" />
          <p className="text-xs text-[#8E8E82] font-mono animate-pulse">Syncing Cloud Firebase Registries...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: SYSTEM OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-[#E5E2DA] p-5 rounded-3xl bg-[#F9F8F6]">
                  <Sliders className="w-5 h-5 text-[#5B6D5B] mb-3" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8E8E82] block">Front Page Sections</span>
                  <span className="text-3xl font-serif italic font-bold text-[#33332D] block mt-1">{hotels.length} Sections</span>
                </div>

                <div className="border border-[#E5E2DA] p-5 rounded-3xl bg-[#F9F8F6]">
                  <Package className="w-5 h-5 text-amber-700 mb-3" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8E8E82] block">Suites & Slot Templates</span>
                  <span className="text-3xl font-serif italic font-bold text-[#33332D] block mt-1">{rooms.length} Offered</span>
                </div>

                <div className="border border-[#E5E2DA] p-5 rounded-3xl bg-[#F9F8F6]">
                  <CalendarDays className="w-5 h-5 text-indigo-700 mb-3" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#8E8E82] block">Total Travel Bookings</span>
                  <span className="text-3xl font-serif italic font-bold text-[#33332D] block mt-1">{bookings.length} Orders</span>
                </div>
              </div>

              {/* Recovery Box */}
              <div className="border border-amber-200/60 bg-amber-50/20 p-6 rounded-3xl space-y-4">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-serif font-bold text-[#33332D] text-sm">Factory Calibration Recovery</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Did you delete default offerings or want to clear customized image tests to revert to the beautiful, curated high-quality Unsplash stock templates? Re-run the hotel seed script dynamically with one single click. This guarantees stable listings while keeping booking history records preserved.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFactoryReset}
                  disabled={actionLoading === 'reset'}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2"
                >
                  {actionLoading === 'reset' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>Recover Seed Defaults</span>
                </button>
              </div>

              {/* Informative block */}
              <div className="p-6 bg-[#F9F8F6] border border-[#E5E2DA] rounded-3xl text-xs space-y-2 font-sans">
                <h4 className="font-bold text-[#33332D]">Understanding Upload Formats:</h4>
                <ul className="list-disc list-inside space-y-1.5 text-gray-500">
                  <li><strong>Instant Files Uploading:</strong> Click any Upload Icon to select images/videos from your local hard drive. They will be uploaded and stored securely on backend disk directories.</li>
                  <li><strong>Support for Videos:</strong> In addition to Unsplash photos, you can upload video components or paste full video paths. Video URLs ending on <code className="font-mono bg-white px-1 py-0.5 rounded text-red-600">.mp4</code> structure will automatically trigger high-fidelity HTML5 rendering with soundless loop playbacks.</li>
                  <li><strong>Persistence Constraints:</strong> Updates will write to Firestore. Security policies allow direct edits carried on by validated administrators. Ensure your authentication session is active.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE SEC-HOTELS */}
          {activeTab === 'sections' && (
            <div className="space-y-6 animate-fade-in">
              {editingHotel ? (
                // EDITING SECTION SCREEN
                <div className="border border-[#E5E2DA] p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-4 flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif italic font-bold text-lg text-[#33332D]">
                          Update Field: "{editingHotel.name}"
                        </h3>
                        {(() => {
                          const badge = getCategoryBadge(editingHotel.id);
                          return (
                            <span className={`px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[10px] text-gray-400">Section Code: <code className="font-mono text-indigo-600 font-bold bg-indigo-50/50 px-1 py-0.5 rounded">{editingHotel.id}</code></p>
                    </div>
                    <button
                      onClick={() => setEditingHotel(null)}
                      className="text-xs text-[#8E8E82] hover:text-[#33332D] flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <X className="w-4 h-4" /> Cancel Edits
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Section Name</label>
                        <input
                          type="text"
                          value={editingHotel.name}
                          onChange={(e) => setEditingHotel({ ...editingHotel, name: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Physical Coordination Location</label>
                        <input
                          type="text"
                          value={editingHotel.location}
                          onChange={(e) => setEditingHotel({ ...editingHotel, location: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Rating Score (0 to 5.0)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={editingHotel.rating}
                            onChange={(e) => setEditingHotel({ ...editingHotel, rating: parseFloat(e.target.value) })}
                            className="flex-growaccent-[#5B6D5B]"
                          />
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-1 rounded-sm">{editingHotel.rating}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Description Content text</label>
                        <textarea
                          rows={4}
                          value={editingHotel.description}
                          onChange={(e) => setEditingHotel({ ...editingHotel, description: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6] leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Media selector */}
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Primary Section Media URL</label>
                        <textarea
                          rows={2}
                          value={editingHotel.image}
                          onChange={(e) => setEditingHotel({ ...editingHotel, image: e.target.value })}
                          placeholder="Paste stock Unsplash photo URL or uploaded local path..."
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6] font-mono"
                        />
                      </div>

                      {/* File Upload Box (Interactive Drag & Drop) */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingSection(true); }}
                        onDragLeave={() => setIsDraggingSection(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setIsDraggingSection(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            await uploadFile(file, (url, uploadedFile) => {
                              const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                              setEditingHotel({ ...editingHotel, image: finalUrl });
                            });
                          }
                        }}
                        className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer relative transition-all duration-200 ${
                          isDraggingSection 
                            ? 'border-[#5B6D5B] bg-[#5B6D5B]/5 scale-[1.01] shadow-xs' 
                            : 'border-[#E5E2DA] bg-gray-50/50 hover:bg-[#F9F8F6] hover:border-[#5B6D5B]'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileUpload(e, (url, uploadedFile) => {
                            // Detect if uploaded file is video
                            const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                            setEditingHotel({ ...editingHotel, image: finalUrl });
                          })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          title="Click or drag media here"
                        />
                        <Upload className={`w-5 h-5 transition-transform ${isDraggingSection ? 'text-[#5B6D5B] scale-110' : 'text-gray-400'}`} />
                        <div>
                          <span className="text-xs font-bold block text-gray-700">
                            {isDraggingSection ? 'Drop file to upload!' : 'Drag & Drop Media Here'}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">or click to upload image/video (25MB limit)</span>
                        </div>
                        {uploadProgress !== null && (
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1 max-w-[150px]">
                            <div className="bg-[#5B6D5B] h-full" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                      </div>

                      {/* Suggestions and Staged Thumbnail Assets Panel */}
                      <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-sans font-bold text-[#33332D] uppercase tracking-wider">Aesthetic Suggestion Presets</span>
                          <span className="text-[9px] text-[#8E8E82]">Click to instantly apply swap</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {(
                            (() => {
                              const suggestions: Record<string, string[]> = {
                                sec_front_view: [
                                  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_rooms_upstairs: [
                                  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_rooms_downstairs: [
                                  'https://images.unsplash.com/photo-1611891487122-207579d67d98?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_bar: [
                                  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1436018626274-89acd67ae29e?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_vip_club: [
                                  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1570872626485-d8ffea697003?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1481162854517-d9e353af153d?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_indoor_snooker: [
                                  'https://images.unsplash.com/photo-1542124749-d05b8cddeb41?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1536152470836-b943b246224c?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_outdoor_snooker: [
                                  'https://images.unsplash.com/photo-1542124749-d05b8cddeb41?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1536152470836-b943b246224c?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_swimming_pool: [
                                  'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1566073771-80760a0fb0cf?auto=format&fit=crop&q=80&w=200'
                                ],
                                sec_kitchen: [
                                  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&q=80&w=200',
                                  'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=200'
                                ]
                              };
                              return suggestions[editingHotel.id] || suggestions['sec_front_view'];
                            })()
                          ).map((pUrl, pIdx) => (
                            <div 
                              key={pIdx} 
                              onClick={() => {
                                setEditingHotel({ ...editingHotel, image: pUrl });
                                showFeedback('success', 'Applied aesthetic preset option to section cover!');
                              }}
                              className={`aspect-video rounded-lg overflow-hidden border cursor-pointer hover:border-[#5B6D5B] transition-all hover:scale-[1.03] flex items-center justify-center ${
                                editingHotel.image === pUrl ? 'border-[#5B6D5B] border-2 ring-2 ring-[#5B6D5B]/10' : 'border-gray-200'
                              }`}
                            >
                              <img src={pUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Media preview */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-[#33332D] block">Media Preview:</span>
                        <div className="aspect-video w-full rounded-2xl bg-gray-50 border border-gray-150 overflow-hidden relative flex items-center justify-center">
                          {isMediaVideo(editingHotel.image) ? (
                            <video
                              src={cleanMediaUrl(editingHotel.image)}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : editingHotel.image ? (
                            <img
                              src={editingHotel.image}
                              alt="Section Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <HelpCircle className="w-8 h-8 text-gray-300" />
                          )}
                          <span className="absolute bottom-2.5 right-2.5 px-2 bg-black/60 text-white font-mono rounded text-[9px] uppercase tracking-wider py-0.5 flex items-center gap-1.5">
                            {isMediaVideo(editingHotel.image) ? (
                              <>
                                <Video className="w-3 h-3 text-red-400" /> Video
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3 text-emerald-400" /> Photo
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Amenities Tag Manager */}
                  <div className="border border-gray-100 p-5 rounded-2xl space-y-3 font-sans">
                    <label className="text-xs font-bold text-[#33332D] block">Default Facilities & Featured Amenities</label>
                    <div className="flex flex-wrap gap-1.5">
                      {editingHotel.amenities.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 py-1 px-2.5 bg-gray-50 border border-gray-200 text-[#33332D] rounded-full text-[10px] tracking-wide font-medium">
                          <span>{item}</span>
                          <button 
                            onClick={() => handleRemoveHotelAmenity(idx)}
                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 max-w-sm mt-2">
                      <input
                        id="new-amenity-section-inp"
                        type="text"
                        placeholder="e.g. Free Cabanas..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.currentTarget as HTMLInputElement).value;
                            handleAddHotelAmenity(val);
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-grow border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const inp = document.getElementById('new-amenity-section-inp') as HTMLInputElement;
                          if (inp) {
                            handleAddHotelAmenity(inp.value);
                            inp.value = '';
                          }
                        }}
                        className="px-3 bg-gray-100 hover:bg-[#5B6D5B] hover:text-white rounded-lg text-xs cursor-pointer font-bold transition-all"
                      >
                        Append
                      </button>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex justify-end gap-3 border-t border-gray-150 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingHotel(null)}
                      className="px-5 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSaveHotel(editingHotel)}
                      disabled={actionLoading === editingHotel.id}
                      className="px-6 py-2 bg-[#5B6D5B] hover:bg-[#4a5a4a] disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === editingHotel.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Commit and Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                // LIST OF ALL 9 SECTIONS grouped into requested categories
                <div className="space-y-6">
                  <div className="p-4 border border-amber-100 bg-amber-50/10 rounded-2xl text-xs flex gap-2.5 text-amber-850 font-sans shadow-2xs">
                    <Sliders className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-700 animate-pulse" />
                    <div className="space-y-1">
                      <span className="font-bold block text-[#33332D]">Dynamic Hotel Sections Control Desk</span>
                      <span className="block text-gray-600 leading-relaxed">
                        Update imagery, descriptions, naming, and amenity specs for the crucial areas of the DanVilla system. Select a category below to isolate the specific area (such as Front View, Guest Rooms, Jazz Bar, VIP Club, Snooker Yards, Pool, or Chef Kitchen), or edit them altogether. Updates are saved instantly to the cloud Firestore backend database.
                      </span>
                    </div>
                  </div>

                  {/* High fidelity horizontal sub-tab category filter */}
                  <div className="flex bg-gray-100/75 p-1 rounded-2xl gap-1 overflow-x-auto select-none no-scrollbar border border-gray-150">
                    {[
                      { id: 'all', label: 'All Wings', count: hotels.length },
                      { id: 'front_view', label: 'Front View', count: hotels.filter(h => getHotelCategory(h.id) === 'front_view').length },
                      { id: 'rooms', label: 'Luxury Rooms', count: hotels.filter(h => getHotelCategory(h.id) === 'rooms').length },
                      { id: 'bar', label: 'Jazz Bar', count: hotels.filter(h => getHotelCategory(h.id) === 'bar').length },
                      { id: 'vip_club', label: 'VIP Club', count: hotels.filter(h => getHotelCategory(h.id) === 'vip_club').length },
                      { id: 'snooker', label: 'Snooker Yards', count: hotels.filter(h => getHotelCategory(h.id) === 'snooker').length },
                      { id: 'pool', label: 'Swimming Pool', count: hotels.filter(h => getHotelCategory(h.id) === 'pool').length },
                      { id: 'kitchen', label: 'Chef Kitchen', count: hotels.filter(h => getHotelCategory(h.id) === 'kitchen').length },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`py-2 px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0 border ${
                          selectedCategory === cat.id
                            ? 'bg-white text-[#5B6D5B] border-gray-200/50 shadow-xs'
                            : 'text-gray-500 hover:text-gray-950 border-transparent hover:bg-white/45'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === cat.id ? 'bg-[#5B6D5B]' : 'bg-gray-300'}`} />
                        <span>{cat.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-mono leading-none ${
                          selectedCategory === cat.id ? 'bg-[#5B6D5B]/10 text-[#5B6D5B]' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const filteredHotels = selectedCategory === 'all' 
                        ? hotels 
                        : hotels.filter(h => getHotelCategory(h.id) === selectedCategory);
                      
                      return filteredHotels.map((hotel) => (
                        <div 
                          key={hotel.id} 
                          className="bg-gray-50/50 hover:bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl overflow-hidden flex flex-col justify-between"
                        >
                          <div className="flex gap-4 p-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative shadow-inner">
                              {isMediaVideo(hotel.image) ? (
                                <video src={cleanMediaUrl(hotel.image)} className="w-full h-full object-cover" />
                              ) : (
                                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 text-[7px] text-white tracking-widest uppercase rounded">
                                {isMediaVideo(hotel.image) ? 'Video' : 'Photo'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[#8E8E82] block">{hotel.location}</span>
                                <span className={`px-1.5 py-0.2 text-[7px] font-bold uppercase rounded-sm ${getCategoryBadge(hotel.id).color}`}>
                                  {getCategoryBadge(hotel.id).label}
                                </span>
                              </div>
                              <h4 className="font-serif italic font-bold text-sm text-[#33332D] leading-tight mt-0.5">{hotel.name}</h4>
                              <p className="text-[10px] text-gray-500 line-clamp-2 max-w-sm">{hotel.description}</p>
                            </div>
                          </div>

                          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-mono">Rating Score: {hotel.rating} / 5.0</span>
                            <button
                              onClick={() => setEditingHotel({ ...hotel })}
                              className="bg-gray-50 hover:bg-[#5B6D5B] text-gray-600 hover:text-white border border-[#E5E2DA] hover:border-[#5B6D5B] px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                            >
                              Edit Imagery & Text
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANAGE OFFERINGS & SUITES */}
          {activeTab === 'rooms' && (
            <div className="space-y-6 animate-fade-in">
              {editingRoom ? (
                // EDITING OR CREATING A ROOM
                <div className="border border-[#E5E2DA] p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                    <h3 className="font-serif italic font-bold text-lg text-[#33332D]">
                      {isCreatingRoom ? 'Form: Create New Offering' : `Form: Edit "${editingRoom.name}"`}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingRoom(null);
                        setIsCreatingRoom(false);
                      }}
                      className="text-xs text-[#8E8E82] hover:text-[#33332D] flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <X className="w-4 h-4" /> Cancel Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Target Homepage Section (Wing)</label>
                        <select
                          disabled={!isCreatingRoom}
                          value={editingRoom.hotelId}
                          onChange={(e) => setEditingRoom({ ...editingRoom, hotelId: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6] font-semibold"
                        >
                          {hotels.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Offering Name</label>
                        <input
                          type="text"
                          value={editingRoom.name}
                          onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6]"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#33332D] block mb-1.5">Price Per Night (₦)</label>
                          <input
                            type="number"
                            value={editingRoom.pricePerNight}
                            onChange={(e) => setEditingRoom({ ...editingRoom, pricePerNight: parseInt(e.target.value) || 0 })}
                            className="w-full border border-[#E5E2DA] rounded-xl px-3 py-1.5 text-xs bg-[#F9F8F6] font-bold text-amber-800"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#33332D] block mb-1.5">Max Occupancy</label>
                          <input
                            type="number"
                            value={editingRoom.capacity}
                            onChange={(e) => setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) || 1 })}
                            className="w-full border border-[#E5E2DA] rounded-xl px-3 py-1.5 text-xs bg-[#F9F8F6] font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#33332D] block mb-1.5">Total Inventory</label>
                          <input
                            type="number"
                            value={editingRoom.totalInventory}
                            onChange={(e) => setEditingRoom({ ...editingRoom, totalInventory: parseInt(e.target.value) || 1 })}
                            className="w-full border border-[#E5E2DA] rounded-xl px-3 py-1.5 text-xs bg-[#F9F8F6] font-mono text-indigo-700 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Offering Description</label>
                        <textarea
                          rows={4}
                          value={editingRoom.description}
                          onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6] leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Media URL */}
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Primary Suite Media URL (Image or Video)</label>
                        <textarea
                          rows={2}
                          value={editingRoom.image}
                          onChange={(e) => setEditingRoom({ ...editingRoom, image: e.target.value })}
                          placeholder="Unsplash URL, YouTube, or direct upload file path..."
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2 text-xs bg-[#F9F8F6] font-mono"
                        />
                      </div>

                      {/* File Upload Trigger (Interactive Drag & Drop) */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingRoomMain(true); }}
                        onDragLeave={() => setIsDraggingRoomMain(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setIsDraggingRoomMain(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            await uploadFile(file, (url, uploadedFile) => {
                              const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                              setEditingRoom({ ...editingRoom, image: finalUrl });
                            });
                          }
                        }}
                        className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer relative transition-all duration-200 ${
                          isDraggingRoomMain 
                            ? 'border-[#5B6D5B] bg-[#5B6D5B]/5 scale-[1.01] shadow-xs' 
                            : 'border-[#E5E2DA] bg-gray-50/50 hover:bg-[#F9F8F6] hover:border-[#5B6D5B]'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileUpload(e, (url, uploadedFile) => {
                            const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                            setEditingRoom({ ...editingRoom, image: finalUrl });
                          })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          title="Click or drag media here"
                        />
                        <Upload className={`w-5 h-5 transition-transform ${isDraggingRoomMain ? 'text-[#5B6D5B] scale-110' : 'text-gray-400'}`} />
                        <div>
                          <span className="text-xs font-bold block text-gray-700">
                            {isDraggingRoomMain ? 'Drop cover file!' : 'Drag & Drop Cover Photo'}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">or click to upload main room media (25MB limit)</span>
                        </div>
                        {uploadProgress !== null && (
                          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-1 max-w-[150px]">
                            <div className="bg-[#5B6D5B] h-full" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                      </div>

                      {/* Display Preview */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-[#33332D] block">Media Preview:</span>
                        <div className="aspect-video w-full rounded-2xl bg-gray-50 border border-gray-150 overflow-hidden relative flex items-center justify-center">
                          {isMediaVideo(editingRoom.image) ? (
                            <video
                              src={cleanMediaUrl(editingRoom.image)}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : editingRoom.image ? (
                            <img
                              src={editingRoom.image}
                              alt="Suite Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <HelpCircle className="w-8 h-8 text-gray-300" />
                          )}
                          <span className="absolute bottom-2.5 right-2.5 px-2 bg-black/60 text-white font-mono rounded text-[9px] uppercase tracking-wider py-0.5 flex items-center gap-1.5">
                            {isMediaVideo(editingRoom.image) ? (
                              <>
                                <Video className="w-3 h-3 text-red-400" /> Video
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3 text-emerald-400" /> Photo
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STUDIO MEDIA ASSETS GALLERY HUB & LIGHTBOX SLIDESHOW DIRECTORY */}
                  <div className="p-5 border border-gray-100 rounded-3xl bg-gray-50/50 space-y-4 font-sans">
                    <div>
                      <h4 className="font-bold text-sm text-[#33332D] flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Interactive Media Studio Hub
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Below is a live thumbnail gallery of all multimedia files attached to this accommodation. Assign roles (Cover Image vs. Slideshow Slide) easily before finalizing updates.</p>
                    </div>

                    {/* ACTIVE STUDIO GALLERY HUB */}
                    <div className="border border-indigo-100 bg-white/70 p-4 rounded-2xl space-y-3 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest block">Staged Accommodation Visuals</span>
                        <span className="text-[9px] text-[#8E8E82] font-mono">{(editingRoom.image ? 1 : 0) + (editingRoom.images || []).length} items configured</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Primary Cover Image Thumbnail */}
                        {editingRoom.image && (
                          <div className="border-2 border-[#5B6D5B] bg-white p-2 rounded-xl relative group shadow-2xs transition-transform hover:scale-[1.01]">
                            <span className="absolute top-1.5 left-1.5 bg-[#5B6D5B] text-white px-2 py-0.5 text-[8px] font-bold rounded-sm tracking-wide z-10 uppercase">
                              Primary Cover
                            </span>

                            <div className="aspect-video w-full rounded-lg bg-gray-50 overflow-hidden relative flex items-center justify-center">
                              {isMediaVideo(editingRoom.image) ? (
                                <video src={cleanMediaUrl(editingRoom.image)} className="w-full h-full object-cover" />
                              ) : (
                                <img src={editingRoom.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/60 text-[7px] text-white px-1 font-mono rounded-xs uppercase">
                                {isMediaVideo(editingRoom.image) ? 'Video' : 'Photo'}
                              </span>
                            </div>

                            <span className="text-[8px] font-mono text-gray-400 truncate block mt-1.5 text-center">{editingRoom.image}</span>
                            
                            <div className="mt-1 flex gap-1 pt-1 border-t border-gray-100 justify-center">
                              <span className="text-[7px] font-bold text-gray-400 tracking-wider uppercase">Active Showcase Banner</span>
                            </div>
                          </div>
                        )}

                        {/* Slide items thumbnails list */}
                        {(editingRoom.images || []).map((slide, sIdx) => (
                          <div key={sIdx} className="border border-gray-250 bg-white p-2 rounded-xl relative group/item hover:border-indigo-300 transition-all hover:scale-[1.01] shadow-3xs">
                            <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white px-1.5 py-0.5 text-[7px] font-bold rounded-sm z-10 uppercase tracking-wide">
                              Gallery Slide
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(editingRoom.images || [])];
                                list.splice(sIdx, 1);
                                setEditingRoom({ ...editingRoom, images: list });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full hover:scale-105 shadow z-15 cursor-pointer"
                              title="Delete Slide Image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            <div className="aspect-video w-full rounded-lg bg-gray-50 overflow-hidden relative flex items-center justify-center">
                              {isMediaVideo(slide) ? (
                                <video src={cleanMediaUrl(slide)} className="w-full h-full object-cover" />
                              ) : (
                                <img src={slide} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/60 text-[7px] text-white px-1 font-mono rounded-sm uppercase">
                                {isMediaVideo(slide) ? 'Video' : 'Photo'}
                              </span>
                            </div>

                            <span className="text-[8px] font-mono text-gray-400 truncate block mt-1.5 text-center">{slide}</span>

                            <div className="mt-1 flex gap-1 justify-between pt-1 border-t border-gray-100">
                              {/* Option to Swap Role: make primary */}
                              <button
                                type="button"
                                onClick={() => {
                                  const oldPrimary = editingRoom.image;
                                  const list = [...(editingRoom.images || [])];
                                  if (oldPrimary) {
                                    list[sIdx] = oldPrimary;
                                  } else {
                                    list.splice(sIdx, 1);
                                  }
                                  setEditingRoom({
                                    ...editingRoom,
                                    image: slide,
                                    images: list
                                  });
                                  showFeedback('success', 'Promoted to primary cover role! Swapped with slideshow list');
                                }}
                                className="w-full py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[7.5px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                              >
                                Set as Cover
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Interactive Drag and Drop Upload Card Inside Grid */}
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingRoomGallery(true); }}
                          onDragLeave={() => setIsDraggingRoomGallery(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setIsDraggingRoomGallery(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              await uploadFile(file, (url, uploadedFile) => {
                                const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                                const current = editingRoom.images || [];
                                setEditingRoom({ ...editingRoom, images: [...current, finalUrl] });
                              });
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center min-h-[110px] relative transition-all duration-200 cursor-pointer ${
                            isDraggingRoomGallery 
                              ? 'border-indigo-600 bg-indigo-50/50 scale-[1.02] shadow-sm' 
                              : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-400'
                          }`}
                        >
                          <Plus className={`w-5 h-5 mb-1 transition-transform ${isDraggingRoomGallery ? 'text-indigo-600 scale-110' : 'text-gray-400'}`} />
                          <span className="text-[10px] font-bold text-gray-600 block">
                            {isDraggingRoomGallery ? 'Drop to Add!' : 'Drag / Upload'}
                          </span>
                          <span className="text-[8px] text-gray-400 block mt-0.5">Slideshow Slide</span>
                          
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => handleFileUpload(e, (url, uploadedFile) => {
                              const finalUrl = uploadedFile?.type?.startsWith('video/') ? `video:${url}` : url;
                              const current = editingRoom.images || [];
                              setEditingRoom({ ...editingRoom, images: [...current, finalUrl] });
                            })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            title="Upload new item into room slideshow gallery"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick paste web URL area */}
                    <div className="flex gap-2 max-w-lg bg-white border border-gray-150 rounded-xl p-1.5 shadow-2xs items-center">
                      <Plus className="w-4 h-4 text-indigo-500 shrink-0 ml-1.5" />
                      <input
                        id="web-gallery-url-post"
                        type="text"
                        placeholder="Paste stock Unsplash photo/video link..."
                        className="flex-grow pl-1 text-[11px] outline-hidden focus:ring-0 placeholder-gray-400 bg-transparent border-none"
                      />
                      <button
                        onClick={() => {
                          const inp = document.getElementById('web-gallery-url-post') as HTMLInputElement;
                          if (inp && inp.value.trim()) {
                            const list = editingRoom.images || [];
                            setEditingRoom({ ...editingRoom, images: [...list, inp.value.trim()] });
                            inp.value = '';
                          }
                        }}
                        className="py-1 px-3 bg-[#5B6D5B] text-white rounded-lg text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                      >
                        Append Link
                      </button>
                    </div>
                  </div>

                  {/* Room Amenities Tag Manager */}
                  <div className="border border-gray-100 p-5 rounded-3xl space-y-3 font-sans">
                    <label className="text-xs font-bold text-[#33332D] block">Signature Perks & Included Room Amenities</label>
                    <div className="flex flex-wrap gap-1.5">
                      {editingRoom.amenities.map((perp, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 py-1 px-2.5 bg-gray-50 border border-gray-200 text-[#33332D] rounded-full text-[10px] tracking-wide font-medium">
                          <span>{perp}</span>
                          <button 
                            onClick={() => {
                              const filtered = editingRoom.amenities.filter((_, rIdx) => rIdx !== idx);
                              setEditingRoom({ ...editingRoom, amenities: filtered });
                            }}
                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 max-w-sm mt-2">
                      <input
                        id="new-amenity-room-inp"
                        type="text"
                        placeholder="e.g. In-room Cinema..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.currentTarget as HTMLInputElement).value;
                            if (val.trim()) {
                              setEditingRoom({ ...editingRoom, amenities: [...editingRoom.amenities, val.trim()] });
                              (e.currentTarget as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="flex-grow border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const inp = document.getElementById('new-amenity-room-inp') as HTMLInputElement;
                          if (inp && inp.value.trim()) {
                            setEditingRoom({ ...editingRoom, amenities: [...editingRoom.amenities, inp.value.trim()] });
                            inp.value = '';
                          }
                        }}
                        className="px-3 bg-gray-100 hover:bg-[#5B6D5B] hover:text-white rounded-lg text-xs cursor-pointer font-bold transition-all"
                      >
                        Append
                      </button>
                    </div>
                  </div>

                  {/* Commit footer */}
                  <div className="flex justify-between items-center border-t border-gray-150 pt-4">
                    {!isCreatingRoom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(editingRoom.id)}
                        disabled={actionLoading === `delete-${editingRoom.id}`}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Offering</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoom(null);
                          setIsCreatingRoom(false);
                        }}
                        className="px-5 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer animate-fade-in"
                      >
                        Cancel
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSaveRoom(editingRoom)}
                        className="px-6 py-2 bg-[#5B6D5B] hover:bg-[#4a5a4a] text-white text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        {actionLoading === (editingRoom.id || 'saving-room') ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm and Publish Suite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // LIST ROOMS ASSOCIATED TO SELECTED HOTEL
                <div className="space-y-6">
                  {/* Select target hotel section wing */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Select DanVilla Section</span>
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedHotelId}
                          onChange={(e) => setSelectedHotelId(e.target.value)}
                          className="border border-[#E5E2DA] rounded-xl px-3 py-1.5 text-xs bg-white font-bold cursor-pointer"
                        >
                          {hotels.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleInitCreateRoom}
                      className="px-4 py-2 bg-[#5B6D5B] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 hover:scale-102"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Suite Offering</span>
                    </button>
                  </div>

                  {/* Rooms list */}
                  <div className="grid grid-cols-1 gap-4 font-sans">
                    {rooms.filter(r => r.hotelId === selectedHotelId).map((room) => (
                      <div 
                        key={room.id}
                        className="bg-white border border-[#E5E2DA] hover:border-gray-300 rounded-2xl overflow-hidden flex flex-col sm:flex-row justify-between"
                      >
                        <div className="flex gap-4 p-4 items-start">
                          <div className="w-24 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 relative">
                            {isMediaVideo(room.image) ? (
                              <video src={cleanMediaUrl(room.image)} className="w-full h-full object-cover" />
                            ) : (
                              <img src={room.image} alt={room.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                            <span className="absolute bottom-1 right-1 bg-black/60 p-0.5 text-[7px] text-white tracking-widest uppercase rounded">
                              {isMediaVideo(room.image) ? 'Video' : 'Photo'}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-serif italic font-bold text-sm text-[#33332D] leading-tight">{room.name}</h4>
                            <p className="text-[10px] text-gray-500 line-clamp-2 max-w-xl">{room.description}</p>
                            <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 font-medium">
                              <span className="bg-gray-100 px-2 py-0.5 rounded-sm text-amber-700 font-bold">Price: ₦{room.pricePerNight} / night</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-sm">Cap: {room.capacity} guest(s)</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-sm">Inventory limits: {room.totalInventory} slots</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-sm font-bold text-[#5B6D5B]">{getRoomImages(room).length} photos/videos</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-4 py-3 sm:py-0 bg-gray-50/50 sm:bg-transparent border-t sm:border-t-0 sm:border-l border-gray-100 flex sm:flex-col justify-center gap-2 shrink-0 items-center justify-between">
                          <button
                            onClick={() => {
                              setIsCreatingRoom(false);
                              setEditingRoom({ ...room });
                            }}
                            className="bg-[#5B6D5B] hover:bg-[#455245] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                          >
                            Edit Properties
                          </button>
                        </div>
                      </div>
                    ))}

                    {rooms.filter(r => r.hotelId === selectedHotelId).length === 0 && (
                      <div className="text-center py-12 border border-dashed border-gray-200 rounded-3xl text-[#8E8E82] text-xs">
                        No Suite Offerings registered yet under this Section. Create one using the button above.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESERVATIONS LEDGER */}
          {activeTab === 'bookings' && (
            <div className="space-y-6 animate-fade-in font-sans">
              {editingBooking ? (
                <div className="border border-[#E5E2DA] p-6 rounded-3xl space-y-6 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                    <h3 className="font-serif italic font-bold text-lg text-[#33332D]">
                      Form: Edit Reservation Details ({editingBooking.id})
                    </h3>
                    <button
                      onClick={() => setEditingBooking(null)}
                      className="text-xs text-[#8E8E82] hover:text-[#33332D] flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <X className="w-4 h-4" /> Cancel Selection
                    </button>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateBookingFull(editingBooking);
                  }} className="space-y-4 text-xs font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Guest Name</label>
                        <input
                          type="text"
                          required
                          value={editingBooking.guestName || ''}
                          onChange={(e) => setEditingBooking({ ...editingBooking, guestName: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] text-[#33332D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Guest Email</label>
                        <input
                          type="email"
                          required
                          value={editingBooking.guestEmail || ''}
                          onChange={(e) => setEditingBooking({ ...editingBooking, guestEmail: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] text-[#33332D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Check-In Date</label>
                        <input
                          type="text"
                          required
                          placeholder="YYYY-MM-DD"
                          value={editingBooking.checkIn}
                          onChange={(e) => setEditingBooking({ ...editingBooking, checkIn: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] font-mono text-[#33332D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Check-Out Date</label>
                        <input
                          type="text"
                          required
                          placeholder="YYYY-MM-DD"
                          value={editingBooking.checkOut}
                          onChange={(e) => setEditingBooking({ ...editingBooking, checkOut: e.target.value })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] font-mono text-[#33332D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Room Count</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={editingBooking.roomCount}
                          onChange={(e) => setEditingBooking({ ...editingBooking, roomCount: parseInt(e.target.value) || 1 })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] font-bold text-[#33332D]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Agreement Total Charge (₦)</label>
                        <input
                          type="number"
                          required
                          value={editingBooking.totalPrice}
                          onChange={(e) => setEditingBooking({ ...editingBooking, totalPrice: parseInt(e.target.value) || 0 })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] font-bold text-amber-800 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Payment Method Preference</label>
                        <select
                          value={editingBooking.paymentMethod || 'card'}
                          onChange={(e) => setEditingBooking({ ...editingBooking, paymentMethod: e.target.value as any })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] text-[#33332D] font-bold"
                        >
                          <option value="card">Secure Card Pay</option>
                          <option value="bank_transfer">Sterling Bank Transfer</option>
                          <option value="cash">Pay Cash on Arrival</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Reservation Status</label>
                        <select
                          value={editingBooking.status}
                          onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] text-[#33332D] font-bold"
                        >
                          <option value="pending">pending (Waiting)</option>
                          <option value="confirmed">confirmed (Live)</option>
                          <option value="cancelled">cancelled (Void)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#33332D] block mb-1.5">Verification Payment Status</label>
                        <select
                          value={editingBooking.paymentStatus}
                          onChange={(e) => setEditingBooking({ ...editingBooking, paymentStatus: e.target.value as any })}
                          className="w-full border border-[#E5E2DA] rounded-xl px-3.5 py-2.5 bg-[#F9F8F6] text-[#33332D] font-bold"
                        >
                          <option value="pending">pending</option>
                          <option value="paid">paid (settled)</option>
                          <option value="failed">failed</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150">
                      <button
                        type="button"
                        onClick={() => setEditingBooking(null)}
                        className="py-2.5 px-5 border border-[#E5E2DA] bg-white text-neutral-500 rounded-full font-bold cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        Nevermind, Go Back
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading === `state-${editingBooking.id}`}
                        className="py-2.5 px-6 bg-[#5B6D5B] hover:bg-[#455245] text-white rounded-full font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs border-b-2 border-red-600"
                      >
                        {actionLoading === `state-${editingBooking.id}` ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          'Commit Reservation Overrides'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-2xl text-xs flex gap-2.5 text-indigo-800 animate-fade-in">
                    <CalendarDays className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>The reservations list below represents a live, reactive window into traveler bookings. Update states, confirm settlement billing, or cancel itineraries directly in Firestore.</span>
                  </div>

                  {/* Ledger Table */}
              <div className="border border-[#E5E2DA] rounded-3xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9F8F6] border-b border-[#E5E2DA] text-[#8E8E82] font-mono uppercase text-[9px] tracking-widest">
                      <tr>
                        <th className="p-4">Itinerary ID</th>
                        <th className="p-4">Customer Details</th>
                        <th className="p-4">Suite / Section</th>
                        <th className="p-4">Stay Dates</th>
                        <th className="p-4">Financials</th>
                        <th className="p-4">Order Status</th>
                        <th className="p-4">Actions / Settlement Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-[#33332D]">
                      {bookings.map((book) => {
                        const roomName = rooms.find(r => r.id === book.roomId)?.name || 'Custom Suite';
                        const secName = hotels.find(h => h.id === book.hotelId)?.name || 'DanVilla Section';
                        return (
                          <tr key={book.id} className="hover:bg-gray-50/50">
                            <td className="p-4 font-mono font-bold text-[#8E8E82]">
                              {book.id}
                            </td>
                            <td className="p-4 space-y-0.5">
                              <span className="font-bold block text-gray-800">{book.guestName || 'Valued Guest'}</span>
                              <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">{book.guestEmail || book.userEmail}</span>
                            </td>
                            <td className="p-4 space-y-0.5">
                              <span className="font-serif italic font-bold block text-gray-700">{roomName}</span>
                              <span className="text-[10px] text-gray-400 block tracking-widest font-bold uppercase">{secName}</span>
                            </td>
                            <td className="p-4 text-[10px] font-mono whitespace-nowrap space-y-0.5">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 block w-max">IN: {book.checkIn}</span>
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 block w-max">OUT: {book.checkOut}</span>
                            </td>
                            <td className="p-4 space-y-0.5">
                              <span className="font-bold text-amber-800 block">₦{book.totalPrice}</span>
                              <div className="flex flex-col gap-1">
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 w-max rounded-sm block font-bold ${
                                  book.paymentStatus === 'paid' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : book.paymentStatus === 'failed' 
                                    ? 'bg-rose-100 text-rose-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {book.paymentStatus === 'paid' ? 'SETTLED' : book.paymentStatus.toUpperCase()}
                                </span>
                                {book.paymentMethod && (
                                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-neutral-500 bg-neutral-100 px-1 py-0.5 rounded w-max block">
                                    {book.paymentMethod.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase ${
                                book.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : book.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {book.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setEditingBooking(book)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-[#5B6D5B] text-amber-800 hover:text-white rounded-md text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-colors"
                                >
                                  Edit Details
                                </button>

                                {book.status !== 'confirmed' && book.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleModifyBookingStatus(book.id, 'confirmed', 'paid')}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[9px] font-bold tracking-wider uppercase cursor-pointer"
                                  >
                                    Deem Paid
                                  </button>
                                )}

                                {book.status !== 'cancelled' ? (
                                  <button
                                    onClick={() => handleModifyBookingStatus(book.id, 'cancelled', 'failed')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[9px] font-bold tracking-wider uppercase cursor-pointer"
                                  >
                                    Void Itinerary
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleModifyBookingStatus(book.id, 'confirmed', 'paid')}
                                    className="px-2 py-1 bg-gray-100 hover:bg-[#5B6D5B] text-gray-600 hover:text-white rounded-md text-[9px] font-bold tracking-wider uppercase cursor-pointer"
                                  >
                                    Re-Confirm
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {bookings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-[#8E8E82] text-xs">
                            No reservations bookings found in Cloud database registries.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: SYSTEM CONFIGURATION SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 animate-fade-in"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-sans tracking-tight">System Configuration Settings</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Manage live gateway methods, direct bank properties, custom WhatsApp message templates, and sandboxes</p>
                </div>
              </div>

              {/* Status banner messages */}
              {settingsSuccessMsg && (
                <div id="settings-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMsg}</span>
                </div>
              )}
              {settingsErrorMsg && (
                <div id="settings-error-alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settingsErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Visual Settings Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Block 1: Gateway Toggles */}
                  <div className="border border-[#E5E2DA] p-6 rounded-3xl bg-[#F9F8F6] space-y-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-serif italic border-b border-[#E5E2DA] pb-2 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#5B6D5B]" />
                      Payment Method Handlers
                    </h4>
                    <p className="text-[11px] text-[#8E8E82] font-sans">Toggle payment preference paths dynamically. If any path is turned off, customers will not see it on their checkout screen.</p>
                    
                    <div className="space-y-3.5 pt-2">
                      {/* CARD TOGGLE */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">Credit/Debit Card Settlement</span>
                          <span className="text-[10px] text-gray-450 block">Gateway direct instant credit clearance (e.g. Stripe/Paystack imitation)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCardMethodsEnabled(!cardMethodsEnabled)}
                          className="focus:outline-hidden cursor-pointer"
                        >
                          {cardMethodsEnabled ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
                        </button>
                      </div>

                      {/* TRANSFER TOGGLE */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">Direct Bank transfer manual route</span>
                          <span className="text-[10px] text-gray-450 block">Permits customers to reserve units and complete transfer to designated account</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTransferMethodsEnabled(!transferMethodsEnabled)}
                          className="focus:outline-hidden cursor-pointer"
                        >
                          {transferMethodsEnabled ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
                        </button>
                      </div>

                      {/* CASH ROUTE TOGGLE */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">Pay Cash on Arrival</span>
                          <span className="text-[10px] text-gray-450 block">Holds reservation and handles currency settlement at resort lobby desk</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCashMethodsEnabled(!cashMethodsEnabled)}
                          className="focus:outline-hidden cursor-pointer"
                        >
                          {cashMethodsEnabled ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Beneficiary Direct Bank Properties */}
                  <div className="border border-[#E5E2DA] p-6 rounded-3xl bg-[#F9F8F6] space-y-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-serif italic border-b border-[#E5E2DA] pb-2 flex items-center gap-2">
                       <Landmark className="w-4 h-4 text-[#5B6D5B]" />
                      Direct Bank Transfer Properties
                    </h4>
                    
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Beneficiary Bank Name</label>
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. Guarantee Trust Bank"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Account Beneficiary Name</label>
                        <input
                          type="text"
                          required
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          placeholder="e.g. DanVilla Resorts International"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Beneficiary Account Number</label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 1024589364"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Block 3: corporate WhatsApp configuration */}
                  <div className="border border-[#E5E2DA] p-6 rounded-3xl bg-[#F9F8F6] space-y-4 lg:col-span-2">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-serif italic border-b border-[#E5E2DA] pb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#5B6D5B]" />
                      Priority Corporate WhatsApp Forward Link Configuration
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1 space-y-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">WhatsApp Telephone Number</label>
                          <input
                            type="text"
                            required
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 2348123456789"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                          />
                          <p className="text-[9px] text-gray-400 mt-1">Provide dial extension code prefix (no plus or spaces, eg. 2348123456789).</p>
                        </div>

                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5 text-[10px] text-blue-800 font-sans leading-relaxed">
                          <strong>💡 Template Placeholders Guide:</strong>
                          <p>You can inject standard parameters inside the template to format guest receipts dynamically:</p>
                          <ul className="list-disc pl-3 text-[9px] space-y-0.5 text-blue-700">
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{id}'}</code> - Unique reservation code</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{guestName}'}</code> - Main lead traveler name</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{guestEmail}'}</code> - Email record</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{hotelName}'}</code> - Wing section</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{roomName}'}</code> - Selected Suite offering</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{checkIn}'}</code> to <code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{checkOut}'}</code> - Stay limits</li>
                            <li><code className="bg-white px-0.5 rounded text-red-600 font-bold">{'{roomCount}'}</code> - Units Reserved quantity</li>
                            <li><code className="bg-white px-0.5 rounded text-red-605 font-bold">{'{totalPrice}'}</code> - Total cost (₦)</li>
                            <li><code className="bg-white px-0.5 rounded text-red-606 font-bold">{'{paymentMethod}'}</code> - Chosen payment mode</li>
                          </ul>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Receipt forward text message Template</label>
                        <textarea
                          required
                          rows={11}
                          value={whatsappTemplate}
                          onChange={(e) => setWhatsappTemplate(e.target.value)}
                          placeholder="Design template text message here..."
                          className="w-full p-3 font-mono border border-gray-200 rounded-xl text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Block 4: Custom Success Receipts Banner Styling */}
                  <div className="border border-[#E5E2DA] p-6 rounded-3xl bg-[#F9F8F6] space-y-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-serif italic border-b border-[#E5E2DA] pb-2 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#5B6D5B]" />
                      Payment Success Receipts Banner Styling
                    </h4>
                    
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Payment Approved Screen Title</label>
                        <input
                          type="text"
                          required
                          value={receiptSuccessTitle}
                          onChange={(e) => setReceiptSuccessTitle(e.target.value)}
                          placeholder="e.g. Lodging secured!"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Screen Description / Success Text Receipt</label>
                        <textarea
                          required
                          rows={4}
                          value={receiptSuccessMessage}
                          onChange={(e) => setReceiptSuccessMessage(e.target.value)}
                          placeholder="Write dynamic cleared narrative text description here..."
                          className="w-full p-3 border border-gray-200 rounded-lg text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Block 5: simulated checkout Sandbox properties */}
                  <div className="border border-[#E5E2DA] p-6 rounded-3xl bg-[#F9F8F6] space-y-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-serif italic border-b border-[#E5E2DA] pb-2 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#5B6D5B]" />
                      Simulated Gateway Checkout Sandbox Options
                    </h4>
                    
                    <div className="space-y-4">
                      {/* SIMULATE FORCE DECLINE */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-gray-800 block">Force decline card simulation</span>
                          <span className="text-[10px] text-gray-400 block">Forces gateway decline check regardless of card layout input</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSandboxSimulateDecline(!sandboxSimulateDecline)}
                          className="focus:outline-hidden cursor-pointer"
                        >
                          {sandboxSimulateDecline ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-gray-300" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Decline card Suffix</label>
                          <input
                            type="text"
                            required
                            maxLength={4}
                            value={sandboxDeclineCode}
                            onChange={(e) => setSandboxDeclineCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 4444"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                          />
                          <p className="text-[9px] text-gray-400 mt-1">Cards ending of this suffix will trigger simulated gate check decline.</p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-bold text-[#8E8E82] tracking-wider mb-1 font-sans">Simulated decline error explanation</label>
                          <input
                            type="text"
                            required
                            value={sandboxDeclineMessage}
                            onChange={(e) => setSandboxDeclineMessage(e.target.value)}
                            placeholder="Declined error message text..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-black bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Submit button bar */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-105">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-3 bg-[#5B6D5B] hover:bg-[#4A594A] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Synchronizing settings...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save and Deploy Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getRoomImages = (room: Room): string[] => {
  if (room.images && room.images.length > 0) return room.images;
  return room.image ? [room.image] : [];
};
