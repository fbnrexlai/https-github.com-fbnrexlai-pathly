
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Trip, DayPlan, Stop } from '../types';

export const tripService = {
  isReady(): boolean {
    return isSupabaseConfigured();
  },

  async getSessionUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  },

  async ensureAuthenticated() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error("No active session");
    return session.user;
  },

  async fetchTripById(tripId: string): Promise<Trip | null> {
    if (!this.isReady()) return null;
    const user = await this.getSessionUser();
    if (!user) return null;

    // Fetch trip. We don't filter by user_id here because RLS handles 
    // access for both owners and collaborators.
    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        name,
        user_id,
        days:day_plans (
          id, date, startTime:start_time, order_index,
          stops (
            id, name, address, placeId:place_id, note, phoneNumber:phone_number,
            lat, lng, openingHours:opening_hours, businessStatus:business_status,
            stayDuration:stay_duration, transitToNext:transit_to_next, order_index
          )
        )
      `)
      .eq('id', tripId)
      .maybeSingle();

    if (error || !data) return null;

    const transformedDays: DayPlan[] = (data.days as any[] || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(day => ({
        id: day.id,
        date: day.date,
        startTime: (day.startTime || '09:00').slice(0, 5),
        stops: (day.stops as any[] || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(stop => ({
            ...stop,
            location: { lat: stop.lat, lng: stop.lng }
          }))
      }));

    return { id: data.id, name: data.name, days: transformedDays };
  },

  async saveTrip(trip: Trip): Promise<void> {
    if (!this.isReady()) return;
    const user = await this.getSessionUser();
    if (!user) return;
    
    // CRITICAL FIX: To prevent ownership hijacking, we first check if the trip exists.
    // If it exists, we only update the name and timestamp.
    // We do NOT send the user_id in the upsert for existing trips because that would
    // overwrite the original owner if a collaborator is the one saving.
    
    const { data: existingTrip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', trip.id)
      .maybeSingle();

    const tripData: any = { 
      id: trip.id, 
      name: trip.name,
      updated_at: new Date().toISOString()
    };

    // Only set user_id if it's a brand new trip
    if (!existingTrip) {
      tripData.user_id = user.id;
    }

    const { error: tripError } = await supabase.from('trips').upsert(tripData);
    if (tripError) throw tripError;

    const currentDayIds = trip.days.map(d => d.id);
    const dayRows = trip.days.map((day, idx) => ({
      id: day.id,
      trip_id: trip.id,
      date: day.date,
      start_time: day.startTime,
      order_index: idx
    }));

    const stopRows: any[] = [];
    trip.days.forEach((day) => {
      day.stops.forEach((stop, sIdx) => {
        stopRows.push({
          id: stop.id,
          day_plan_id: day.id,
          name: stop.name,
          address: stop.address || null,
          place_id: stop.placeId || null,
          note: stop.note || null,
          phone_number: stop.phoneNumber || null,
          lat: stop.location.lat,
          lng: stop.location.lng,
          opening_hours: stop.openingHours || null,
          business_status: stop.businessStatus || null,
          stay_duration: stop.stayDuration,
          transit_to_next: stop.transitToNext || null,
          order_index: sIdx
        });
      });
    });

    const { data: existingDays } = await supabase.from('day_plans').select('id').eq('trip_id', trip.id);
    const dayIdsToDelete = existingDays?.filter(ed => !currentDayIds.includes(ed.id)).map(ed => ed.id) || [];
    
    if (dayIdsToDelete.length > 0) {
      await supabase.from('day_plans').delete().in('id', dayIdsToDelete);
    }

    if (dayRows.length > 0) {
      const { error: dayError } = await supabase.from('day_plans').upsert(dayRows);
      if (dayError) throw dayError;
    }

    if (currentDayIds.length > 0) {
      const allStopIds = stopRows.map(s => s.id);
      const deleteQuery = supabase.from('stops').delete().in('day_plan_id', currentDayIds);
      if (allStopIds.length > 0) {
        deleteQuery.filter('id', 'not.in', `(${allStopIds.join(',')})`);
      }
      await deleteQuery;
    }

    if (stopRows.length > 0) {
      const { error: stopError } = await supabase.from('stops').upsert(stopRows);
      if (stopError) throw stopError;
    }
  },

  async fetchSavedPlaces(): Promise<Stop[]> {
    if (!this.isReady()) return [];
    const user = await this.getSessionUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        address: s.address || '',
        placeId: s.place_id,
        location: { lat: s.lat, lng: s.lng },
        phoneNumber: s.phone_number || '',
        openingHours: s.opening_hours || [],
        businessStatus: s.business_status || '',
        stayDuration: s.stay_duration || 60,
        note: s.note || ''
      }));
    } catch (e) {
      return [];
    }
  },

  async toggleSavedPlace(stop: Stop): Promise<boolean> {
    const placeId = stop.placeId;
    if (!placeId) throw new Error("Missing placeId");

    const user = await this.getSessionUser();
    if (!user) return false;

    const { data: existing, error: fetchError } = await supabase
      .from('saved_places')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', placeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const { error: delError } = await supabase
        .from('saved_places')
        .delete()
        .eq('id', existing.id);
      if (delError) throw delError;
      return false;
    } else {
      const insertData = {
        user_id: user.id,
        place_id: placeId,
        name: stop.name,
        address: stop.address || '',
        lat: stop.location.lat,
        lng: stop.location.lng,
        phone_number: stop.phoneNumber || null,
        opening_hours: Array.isArray(stop.openingHours) ? stop.openingHours : null,
        business_status: stop.businessStatus || null,
        stay_duration: stop.stayDuration || 60,
        note: stop.note || null
      };
      const { error: insError } = await supabase.from('saved_places').insert(insertData);
      if (insError) throw insError;
      return true;
    }
  },

  async getCachedPlace(placeId: string): Promise<any | null> {
    if (!this.isReady()) return null;
    const { data } = await supabase.from('cached_places').select('*').eq('place_id', placeId).single();
    if (!data) return null;
    return {
      ...data,
      place_id: data.place_id,
      formatted_address: data.address,
      formatted_phone_number: data.phone_number,
      opening_hours: { weekday_text: data.opening_hours },
      geometry: { location: { lat: data.lat, lng: data.lng } }
    };
  },

  async saveCachedPlace(place: any): Promise<void> {
    if (!this.isReady() || !place.place_id) return;
    const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
    const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
    
    await supabase.from('cached_places').upsert({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat,
      lng,
      phone_number: place.formatted_phone_number,
      opening_hours: place.opening_hours?.weekday_text || null,
      business_status: place.business_status,
      updated_at: new Date().toISOString()
    });
  },

  async getCachedTransit(id: string): Promise<any | null> {
    if (!this.isReady()) return null;
    const { data } = await supabase.from('cached_transit').select('data').eq('id', id).single();
    return data?.data || null;
  },

  async saveCachedTransit(id: string, data: any): Promise<void> {
    if (!this.isReady()) return;
    await supabase.from('cached_transit').upsert({ id, data, updated_at: new Date().toISOString() });
  }
};
