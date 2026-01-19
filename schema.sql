
-- 1. Helper Function (SECURITY DEFINER bypasses RLS to break the loop)
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

-- 2. Drop specific policies by name to avoid "already exists" errors
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;
DROP POLICY IF EXISTS "collaborators_access_policy" ON public.trip_collaborators;
DROP POLICY IF EXISTS "friendships_delete_policy" ON public.friendships;
DROP POLICY IF EXISTS "friendships_all_policy" ON public.friendships;

-- 3. Re-create Strict Trip Policies
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

-- 4. Re-create Collaborator Policy
CREATE POLICY "collaborators_access_policy" ON public.trip_collaborators 
FOR ALL USING (
    user_id = auth.uid() 
    OR 
    public.is_trip_owner(trip_id)
);

-- 5. Friendship Policies (Allow users to delete relationships they are part of)
CREATE POLICY "friendships_all_policy" ON public.friendships
FOR ALL USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
