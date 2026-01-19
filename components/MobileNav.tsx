
import React from 'react';
import { Navigation, Map as MapIcon, CalendarDays } from 'lucide-react';

interface MobileNavProps {
  onShowItinerary: () => void;
  onToggleMap: () => void;
  onToggleDays: () => void;
  showMap: boolean;
  isSidebarOpen: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onShowItinerary, onToggleMap, onToggleDays, showMap, isSidebarOpen }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 flex justify-around z-50 shadow-lg pb-safe transition-colors duration-300">
      <button 
        onClick={onToggleDays} 
        className={`flex flex-col items-center gap-0.5 transition-colors ${isSidebarOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <CalendarDays className="w-5 h-5" />
        <span className="text-[10px] font-bold">天數管理</span>
      </button>

      <button 
        onClick={onShowItinerary} 
        className="text-blue-600 dark:text-blue-400 flex flex-col items-center gap-0.5"
      >
        <div className="bg-blue-600 dark:bg-blue-500 p-1.5 rounded-full -mt-4 shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40">
          <Navigation className="w-5 h-5 text-white" />
        </div>
        <span className="text-[10px] font-bold mt-1">行程規劃</span>
      </button>

      <button 
        onClick={onToggleMap} 
        className={`flex flex-col items-center gap-0.5 transition-colors ${showMap ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <MapIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">顯示地圖</span>
      </button>
    </nav>
  );
};
