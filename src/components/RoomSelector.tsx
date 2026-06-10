import React, { useEffect, useState } from 'react';
import { Calendar, Users, Briefcase, Zap, Info, Loader2, X, ChevronLeft, ChevronRight, Maximize2, Video } from 'lucide-react';
import { Hotel, Room, RoomAvailabilityResponse } from '../types';
import { fetchRooms, fetchAvailability } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

const isMediaVideo = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('video:') || 
         url.toLowerCase().endsWith('.mp4') || 
         url.toLowerCase().endsWith('.webm') || 
         url.toLowerCase().endsWith('.mov') ||
         url.includes('youtube.com') || 
         url.includes('youtu.be');
};

const cleanMediaUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('video:')) return url.substring(6);
  return url;
};

interface RoomSelectorProps {
  hotel: Hotel;
  onBookRoom: (room: Room, checkIn: string, checkOut: string, roomCount: number) => void;
  onBack: () => void;
}

const ROOM_IMAGES_MAP: Record<string, string[]> = {
  r_front_valet: [
    "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"
  ],
  r_front_lobby_meet: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1542744094-2ab25be78b90?auto=format&fit=crop&q=80&w=1200"
  ],
  r_upstairs_royal: [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200"
  ],
  r_upstairs_premium_king: [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200"
  ],
  r_upstairs_studio: [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"
  ],
  r_downstairs_villa: [
    "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1517541621645-65bcca855d47?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1548625361-155deee223d0?auto=format&fit=crop&q=80&w=1200"
  ],
  r_downstairs_garden_suite: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=1200"
  ],
  r_bar_onyx_counter: [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&q=80&w=1200"
  ],
  r_bar_velvet_nook: [
    "https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200"
  ],
  r_vip_crimson_booth: [
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200"
  ],
  r_vip_neon_lounge: [
    "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=1200"
  ],
  r_indoor_billiard_slot: [
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200"
  ],
  r_outdoor_patio_slot: [
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1609148014511-5341399cc9be?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200"
  ],
  r_pool_canvas_cabana: [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&q=80&w=1200"
  ],
  r_pool_twin_sunbeds: [
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1200"
  ],
  r_kitchen_chef_table: [
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&q=80&w=1200"
  ],
  r_kitchen_patissier_class: [
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200"
  ],
};

const getRoomImages = (room: Room): string[] => {
  if (room.images && room.images.length > 0) return room.images;
  if (ROOM_IMAGES_MAP[room.id]) return ROOM_IMAGES_MAP[room.id];
  return room.image ? [room.image] : [];
};

