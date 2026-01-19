
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Search, Loader2, UserMinus, AlertCircle } from 'lucide-react';
import { useCollaboration } from '../hooks/useCollaboration';
import { supabase } from '../services/supabaseClient';
import { ConfirmModal } from './ConfirmModal';

interface FriendManagerProps {
  onFriendDeleted?: () => void;
}

export const FriendManager: React.FC<FriendManagerProps> = ({ onFriendDeleted }) => {
  const { searchUser, sendFriendRequest, respondToRequest, getFriends, removeFriend } = useCollaboration();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State for the custom confirmation modal
  const [confirmDelete, setConfirmDelete] = useState<{ 
    isOpen: boolean; 
    id: string | null; 
    name: string 
  }>({
    isOpen: false,
    id: null,
    name: ''
  });

  const loadData = async () => {
    try {
      const f = await getFriends();
      setFriends(f);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase
        .from('friendships')
        .select('id, sender:profiles!friendships_sender_id_fkey(id, username)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      setPending(p || []);
    } catch (err) {
      console.error("Failed to load friends data:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const user = await searchUser(searchQuery.trim());
      if (user) {
        await sendFriendRequest(user.id);
        alert('已發送好友邀請');
        setSearchQuery('');
        loadData();
      }
    } catch (e) {
      setErrorMessage('找不到該用戶或已是好友');
    } finally {
      setIsSearching(false);
    }
  };

  // Stage 1: Trigger Modal
  const openConfirmModal = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[FriendManager] >>> STEP 1: Remove Clicked for ${name} (ID: ${id})`);
    setConfirmDelete({ isOpen: true, id, name });
  };

  // Stage 2: Execute Deletion
  const executeRemoveFriend = async () => {
    const friendshipId = confirmDelete.id;
    const name = confirmDelete.name;
    
    if (!friendshipId) return;

    console.log(`[FriendManager] >>> STEP 2: User Confirmed Deletion for ${name}`);

    // Capture current state for potential rollback
    const previousFriends = [...friends];
    
    // Optimistic Update
    setFriends(prev => prev.filter(f => f.friendship_id !== friendshipId));
    setDeletingId(friendshipId);
    setErrorMessage(null);
    
    // Close modal
    setConfirmDelete({ isOpen: false, id: null, name: '' });

    try {
      console.log("[FriendManager] >>> STEP 3: Supabase Call Initiated...");
      await removeFriend(friendshipId);
      console.log("[FriendManager] >>> STEP 4: DB Deletion Successful.");
      // Callback to parent to refresh trip list
      if (onFriendDeleted) onFriendDeleted();
    } catch (err: any) {
      console.error("[FriendManager] >>> STEP 4 (FAIL): DB Deletion failed. Rolling back...", err);
      setFriends(previousFriends);
      
      const isRlsError = err.code === '42501' || err.message?.includes('policy');
      const msg = isRlsError 
        ? '權限不足 (RLS Policy Violation)。' 
        : `刪除失敗: ${err.message || '連線錯誤'}`;
        
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-full flex flex-col shadow-2xl backdrop-blur-sm transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight text-white">社交與好友</h2>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋名稱並加好友..."
            className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
        <button 
          disabled={isSearching} 
          className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all hover:bg-blue-500 text-white disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        </button>
      </form>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6 animate-in slide-in-from-top-2">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            待處理邀請
          </p>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group transition-colors hover:border-white/10">
                <span className="text-sm font-bold text-white truncate max-w-[100px]">{p.sender?.username || '未知用戶'}</span>
                <div className="flex gap-2">
                  <button onClick={async (e) => { e.stopPropagation(); try { await respondToRequest(p.id, true); loadData(); } catch(e) { setErrorMessage('操作失敗'); } }} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/40 transition-colors shadow-sm"><Check className="w-4 h-4" /></button>
                  <button onClick={async (e) => { e.stopPropagation(); try { await respondToRequest(p.id, false); loadData(); } catch(e) { setErrorMessage('操作失敗'); } }} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors shadow-sm"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">我的好友 ({friends.length})</p>
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-[10px] text-slate-500 font-bold uppercase italic tracking-wider">目前沒有好友</p>
            </div>
          ) : friends.map(f => (
            <div key={f.friendship_id} className="bg-white/5 px-4 py-3 rounded-xl text-xs font-bold border border-white/5 flex items-center justify-between group transition-all hover:bg-white/[0.08] hover:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-white text-sm tracking-tight">{f.username}</span>
              </div>
              <button 
                type="button"
                onClick={(e) => openConfirmModal(e, f.friendship_id, f.username)}
                disabled={deletingId === f.friendship_id}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl md:opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 relative"
                title="刪除好友"
              >
                {deletingId === f.friendship_id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="刪除好友"
        message={`確定要從好友名單中移除 ${confirmDelete.name} 嗎？`}
        isDanger={true}
        confirmText="確認移除"
        onConfirm={executeRemoveFriend}
        onCancel={() => {
          console.log("[FriendManager] >>> Modal Cancelled.");
          setConfirmDelete({ isOpen: false, id: null, name: '' });
        }}
      />
    </div>
  );
};
