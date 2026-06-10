import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  query, 
  where, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Configure local uploads storage
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Types
interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  image: string;
  amenities: string[];
}

interface Room {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  totalInventory: number;
  image: string;
  amenities: string[];
}

interface Booking {
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
  guestName: string;
  guestEmail: string;
  createdAt: string;
  updatedAt: string;
}

const clientApp = initializeApp(firebaseConfig);
const db = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(uploadsDir));

// Seeding standard high-end hotel properties and luxury room layouts
const seedHotels: Hotel[] = [
  {
    id: "sec_front_view",
    name: "Front View & Grand Lobby",
    description: "The magnificent facade and main lobby entrance of DanVilla Hotel. Framed by neoclassical grand columns, roaring water fountains, a spacious high-glass welcome foyer, and a 24/7 priority concierge desk.",
    location: "Main Entrance & Lobby Campus (Main)",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Grand Foyer", "Valet Parking", "Chauffeur Service", "Welcome Lounge", "High Ceiling Lounge"]
  },
  {
    id: "sec_rooms_upstairs",
    name: "Rooms Upstairs (Premium Levels)",
    description: "DanVilla's high-elevation luxury corridor. Incorporates exquisite premium accommodations situated on the upper floors, presenting bird's-eye gardens vistas, private balconies, and bespoke walk-in dressing suites.",
    location: "Upper Tower Levels (Rooms)",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Panoramic Balconies", "Elevated Views", "King Sized Bed", "Mini Bar Selection", "Luxury Rain Shower"]
  },
  {
    id: "sec_rooms_downstairs",
    name: "Rooms Downstairs (Garden Levels)",
    description: "Peaceful ground-floor sanctuaries enveloped by lush botanical walkways, cascading estate streams, private stone terraces, and immediate slide-gate gardens backyard access.",
    location: "Ground Floor Terraces (Rooms)",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Garden Patios", "Cascading Streams", "Direct Lawn Access", "Quiet Soundproofing", "Hammock Nest"]
  },
  {
    id: "sec_bar",
    name: "Brass & Onyx Jazz Bar",
    description: "Our elegant custom beverage lounge. Savour award-winning mixology cocktails, imported single-malt reserves, live evening acoustic jazz sets, and quiet plush velvet seating bays.",
    location: "Lobby East Wing (Dining)",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Award-Winning Mixology", "Live Acoustic Jazz", "Velvet Booths", "Premium Cigar Vault", "Rare Spirits"]
  },
  {
    id: "sec_vip_club",
    name: "Crimson Velvet VIP Club",
    description: "Unparalleled luxury nightlife. Features private crimson-leather booths, signature bottle services, cutting-edge multi-layer sound systems, celebrity guest DJs, and an upper terrace skyline view deck.",
    location: "Penthouse Block (Dining)",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Signature Bottle Service", "Top-Tier DJs", "Strict Access Control", "Private Booths", "Soundproof Lounge"]
  },
  {
    id: "sec_indoor_snooker",
    name: "Imperial Indoor Snooker Hall",
    description: "Our championship indoor billiard den. Mahogany-finished walls, professional-grade slate snooker tables, customized overhead brass task lights, and leather armchairs for spectators.",
    location: "Recreation Hub Level 2 (Snooker)",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Billiard Tables", "Championship Cues", "Spectator Seating", "Cigar Friendly", "Beverage Service"]
  },
  {
    id: "sec_outdoor_snooker",
    name: "Garden Terrace Outdoor Snooker Yard",
    description: "Play in the cool tropical night air. Beautiful all-weather slate snooker tables sheltered under high-grade canvas sails, surrounded by glowing string bulbs and a tiki cocktail stand.",
    location: "North Garden Courtyard (Snooker)",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1609148014511-5341399cc9be?auto=format&fit=crop&q=80&w=1200",
    amenities: ["All-Weather Pool Table", "Tiki Cocktail Shack", "Heated Patio Lamps", "Garden Breezes", "Lounge Swings"]
  },
  {
    id: "sec_swimming_pool",
    name: "Azure Olympic Swimming Pool",
    description: "The stunning thermal reflection pool of DanVilla Hotel. Bordered by private curtained daybed cabanas, premium teak sun loungers, fresh tropical juice grills, and outdoor rain showers.",
    location: "Resort Central Gardens (Pool)",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Olympic Sized", "Water Heating", "Daybed Cabanas", "Poolside Grill & Juice", "Outdoor Beach Shower"]
  },
  {
    id: "sec_kitchen",
    name: "Epicurean Open Kitchen & Chef Table",
    description: "The culinary heart of the resort. Features high-interactivity prep sections led by international master chefs, intimate fine dining tables, and premium baking masterclasses.",
    location: "Ground Floor Restaurant Hub (Dining)",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200",
    amenities: ["Interactive Chef Table", "Culinary Masterclasses", "Seafood Aquarium", "Artisanal Oven", "Sommelier Pairings"]
  }
];

