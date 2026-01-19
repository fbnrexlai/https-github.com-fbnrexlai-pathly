
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Loader2, ShieldCheck, UserMinus, AlertCircle } from 'lucide-react';
import { useCollaboration } from '../hooks/useCollaboration';
import { supabase } from '../services/supabaseClient';

interface TripShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

export const TripShareModal: React.FC<TripShareModalProps> = ({ isOpen, onClose, tripId, tripName }) => {
  const { getFriends, addCollaborator, removeCollaborator } = useCollaboration();
  const [friends, setFriends] = useState<any[]>([]);
  const [existingCollaborators, setExistingCollaborators] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadCollaborationData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [allFriends, collabRes, tripRes] = await Promise.all([
        getFriends(),
        supabase.from('trip_collaborators').select('user_id').eq('trip_id', tripId),
        supabase.from('trips').select('user_id').eq('id', tripId).single()
      ]);

      setFriends(allFriends);
      setExistingCollaborators((collabRes.data || []).map(c => c.user_id));
      setIsOwner(tripRes.data?.user_id === user.id);
    } catch (e) {
      console.error("Load share data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadCollaborationData();
  }, [isOpen, tripId]);

  const handleInvite = async (friendId: string) => {
    setActionId(friendId);
    try {
      await addCollaborator(tripId, friendId);
      setExistingCollaborators(prev => [...prev, friendId]);
    } catch (e: any) {
      alert("邀請失敗: " + (e.message || "未知錯誤"));
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (friendId: string, username: string) => {
    if (!window.confirm(`確定要移除 ${username} 的編輯權限嗎？`)) return;
    
    setActionId(friendId);
    try {
      await removeCollaborator(tripId, friendId);
      setExistingCollaborators(prev => prev.filter(id => id !== friendId));
    } catch (e: any) {
      alert("移除失敗: " + (e.message || "權限不足"));
    } finally {
      setActionId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">共用行程設定</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tripName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!isOwner && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed uppercase">
                您不是此行程的建立者。只有擁有者可以管理協作者成員。
              </p>
            </div>
          )}

          <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">我的好友清單</p>
          
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">載入中...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-400">目前沒有好友</p>
              <p className="text-[10px] text-slate-500 mt-1">請先在儀表板搜尋並加入好友</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map(friend => {
                const isAlreadyCollaborator = existingCollaborators.includes(friend.id);
                const isProcessing = actionId === friend.id;

                return (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isAlreadyCollaborator ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{friend.username}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAlreadyCollaborator ? (
                        <>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            已加入
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => handleRemove(friend.id, friend.username)}
                              disabled={isProcessing}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              title="移除協作者"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleInvite(friend.id)}
                          disabled={isProcessing || !isOwner}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          邀請編輯
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">
            {isOwner 
              ? "* 邀請後，好友將擁有完整編輯權限。您隨時可以將其移除。" 
              : "* 只有行程擁有者可以管理協作者名單。"}
          </p>
        </div>
      </div>
    </div>
  );
};
