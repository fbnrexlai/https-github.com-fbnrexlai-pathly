
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, AlertCircle, X } from 'lucide-react';
import { tripService } from '../services/tripService';

declare global {
  interface Window {
    google: any;
  }
}

interface AutocompleteInputProps {
  onPlaceSelected: (place: any) => void;
  placeholder?: string;
  className?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ onPlaceSelected, placeholder, className }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Fix stale closure: Keep a ref to the latest callback
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const extractUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
  };

  const finalizeResult = async (place: any, source: 'api' | 'cache' = 'api') => {
    setIsResolvingLink(false);
    setError(null);
    if (place && (place.geometry || place.location)) {
      if (source === 'api') {
        await tripService.saveCachedPlace(place);
      }
      // Use the ref to call the latest version of the function
      if (onPlaceSelectedRef.current) {
        onPlaceSelectedRef.current(place);
      }
      setInputValue('');
      if (inputRef.current) inputRef.current.value = '';
    } else {
      setError("無法識別地點，請嘗試搜尋名稱");
    }
  };

  const enrichPlaceData = async (basicPlace: any) => {
    if (!basicPlace.place_id) return basicPlace;
    
    setIsResolvingLink(true);
    const cached = await tripService.getCachedPlace(basicPlace.place_id);
    if (cached) {
      return finalizeResult(cached, 'cache');
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
      placeId: basicPlace.place_id,
      fields: ['place_id', 'geometry', 'name', 'formatted_address', 'opening_hours', 'business_status', 'formatted_phone_number'],
    }, (place: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        finalizeResult(place, 'api');
      } else {
        finalizeResult(basicPlace, 'api');
      }
    });
  };

  const resolveGoogleMapsLink = async (rawInput: string) => {
    if (!window.google?.maps?.places) return;
    const url = extractUrl(rawInput);
    if (!url) return;
    setIsResolvingLink(true);
    
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    service.findPlaceFromQuery({
      query: url,
      fields: ['place_id', 'name'],
    }, (results: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
        enrichPlaceData(results[0]);
      } else {
        setIsResolvingLink(false);
        setError("無法解析連結，請搜尋名稱");
      }
    });
  };

  useEffect(() => {
    let checkInterval: number;
    const initAutocomplete = () => {
      if (!window.google?.maps?.places || !inputRef.current) return false;
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'name'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place && place.place_id) {
            setInputValue(place.name || '');
            enrichPlaceData(place);
          }
        });

        setIsLoaded(true);
        return true;
      } catch (e) { return false; }
    };

    if (!initAutocomplete()) {
      checkInterval = window.setInterval(() => {
        if (initAutocomplete()) clearInterval(checkInterval);
      }, 500);
    }
    return () => { if (checkInterval) clearInterval(checkInterval); };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.includes('http') && (val.includes('maps') || val.includes('goo.gl'))) {
      resolveGoogleMapsLink(val);
    }
  };

  const clearInput = () => {
    setInputValue('');
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-4 z-10 text-slate-400 pointer-events-none">
          {isResolvingLink ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : (
            <Search className="w-5 h-5 transition-colors group-focus-within:text-blue-500" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          disabled={!isLoaded || isResolvingLink}
          placeholder={isLoaded ? (placeholder || "搜尋景點或貼上地圖連結...") : "地圖組件載入中..."}
          className="w-full h-12 pl-12 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium text-slate-900 dark:text-slate-100"
        />

        {inputValue && !isResolvingLink && (
          <button 
            onClick={clearInput}
            className="absolute right-3 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && !isResolvingLink && (
        <div className="absolute top-full mt-2 left-0 right-0 animate-in fade-in slide-in-from-top-1 z-20">
          <div className="flex items-center gap-2 text-xs text-red-600 font-bold bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-3 py-2 rounded-lg shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};
