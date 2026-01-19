
import React from 'react';
import { Edit2, Loader2, Download, CalendarDays, Clock, Map as MapIcon, Flag } from 'lucide-react';
import { getDayInfo } from '../utils/timeUtils';
import { WeatherIndicator } from './WeatherIndicator';
import { ThemeToggle } from './ThemeToggle';

interface TripHeaderProps {
  tripName: string;
  onNameChange: (name: string) => void;
  activeDayDate: string;
  onDateChange: (date: string) => void;
  activeDayStartTime: string;
  onStartTimeChange: (time: string) => void;
  showMap: boolean;
  onToggleMap: () => void;
  onExport: () => void;
  isExporting: boolean;
  hasActiveDay: boolean;
  hasStops: boolean;
  activeDayNumber: number; // New prop for day index
  firstStopLocation?: { lat: number, lng: number };
}

export const TripHeader: React.FC<TripHeaderProps> = ({
  tripName,
  onNameChange,
  activeDayDate,
  onDateChange,
  activeDayStartTime,
  onStartTimeChange,
  showMap,
  onToggleMap,
  onExport,
  isExporting,
  hasActiveDay,
  hasStops,
  activeDayNumber,
  firstStopLocation
}) => {
  const { weekday } = getDayInfo(activeDayDate);

  return (
    <header className="mb-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-1.5 group">
            <input 
              type="text" 
              value={tripName} 
              onChange={(e) => onNameChange(e.target.value)}
              className="text-xl font-black text-slate-900 dark:text-white tracking-tight bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-all px-0.5 w-full"
              placeholder="行程名稱..."
            />
            <Edit2 className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100" />
          </div>
          
          {/* Enhanced Day Indicator Subtitle */}
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
              <Flag className="w-2.5 h-2.5" />
              <span>DAY {activeDayNumber}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">當前行程</span>
          </div>
        </div>

        <button 
          onClick={onExport}
          disabled={isExporting || !hasActiveDay || !hasStops}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all disabled:opacity-50 flex-shrink-0"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">匯出圖片</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-bold transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
          <input 
            type="date" 
            value={activeDayDate || ''} 
            onChange={(e) => onDateChange(e.target.value)} 
            className="bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-200" 
          />
          <span className="text-slate-400 border-l border-slate-100 dark:border-slate-700 pl-1.5 ml-0.5 min-w-[2rem] text-center">{weekday}</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-bold transition-colors">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <input 
            type="time" 
            value={activeDayStartTime || ''} 
            onChange={(e) => onStartTimeChange(e.target.value)} 
            className="bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-200" 
          />
        </div>

        {firstStopLocation && (
          <WeatherIndicator 
            lat={firstStopLocation.lat} 
            lng={firstStopLocation.lng} 
            date={activeDayDate} 
          />
        )}

        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />
          <button 
            onClick={onToggleMap} 
            title={showMap ? "隱藏地圖" : "顯示地圖"}
            className={`p-2 rounded-lg border transition-all ${showMap ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