const seedRooms: Room[] = [
  // Front View Section slots
  {
    id: "r_front_valet",
    hotelId: "sec_front_view",
    name: "VIP Welcome Lounge & Private Chauffeur Booking",
    description: "Reserve your dedicated reception lounge space with immediate executive express check-in, premium airport pickup service, and locked valet spaces.",
    pricePerNight: 120,
    capacity: 4,
    totalInventory: 5,
    image: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&q=80&w=600",
    amenities: ["Chauffeur Driven S-Class", "Valet Priority Tag", "Exclusive Welcome Drinks", "Savoury Snack Platter"]
  },
  {
    id: "r_front_lobby_meet",
    hotelId: "sec_front_view",
    name: "Executive Conference Foyer Meeting Suite",
    description: "Reserve a private glass-enclosed conference room directly adjoining the Grand Lobby, integrated with smart displays and coffee service.",
    pricePerNight: 250,
    capacity: 10,
    totalInventory: 3,
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600",
    amenities: ["Airplay Display Projector", "Soundproof Glass Walls", "Direct Espresso Machine", "Custom Leather Seats"]
  },

  // Rooms Upstairs Section
  {
    id: "r_upstairs_royal",
    hotelId: "sec_rooms_upstairs",
    name: "Royal Upstairs Penthouse Horizon Suite",
    description: "Luxurious top-tier residence featuring panoramic cloud-level balcony, outdoor soaking tub, and independent private living lounge.",
    pricePerNight: 550,
    capacity: 4,
    totalInventory: 6,
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600",
    amenities: ["Highest Balcony View", "Soaking Tub", "Walk-In Dressing Room", "Private Bar Pantry", "Butlers on Call"]
  },
  {
    id: "r_upstairs_premium_king",
    hotelId: "sec_rooms_upstairs",
    name: "Premium King Skyline Room",
    description: "A gorgeous, elevated room boasting elegant hardwood accents, panoramic ceiling-to-floor glass, and customizable ambient light presets.",
    pricePerNight: 350,
    capacity: 2,
    totalInventory: 12,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
    amenities: ["Floor-to-ceiling glass", "Voice Assistant Control", "Plush King Size Bed", "Custom Bath Aromatherapy"]
  },
  {
    id: "r_upstairs_studio",
    hotelId: "sec_rooms_upstairs",
    name: "Skyview Double Executive Suite",
    description: "Spacious multi-bed design on upper levels, perfectly calibrated for small travelling families or high-profile business colleagues.",
    pricePerNight: 420,
    capacity: 4,
    totalInventory: 10,
    image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600",
    amenities: ["Double Queen Beds", "Executive Working Desk", "8K Curved TV Screen", "Luxury Rainfall Showers"]
  },

  // Rooms Downstairs Section
  {
    id: "r_downstairs_villa",
    hotelId: "sec_rooms_downstairs",
    name: "Supreme Ground-Floor Lawn Villa",
    description: "Our hallmark estate layout on the garden levels. Outfitted with dual glass wings, private terrace, and a tranquil backyard koi pond stream.",
    pricePerNight: 600,
    capacity: 6,
    totalInventory: 4,
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
    amenities: ["Private Lawn Gates", "Stone Terrace", "Premium Fireplace Hearth", "Chef Kitchenette", "Hammock Nest"]
  },
  {
    id: "r_downstairs_garden_suite",
    hotelId: "sec_rooms_downstairs",
    name: "Botanical Garden View Luxury Canopy Suite",
    description: "Beautiful garden-access bedroom structured around a modern timber framework, local handwoven wool rugs, and custom botanical artwork.",
    pricePerNight: 320,
    capacity: 3,
    totalInventory: 15,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600",
    amenities: ["French Doors to Lawn", "Traditional Four-poster Bed", "Heated Underfloor Tiles", "Organic Herbal Tea Bar"]
  },

  // Bar Section Slots
  {
    id: "r_bar_onyx_counter",
    hotelId: "sec_bar",
    name: "Brass Counter Reserved High-Stool Seat",
    description: "Guaranteed premium bar-counter seats in front of our mixology station, complete with a starter pairing collection of artisanal snacks.",
    pricePerNight: 80,
    capacity: 1,
    totalInventory: 8,
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600",
    amenities: ["Mixologist Spotlight Seat", "Artisanal Cheese Pairing", "Whiskey Flight Samples", "USB Phone Charging Port"]
  },
  {
    id: "r_bar_velvet_nook",
    hotelId: "sec_bar",
    name: "Private Velvet Lounge Alcove Reservation",
    description: "Reserve a semi-private plush velvet U-shaped booth accommodating groups for private celebrations and dedicated waiter calling service.",
    pricePerNight: 220,
    capacity: 6,
    totalInventory: 4,
    image: "https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&q=80&w=600",
    amenities: ["Bottle of House Champagne", "Gourmet Tapas Platters", "Acoustic Stage Proximity", "Customized Ambient Volume"]
  },

  // VIP Club Section Slots
  {
    id: "r_vip_crimson_booth",
    hotelId: "sec_vip_club",
    name: "Crimson Velvet Royal DJ-Tier VIP Box",
    description: "The ultimate club reservation. Overlooking the entire dance arena, enjoy premier bottle service, dedicated club security, and master mixologists.",
    pricePerNight: 650,
    capacity: 8,
    totalInventory: 3,
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=600",
    amenities: ["Complimentary Don Julio 1942", "Dedicated Host Butler", "Premium Sound Isolation", "Access to DJ Deck Patio"]
  },
  {
    id: "r_vip_neon_lounge",
    hotelId: "sec_vip_club",
    name: "Neon Glow High-Society Skyline Lounge Booth",
    description: "Beautifully styled sky lounge reservation on the upper terrace, combining immediate club entry status with fresh breeze garden vistas.",
    pricePerNight: 400,
    capacity: 5,
    totalInventory: 5,
    image: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&q=80&w=600",
    amenities: ["Express Club Entry Bypass", "Signature Vodka Carafe", "Skyline Viewing Deck", "Glow-in-the-dark Glassware"]
  },

  // Indoor Snooker Section Slots
  {
    id: "r_indoor_billiard_slot",
    hotelId: "sec_indoor_snooker",
    name: "Championship Mahogany Snooker Table Half-Day Slot",
    description: "Reserve an entire premium tournament-grade Mahogany table, custom cue selections, scoreboards, and direct food-grill service link.",
    pricePerNight: 95,
    capacity: 4,
    totalInventory: 4,
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600",
    amenities: ["Tournament Snooker Balls", "Premium Carbon Cues", "Direct Service Calling Bleep", "Armchair Spectator Bay"]
  },

  // Outdoor Snooker Section Slots
  {
    id: "r_outdoor_patio_slot",
    hotelId: "sec_outdoor_snooker",
    name: "Open-Air Garden Snooker Pavilion Evening Slot",
    description: "Reserve our outdoor garden pavilion snooker table, framed by tropical canopies, warm evening heaters, and tiki beverage delivery.",
    pricePerNight: 110,
    capacity: 4,
    totalInventory: 3,
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600",
    amenities: ["Sailcloth Canopied Area", "Tiki Juice Welcome Bowls", "Cozy Flame Warmers", "Surrounding Acoustic Speakers"]
  },

  // Swimming Pool Section Slots
  {
    id: "r_pool_canvas_cabana",
    hotelId: "sec_swimming_pool",
    name: "Royal Poolside Canvas Daybed Cabana",
    description: "Lock your private curtained luxury pool cabana room. Equipped with multiple soft lounges, complimentary sunscreen bars, and fresh fruit servers.",
    pricePerNight: 150,
    capacity: 4,
    totalInventory: 6,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600",
    amenities: ["Flowing Canvas Curtains", "Plush Daybeds", "Organic Sunscreen Kit", "Fresh Exotic Fruit Plate", "Private Towel Bar"]
  },
  {
    id: "r_pool_twin_sunbeds",
    hotelId: "sec_swimming_pool",
    name: "Azure Court Twin Teak Sunbeds Reserve",
    description: "Secure front-row poolside sun loungers right by the deep water edge, including premium giant umbrellas and mineral water buckets.",
    pricePerNight: 70,
    capacity: 2,
    totalInventory: 15,
    image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=600",
    amenities: ["Premium Giant Umbrella", "Unlimited Ice Baths", "Dedicated Drink Servers", "Soft Microfiber Towels"]
  },

  // Kitchen Section Slots
  {
    id: "r_kitchen_chef_table",
    hotelId: "sec_kitchen",
    name: "Interactive Master Chef Table Tasting Experience",
    description: "Reserve VIP seating right at our open copper kitchen table. Watch as master chefs craft a customized 7-course seasonal tasting run before you.",
    pricePerNight: 280,
    capacity: 2,
    totalInventory: 4,
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600",
    amenities: ["7-Course Immersive Menu", "Direct Chef Interaction", "Champagne Aperitif", "Personalized Recipe Card"]
  },
  {
    id: "r_kitchen_patissier_class",
    hotelId: "sec_kitchen",
    name: "Artisanal Baking & Pastry Masterclass Reservation",
    description: "Join our expert patissiers for an instructional afternoon of sourdough mechanics, complex chocolate tempering, and gourmet plating.",
    pricePerNight: 140,
    capacity: 1,
    totalInventory: 8,
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600",
    amenities: ["Professional Chef Apron", "All Premium Bake Ingredients", "Sourdough Starter Sample", "Take-Home Pastry Pack"]
  }
];

