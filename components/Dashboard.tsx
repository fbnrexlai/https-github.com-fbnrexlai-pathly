
import React from 'react';
import { Plus, MapPin, Loader2, LogOut, Compass } from 'lucide-react';
import { useTripManager } from '../hooks/useTripManager';
import { TripCard } from './TripCard';
import { ConfirmModal } from './ConfirmModal';
import { ProfileSetup } from './ProfileSetup';
import { FriendManager } from './FriendManager';

interface DashboardProps {
  onSelectTrip: (id: string) => void;
  onLogout: () => void;
  onOpenSetup: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTrip, onLogout }) => {
  const {
    trips,
    loading,
    isCreating,
    deletingId,
    newTripName,
    setNewTripName,
    deleteConfirm,
    setDeleteConfirm,
    handleCreateTrip,
    executeDelete,
    profile,
    refreshProfile,
    refreshTrips
  } = useTripManager(onSelectTrip);

  const onRequestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, tripId: id });
  };

  if (loading && !profile && trips.length === 0) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">初始化中...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 transition-colors">
      {!profile && <ProfileSetup onComplete={refreshProfile} />}
      
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
                {profile ? `你好，${profile.username}` : "我的行程"}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Triply Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 bg-white/5 rounded-lg hover:bg-white/10 px-3"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">登出帳號</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <form onSubmit={handleCreateTrip}>
              <div className="flex gap-2 md:gap-3">
                <input 
                  required
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder="行程名稱 (如：日本關西之旅)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm md:text-lg"
                />
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 md:px-8 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span className="hidden md:inline">建立行程</span>
                </button>
              </div>
            </form>

            {loading ? (
              <div className="flex flex-col items-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">讀取行程中...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-16 md:py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">還沒有行程嗎？</h2>
                <p className="text-slate-400 text-sm">輸入名稱並點擊建立，開始規劃您的冒險！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                  <TripCard 
                    key={trip.id} 
                    trip={trip} 
                    deletingId={deletingId}
                    onSelect={onSelectTrip}
                    onDeleteRequest={onRequestDelete}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
             <FriendManager onFriendDeleted={refreshTrips} />
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="刪除行程"
        message="確定要刪除這趟旅行嗎？所有相關的天數與景點將一併移除，此操作無法復原。"
        isDanger={true}
        confirmText="確認刪除"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, tripId: null })}
      />
    </div>
  );
};