export const RoomSelector: React.FC<RoomSelectorProps> = ({ hotel, onBookRoom, onBack }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availability, setAvailability] = useState<RoomAvailabilityResponse[]>([]);
  
  // Lightbox carousel state
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [lightboxRoomName, setLightboxRoomName] = useState<string>('');

  const handleNextImage = () => {
    if (!lightboxImages) return;
    setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const handlePrevImage = () => {
    if (!lightboxImages) return;
    setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const handleOpenLightbox = (room: Room) => {
    const images = getRoomImages(room);
    setLightboxImages(images);
    setCurrentImageIndex(0);
    setLightboxRoomName(room.name);
  };

  const handleCloseLightbox = () => {
    setLightboxImages(null);
  };

  // Lightbox key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxImages) return;
      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'Escape') {
        handleCloseLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImages, currentImageIndex]);

  // Default dates: tomorrow to +4 days
  const getOffsetDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState(getOffsetDateString(1));
  const [checkOut, setCheckOut] = useState(getOffsetDateString(4));
  const [roomCount, setRoomCount] = useState(1);
  const [guests, setGuests] = useState(2);
  
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate stays length
  const dateDiffInDays = (d1Str: string, d2Str: string) => {
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    const diff = d2.getTime() - d1.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };
  const stayLength = dateDiffInDays(checkIn, checkOut);

  // Load Rooms
  useEffect(() => {
    const loadRoomsData = async () => {
      setLoadingRooms(true);
      setErrorMsg('');
      try {
        const data = await fetchRooms(hotel.id);
        setRooms(data);
        
        // Fetch initial availability mapping
        const avail = await fetchAvailability(hotel.id, checkIn, checkOut);
        setAvailability(avail);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to fetch rooms and availability data.');
      } finally {
        setLoadingRooms(false);
      }
    };
    loadRoomsData();
  }, [hotel.id]);

  // Query availability on date changes
  const handleQueryAvailability = async (ci: string, co: string) => {
    if (new Date(ci) >= new Date(co)) {
      setErrorMsg('Check-out date must be chronologically after the check-in date.');
      return;
    }
    setErrorMsg('');
    setCheckingAvailability(true);
    try {
      const avail = await fetchAvailability(hotel.id, ci, co);
      setAvailability(avail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred querying hotel availability.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleDateChange = (type: 'checkIn' | 'checkOut', val: string) => {
    let ci = checkIn;
    let co = checkOut;
    if (type === 'checkIn') {
      ci = val;
      setCheckIn(val);
      // Auto-set checkout to checkin + 1 if checkout is before or equal
      if (new Date(val) >= new Date(checkOut)) {
        const nextDay = new Date(val);
        nextDay.setDate(nextDay.getDate() + 3);
        co = nextDay.toISOString().split('T')[0];
        setCheckOut(co);
      }
    } else {
      co = val;
      setCheckOut(val);
      if (new Date(checkIn) >= new Date(val)) {
        const prevDay = new Date(val);
        prevDay.setDate(prevDay.getDate() - 3);
        ci = prevDay.toISOString().split('T')[0];
        setCheckIn(ci);
      }
    }
    handleQueryAvailability(ci, co);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E5E2DA] p-6 md:p-8 shadow-xs" id="room-selector-panel">
      {/* Header back navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2DA] pb-6 mb-8">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-[#5B6D5B] hover:text-[#4a584a] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
          >
            &larr; Back to Wings & Towers
          </button>
          <h2 className="text-2xl font-serif italic font-bold text-[#33332D] leading-tight">
            {hotel.name}
          </h2>
          <p className="text-xs text-[#8E8E82] mt-1">{hotel.location}</p>
        </div>
        
        {/* Verification indicator */}
        <div className="flex items-center gap-3 bg-[#E8F0E8] border border-[#5B6D5B]/20 px-4 py-2.5 rounded-full text-[#5B6D5B]">
          <Zap className="w-4 h-4 text-[#5B6D5B] shrink-0 fill-[#5B6D5B]/10" />
          <div className="text-[11px] font-sans">
            <span className="font-bold block tracking-widest uppercase text-[#5B6D5B]">Live Room Vacancies</span>
            <span className="text-[#8E8E82] text-[10px]">Real-time live availability</span>
          </div>
        </div>
      </div>

      {/* Date and Guests Configuration Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#F9F8F6] border border-[#E5E2DA] rounded-2xl mb-8">
        <div>
          <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic">Check-In</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E82]" />
            <input
              type="date"
              value={checkIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleDateChange('checkIn', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2DA] bg-white rounded-lg text-xs text-[#33332D] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic">Check-Out</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E82]" />
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => handleDateChange('checkOut', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2DA] bg-white rounded-lg text-xs text-[#33332D] focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic">Room Count</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E82]" />
            <select
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2DA] bg-white rounded-lg text-xs text-[#33332D] appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Room' : 'Rooms'}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#8E8E82] tracking-widest uppercase mb-1.5 font-serif italic">Adult Guests</label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E82]" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E2DA] bg-white rounded-lg text-xs text-[#33332D] appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#5B6D5B] focus:border-[#5B6D5B] font-medium"
            >
              {[1, 2, 3, 4, 6].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error / Feedback display */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50/55 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in font-sans">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Room designs state */}
      {loadingRooms ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#5B6D5B] animate-spin" />
          <p className="text-xs text-[#8E8E82] font-mono">Querying available hotel rooms...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif italic font-bold text-[#33332D] uppercase tracking-widest">
              Selected Suite Offerings ({rooms.length})
            </h3>
            {checkingAvailability && (
              <span className="text-[10px] font-mono text-[#5B6D5B] flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B6D5B]" /> Synchronizing live capacity...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {rooms.map((room) => {
              const avail = availability.find(a => a.roomId === room.id);
              const availableCount = avail ? avail.availableCount : room.totalInventory;
              const isFullyBooked = availableCount === 0;
              const inventoryShort = availableCount < roomCount;
              
              const calculatedTotalPrice = room.pricePerNight * roomCount * stayLength;

              return (
                <motion.div
                  key={room.id}
                  layoutId={`room-box-${room.id}`}
                  className={`border rounded-3xl overflow-hidden flex flex-col lg:flex-row transition-all ${
                    isFullyBooked
                      ? 'border-[#E5E2DA] bg-[#F9F8F6] opacity-70'
                      : inventoryShort
                      ? 'border-[#E5E2DA] bg-[#F9F8F6]/40'
                      : 'border-[#E5E2DA] bg-white hover:border-[#8E8E82]'
                  }`}
                >
                  {/* Photo representation with Lightbox Trigger */}
                  <div
                    onClick={() => handleOpenLightbox(room)}
                    className="lg:w-80 h-52 lg:h-auto relative shrink-0 overflow-hidden cursor-pointer group/img"
                    title="Click to view full-screen room photo gallery"
                  >
                    {isMediaVideo(room.image) ? (
                      <video
                        src={cleanMediaUrl(room.image)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      />
                    ) : (
                      <img
                        src={room.image}
                        alt={room.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {/* Hover state overlay showing view icon */}
                    <div className="absolute inset-0 bg-[#33332D]/45 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                      <div className="px-4 py-2 bg-[#F9F8F6]/95 border border-[#E5E2DA] rounded-full text-[10px] font-bold tracking-widest text-[#33332D] uppercase flex items-center gap-1.5 shadow-md transform translate-y-2 group-hover/img:translate-y-0 transition-transform duration-300">
                        <Maximize2 className="w-3.5 h-3.5 text-[#5B6D5B]" />
                        <span>View Gallery</span>
                      </div>
                    </div>

                    {isFullyBooked ? (
                      <div className="absolute inset-0 bg-[#33332D]/60 backdrop-blur-xs flex items-center justify-center z-20">
                        <span className="px-4 py-2 bg-[#33332D]/90 text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                          Fully Booked
                        </span>
                      </div>
                    ) : inventoryShort ? (
                      <div className="absolute inset-0 bg-[#5B6D5B]/30 backdrop-blur-xs flex items-center justify-center z-20 font-sans">
                        <span className="px-4 py-2 bg-[#5B6D5B] text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                          Only {availableCount} left
                        </span>
                      </div>
                    ) : (
                      // Subtle premium tag on the corner showing the photos count
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white rounded-md text-[9px] font-medium tracking-wider uppercase font-sans z-10 flex items-center gap-1">
                        <Maximize2 className="w-2.5 h-2.5" />
                        {getRoomImages(room).length} Photos
                      </div>
                    )}
                  </div>

                  {/* Room specifications */}
                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="font-serif italic font-bold text-lg text-[#33332D] leading-tight">
                          {room.name}
                        </h4>
                        
                        {/* Occupancy and Availability tagger */}
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-[#F9F8F6] border border-[#E5E2DA] text-[#8E8E82] rounded-full text-[10px] font-medium leading-normal font-sans">
                            Max {room.capacity} Guests
                          </span>
                          {!isFullyBooked && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              availableCount <= 2 ? 'bg-red-50 text-red-600' : 'bg-[#E8F0E8] text-[#5B6D5B]'
                            }`}>
                              {availableCount} of {room.totalInventory} vacant
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[#8E8E82] text-xs font-sans leading-relaxed mb-4">
                        {room.description}
                      </p>

                      {/* Amenities Icons Row */}
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {room.amenities.map((amenity, idx) => (
                          <span
                            key={idx}
                            className="bg-[#F9F8F6] border border-[#E5E2DA] text-[#8E8E82] rounded-full py-1 px-3 text-[10px] font-medium font-sans"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom transaction details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E5E2DA] w-full">
                      <div className="flex flex-row sm:flex-col justify-between items-center sm:items-start w-full sm:w-auto">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-bold text-[#33332D] font-serif italic">${room.pricePerNight}</span>
                            <span className="text-[#8E8E82] text-xs">/ night</span>
                          </div>
                          {stayLength > 0 && (
                            <p className="text-[10px] text-[#8E8E82] font-sans mt-0.5 hidden sm:block">
                              Subtotal: ${room.pricePerNight} * {stayLength} nights {roomCount > 1 ? `* ${roomCount} rooms` : ''}
                            </p>
                          )}
                        </div>
                        
                        {/* Render active total stay inline on mobile as well! */}
                        {stayLength > 0 && !isFullyBooked && !inventoryShort && (
                          <div className="text-right sm:hidden">
                            <span className="text-[9px] text-[#8E8E82] uppercase tracking-widest block font-bold leading-none mb-0.5">Total Stay</span>
                            <span className="text-sm font-bold font-serif italic text-[#5B6D5B]">${calculatedTotalPrice}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        {stayLength > 0 && !isFullyBooked && !inventoryShort && (
                          <div className="text-right hidden sm:block">
                            <span className="text-[9px] text-[#8E8E82] uppercase tracking-widest block font-bold">Total Stay</span>
                            <span className="text-base font-bold font-serif italic text-[#5B6D5B]">${calculatedTotalPrice}</span>
                          </div>
                        )}

                        <button
                          disabled={isFullyBooked || inventoryShort || stayLength === 0}
                          onClick={() => onBookRoom(room, checkIn, checkOut, roomCount)}
                          className={`w-full sm:w-auto py-3 px-6 rounded-full text-xs font-bold font-sans uppercase tracking-widest transition-all select-none cursor-pointer text-center ${
                            isFullyBooked || inventoryShort || stayLength === 0
                              ? 'bg-[#F9F8F6] text-[#8E8E82] border border-[#E5E2DA] cursor-not-allowed'
                              : 'bg-[#5B6D5B] hover:bg-[#4a584a] text-white shadow-2xs'
                          }`}
                        >
                          {isFullyBooked
                            ? 'Unavailable'
                            : inventoryShort
                            ? 'No Inventory'
                            : stayLength === 0
                            ? 'Select dates'
                            : 'Reserve Now'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none"
            onClick={handleCloseLightbox}
          >
            {/* Top Bar with Description & Close Button */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between text-white z-50 bg-gradient-to-b from-black/80 to-transparent">
              <div>
                <h3 className="font-serif italic text-lg md:text-xl text-[#F9F8F6]">
                  {lightboxRoomName}
                </h3>
                <p className="text-white/60 text-xs mt-0.5">
                  DanVilla Luxury Suite Catalog &bull; Image {currentImageIndex + 1} of {lightboxImages.length}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseLightbox();
                }}
                className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all cursor-pointer backdrop-blur-md shadow-lg border border-white/10"
                aria-label="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Central Slide & Controls Layout */}
            <div className="w-full max-w-5xl px-4 flex items-center justify-between relative" onClick={(e) => e.stopPropagation()}>
              {/* Previous Button */}
              <button
                onClick={handlePrevImage}
                className="absolute left-6 md:-left-12 z-10 p-3.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-full transition-all cursor-pointer backdrop-blur-md shadow-xl border border-white/10 hover:scale-105"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Img Container */}
              <div className="w-full h-[55vh] md:h-[65vh] flex items-center justify-center overflow-hidden rounded-2xl relative shadow-2xl border border-white/5 bg-zinc-950">
                <AnimatePresence mode="wait">
                  {isMediaVideo(lightboxImages[currentImageIndex]) ? (
                    <motion.video
                      key={currentImageIndex}
                      src={cleanMediaUrl(lightboxImages[currentImageIndex])}
                      controls
                      autoPlay
                      loop
                      muted
                      className="max-w-full max-h-full object-contain"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                    />
                  ) : (
                    <motion.img
                      key={currentImageIndex}
                      src={lightboxImages[currentImageIndex]}
                      alt={`${lightboxRoomName} - slide ${currentImageIndex}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextImage}
                className="absolute right-6 md:-right-12 z-10 p-3.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-full transition-all cursor-pointer backdrop-blur-md shadow-xl border border-white/10 hover:scale-105"
                aria-label="Next Image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom thumbnail selector / pagination controls */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? 'w-6 bg-[#E5E2DA]' : 'w-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Small Thumbnail Grid for Premium Feel */}
              <div className="hidden md:flex items-center gap-3.5 max-w-lg overflow-x-auto p-2 bg-black/30 backdrop-blur-md rounded-2xl border border-white/5 mx-6">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer relative ${
                      idx === currentImageIndex ? 'border-amber-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isMediaVideo(img) ? (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Video className="w-5 h-5 text-white/85" />
                      </div>
                    ) : (
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
