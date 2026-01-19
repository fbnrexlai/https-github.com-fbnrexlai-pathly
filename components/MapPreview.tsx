import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Stop } from '../types';
import { getOpeningHoursOnDate } from '../utils/timeUtils';

interface MapPreviewProps {
  stops: Stop[];
  currentDate: string;
}

const API_KEY = "AIzaSyBkmr2ZkRC3SXQI2Py8Q9AdC6KQBdD6FRc";

export const MapPreview: React.FC<MapPreviewProps> = ({ stops, currentDate }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const clearMapOverlays = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    clearMapOverlays();

    if (stops.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      stops.forEach((stop, index) => {
        const marker = new window.google.maps.Marker({
          position: stop.location,
          map: mapInstanceRef.current,
          label: { text: (index + 1).toString(), color: "white", fontWeight: "bold", fontSize: "10px" },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#1e293b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 12,
          },
          title: stop.name
        });

        marker.addListener('click', () => {
          const hours = getOpeningHoursOnDate(stop.openingHours, currentDate);
          const content = `
            <div style="padding: 8px; font-family: sans-serif; min-width: 150px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${stop.name}</h3>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">${stop.address}</p>
              ${stop.phoneNumber ? `<p style="margin: 0 0 8px 0; font-size: 11px; color: #2563eb; font-weight: 600;">☎ ${stop.phoneNumber}</p>` : ''}
              ${stop.note ? `<p style="margin: 0 0 8px 0; font-size: 10px; color: #475569; font-style: italic;">"${stop.note}"</p>` : ''}
              <div style="display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; width: fit-content;">
                停留 ${stop.stayDuration} 分鐘
              </div>
              ${hours ? `<div style="margin-top:6px; font-size:10px; color:#475569; font-weight:600; display:flex; align-items:center; gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 6v12"/><path d="M8 12h8"/></svg>營業時間: ${hours}</div>` : ''}
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(stop.location);
      });

      if (stops.length >= 2) {
        const origin = stops[0];
        const destination = stops[stops.length - 1];
        const intermediates = stops.slice(1, -1).map(s => ({
            location: { latLng: { latitude: s.location.lat, longitude: s.location.lng } }
        }));

        // Use Routes API instead of Directions Service to avoid legacy errors
        fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: origin.location.lat, longitude: origin.location.lng } } },
                destination: { location: { latLng: { latitude: destination.location.lat, longitude: destination.location.lng } } },
                intermediates: intermediates,
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_UNAWARE'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.routes && data.routes[0] && data.routes[0].polyline) {
                const encodedPolyline = data.routes[0].polyline.encodedPolyline;
                if (window.google.maps.geometry) {
                    const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
                    polylineRef.current = new window.google.maps.Polyline({
                        path: path,
                        geodesic: true,
                        strokeColor: "#2563eb",
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map: mapInstanceRef.current
                    });
                }
            } else {
                throw new Error("No route found in Routes API response");
            }
        })
        .catch(err => {
            console.warn("Routes API failed, falling back to straight connection", err);
            polylineRef.current = new window.google.maps.Polyline({
                path: stops.map(s => s.location),
                geodesic: true,
                strokeColor: "#64748b",
                strokeOpacity: 0.5,
                strokeWeight: 2,
                icons: [{ icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '100%', repeat: '50px' }],
                map: mapInstanceRef.current
            });
        })
        .finally(() => {
             mapInstanceRef.current.fitBounds(bounds, 50);
        });

      } else if (stops.length === 1) {
        mapInstanceRef.current.setCenter(stops[0].location);
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [stops, currentDate]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        window.google?.maps?.event?.trigger(mapInstanceRef.current, 'resize');
        if (stops.length > 0) {
           const bounds = new window.google.maps.LatLngBounds();
           stops.forEach(s => bounds.extend(s.location));
           mapInstanceRef.current.fitBounds(bounds, 50);
        }
      }, 300);
    }
  }, [isExpanded, stops]);

  return (
    <div className={`relative transition-all duration-300 ease-in-out ${isExpanded ? 'h-[70vh] mb-4' : 'h-32 mb-3'}`}>
      <div ref={mapRef} className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-slate-100 overflow-hidden" />
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-md hover:bg-slate-50 transition-colors z-10"
        title={isExpanded ? "收合地圖" : "展開地圖"}
      >
        {isExpanded ? <Minimize2 className="w-4 h-4 text-slate-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
      </button>
    </div>
  );
};