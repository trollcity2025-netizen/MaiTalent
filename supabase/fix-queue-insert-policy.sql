-- Fix: Add INSERT policy for authenticated users to join the queue
-- Also create a preview show if it doesn't exist
-- Run this in your Supabase SQL Editor

-- 1. First, create a preview show if it doesn't exist
INSERT INTO public.shows (id, title, status, start_time)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Preview Show',
    'live',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on show_queue if not already enabled
ALTER TABLE public.show_queue ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing queue policies
DROP POLICY IF EXISTS "Queue can be viewed by everyone" ON public.show_queue;
DROP POLICY IF EXISTS "Hosts can manage their show queue" ON public.show_queue;

-- 4. Policy: Anyone can view the queue
CREATE POLICY "Queue can be viewed by everyone" 
    ON public.show_queue FOR SELECT USING (true);

-- 5. Policy: Authenticated users can insert themselves into the queue
CREATE POLICY "Authenticated users can join queue" 
    ON public.show_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Policy: Only hosts can update/delete queue entries
CREATE POLICY "Hosts can manage their show queue" 
    ON public.show_queue FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.show_participants sp
            WHERE sp.show_id = public.show_queue.show_id
            AND sp.user_id = auth.uid()
            AND sp.role = 'host'
            AND sp.is_active = true
        )
    );
