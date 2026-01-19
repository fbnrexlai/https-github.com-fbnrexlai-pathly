
import React from 'react';
import { LayoutDashboard, MapPin, Clock3, Navigation, Loader2, Coins, Map as MapIcon, Calculator } from 'lucide-react';

interface DaySummaryProps {
  daySummary: {
    totalStops: number;
    startTime: string;
    endTime: string;
    transitDisplay: string;
    totalDistance: string;
    dayCost?: string | null;
    tripCost?: string | null;
  } | null;
  isCalculating: boolean;
}

export const DaySummary: React.FC<DaySummaryProps> = ({ daySummary, isCalculating }) => {
  if (!daySummary) return null;

  return (
    <div className="mb-3 px-2 py-1.5 bg-slate-900 text-white rounded-lg shadow-md flex flex-col gap-1 overflow-hidden relative">
      {isCalculating && (
        <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[1px] flex items-center justify-center z-10">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
          <span className="text-[10px] font-bold">更新計算中...</span>
        </div>
      )}
      
      <div className="flex items-center justify-between gap-1 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-1.5 border-r border-slate-700">
            <LayoutDashboard className="w-3 h-3 text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">單日概覽</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1" title="景點總數">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="text-[11px] font-bold">{daySummary.totalStops}</span>
            </div>
            <div className="flex items-center gap-1" title="行程起訖">
              <Clock3 className="w-3 h-3 text-slate-500" />
              <span className="text-[11px] font-bold whitespace-nowrap">{daySummary.startTime}-{daySummary.endTime}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded" title="交通總時長">
              <Navigation className="w-3 h-3 text-teal-400" />
              <span className="text-[11px] font-bold whitespace-nowrap">{daySummary.transitDisplay}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded" title="交通總里程">
              <MapIcon className="w-3 h-3 text-indigo-400" />
              <span className="text-[11px] font-bold whitespace-nowrap">{daySummary.totalDistance}</span>
            </div>
          </div>
        </div>
      </div>

      {(daySummary.dayCost || daySummary.tripCost) && (
        <div className="flex items-center gap-3 pt-1 border-t border-slate-800 mt-0.5">
          {daySummary.dayCost && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-900/30 border border-amber-500/20 rounded" title="本日交通過路費">
              <Coins className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold text-amber-500 uppercase">本日通行費:</span>
              <span className="text-[10px] font-black text-amber-200">{daySummary.dayCost}</span>
            </div>
          )}
          {daySummary.tripCost && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-900/30 border border-blue-500/20 rounded ml-auto" title="全行程累計過路費">
              <Calculator className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-bold text-blue-400 uppercase">全行程累計:</span>
              <span className="text-[10px] font-black text-blue-100">{daySummary.tripCost}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
