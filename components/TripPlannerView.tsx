
import React, { useState, useRef, useMemo } from 'react';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';
import { Trip, DayPlan, Stop, TravelMode } from '../types';
import { AppSidebar } from './AppSidebar';
import { TripHeader } from './TripHeader';
import { MapPreview } from './MapPreview';
import { DaySummary } from './DaySummary';
import { AutocompleteInput } from './AutocompleteInput';
import { Timeline } from './Timeline';
import { MobileNav } from './MobileNav';
import { SyncStatus } from './SyncStatus';
import { SyncState } from './SyncStatus';
import { useTripLogic } from '../hooks/useTripLogic';
import { useWeather, WeatherData } from '../hooks/useWeather';
import { checkWeatherConflicts } from '../utils/weatherUtils';
import { TripShareModal } from './TripShareModal';

// Set to true to force warnings for testing
const ENABLE_MOCK_STORM = false;

const MOCK_STORM_DATA: WeatherData = {
  tempMax: 20,
  tempMin: 15,
  weatherCode: 95,
  isHistorical: false,
  hourly: {
    precipitation_probability: Array(24).fill(99),
    weather_code: Array(24).fill(95),
    time: Array(24).fill("").map((_, i) => `2024-01-01T${i.toString().padStart(2, '0')}:00`)
  }
};

interface TripPlannerViewProps {
  trip: Trip;
  activeDayId: string;
  setActiveDayId: (id: string) => void;
  updateTrip: (updater: (prev: Trip) => Trip) => void;
  isLoading: boolean;
  syncStatus: SyncState;
  lastSaved?: Date;
  savedPlaces: any[];
  contextualSavedPlaces: any[];
  showAllSaved: boolean;
  setShowAllSaved: (val: boolean) => void;
  toggleSavedPlace: (stop: Stop) => Promise<{ success: boolean; isAdded: boolean }>;
  calculateRoute: (stops: Stop[]) => Promise<Stop[]>;
  generateId: () => string;
  isCalculating: boolean;
  onBack: () => void;
  onLogout: () => void;
  showFeedback: (msg: string) => void;
  setConfirm: (config: any) => void;
}

