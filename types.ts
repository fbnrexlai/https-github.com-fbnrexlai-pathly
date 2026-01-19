
export enum TravelMode {
  WALKING = 'WALKING',
  TRANSIT = 'TRANSIT',
  DRIVING = 'DRIVING'
}

export interface Stop {
  id: string;
  name: string;
  address: string;
  placeId?: string;
  note?: string;
  phoneNumber?: string;
  location: {
    lat: number;
    lng: number;
  };
  openingHours?: string[];
  businessStatus?: string;
  stayDuration: number; // Duration in minutes
  transitToNext?: {
    duration: string;
    durationValue: number; // in seconds
    distance: string;
    mode: TravelMode;
    fareDisplay?: string; 
  };
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  placeId: string;
  location: {
    lat: number;
    lng: number;
  };
  phoneNumber?: string;
  openingHours?: string[];
  businessStatus?: string;
  note?: string;
  createdAt: string;
}

export interface DayPlan {
  id: string;
  date: string; // ISO string representation of the date
  startTime: string; // "HH:mm" format
  stops: Stop[];
}

export interface Trip {
  id: string;
  name: string;
  days: DayPlan[];
}
