
import { Stop } from '../types';
import { WeatherData } from '../hooks/useWeather';

export const OUTDOOR_KEYWORDS = [
  'park', 'garden', 'beach', 'hiking', 'trail', 'zoo', 'outdoor', 
  'walk', 'camp', 'forest', 'mountain', 'lake', 'river', 'botanical',
  'plaza', 'square', 'market', 'temple', 'shrine', 'mount', 'island',
  '公園', '花園', '海灘', '步道', '動物園', '戶外', '健行', '森林', '山', '湖', '廣場', '市場', '廟', '寺', '島'
];

/**
 * Determines if a stop is likely an outdoor activity based on its name and notes.
 */
export const isOutdoorActivity = (stop: Stop): boolean => {
  const text = (stop.name + ' ' + (stop.note || '')).toLowerCase();
  return OUTDOOR_KEYWORDS.some(k => text.includes(k.toLowerCase()));
};

/**
 * Checks for weather conflicts for a list of stops.
 * Returns a record where Key = stopId and Value = warning message.
 */
export const checkWeatherConflicts = (
  stops: Stop[],
  timeline: { arrival: string; departure: string }[],
  weather: WeatherData | null
): Record<string, string> => {
  if (!weather || !weather.hourly || stops.length === 0) {
    console.debug("Weather Conflict Check: Skipped (No weather data or stops)");
    return {};
  }

  const conflicts: Record<string, string> = {};
  let checkedCount = 0;

  stops.forEach((stop, index) => {
    if (!isOutdoorActivity(stop)) return;
    checkedCount++;

    const arrivalTime = timeline[index]?.arrival;
    const departureTime = timeline[index]?.departure;

    if (!arrivalTime || !departureTime) return;

    const startHour = parseInt(arrivalTime.split(':')[0], 10);
    const endHour = parseInt(departureTime.split(':')[0], 10);

    if (isNaN(startHour) || isNaN(endHour)) return;

    let maxRainChance = 0;
    let worstWeatherCode = 0;
    const actualEndHour = endHour < startHour ? 23 : endHour;

    for (let h = startHour; h <= actualEndHour; h++) {
      if (h < weather.hourly.precipitation_probability.length) {
        const rainChance = weather.hourly.precipitation_probability[h];
        const code = weather.hourly.weather_code[h];
        
        if (rainChance > maxRainChance) maxRainChance = rainChance;
        if (code > worstWeatherCode) worstWeatherCode = code;
      }
    }

    const isStormy = [95, 96, 99].includes(worstWeatherCode);
    
    if (isStormy) {
      conflicts[stop.id] = "暴風雨警報！建議改為室內行程";
    } else if (maxRainChance >= 60) {
      conflicts[stop.id] = `降雨機率高 (${maxRainChance}%)，請攜帶雨具`;
    }
  });

  if (Object.keys(conflicts).length === 0 && checkedCount > 0) {
    console.debug(`Weather Conflict Check: ${checkedCount} outdoor stops analyzed. Status: CLEAR.`);
  } else if (Object.keys(conflicts).length > 0) {
    console.debug(`Weather Conflict Check: Found ${Object.keys(conflicts).length} warnings.`);
  }

  return conflicts;
};
