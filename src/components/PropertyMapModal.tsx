import React from 'react';
import { X, MapPin, Compass, ShieldAlert, Navigation } from 'lucide-react';
import { Hotel } from '../types';
// @ts-expect-error image asset loaded via Vite asset plugin
import mapImg from '../assets/images/danvilla_resort_map_1781173552394.png';

interface PropertyMapModalProps {
  hotel: Hotel;
  onClose: () => void;
}

// Maps hotel sections to location details on the resort campus
const placementDetails: Record<string, {
  region: string;
  description: string;
  directions: string;
  x: number; // percentage X on map
  y: number; // percentage Y on map
}> = {
  sec_front_view: {
    region: "Central Arrival Grand Atrium",
    description: "The primary hospitality hub where checks are synchronized and welcome service concierge remains active 24/7.",
    directions: "Immediate entry from the main resort columns boulevard.",
    x: 50,
    y: 82
  },
  sec_rooms_upstairs: {
    region: "East Sky Tower, Levels 5-12",
    description: "The elevated retreat corridor where private high balconies look over the resort central gardens.",
    directions: "Board the central gold elevators from the Lobby East wing, press upper floors.",
    x: 28,
    y: 38
  },
  sec_rooms_downstairs: {
    region: "West Garden Terraces, Ground Level",
    description: "Lush botanical level featuring immediate slide-gate access to private gravel pathways.",
    directions: "South garden foyer corridors exiting right of the Grand Fountain.",
    x: 24,
    y: 58
  },
  sec_bar: {
    region: "Lobby Campus, Left East Wing",
    description: "Plush velvet custom mixology cocktail club holding state of the art sound proofing for acoustic sets.",
    directions: "Direct pathway behind the Grand Fireplace, through the Onyx double-doors.",
    x: 68,
    y: 78
  },
  sec_vip_club: {
    region: "Apex Level Penthouse Duplex",
    description: "Nightlife center featuring crimson premium suites, skyline stargazing decks, and VIP security controls.",
    directions: "Private VIP terminal elevators operating from Area 3 parking access.",
    x: 78,
    y: 28
  },
  sec_indoor_snooker: {
    region: "Recreation Hub Corridor, Floor 2",
    description: "A secure championship billiard hall holding tournament grade mahogany slate tables.",
    directions: "North elevator to second level, right after passing the fitness foyer.",
    x: 42,
    y: 26
  },
  sec_outdoor_snooker: {
    region: "Garden Courtyard North Foyer",
    description: "All-weather snooker table sheltered under high-grade canvas sails, framed by ambient decorative lights.",
    directions: "Walk down the central botanical trail and pass the orchid greenhouse.",
    x: 48,
    y: 16
  },
  sec_swimming_pool: {
    region: "Central Gardens Promenade",
    description: "Stunning thermal-reflection heated swimming pool bordered by private designer cabanas.",
    directions: "Directly opposite the main Lobby glass walkway doors.",
    x: 52,
    y: 50
  },
  sec_kitchen: {
    region: "Ground Level Gastronomical Hub",
    description: "Culinary core featuring master chef workspaces, stone ovens, and intimate dining banquettes.",
    directions: "Left corridor from main reception desks, adjacent to the Azure Courtyard.",
    x: 72,
    y: 58
  }
};

export const PropertyMapModal: React.FC<PropertyMapModalProps> = ({ hotel, onClose }) => {
  const placement = placementDetails[hotel.id] || {
    region: "DanVilla Main Campus",
    description: "Part of the integrated danvilla five-star resort estate layout.",
    directions: "Inquire at front guest services.",
    x: 50,
    y: 50
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="relative bg-white text-black w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-blue-900/10 flex flex-col md:flex-row transition-all duration-300"
        id="property-map-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black hover:bg-red-600 text-white hover:text-white rounded-full transition-colors cursor-pointer"
          title="Close Map View"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Map Visualization Side */}
        <div className="relative w-full md:w-3/5 aspect-square md:aspect-auto md:min-h-[500px] bg-neutral-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-blue-900/10">
          <img
            src={mapImg}
            alt="DanVilla Campus Map"
            className="w-full h-full object-cover opacity-90 transition-opacity duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Glowing Placement Marker Pin overlay */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-700 pointer-events-none"
            style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
          >
            {/* Pulsating ripple effect circles (Red Brand Accent) */}
            <div className="absolute w-12 h-12 -left-4 -top-4 rounded-full bg-red-600/30 animate-ping" />
            <div className="absolute w-6 h-6 -left-1 -top-1 rounded-full bg-red-600/40 animate-pulse" />
            
            {/* Real Pin pinhead locator */}
            <div className="relative flex flex-col items-center">
              <div className="bg-red-600 text-white p-1.5 rounded-full shadow-lg border border-white">
                <MapPin className="w-4 h-4 fill-white text-red-600" />
              </div>
              <div className="bg-black/90 text-white px-2 py-1 rounded text-[9px] font-bold tracking-wider mt-1.5 whitespace-nowrap shadow-md border border-red-600/40">
                {hotel.name}
              </div>
            </div>
          </div>

          {/* Floating Campus Legend Indicator */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/95 text-white/90 p-3 rounded-2xl border border-blue-900/30 text-[10px] font-mono flex items-center gap-2.5 backdrop-blur-md">
            <Compass className="w-4 h-4 text-red-500 animate-spin-slow shrink-0" />
            <div>
              <span className="text-red-500 font-bold uppercase tracking-wider block">DanVilla Brand Campus Layout</span>
              <span className="text-gray-400 block mt-0.5">Custom placement visualization. Purely offline local synchronization scheme.</span>
            </div>
          </div>
        </div>

        {/* Info detail Sidebar (Aesthetic pure white/blue/black layout with red marker) */}
        <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-between bg-white text-neutral-900">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono text-blue-900 font-bold uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-900/10 inline-block mb-3">
                Estate Placement Directory
              </span>
              <h3 className="text-2xl font-serif font-black italic tracking-tight text-neutral-900 leading-tight">
                {hotel.name}
              </h3>
              <p className="text-xs text-gray-500 font-sans mt-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>{hotel.location}</span>
              </p>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* Geographical details */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-950 uppercase tracking-wider font-mono text-[10px] text-blue-900">Sector Placement Area</h5>
                <p className="text-neutral-800 leading-relaxed font-sans">{placement.region}</p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-neutral-950 uppercase tracking-wider font-mono text-[10px] text-blue-900 font-bold">Spatial Details</h5>
                <p className="text-gray-600 leading-relaxed font-sans">{placement.description}</p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-neutral-950 uppercase tracking-wider font-mono text-[10px] text-blue-900 font-bold flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-red-600" />
                  <span>How to Reach There</span>
                </h5>
                <p className="text-gray-600 leading-relaxed font-sans bg-gray-50 p-2.5 rounded-lg border border-neutral-200 italic">
                  "{placement.directions}"
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 mt-6 md:mt-0 space-y-3.5">
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700/90 rounded-xl border border-red-500/10 text-[10px]">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>Real-time safety locks apply to all bookings in this resort zone.</span>
            </div>
            
            <button
              onClick={onClose}
              className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors text-center border-b-2 border-red-600 shadow-sm"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
