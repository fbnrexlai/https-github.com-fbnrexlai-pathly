
import React from 'react';
import { CheckCircle2, CloudUpload, CloudOff, AlertCircle, Loader2 } from 'lucide-react';

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncStatusProps {
  status: SyncState;
  lastSaved?: Date;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ status, lastSaved }) => {
  const configs = {
    synced: {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
      text: '已同步',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    syncing: {
      icon: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
      text: '同步中...',
      className: 'bg-blue-50 text-blue-700 border-blue-100'
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
      text: '同步失敗',
      className: 'bg-red-50 text-red-700 border-red-100'
    },
    offline: {
      icon: <CloudOff className="w-3.5 h-3.5 text-slate-400" />,
      text: '離線模式',
      className: 'bg-slate-100 text-slate-500 border-slate-200'
    }
  };

  const config = configs[status];

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold transition-all duration-300 ${config.className}`}
      title={lastSaved ? `最後儲存時間: ${lastSaved.toLocaleTimeString()}` : undefined}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};