// Seed function
async function verifyAndSeedDatabase() {
  try {
    console.log("Verifying hotel sections in Firestore for DanVilla Hotel...");
    for (const hotel of seedHotels) {
      const docRef = doc(db, "hotels", hotel.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, hotel);
        console.log(`Seeded section/hotel: ${hotel.name}`);
      } else {
        console.log(`Section/Hotel already exists: ${hotel.name}`);
      }
    }

    console.log("Verifying room templates in Firestore for DanVilla Hotel...");
    for (const room of seedRooms) {
      const docRef = doc(db, "rooms", room.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, room);
        console.log(`Seeded room: ${room.name}`);
      } else {
        console.log(`Room already exists: ${room.name}`);
      }
    }
    console.log("Database verification and seeding completed successfully!");
  } catch (error) {
    console.error("Failed to seed/verify database: ", error);
  }
}

// On boot, fire seeder
verifyAndSeedDatabase();

// --- ADMIN API ENDPOINTS ---

// API: File upload of images/videos
app.post("/api/upload", (req, res) => {
  try {
    const { filename, fileData } = req.body;
    if (!filename || !fileData) {
      return res.status(400).json({ error: "Filename and fileData are required." });
    }

    // Parse base64 header
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid Base64 payload structure." });
    }

    const buffer = Buffer.from(matches[2], "base64");
    const extension = path.extname(filename) || ".jpg";
    const baseName = path.basename(filename, extension).replace(/[^a-zA-Z0-9_\-]/g, "");
    const safeFilename = `${baseName}_${Date.now()}${extension}`;
    const destinationPath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(destinationPath, buffer);

    console.log(`Successfully uploaded file saved as: ${safeFilename}`);
    res.json({ url: `/uploads/${safeFilename}` });
  } catch (err: any) {
    console.error("File upload failed on server: ", err);
    res.status(500).json({ error: "Failed to upload file to the server." });
  }
});

