
import React from 'react';
import { Trash2, Calendar, Clock, Loader2, Users, Crown, UserPlus } from 'lucide-react';
import { TripSummary } from '../hooks/useTripManager';

interface TripCardProps {
  trip: TripSummary;
  deletingId: string | null;
  onSelect: (id: string) => void;
  onDeleteRequest: (id: string, e: React.MouseEvent) => void;
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '剛剛';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分鐘前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小時前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`;
  
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const TripCard: React.FC<TripCardProps> = ({ trip, deletingId, onSelect, onDeleteRequest }) => {
  const isRecent = (new Date().getTime() - new Date(trip.updated_at).getTime()) < 86400000;
  const isDeleting = deletingId === trip.id;
  // Use collaborator_count which is now filtered in the hook
  const activeCollaboratorCount = trip.collaborator_count || 0;
  const hasActiveCollaborators = activeCollaboratorCount > 0;

  return (
    <div 
      onClick={() => onSelect(trip.id)}
      className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-6 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
          <h3 className="text-lg md:text-xl font-black text-white truncate">{trip.name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {trip.is_owner ? (
              <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Crown className="w-2.5 h-2.5" /> 私人行程
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                <Users className="w-2.5 h-2.5" /> 朋友共享
              </span>
            )}

            {trip.is_owner && hasActiveCollaborators && (
              <span className="flex items-center gap-1 text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 animate-in fade-in zoom-in group-hover:animate-pulse">
                <UserPlus className="w-2.5 h-2.5" /> 已共享 ({activeCollaboratorCount} 人)
              </span>
            )}
          </div>
        </div>
        {trip.is_owner && (
          <button 
            onClick={(e) => onDeleteRequest(trip.id, e)}
            disabled={isDeleting}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl transition-all disabled:opacity-80
              ${isDeleting ? 'bg-red-500/20 text-red-400 w-auto' : 'text-slate-500 hover:text-red-500 hover:bg-red-500/10'}
            `}
            title="刪除行程"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-bold">刪除中</span>
              </>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-4 text-slate-400">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${isRecent ? 'text-blue-400' : ''}`}>
          <Clock className={`w-3 h-3 ${isRecent ? 'animate-pulse' : ''}`} />
          最後編輯：{formatRelativeTime(trip.updated_at)}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight">
          <Calendar className="w-3 h-3 text-slate-500" />
          {trip.day_count} 天安排
        </div>
      </div>
    </div>
  );
};
