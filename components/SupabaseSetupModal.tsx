
import React, { useState } from 'react';
import { Database, Copy, Check, X, ShieldAlert, Layers } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCode = `-- FINAL RLS REPAIR SCRIPT (V5 - Collaborator Management)
-- This ensures owners can manage their trip's collaborators.

BEGIN;

-- 1. Helper Function
CREATE OR REPLACE FUNCTION public.is_trip_owner(tid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = tid 
    AND user_id = auth.uid()
  );
$$;

-- 2. Drop policies
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;
DROP POLICY IF EXISTS "collaborators_access_policy" ON public.trip_collaborators;
DROP POLICY IF EXISTS "friendships_all_policy" ON public.friendships;

-- 3. Trip Policies
CREATE POLICY "trips_select_policy" ON public.trips 
FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    id IN (SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid())
);

CREATE POLICY "trips_insert_policy" ON public.trips 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_update_policy" ON public.trips 
FOR UPDATE USING (
    auth.uid() = user_id 
    OR 
    id IN (SELECT trip_id FROM public.trip_collaborators WHERE user_id = auth.uid() AND role = 'editor')
);

CREATE POLICY "trips_delete_policy" ON public.trips 
FOR DELETE USING (auth.uid() = user_id);

-- 4. Collaborator Policy (Allows owners to insert/delete, users to view their own)
CREATE POLICY "collaborators_access_policy" ON public.trip_collaborators 
FOR ALL USING (
    user_id = auth.uid() 
    OR 
    public.is_trip_owner(trip_id)
);

-- 5. Friendship Policy
CREATE POLICY "friendships_all_policy" ON public.friendships
FOR ALL USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

COMMIT;
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Database Strict Mode V5</h3>
            <p className="text-xs text-slate-500">Collaborator & Sharing Fix</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-xs text-emerald-800">
            <p className="font-bold mb-1">Action Required:</p>
            <p>Please copy and run this SQL script. It fixes collaborator permissions so trip owners can properly remove shared access.</p>
          </div>
        </div>

        <div className="relative bg-slate-900 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SQL Script</span>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold text-white transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy SQL"}
            </button>
          </div>
          <div className="overflow-auto p-4 flex-1 custom-scrollbar">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
              {sqlCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
