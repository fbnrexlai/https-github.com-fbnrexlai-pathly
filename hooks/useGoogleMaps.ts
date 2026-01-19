import { useState, useCallback } from 'react';
import { Stop, TravelMode } from '../types';
import { tripService } from '../services/tripService';

const API_KEY = "AIzaSyBkmr2ZkRC3SXQI2Py8Q9AdC6KQBdD6FRc";

interface TransitData {
  duration: string;
  durationValue: number;
  distance: string;
  mode: TravelMode;
  fareDisplay?: string;
}

export const useGoogleMaps = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const getCacheKey = (origin: Stop, dest: Stop, mode: TravelMode) => {
    const oLat = origin.location.lat.toFixed(4);
    const oLng = origin.location.lng.toFixed(4);
    const dLat = dest.location.lat.toFixed(4);
    const dLng = dest.location.lng.toFixed(4);
    return `route_v2_${oLat},${oLng}_${dLat},${dLng}_${mode}`;
  };

  const formatDuration = (secondsStr: string): string => {
    const seconds = parseInt(secondsStr.replace('s', ''), 10);
    if (isNaN(seconds)) return "0 min";
    const mins = Math.ceil(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} hr ${m} mins`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${meters} m`;
  };

  const calculateRoute = useCallback(async (stops: Stop[]): Promise<Stop[]> => {
    if (stops.length < 2) return stops;

    setIsCalculating(true);
    setApiError(null);
    const newStops = [...stops];

    for (let i = 0; i < newStops.length - 1; i++) {
      const origin = newStops[i];
      const destination = newStops[i + 1];
      const mode = origin.transitToNext?.mode || TravelMode.DRIVING;
      const cacheKey = getCacheKey(origin, destination, mode);

      let cachedData = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (!cachedData) {
        cachedData = await tripService.getCachedTransit(cacheKey);
      }

      if (cachedData) {
        newStops[i] = { ...origin, transitToNext: cachedData };
        sessionStorage.setItem(cacheKey, JSON.stringify(cachedData));
        continue;
      }

      try {
        const isDriving = mode === TravelMode.DRIVING;
        const isTransit = mode === TravelMode.TRANSIT;

        // Dynamically construct field mask
        // Note: routes.transitFare is NOT supported in Routes API v2 currently, so we cannot request it.
        const fields = ['routes.duration', 'routes.distanceMeters'];
        if (isDriving) fields.push('routes.travelAdvisory.tollInfo');

        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': fields.join(',')
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: origin.location.lat, longitude: origin.location.lng } } },
            destination: { location: { latLng: { latitude: destination.location.lat, longitude: destination.location.lng } } },
            travelMode: mode === TravelMode.TRANSIT ? 'TRANSIT' : mode === TravelMode.WALKING ? 'WALK' : 'DRIVE',
            routingPreference: isDriving ? 'TRAFFIC_AWARE' : undefined,
            // Request tolls ONLY for driving
            extraComputations: isDriving ? ['TOLLS'] : undefined,
            routeModifiers: isDriving ? {
              vehicleInfo: { emissionType: 'GASOLINE' }
            } : undefined,
            units: 'METRIC',
            languageCode: 'zh-TW'
          })
        });

        if (!response.ok) {
           console.error(`Routes API Error ${response.status}: ${await response.text()}`);
           continue;
        }

        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const durationValue = parseInt(route.duration.replace('s', ''), 10);
          
          let fareDisplay = undefined;
          
          // Note: Transit fares are not returned by Routes API v2 yet.
          
          // Handle Driving Tolls
          if (isDriving && route.travelAdvisory?.tollInfo?.estimatedPrice?.[0]) {
            const toll = route.travelAdvisory.tollInfo.estimatedPrice[0];
            const price = parseInt(toll.units || '0') + (toll.nanos || 0) / 1000000000;
            try {
                fareDisplay = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: toll.currencyCode }).format(price);
            } catch (e) {
                fareDisplay = `${toll.currencyCode} ${price.toFixed(0)}`;
            }
          }

          const transitData: TransitData = {
            duration: formatDuration(route.duration),
            durationValue: isNaN(durationValue) ? 0 : durationValue,
            distance: formatDistance(route.distanceMeters || 0),
            mode: mode,
            fareDisplay: fareDisplay
          };

          newStops[i] = { ...origin, transitToNext: transitData };
          sessionStorage.setItem(cacheKey, JSON.stringify(transitData));
          await tripService.saveCachedTransit(cacheKey, transitData);
        }
      } catch (err) {
        console.warn("Routes API error:", err);
      }
    }

    setIsCalculating(false);
    return newStops;
  }, []);

  return { calculateRoute, isCalculating, apiError };
};