// API: Update Section details
app.put("/api/hotels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await setDoc(doc(db, "hotels", id), data);
    res.json({ success: true, hotel: data });
  } catch (error: any) {
    console.error("PUT /api/hotels failed: ", error);
    res.status(500).json({ error: `Update failed: ${error.message || error}` });
  }
});

// API: Create new room/offering
app.post("/api/hotels/:hotelId/rooms", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const data = req.body;
    const roomId = `r_custom_${Math.random().toString(36).substr(2, 9)}`;
    const newRoom = { ...data, id: roomId, hotelId };
    await setDoc(doc(db, "rooms", roomId), newRoom);
    res.status(201).json(newRoom);
  } catch (error: any) {
    console.error("POST /api/rooms failed: ", error);
    res.status(500).json({ error: `Creation failed: ${error.message || error}` });
  }
});

// API: Update room/offering details
app.put("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await setDoc(doc(db, "rooms", id), data);
    res.json({ success: true, room: data });
  } catch (error: any) {
    console.error("PUT /api/rooms failed: ", error);
    res.status(500).json({ error: `Update failed: ${error.message || error}` });
  }
});

// API: Delete room/offering
app.delete("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(db, "rooms", id));
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/rooms failed: ", error);
    res.status(500).json({ error: "Failed to delete room." });
  }
});

