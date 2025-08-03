// User types
export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'farmer' | 'expert' | 'admin';
  profile: UserProfile;
  preferences: UserPreferences;
  lastLogin?: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface UserProfile {
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  farmSize?: number;
  farmType?: 'organic' | 'conventional' | 'mixed';
  experience?: number;
  crops?: string[];
  avatar?: string;
  bio?: string;
  expertise?: string[];
  verified?: boolean;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  language: string;
  units: {
    temperature: 'celsius' | 'fahrenheit';
    area: 'acres' | 'hectares';
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  mobile: string;
  role?: 'farmer' | 'expert';
  profile?: Partial<UserProfile>;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// Crop types
export interface Crop {
  _id: string;
  farmer: string | User;
  name: string;
  variety?: string;
  category: 'grains' | 'vegetables' | 'fruits' | 'pulses' | 'spices' | 'cash_crops' | 'other';
  quantity: {
    value: number;
    unit: 'kg' | 'quintal' | 'ton' | 'piece' | 'dozen' | 'bag';
  };
  price: {
    value: number;
    unit: 'per_kg' | 'per_quintal' | 'per_ton' | 'per_piece' | 'per_dozen' | 'per_bag' | 'total';
  };
  description?: string;
  images?: string[];
  location: {
    address?: string;
    city: string;
    state: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  harvestDate: Date;
  availableFrom: Date;
  availableUntil: Date;
  quality: {
    grade: 'A' | 'B' | 'C' | 'Premium';
    organic: boolean;
    certifications?: string[];
  };
  status: 'available' | 'sold' | 'reserved' | 'expired';
  inquiries: CropInquiry[];
  views: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CropInquiry {
  _id: string;
  buyer: string | User;
  message: string;
  contactInfo: {
    phone?: string;
    email?: string;
  };
  createdAt: Date;
  status: 'pending' | 'responded' | 'closed';
}

// Expense types
export interface Expense {
  _id: string;
  farmer: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  subcategory?: string;
  date: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'credit';
  vendor?: {
    name?: string;
    contact?: string;
    address?: string;
  };
  receipt?: {
    number?: string;
    image?: string;
  };
  tags?: string[];
  season?: 'kharif' | 'rabi' | 'summer' | 'year_round';
  cropRelated?: {
    crop?: string;
    area?: number;
  };
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    endDate?: Date;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseCategory = 
  | 'seeds'
  | 'fertilizers'
  | 'pesticides'
  | 'labor'
  | 'equipment'
  | 'fuel'
  | 'irrigation'
  | 'transportation'
  | 'storage'
  | 'marketing'
  | 'insurance'
  | 'taxes'
  | 'utilities'
  | 'veterinary'
  | 'feed'
  | 'maintenance'
  | 'other';

// Sensor types
export interface Sensor {
  _id: string;
  farmer: string;
  deviceId: string;
  name: string;
  type: 'weather_station' | 'soil_sensor' | 'irrigation_sensor' | 'greenhouse_sensor' | 'multi_sensor';
  location: {
    name?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    address?: string;
    fieldArea?: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  batteryLevel?: number;
  signalStrength?: number;
  lastReading?: SensorReading;
  readings: SensorReading[];
  alerts: SensorAlert[];
  thresholds?: SensorThresholds;
  metadata?: {
    manufacturer?: string;
    model?: string;
    firmware?: string;
    installationDate?: Date;
    warrantyExpiry?: Date;
    maintenanceSchedule?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorReading {
  _id?: string;
  timestamp: Date;
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  humidity?: {
    value: number;
    unit: string;
  };
  soilMoisture?: {
    value: number;
    unit: string;
  };
  pH?: {
    value: number;
    unit: string;
  };
  lightIntensity?: {
    value: number;
    unit: string;
  };
  soilTemperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  electricalConductivity?: {
    value: number;
    unit: string;
  };
  windSpeed?: {
    value: number;
    unit: string;
  };
  windDirection?: {
    value: number;
    unit: string;
  };
  rainfall?: {
    value: number;
    unit: string;
  };
  atmosphericPressure?: {
    value: number;
    unit: string;
  };
}

export interface SensorAlert {
  _id: string;
  type: 'low_battery' | 'sensor_offline' | 'abnormal_reading' | 'maintenance_due';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface SensorThresholds {
  temperature?: {
    min?: number;
    max?: number;
  };
  humidity?: {
    min?: number;
    max?: number;
  };
  soilMoisture?: {
    min?: number;
    max?: number;
  };
  pH?: {
    min?: number;
    max?: number;
  };
}

// Weather types
export interface WeatherData {
  location: {
    name: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    windSpeed: number;
    windDirection: number;
    description: string;
    icon: string;
    clouds: number;
    sunrise: number;
    sunset: number;
    timestamp: number;
  };
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
}

export interface WeatherForecast {
  date: number;
  temperature: {
    min: number;
    max: number;
    current: number;
  };
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  clouds: number;
  rain: number;
}

export interface WeatherAlert {
  type: string;
  severity: string;
  description: string;
  start: number;
  end: number;
}

// Chat types
export interface Chat {
  _id: string;
  participants: ChatParticipant[];
  type: 'consultation' | 'support' | 'group';
  title: string;
  description?: string;
  category: ChatCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'closed' | 'pending';
  messages: ChatMessage[];
  lastMessage?: {
    content: string;
    sender: string;
    timestamp: Date;
  };
  tags?: string[];
  rating?: {
    score: number;
    feedback?: string;
    ratedBy: string;
    ratedAt: Date;
  };
  metadata?: {
    farmLocation?: {
      city?: string;
      state?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    cropType?: string;
    farmSize?: number;
    urgencyLevel?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  user: string | User;
  role: 'farmer' | 'expert' | 'admin';
  joinedAt: Date;
  leftAt?: Date;
}

export interface ChatMessage {
  _id: string;
  sender: string | User;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  attachments?: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }[];
  readBy: {
    user: string;
    readAt: Date;
  }[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export type ChatCategory = 
  | 'crop_disease'
  | 'pest_control'
  | 'soil_health'
  | 'irrigation'
  | 'fertilization'
  | 'weather'
  | 'market_prices'
  | 'government_schemes'
  | 'technology'
  | 'general';

// Tip types
export interface Tip {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'article' | 'video' | 'infographic' | 'tutorial' | 'guide';
  category: TipCategory;
  subcategory?: string;
  tags: string[];
  author: string | User;
  media: {
    images?: string[];
    videos?: {
      url: string;
      thumbnail?: string;
      duration?: number;
      provider?: string;
    }[];
    documents?: {
      url: string;
      filename: string;
      size: number;
    }[];
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  language: string;
  crops?: string[];
  regions?: string[];
  seasons?: ('kharif' | 'rabi' | 'summer' | 'year_round')[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  views: number;
  likes: {
    user: string;
    likedAt: Date;
  }[];
  comments: TipComment[];
  rating: {
    average: number;
    count: number;
    ratings: {
      user: string;
      score: number;
      review?: string;
      createdAt: Date;
    }[];
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TipComment {
  _id: string;
  user: string | User;
  content: string;
  createdAt: Date;
  replies: {
    _id: string;
    user: string | User;
    content: string;
    createdAt: Date;
  }[];
}

export type TipCategory = 
  | 'crop_management'
  | 'pest_control'
  | 'soil_health'
  | 'irrigation'
  | 'fertilization'
  | 'weather'
  | 'technology'
  | 'market_trends'
  | 'government_schemes'
  | 'organic_farming'
  | 'sustainable_practices'
  | 'equipment'
  | 'storage'
  | 'processing';

// Crop Advisor types
export interface CropRecommendation {
  name: string;
  score: number;
  reasons: string[];
  details: {
    seasons: string[];
    soilTypes: string[];
    regions: string[];
    fertilizers: string[];
    waterRequirement: string;
    duration: string;
    yield: string;
    tips: string[];
    estimatedCost: number;
    estimatedRevenue: number;
    riskLevel: string;
  };
}

export interface CropAdvisorRequest {
  soilType: string;
  region: string;
  season: string;
  farmSize: number;
  budget?: number;
  experience?: string;
  waterAvailability?: string;
}

export interface CropAdvisorResponse {
  recommendations: CropRecommendation[];
  generalTips: string[];
  inputParameters: CropAdvisorRequest;
  disclaimer: string;
}

// Dashboard types
export interface DashboardStats {
  crops: {
    total: number;
    active: number;
    sold: number;
    revenue: number;
  };
  expenses: {
    thisMonth: number;
    lastMonth: number;
    change: number;
    count: number;
    breakdown: {
      _id: string;
      total: number;
      count: number;
    }[];
  };
  sensors: {
    active: number;
    total: number;
  };
  consultations: {
    pending: number;
    total: number;
  };
  recentActivity: {
    expenses: Expense[];
    crops: Crop[];
  };
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

// Socket.io types
export interface SocketEvents {
  'sensor-data': (data: any) => void;
  'new-message': (data: any) => void;
  'new-inquiry': (data: any) => void;
  'chat-status-updated': (data: any) => void;
  'new-consultation': (data: any) => void;
}

// Report types
export interface ReportData {
  farmer: string;
  generatedAt: Date;
  period?: string;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  [key: string]: any;
}