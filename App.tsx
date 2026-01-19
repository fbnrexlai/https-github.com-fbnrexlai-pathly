
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { Dashboard } from './components/Dashboard';
import { TripPlannerView } from './components/TripPlannerView';
import { GlobalModals } from './components/layout/GlobalModals';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { useTripData } from './hooks/useTripData';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState('');
  
  const { 
    trip, updateTrip, isLoading, syncStatus, lastSaved, 
    generateId, savedPlaces, contextualSavedPlaces, 
    showAllSaved, setShowAllSaved, toggleSavedPlace 
  } = useTripData(!!session, activeTripId);

  const { calculateRoute, isCalculating } = useGoogleMaps();

  const [toast, setToast] = useState({ message: '', visible: false });
  const [confirm, setConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

  // Handle Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setIsAuthLoading(false);
        setActiveTripId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync activeDayId with trip changes
  useEffect(() => {
    if (trip.days.length > 0 && !trip.days.find(d => d.id === activeDayId)) {
      setActiveDayId(trip.days[0].id);
    }
  }, [trip.days, activeDayId]);

  const handleLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    setSession(null);
  };

  if (isAuthLoading) return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <span className="text-slate-400 font-black tracking-widest uppercase text-xs">Triply Securing...</span>
      </div>
    </div>
  );

  if (!session) return <LoginView onLoginSuccess={() => {}} />;
  
  return (
    <>
      <GlobalModals 
        setup={{ isOpen: false, onClose: () => {} }} 
        toast={{ ...toast, onClose: () => setToast(p => ({ ...p, visible: false })) }} 
        confirm={{ ...confirm, onCancel: () => setConfirm(p => ({ ...p, isOpen: false })) }} 
      />

      {!activeTripId ? (
        <Dashboard 
          onSelectTrip={setActiveTripId} 
          onLogout={handleLogout} 
          onOpenSetup={() => {}} 
        />
      ) : (
        <TripPlannerView 
          trip={trip}
          activeDayId={activeDayId}
          setActiveDayId={setActiveDayId}
          updateTrip={updateTrip}
          isLoading={isLoading}
          syncStatus={syncStatus}
          lastSaved={lastSaved}
          savedPlaces={savedPlaces}
          contextualSavedPlaces={contextualSavedPlaces}
          showAllSaved={showAllSaved}
          setShowAllSaved={setShowAllSaved}
          toggleSavedPlace={toggleSavedPlace}
          calculateRoute={calculateRoute}
          generateId={generateId}
          isCalculating={isCalculating}
          onBack={() => setActiveTripId(null)}
          onLogout={handleLogout}
          showFeedback={(msg) => setToast({ message: msg, visible: true })}
          setConfirm={setConfirm}
        />
      )}
    </>
  );
};

export default App;