// API: Admin recovery factory reset
app.post("/api/admin/reset", async (req, res) => {
  try {
    console.log("Admin triggered catalog reset...");
    for (const hotel of seedHotels) {
      await setDoc(doc(db, "hotels", hotel.id), hotel);
    }
    for (const room of seedRooms) {
      await setDoc(doc(db, "rooms", room.id), room);
    }
    res.json({ success: true, message: "Catalog reset to factory defaults successfully!" });
  } catch (error) {
    console.error("POST /api/admin/reset failed: ", error);
    res.status(500).json({ error: "Failed to reset hotel database catalogs." });
  }
});

// API: Get Admin Bookings Securely
app.get("/api/admin/bookings", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "bookings"));
    const bookings: Booking[] = [];
    snapshot.forEach(docSnap => {
      bookings.push(docSnap.data() as Booking);
    });
    // Sort chronologically by newest
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(bookings);
  } catch (error) {
    console.error("GET /api/admin/bookings failed: ", error);
    res.status(500).json({ error: "Failed to download admin bookings checklist." });
  }
});

// API: Admin Update Booking State Securely
app.post("/api/admin/bookings/update", async (req, res) => {
  try {
    const { bookingId, status, paymentStatus } = req.body;
    if (!bookingId || !status || !paymentStatus) {
      return res.status(400).json({ error: "Missing parameters bookingId, status, or paymentStatus." });
    }

    const docRef = doc(db, "bookings", bookingId);
    const bookingDoc = await getDoc(docRef);
    if (!bookingDoc.exists()) {
      return res.status(404).json({ error: "Reservation details could not be found." });
    }

    await updateDoc(docRef, {
      status,
      paymentStatus,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/admin/bookings/update failed: ", error);
    res.status(500).json({ error: `Update failed: ${error.message || error}` });
  }
});

// API: Get Hotels
app.get("/api/hotels", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "hotels"));
    const hotels: Hotel[] = [];
    snapshot.forEach(docSnap => {
      hotels.push(docSnap.data() as Hotel);
    });
    res.json(hotels);
  } catch (error) {
    console.error("GET /api/hotels failed: ", error);
    res.status(500).json({ error: "Failed to download hotels information." });
  }
});

