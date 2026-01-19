
import React from 'react';
import { Plus, LogOut, MapPin, XCircle, X, Filter, LayoutGrid } from 'lucide-react';
import { Trip, Stop, SavedPlace } from '../types';
import { getDayInfo } from '../utils/timeUtils';

interface AppSidebarProps {
  trip: Trip;
  activeDayId: string;
  isOpen: boolean;
  onClose: () => void;
  onDaySelect: (id: string) => void;
  onDayDelete: (id: string) => void;
  onDayAdd: () => void;
  savedPlaces: SavedPlace[];
  showAllSaved: boolean;
  onToggleShowAll: (val: boolean) => void;
  onSavedPlaceAdd: (place: Stop) => void;
  onLogout: () => void;
  onClearData: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  trip,
  activeDayId,
  isOpen,
  onClose,
  onDaySelect,
  onDayDelete,
  onDayAdd,
  savedPlaces,
  showAllSaved,
  onToggleShowAll,
  onSavedPlaceAdd,
  onLogout
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] md:hidden transition-opacity animate-in fade-in"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-all duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-56 shadow-2xl md:shadow-none`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">TRIPLY AI</h1>
          <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 hide-scrollbar space-y-5">
          <section>
            <div className="flex items-center justify-between px-2 mb-2">
               <h3 className="text-[9px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">行程天數</h3>
               <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600">AUTO-SAVED</span>
            </div>
            <div className="space-y-1">
              {trip.days.map((day, idx) => {
                const { display, weekday } = getDayInfo(day.date);
                return (
                  <div key={day.id} className="group relative">
                    <button
                      onClick={() => onDaySelect(day.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${activeDayId === day.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/30 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <div className="flex flex-col items-start gap-0 text-left">
                        <span className="text-[8px] uppercase font-bold opacity-60">DAY {idx + 1}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs">{display}</span>
                          <span className="text-[10px] opacity-70">({weekday})</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${activeDayId === day.id ? 'bg-white dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>{day.stops.length}</span>
                    </button>
                    {trip.days.length > 1 && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); onDayDelete(day.id); }} 
                          className="absolute -top-1 -right-1 opacity-100 md:opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-700 rounded-full text-slate-300 hover:text-red-500 transition-all z-10"
                          title="刪除本日"
                      >
                          <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button onClick={onDayAdd} className="w-full mt-2 flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all">
                <Plus className="w-3.5 h-3.5" /> <span className="text-xs font-medium">新增行程天數</span>
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between px-2 mb-2">
               <h3 className="text-[9px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">已儲存景點</h3>
               <button 
                onClick={() => onToggleShowAll(!showAllSaved)}
                className={`p-1 rounded transition-colors ${showAllSaved ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                title={showAllSaved ? "切換至附近景點" : "顯示全部儲存"}
               >
                 {showAllSaved ? <LayoutGrid className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
               </button>
            </div>
            
            {savedPlaces.length === 0 ? (
              <div className="px-2 py-4 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <p className="text-[9px] text-slate-400">點擊行程中景點的愛心來儲存</p>
              </div>
            ) : (
              <div className="space-y-1">
                {savedPlaces.map((place) => (
                  <div key={place.id} className="group relative flex items-center gap-1.5 p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-blue-100 dark:hover:border-blue-900 transition-all shadow-sm">
                    <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 pr-4 truncate flex-1">{place.name}</p>
                    <button 
                      onClick={() => onSavedPlaceAdd({
                        id: place.id,
                        name: place.name,
                        address: place.address,
                        location: place.location,
                        placeId: place.placeId,
                        phoneNumber: place.phoneNumber,
                        openingHours: place.openingHours,
                        businessStatus: place.businessStatus,
                        note: place.note || '',
                        stayDuration: 60
                      })} 
                      className="p-1 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-500"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {!showAllSaved && (
                   <p className="text-[8px] text-center text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                     僅顯示 200km 內景點
                   </p>
                )}
              </div>
            )}
          </section>

          <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
             <button onClick={onLogout} className="w-full flex items-center gap-2 p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-bold uppercase tracking-widest">
               <LogOut className="w-4 h-4" /> 登出帳號
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};
