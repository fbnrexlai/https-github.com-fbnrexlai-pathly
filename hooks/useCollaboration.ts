
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export const useCollaboration = () => {
  const [loading, setLoading] = useState(false);

  const searchUser = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();
    if (error) throw error;
    return data;
  };

  const sendFriendRequest = async (receiverId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    });
    if (error) throw error;
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    if (accept) {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('friendships').delete().eq('id', requestId);
      if (error) throw error;
    }
  };

  const getFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        sender_id,
        receiver_id,
        sender:profiles!friendships_sender_id_fkey(id, username),
        receiver:profiles!friendships_receiver_id_fkey(id, username)
      `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) throw error;
    
    return (data || []).map((f: any) => {
      const isSender = f.sender_id === user.id;
      const friendProfile = isSender ? f.receiver : f.sender;
      return {
        friendship_id: f.id, 
        id: friendProfile.id,
        username: friendProfile.username
      };
    });
  };

  const removeFriend = async (friendshipId: string) => {
    console.log("[useCollaboration] removeFriend initiated for ID:", friendshipId);
    setLoading(true);
    try {
      console.log("[useCollaboration] Sending DELETE query to Supabase...");
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
        
      if (error) {
        console.error("[useCollaboration] Supabase error during deletion:", error);
        throw error;
      }
      
      console.log("[useCollaboration] DELETE query successful.");
      return true;
    } catch (err) {
      console.error("[useCollaboration] Exception in removeFriend:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = async (tripId: string, userId: string) => {
    const { error } = await supabase.from('trip_collaborators').insert({
      trip_id: tripId,
      user_id: userId,
      role: 'editor'
    });
    if (error) throw error;
  };

  const removeCollaborator = async (tripId: string, userId: string) => {
    const { error } = await supabase
      .from('trip_collaborators')
      .delete()
      .match({ trip_id: tripId, user_id: userId });
    if (error) throw error;
  };

  return { 
    searchUser, 
    sendFriendRequest, 
    respondToRequest, 
    getFriends, 
    removeFriend, 
    addCollaborator, 
    removeCollaborator,
    loading 
  };
};
