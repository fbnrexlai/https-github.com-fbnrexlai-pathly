
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export interface TripSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  day_count: number;
  user_id: string;
  is_owner?: boolean;
  collaborator_count?: number;
}

export const useTripManager = (onSelectTrip: (id: string) => void) => {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState("");
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; tripId: string | null }>({
    isOpen: false,
    tripId: null,
  });

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setProfile(data);
      return data;
    } catch (e: any) {
      console.error("Profile fetch error:", e.message || e);
      return null;
    }
  };

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch current accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f => 
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );

      // 2. Fetch trips owned by user with their collaborators
      const ownedTripsPromise = supabase
        .from('trips')
        .select(`
          id, name, created_at, updated_at, user_id,
          day_plans (id),
          trip_collaborators (user_id)
        `)
        .eq('user_id', user.id);

      // 3. Fetch trips where user is a collaborator
      const collaboratorTripsPromise = supabase
        .from('trip_collaborators')
        .select(`
          trip_id,
          trips (
            id, name, created_at, updated_at, user_id,
            day_plans (id),
            trip_collaborators (user_id)
          )
        `)
        .eq('user_id', user.id);

      const [ownedRes, collabRes] = await Promise.all([ownedTripsPromise, collaboratorTripsPromise]);

      if (ownedRes.error) throw ownedRes.error;
      if (collabRes.error) throw collabRes.error;

      // Map owned trips and filter collaborator count to only include active friends
      const owned = (ownedRes.data || []).map(t => {
        const activeCollabs = (t.trip_collaborators as any[] || []).filter(tc => 
          friendIds.includes(tc.user_id)
        );
        return {
          ...t,
          is_owner: true,
          collaborator_count: activeCollabs.length
        };
      });
      
      const collaborated = (collabRes.data || [])
        .map(c => c.trips)
        .filter(t => {
          if (!t) return false;
          if (t.user_id === user.id) return false;
          // Ensure trip owner is still a friend
          return friendIds.includes(t.user_id);
        })
        .map(t => ({
          ...t,
          is_owner: false,
          // For collaborated trips, we don't necessarily show other collaborators in this view
          collaborator_count: (t.trip_collaborators as any[] || []).length
        }));

      const allTrips = [...owned, ...collaborated];

      const sortedTrips = allTrips.sort((a, b) => 
        new Date(b.updated_at || b.created_at).getTime() - 
        new Date(a.updated_at || a.created_at).getTime()
      );

      const mappedTrips: TripSummary[] = sortedTrips.map(t => ({
        id: t.id,
        name: t.name,
        created_at: t.created_at,
        updated_at: t.updated_at || t.created_at,
        user_id: t.user_id,
        is_owner: !!t.is_owner,
        day_count: (t.day_plans as any[] || []).length,
        collaborator_count: t.collaborator_count
      }));
      
      setTrips(mappedTrips);
    } catch (err: any) {
      console.error("Fetch trips exception:", err.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchTrips();
  }, [fetchTrips]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const tripId = crypto.randomUUID();
      const { error: tripError } = await supabase.from('trips').insert({
        id: tripId,
        name: newTripName,
        user_id: user.id
      });

      if (tripError) throw tripError;

      await supabase.from('day_plans').insert({
        id: crypto.randomUUID(),
        trip_id: tripId,
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        order_index: 0
      });

      setNewTripName("");
      onSelectTrip(tripId);
    } catch (err: any) {
      console.error("Create trip error:", err);
      alert("建立失敗: " + (err.message || "未知錯誤"));
    } finally {
      setIsCreating(false);
    }
  };

  const executeDelete = async () => {
    const id = deleteConfirm.tripId;
    if (!id) return;
    
    setDeletingId(id);
    setDeleteConfirm({ isOpen: false, tripId: null });

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      setTrips(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error("Delete Error:", err.message || err);
      alert(`刪除失敗: ${err.message || "權限不足"}`);
    } finally {
      setDeletingId(null);
    }
  };

  return {
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
    refreshProfile: fetchProfile,
    refreshTrips: fetchTrips
  };
};
