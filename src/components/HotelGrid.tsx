import React from 'react';
import { Star, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { Hotel } from '../types';
import { motion } from 'motion/react';

interface HotelGridProps {
  hotels: Hotel[];
  onSelectHotel: (hotel: Hotel) => void;
  onOpenMap?: (hotel: Hotel) => void;
}

export const HotelGrid: React.FC<HotelGridProps> = ({ hotels, onSelectHotel, onOpenMap }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {hotels.map((hotel, index) => (
        <motion.div
          key={hotel.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="group relative bg-white border border-[#E5E2DA] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full"
          id={`hotel-card-${hotel.id}`}
        >
          {/* Image Container */}
          <div className="relative h-64 w-full overflow-hidden bg-[#F9F8F6]">
            <img
              src={hotel.image}
              alt={hotel.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              referrerPolicy="no-referrer"
            />
            {/* Rating Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-white/95 backdrop-blur-xs rounded-full text-xs font-semibold text-black shadow-xs border border-neutral-200">
              <Star className="w-3.5 h-3.5 fill-[#1E3A8A] text-[#1E3A8A]" />
              <span>{hotel.rating.toFixed(1)}</span>
            </div>
            
            {/* Guarantee Tag */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-red-600 border border-red-500/20 text-white rounded-full text-[10px] font-bold tracking-widest uppercase shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live Available</span>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 flex flex-col flex-grow">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-serif italic font-bold text-xl text-black leading-tight group-hover:text-[#1E3A8A] transition-colors">
                {hotel.name}
              </h3>
            </div>

            <div className="flex items-center justify-between gap-1.5 text-xs text-[#8E8E82] mb-3 font-sans">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{hotel.location}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMap?.(hotel);
                }}
                className="text-[10px] text-[#1E3A8A] hover:text-red-600 font-bold uppercase tracking-wider underline cursor-pointer"
              >
                View Map
              </button>
            </div>

            <p className="text-[#8E8E82] font-sans text-xs leading-relaxed mb-6 flex-grow line-clamp-3">
              {hotel.description}
            </p>

            {/* Featured Amenities Grid */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {hotel.amenities.slice(0, 3).map((amenity, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-[#F9F8F6] text-[#8E8E82] rounded-full text-[10px] font-medium border border-[#E5E2DA]"
                >
                  {amenity}
                </span>
              ))}
              {hotel.amenities.length > 3 && (
                <span className="px-2.5 py-1 bg-[#F9F8F6] text-[#8E8E82] rounded-full text-[10px] font-medium border border-[#E5E2DA]">
                  +{hotel.amenities.length - 3} more
                </span>
              )}
            </div>

            {/* CTA action */}
            <button
              onClick={() => onSelectHotel(hotel)}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-[#1E3A8A] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full border-b-2 border-red-600 transition-all font-sans cursor-pointer shadow-xs"
              id={`hotel-btn-${hotel.id}`}
            >
              <span>Explore Available Suites</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
