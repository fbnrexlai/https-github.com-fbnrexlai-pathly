
import React, { useMemo, useState } from 'react';
import { Trip, DayPlan, Stop, TravelMode } from '../types';
import { createSafeDate } from '../utils/timeUtils';
import * as htmlToImage from 'html-to-image';
import { DropResult } from '@hello-pangea/dnd';

interface UseTripLogicProps {
  trip: Trip;
  activeDay: DayPlan;
  updateTrip: (updater: (prev: Trip) => Trip) => void;
  calculateRoute: (stops: Stop[]) => Promise<Stop[]>;
  generateId: () => string;
  showFeedback: (msg: string) => void;
  exportRef: React.RefObject<HTMLDivElement>;
}

export const useTripLogic = ({
  trip,
  activeDay,
  updateTrip,
  calculateRoute,
  generateId,
  showFeedback,
  exportRef
}: UseTripLogicProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    updateTrip(prev => {
      const dayIdx = prev.days.findIndex(d => d.id === activeDay.id);
      if (dayIdx === -1) return prev;

      const updatedDays = [...prev.days];
      const baseDate = new Date(newDate);
      if (isNaN(baseDate.getTime())) return prev;

      for (let i = dayIdx; i < updatedDays.length; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + (i - dayIdx));
        updatedDays[i] = {
          ...updatedDays[i],
          date: d.toISOString().split('T')[0]
        };
      }
      return { ...prev, days: updatedDays };
    });
  };

  const handleAddStop = async (place: any | Stop) => {
    const targetDayId = activeDay.id;
    const isSaved = (place as Stop).id !== undefined && (place as Stop).placeId !== undefined;
    
    const newStop: Stop = isSaved ? { ...(place as Stop), id: generateId(), transitToNext: undefined } : {
      id: generateId(),
      name: place.name || '未命名',
      address: place.formatted_address || '',
      placeId: place.place_id,
      phoneNumber: place.formatted_phone_number,
      location: { 
        lat: typeof place.geometry?.location?.lat === 'function' ? place.geometry.location.lat() : (place.geometry?.location?.lat || place.location?.lat), 
        lng: typeof place.geometry?.location?.lng === 'function' ? place.geometry.location.lng() : (place.geometry?.location?.lng || place.location?.lng) 
      },
      openingHours: place.opening_hours?.weekday_text,
      businessStatus: place.business_status,
      stayDuration: 60,
      note: ''
    };

    updateTrip(prev => ({ 
      ...prev, 
      days: prev.days.map(d => d.id === targetDayId ? { ...d, stops: [...d.stops, newStop] } : d) 
    }));

    const currentDay = trip.days.find(d => d.id === targetDayId);
    if (currentDay) {
      const stopsToCalculate = [...currentDay.stops, newStop];
      const updatedStops = await calculateRoute(stopsToCalculate);
      updateTrip(prev => ({ 
        ...prev, 
        days: prev.days.map(d => d.id === targetDayId ? { ...d, stops: updatedStops } : d) 
      }));
    }
    showFeedback(`已加入: ${newStop.name}`);
  };

  const deleteStop = async (dayId: string, stopId: string) => {
    updateTrip(p => ({ 
      ...p, 
      days: p.days.map(d => d.id === dayId ? { ...d, stops: d.stops.filter(x => x.id !== stopId) } : d) 
    }));

    const day = trip.days.find(d => d.id === dayId);
    if (day) {
       const remainingStops = day.stops.filter(x => x.id !== stopId);
       if (remainingStops.length >= 2) {
           const updatedStops = await calculateRoute(remainingStops);
           updateTrip(p => ({ 
             ...p, 
             days: p.days.map(d => d.id === dayId ? { ...d, stops: updatedStops } : d) 
           }));
       }
    }
  };

  const handleMoveStop = async (dayId: string, index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const day = trip.days.find(d => d.id === dayId);
    if (!day || targetIdx < 0 || targetIdx >= day.stops.length) return;

    const newStops = [...day.stops];
    [newStops[index], newStops[targetIdx]] = [newStops[targetIdx], newStops[index]];

    updateTrip(p => ({
      ...p,
      days: p.days.map(d => d.id === dayId ? { ...d, stops: newStops } : d)
    }));

    if (newStops.length >= 2) {
      const routedStops = await calculateRoute(newStops);
      updateTrip(p => ({
        ...p,
        days: p.days.map(d => d.id === dayId ? { ...d, stops: routedStops } : d)
      }));
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const dayId = activeDay.id;
    const newStops = [...activeDay.stops];
    const [movedStop] = newStops.splice(sourceIndex, 1);
    newStops.splice(destIndex, 0, movedStop);

    updateTrip(p => ({
      ...p,
      days: p.days.map(d => d.id === dayId ? { ...d, stops: newStops } : d)
    }));

    if (newStops.length >= 2) {
      const routedStops = await calculateRoute(newStops);
      updateTrip(p => ({
        ...p,
        days: p.days.map(d => d.id === dayId ? { ...d, stops: routedStops } : d)
      }));
    }
  };

  const handleExport = async (dayNumber: number) => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const link = document.createElement('a');
      link.download = `${trip.name}_Day${dayNumber}.jpg`;
      link.href = await htmlToImage.toJpeg(exportRef.current, { quality: 0.95, backgroundColor: '#f8fafc', pixelRatio: 2 });
      link.click();
    } finally { 
      setIsExporting(false); 
    }
  };

  const timeline = useMemo(() => {
    const startDateTime = createSafeDate(activeDay.date, activeDay.startTime);
    if (!startDateTime) return [];
    
    let cur = new Date(startDateTime);
    return activeDay.stops.map(s => {
      const arr = new Date(cur);
      const dep = new Date(arr.getTime() + s.stayDuration * 60000);
      cur = new Date(dep.getTime() + (s.transitToNext?.durationValue || 0) * 1000);
      return { 
        arrival: arr.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }), 
        departure: dep.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) 
      };
    });
  }, [activeDay.date, activeDay.startTime, activeDay.stops]);

  const parseFare = (fareStr: string | undefined): { val: number, code: string } => {
    if (!fareStr) return { val: 0, code: 'TWD' };
    const numericPart = fareStr.replace(/[^\d.]/g, '');
    const val = parseFloat(numericPart);
    let code = 'TWD';
    if (fareStr.includes('￥') || fareStr.includes('JPY')) code = 'JPY';
    else if (fareStr.includes('US$') || fareStr.includes('USD')) code = 'USD';
    else if (fareStr.includes('HK$') || fareStr.includes('HKD')) code = 'HKD';
    else if (fareStr.includes('NT$') || fareStr.includes('TWD')) code = 'TWD';
    return { val: isNaN(val) ? 0 : val, code };
  };

  const formatCurrency = (val: number, code: string) => {
    try {
      return new Intl.NumberFormat('zh-TW', { 
        style: 'currency', 
        currency: code,
        maximumFractionDigits: 0 
      }).format(val);
    } catch (e) {
      return `${code} ${val.toLocaleString()}`;
    }
  };

  const summary = useMemo(() => {
    if (!activeDay.stops || activeDay.stops.length === 0) return null;
    
    let totalTransitSeconds = 0;
    let totalDistanceMeters = 0;
    let dayTollSum = 0;
    let currencyCode = 'TWD'; 

    activeDay.stops.forEach(s => {
      if (s.transitToNext) {
        totalTransitSeconds += s.transitToNext.durationValue || 0;
        const distStr = s.transitToNext.distance || "";
        if (distStr.includes('km')) totalDistanceMeters += parseFloat(distStr.replace(' km', '')) * 1000;
        else if (distStr.includes(' m')) totalDistanceMeters += parseFloat(distStr.replace(' m', ''));

        if (s.transitToNext.fareDisplay) {
          const { val, code } = parseFare(s.transitToNext.fareDisplay);
          dayTollSum += val;
          currencyCode = code;
        }
      }
    });

    const transitMins = Math.floor(totalTransitSeconds / 60);
    const totalDistanceKm = (totalDistanceMeters / 1000).toFixed(1);

    // Also calculate grand total for the entire trip
    let tripTollSum = 0;
    trip.days.forEach(d => {
      d.stops.forEach(s => {
        if (s.transitToNext?.fareDisplay) {
          const { val } = parseFare(s.transitToNext.fareDisplay);
          tripTollSum += val;
        }
      });
    });

    return { 
      totalStops: activeDay.stops.length, 
      startTime: activeDay.startTime, 
      endTime: timeline[timeline.length - 1]?.departure || '--:--', 
      transitDisplay: transitMins >= 60 ? `${Math.floor(transitMins / 60)}h ${transitMins % 60}m` : `${transitMins}m`,
      totalDistance: `${totalDistanceKm} km`,
      dayCost: dayTollSum > 0 ? formatCurrency(dayTollSum, currencyCode) : null,
      tripCost: tripTollSum > 0 ? formatCurrency(tripTollSum, currencyCode) : null
    };
  }, [activeDay, timeline, trip.days]);

  return {
    handleDateChange,
    handleAddStop,
    deleteStop,
    handleMoveStop,
    handleDragEnd,
    handleExport,
    isExporting,
    timeline,
    summary
  };
};