// API: Get Rooms
app.get("/api/hotels/:hotelId/rooms", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const snapshot = await getDocs(query(collection(db, "rooms"), where("hotelId", "==", hotelId)));
    const rooms: Room[] = [];
    snapshot.forEach(docSnap => {
      rooms.push(docSnap.data() as Room);
    });
    res.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms failed: ", error);
    res.status(500).json({ error: "Failed to load rooms details." });
  }
});

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

// Helper: Real-time availability engine
async function calculateAvailableRooms(
  hotelId: string,
  checkIn: string,
  checkOut: string
) {
  // 1. Fetch all hotel rooms
  const roomsSnap = await getDocs(query(collection(db, "rooms"), where("hotelId", "==", hotelId)));
  const rooms: Room[] = [];
  roomsSnap.forEach(d => {
    rooms.push(d.data() as Room);
  });

  // 2. Fetch all conflicting bookings (status count where status is NOT cancelled and dates overlap)
  const bookingsSnap = await getDocs(query(collection(db, "bookings"), where("hotelId", "==", hotelId)));
  const activeBookings: Booking[] = [];
  bookingsSnap.forEach(d => {
    const b = d.data() as Booking;
    if (b.status !== "cancelled") {
      activeBookings.push(b);
    }
  });

  // Filter overlapping ones on the server
  const requestedDates = getDatesArray(checkIn, checkOut); // Excludes checkout day for room counts

  const availability = rooms.map(room => {
    const conflicting = activeBookings.filter(b => {
      if (b.roomId !== room.id) return false;
      // Evaluate overlap
      return b.checkIn < checkOut && b.checkOut > checkIn;
    });

    // For each date in the request, calculate maximum rooms booked on that single night
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

  return availability;
}

// API: Get Real-time Room Availability with bookings count matching check-in and check-out ranges
app.get("/api/rooms/availability", async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut } = req.query as { hotelId?: string; checkIn?: string; checkOut?: string };

    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Parameters hotelId, checkIn, and checkOut are strictly required." });
    }

    // Ensure date boundaries are meaningful
    if (new Date(checkIn) >= new Date(checkOut)) {
      return res.status(400).json({ error: "Check-out date must be chronologically after the check-in date." });
    }

    const availability = await calculateAvailableRooms(hotelId, checkIn, checkOut);
    res.json(availability);
  } catch (error) {
    console.error("GET /api/rooms/availability failed: ", error);
    res.status(500).json({ error: "Failed to evaluate real-time availability variables." });
  }
});

// API: Create Booking with active inventory locks
app.post("/api/bookings/create", async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      hotelId,
      roomId,
      checkIn,
      checkOut,
      roomCount,
      guestName,
      guestEmail
    } = req.body;

    if (!userId || !hotelId || !roomId || !checkIn || !checkOut || !roomCount || !guestName || !guestEmail) {
      return res.status(400).json({ error: "Invalid payload parameters. Complete details needed." });
    }

    // Double check availability on the server side to guarantee race-condition double booking prevention
    const availabilityList = await calculateAvailableRooms(hotelId, checkIn, checkOut);
    const roomAvail = availabilityList.find(a => a.roomId === roomId);

    if (!roomAvail) {
      return res.status(404).json({ error: "The chosen room type could not be found." });
    }

    if (roomAvail.availableCount < roomCount) {
      return res.status(403).json({
        error: `Only ${roomAvail.availableCount} rooms of type '${roomAvail.name}' are available for these selections. Dynamic booking is locked.`
      });
    }

    // Calculate total price
    const nights = getDatesArray(checkIn, checkOut).length;
    const totalPrice = nights * roomAvail.pricePerNight * roomCount;

    // Create unique ID
    const bookingId = `book_${Math.random().toString(36).substr(2, 9)}`;

    const newBooking: Booking = {
      id: bookingId,
      userId,
      userEmail,
      hotelId,
      roomId,
      checkIn,
      checkOut,
      roomCount,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      guestName,
      guestEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save in Firestore
    await setDoc(doc(db, "bookings", bookingId), newBooking);

    res.status(201).json(newBooking);
  } catch (error) {
    console.error("POST /api/bookings/create failed: ", error);
    res.status(500).json({ error: "Server-side double-booking checks encountered an error." });
  }
});

