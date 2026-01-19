
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trip, DayPlan, Stop, SavedPlace } from '../types';
import { tripService } from '../services/tripService';
import { SyncState } from '../components/SyncStatus';
import { calculateDistance } from '../utils/geoUtils';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const createDefaultTrip = (): Trip => ({ 
  id: generateId(), 
  name: '我的精彩旅行', 
  days: [{ id: generateId(), date: new Date().toISOString().split('T')[0], startTime: '09:00', stops: [] }] 
});

export const useTripData = (isAuthenticated: boolean, activeTripId: string | null) => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncState>('synced');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);
  
  const [trip, setTrip] = useState<Trip>(createDefaultTrip());

  const syncTimeoutRef = useRef<number | null>(null);

  // Load global saved places once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadSaved = async () => {
      try {
        const remoteSaved = await tripService.fetchSavedPlaces();
        setSavedPlaces(remoteSaved as any);
      } catch (e: any) {
        console.error("Load saved places error:", e?.message || e);
      }
    };
    loadSaved();
  }, [isAuthenticated]);

  // Load trip whenever activeTripId changes
  useEffect(() => {
    if (!isAuthenticated || !activeTripId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        await tripService.ensureAuthenticated();
        const remoteTrip = await tripService.fetchTripById(activeTripId);
        if (remoteTrip) {
          setTrip(remoteTrip);
          setLastSaved(new Date());
        }
      } catch (e: any) {
        const errorMsg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
        console.error("Load trip error detail:", errorMsg);
        if (e?.code === '42P01' || e?.code === '42501' || errorMsg.includes('user_id')) {
          setShowSetupModal(true);
        }
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated, activeTripId]);

  // Contextual filtering logic
  const contextualSavedPlaces = useMemo(() => {
    if (showAllSaved || !activeTripId || trip.days.length === 0) return savedPlaces;

    const tripStops = trip.days.flatMap(d => d.stops);
    if (tripStops.length === 0) return savedPlaces;

    const centerLat = tripStops.reduce((sum, s) => sum + s.location.lat, 0) / tripStops.length;
    const centerLng = tripStops.reduce((sum, s) => sum + s.location.lng, 0) / tripStops.length;

    return savedPlaces.filter(place => {
      const dist = calculateDistance(centerLat, centerLng, place.location.lat, place.location.lng);
      return dist <= 200;
    });
  }, [savedPlaces, trip, activeTripId, showAllSaved]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !activeTripId) return;
    
    if (!tripService.isReady()) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(async () => {
      try {
        await tripService.saveTrip(trip);
        setSyncStatus('synced');
        setLastSaved(new Date());
      } catch (e: any) {
        const errorMsg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
        console.error("Auto-save error detail:", errorMsg);
        if (e?.code === '42P01' || e?.code === '42501') setShowSetupModal(true);
        setSyncStatus('error');
      }
    }, 2000);
    
    return () => { if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current); };
  }, [trip, isLoading, isAuthenticated, activeTripId]);

  const updateTrip = useCallback((updater: (prev: Trip) => Trip) => setTrip(updater), []);

  const toggleSavedPlace = async (stop: Stop): Promise<{ success: boolean; isAdded: boolean }> => {
    try {
      const isAdded = await tripService.toggleSavedPlace(stop);
      const updated = await tripService.fetchSavedPlaces();
      setSavedPlaces(updated as any);
      return { success: true, isAdded };
    } catch (e: any) {
      console.error("Toggle saved place error detail:", e?.message || e);
      if (e?.code === '42P01' || e?.code === '42501') setShowSetupModal(true);
      return { success: false, isAdded: false };
    }
  };

  return { 
    trip, 
    updateTrip, 
    isLoading, 
    syncStatus, 
    lastSaved, 
    showSetupModal, 
    setShowSetupModal, 
    generateId,
    savedPlaces,
    contextualSavedPlaces,
    showAllSaved,
    setShowAllSaved,
    toggleSavedPlace
  };
};
