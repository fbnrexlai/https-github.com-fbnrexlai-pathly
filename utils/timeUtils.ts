
// Helper function to reliably get opening hours for a specific date string (YYYY-MM-DD)
export const getOpeningHoursOnDate = (openingHours: string[] | undefined, dateStr: string | undefined) => {
  if (!openingHours || !dateStr) return null;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; 
  const day = parseInt(parts[2]);
  const date = new Date(year, month, day);
  
  const dayIndex = date.getDay();
  const googleDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  
  const rawText = openingHours[googleDayIndex];
  if (!rawText) return null;

  if (rawText.includes('：')) return rawText.split('：')[1].trim();
  if (rawText.includes(': ')) return rawText.split(': ')[1].trim();
  
  return rawText;
};

export const getDayInfo = (dateStr: string) => {
  if (!dateStr) return { display: '', weekday: '' };
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { display: dateStr, weekday: '' };
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) return { display: dateStr, weekday: '' };

    const display = `${month + 1}/${day}`;
    const weekday = date.toLocaleDateString('zh-TW', { weekday: 'short' });
    
    return { display, weekday };
  } catch (e) {
    return { display: dateStr, weekday: '' };
  }
};

/**
 * Creates a Date object from YYYY-MM-DD and HH:mm strings without relying on 
 * potentially brittle string template parsing that causes RangeError.
 */
export const createSafeDate = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr || !timeStr) return null;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const date = new Date(y, m - 1, d, hh, mm, 0);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};