export const TripPlannerView: React.FC<TripPlannerViewProps> = (props) => {
  const { 
    trip, activeDayId, setActiveDayId, updateTrip, isLoading, 
    syncStatus, lastSaved, savedPlaces, contextualSavedPlaces,
    showAllSaved, setShowAllSaved, toggleSavedPlace, 
    calculateRoute, generateId, isCalculating, onBack, 
    onLogout, showFeedback, setConfirm 
  } = props;

  const exportRef = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState({ sidebar: false, map: true, editingNote: null as string | null, shareModal: false });

  const activeDayIndex = trip.days.findIndex(d => d.id === activeDayId);
  const activeDay = activeDayIndex !== -1 ? trip.days[activeDayIndex] : trip.days[0] || { id: 'dummy', date: '', startTime: '', stops: [] };
  const dayDisplayNumber = activeDayIndex !== -1 ? activeDayIndex + 1 : 1;

  const {
    handleDateChange,
    handleAddStop,
    deleteStop,
    handleMoveStop,
    handleDragEnd,
    handleExport,
    isExporting,
    timeline,
    summary
  } = useTripLogic({
    trip, activeDay, updateTrip, calculateRoute, generateId, showFeedback, exportRef
  });

  const refLocation = useMemo(() => {
    if (activeDay.stops && activeDay.stops.length > 0) {
      return activeDay.stops[0].location;
    }
    for (const day of trip.days) {
      if (day.stops && day.stops.length > 0) {
        return day.stops[0].location;
      }
    }
    return undefined;
  }, [activeDay.stops, trip.days]);

  const { weather: realWeather } = useWeather(refLocation?.lat, refLocation?.lng, activeDay.date);
  
  const weatherToUse = ENABLE_MOCK_STORM ? MOCK_STORM_DATA : realWeather;

  const weatherConflicts = useMemo(() => {
    return checkWeatherConflicts(activeDay.stops, timeline, weatherToUse);
  }, [activeDay.stops, timeline, weatherToUse]);

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-56 bg-slate-50 dark:bg-slate-950 overflow-x-hidden transition-colors duration-300">
      <AppSidebar 
        trip={trip} 
        activeDayId={activeDay.id} 
        isOpen={ui.sidebar} 
        onClose={() => setUi(s => ({ ...s, sidebar: false }))} 
        onDaySelect={(id) => { setActiveDayId(id); setUi(s => ({ ...s, sidebar: false })); window.scrollTo(0, 0); }} 
        savedPlaces={contextualSavedPlaces} 
        showAllSaved={showAllSaved}
        onToggleShowAll={setShowAllSaved}
        onSavedPlaceAdd={handleAddStop} 
        onLogout={onLogout} 
        onDayDelete={(id) => setConfirm({ 
          isOpen: true, title: "刪除行程", message: "確定刪除嗎？", isDanger: true, 
          onConfirm: () => updateTrip(p => ({ ...p, days: p.days.filter(d => d.id !== id) })) 
        })} 
        onDayAdd={() => { 
          const lastDay = trip.days[trip.days.length - 1];
          const nextDate = new Date(lastDay.date);
          nextDate.setDate(nextDate.getDate() + 1);
          const n = { id: generateId(), date: nextDate.toISOString().split('T')[0], startTime: '09:00', stops: [] }; 
          updateTrip(p => ({ ...p, days: [...p.days, n] })); 
          setActiveDayId(n.id); 
          showFeedback("Day Created"); 
        }} 
        onClearData={() => {}} 
      />
      
      <div className="fixed top-0 left-0 right-0 h-12 md:pl-56 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-[40] flex items-center justify-between px-4 transition-colors duration-300">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-bold text-sm transition-colors">
          <ChevronLeft className="w-5 h-5" />
          返回列表
        </button>

        <button 
          onClick={() => setUi(s => ({ ...s, shareModal: true }))}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-tight shadow-md transition-all active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>共用行程</span>
        </button>
      </div>

      <div ref={exportRef} className="bg-slate-50 dark:bg-slate-950 min-h-screen pt-14 transition-colors duration-300">
        <main className="max-w-xl mx-auto p-3 md:py-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="text-slate-400 font-bold">同步行程資料中...</div>
            </div>
          ) : (
            <>
              <TripHeader 
                tripName={trip.name} 
                onNameChange={n => updateTrip(p => ({ ...p, name: n }))} 
                activeDayDate={activeDay.date} 
                onDateChange={handleDateChange} 
                activeDayStartTime={activeDay.startTime} 
                onStartTimeChange={t => updateTrip(p => ({ ...p, days: p.days.map(x => x.id === activeDay.id ? { ...x, startTime: t } : x) }))} 
                showMap={ui.map} 
                onToggleMap={() => setUi(s => ({ ...s, map: !ui.map }))} 
                onExport={() => handleExport(dayDisplayNumber)} 
                isExporting={isExporting} 
                hasActiveDay={!!activeDay.date} 
                hasStops={activeDay.stops && activeDay.stops.length > 0} 
                activeDayNumber={dayDisplayNumber}
                firstStopLocation={refLocation} 
              />
              <div className="flex justify-between px-1 mb-4">
                <SyncStatus status={syncStatus} lastSaved={lastSaved} />
              </div>
              {ui.map && activeDay.stops && activeDay.stops.length > 0 && <MapPreview stops={activeDay.stops} currentDate={activeDay.date} />}
              <DaySummary daySummary={summary} isCalculating={isCalculating} />
              <AutocompleteInput onPlaceSelected={handleAddStop} className="mb-6" />
              <Timeline 
                activeDay={activeDay} 
                activeDayId={activeDay.id} 
                timeline={timeline} 
                isCalculating={isCalculating}
                editingNoteId={ui.editingNote} 
                setEditingNoteId={id => setUi(s => ({ ...s, editingNote: id }))} 
                savedPlaces={savedPlaces} 
                onToggleSavePlace={async s => {
                  const result = await toggleSavedPlace(s);
                  if (result.success) {
                    showFeedback(result.isAdded ? "已收藏地點" : "已移除收藏");
                  }
                }} 
                onDeleteStop={(dId, sId) => setConfirm({ 
                  isOpen: true, title: "移除景點", message: "確定要移除這個景點嗎？", isDanger: true, 
                  onConfirm: () => deleteStop(dId, sId) 
                })}
                onUpdateNote={(dId, sId, n) => updateTrip(p => ({ ...p, days: p.days.map(d => d.id === dId ? { ...d, stops: d.stops.map(x => x.id === sId ? { ...x, note: n } : x) } : d) }))} 
                onUpdateDuration={(dId, sId, dur) => updateTrip(p => ({ ...p, days: p.days.map(d => d.id === dId ? { ...d, stops: d.stops.map(x => x.id === sId ? { ...x, stayDuration: dur } : x) } : d) }))} 
                onUpdateTransitMode={async (dId, sId, m) => {
                  updateTrip(p => ({ ...p, days: p.days.map(d => d.id === dId ? { ...d, stops: d.stops.map(x => x.id === sId ? { ...x, transitToNext: { ...(x.transitToNext || { duration: '...', durationValue: 0, distance: '...', mode: m }), mode: m } } : x) } : d) }));
                  const day = trip.days.find(d => d.id === dId);
                  if (day) {
                    const updatedStops = await calculateRoute(day.stops.map(s => s.id === sId ? { ...s, transitToNext: s.transitToNext ? { ...s.transitToNext, mode: m } : { duration: '0s', durationValue: 0, distance: '0m', mode: m } } : s));
                    updateTrip(p => ({ ...p, days: p.days.map(d => d.id === dId ? { ...d, stops: updatedStops } : d) }));
                  }
                }} 
                onOpenMap={(o, d) => window.open(`https://www.google.com/maps/dir/?api=1&origin=${o.address}&destination=${d.address}`, '_blank')} 
                weatherConflicts={weatherConflicts}
                onDragEnd={handleDragEnd}
                onMoveStop={handleMoveStop}
              />
            </>
          )}
        </main>
      </div>
      <MobileNav 
        onShowItinerary={() => setUi(s => ({ ...s, sidebar: false }))} 
        onToggleMap={() => setUi(s => ({ ...s, map: !ui.map }))} 
        onToggleDays={() => setUi(s => ({ ...s, sidebar: !ui.sidebar }))} 
        showMap={ui.map} 
        isSidebarOpen={ui.sidebar} 
      />
      
      <TripShareModal 
        isOpen={ui.shareModal} 
        onClose={() => setUi(s => ({ ...s, shareModal: false }))} 
        tripId={trip.id} 
        tripName={trip.name} 
      />
    </div>
  );
};