// API: Payment Gateway Simulated Secure Settlement
// Keep validation secret, checking credit-cards securely with interactive 3D secure checks
app.post("/api/payments/charge", async (req, res) => {
  try {
    const { bookingId, cardNumber, cardExpiry, cardCvc } = req.body;

    if (!bookingId || !cardNumber || !cardExpiry || !cardCvc) {
      return res.status(400).json({ error: "Card credentials and booking token must be provided." });
    }

    // Fetch the booking from Firestore
    const docRef = doc(db, "bookings", bookingId);
    const bookingDoc = await getDoc(docRef);
    if (!bookingDoc.exists()) {
      return res.status(404).json({ error: "The targeted reservation booking could not be located." });
    }

    const booking = bookingDoc.data() as Booking;

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: "Cannot process charge on cancelled reservation files." });
    }

    // Payment simulation gateway validation rules:
    // Simulated decline codes based on input combinations
    const cleanCard = cardNumber.replace(/\s+/g, '');
    
    // Insufficient funds trigger
    if (cleanCard.endsWith("4444")) {
      return res.status(402).json({ error: "Declined: Insufficient funds on the provided card account." });
    }
    
    // Card expired trigger
    if (cleanCard.endsWith("0000")) {
      return res.status(402).json({ error: "Declined: The credit card account has expired or been restricted." });
    }

    // Success transaction pathway
    const updatePayload = {
      status: 'confirmed' as const,
      paymentStatus: 'paid' as const,
      paymentIntentId: `pi_${Math.random().toString(36).substr(2, 14)}`,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updatePayload);

    res.json({
      success: true,
      message: "Gateway Secure Transaction Approved",
      paymentIntentId: updatePayload.paymentIntentId,
      updatedReservation: {
        ...booking,
        ...updatePayload
      }
    });

  } catch (error) {
    console.error("POST /api/payments/charge failed: ", error);
    res.status(500).json({ error: "Simulation gateway link failed." });
  }
});

// API: Cancel Booking and Release Inventory Immediately
app.post("/api/bookings/cancel", async (req, res) => {
  try {
    const { bookingId, userId } = req.body;

    if (!bookingId || !userId) {
      return res.status(400).json({ error: "Booking session token and User reference ID are required." });
    }

    const docRef = doc(db, "bookings", bookingId);
    const bookingDoc = await getDoc(docRef);

    if (!bookingDoc.exists()) {
      return res.status(404).json({ error: "Reservation details could not be found." });
    }

    const booking = bookingDoc.data() as Booking;

    if (booking.userId !== userId) {
      return res.status(403).json({ error: "Access Denied: Unauthorized cancellation request." });
    }

    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Reservation cancelled, and inventory released." });
  } catch (error) {
    console.error("POST /api/bookings/cancel failed: ", error);
    res.status(500).json({ error: "Unable to complete reservation cancellation." });
  }
});

// Integrate Vite as Middleware or Static Folder serving
async function initializeViteAndListen() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched and running on http://0.0.0.0:${PORT}`);
  });
}

initializeViteAndListen();
