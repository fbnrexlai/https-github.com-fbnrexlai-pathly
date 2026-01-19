
import { useState, useEffect } from 'react';

export interface WeatherData {
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  isHistorical: boolean;
  hourly?: {
    precipitation_probability: number[];
    weather_code: number[];
    time: string[];
  };
}

const CACHE_PREFIX = 'triply_weather_cache_v2_';

export const useWeather = (lat: number | undefined, lng: number | undefined, date: string | undefined) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng || !date) {
      setWeather(null);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchWeather = async () => {
      // Round coordinates to increase cache hit rate
      const rLat = Number(lat).toFixed(2);
      const rLng = Number(lng).toFixed(2);
      const cacheKey = `${CACHE_PREFIX}${rLat}_${rLng}_${date}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        setWeather(JSON.parse(cached));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      if (signal.aborted) return;

      setLoading(true);
      setError(null);

      try {
        const targetDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let url = '';
        let isHistorical = false;

        // Fetch hourly data for granularity
        const hourlyParams = '&hourly=temperature_2m,precipitation_probability,weather_code';
        const dailyParams = '&daily=weather_code,temperature_2m_max,temperature_2m_min';

        if (diffDays >= 0 && diffDays <= 14) {
          url = `https://api.open-meteo.com/v1/forecast?latitude=${rLat}&longitude=${rLng}${dailyParams}${hourlyParams}&timezone=auto&start_date=${date}&end_date=${date}`;
        } else {
          isHistorical = true;
          const lastYearDate = new Date(targetDate);
          lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
          if (lastYearDate > today) {
            lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
          }
          const lastYearStr = lastYearDate.toISOString().split('T')[0];
          // Historical API usually provides hourly data as well
          url = `https://archive-api.open-meteo.com/v1/archive?latitude=${rLat}&longitude=${rLng}${dailyParams}${hourlyParams}&timezone=auto&start_date=${lastYearStr}&end_date=${lastYearStr}`;
        }

        const response = await fetch(url, { signal });
        
        if (!response.ok) {
          throw new Error(`Weather API status: ${response.status}`);
        }

        const data = await response.json();

        if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max[0] !== null) {
          const result: WeatherData = {
            tempMax: Math.round(data.daily.temperature_2m_max[0]),
            tempMin: Math.round(data.daily.temperature_2m_min[0]),
            weatherCode: data.daily.weather_code[0],
            isHistorical,
            hourly: data.hourly ? {
              precipitation_probability: data.hourly.precipitation_probability || [],
              weather_code: data.hourly.weather_code || [],
              time: data.hourly.time || []
            } : undefined
          };
          setWeather(result);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } else {
          setWeather(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        if (err.message === 'Failed to fetch') {
           console.warn('Weather service connectivity issue. Will retry on next update.');
           setError('連線逾時');
        } else {
           console.error('Weather fetch error:', err);
           setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      controller.abort();
    };
  }, [lat, lng, date]);

  return { weather, loading, error };
};
