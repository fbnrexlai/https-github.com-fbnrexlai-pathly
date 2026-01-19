
import React, { useState } from 'react';
import { User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ProfileSetupProps {
  onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("您尚未登入或連線已逾期");

      // Attempt to insert/upsert profile
      // Using a direct object to avoid potential column mapping issues if the schema just changed
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: cleanUsername,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error("Profile setup error details:", upsertError);
        
        if (upsertError.message?.includes('username')) {
          throw new Error("資料庫欄位尚未更新，請稍候 30 秒後再試，或聯絡管理員確認 SQL 已執行。");
        }
        
        if (upsertError.code === '23505') {
          throw new Error("此 ID 已被他人使用，請換一個更酷的名稱");
        }
        
        throw new Error(upsertError.message || "建立個人資料時發生錯誤");
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || "設定失敗，請檢查網路連線");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-800 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">建立您的旅遊 ID</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">這將是您的唯一識別碼，方便好友找到您</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">您的唯一 ID (至少 3 個字元)</label>
            <div className="relative">
              <input 
                required
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="例如: travel_master_99"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              />
              {username.length >= 3 && !loading && (
                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "完成設定"}
          </button>
        </form>
      </div>
    </div>
  );
};
