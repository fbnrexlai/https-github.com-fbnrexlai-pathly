import React from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, Loader2, Thermometer, AlertCircle } from 'lucide-react';
import { useWeather } from '../hooks/useWeather';

interface WeatherIndicatorProps {
  lat?: number;
  lng?: number;
  date?: string;
}

export const WeatherIndicator: React.FC<WeatherIndicatorProps> = ({ lat, lng, date }) => {
  const { weather, loading, error } = useWeather(lat, lng, date);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-bold animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>讀取天氣...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-400 font-bold"
        title={error}
      >
        <AlertCircle className="w-3 h-3" />
        <span className="hidden sm:inline">天氣服務暫不穩定</span>
      </div>
    );
  }

  if (!weather) return null;

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes
    if (code === 0) return <Sun className="w-3.5 h-3.5 text-orange-400" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-3.5 h-3.5 text-slate-400" />;
    if (code >= 45 && code <= 48) return <CloudFog className="w-3.5 h-3.5 text-slate-300" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
    if (code >= 71 && code <= 77) return <Snowflake className="w-3.5 h-3.5 text-blue-200" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-3.5 h-3.5 text-blue-500" />;
    if (code >= 95) return <CloudLightning className="w-3.5 h-3.5 text-indigo-500" />;
    return <Sun className="w-3.5 h-3.5 text-orange-400" />;
  };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm transition-all hover:border-blue-200 group">
      <div className="flex items-center gap-1">
        {getWeatherIcon(weather.weatherCode)}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-900 leading-none">
            {weather.tempMax}° / {weather.tempMin}°
          </span>
          {weather.isHistorical && (
            <span className="text-[7px] text-blue-500 font-black uppercase tracking-tighter">歷史平均</span>
          )}
        </div>
      </div>
      <Thermometer className="w-3 h-3 text-slate-300 group-hover:text-red-400 transition-colors" />
    </div>
  );
};
