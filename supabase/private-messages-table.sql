-- Private messages table for direct messaging between users
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_paid_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created ON private_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own messages (sent or received)
CREATE POLICY "Users can read their own messages" ON private_messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to insert messages they send
CREATE POLICY "Users can insert their own messages" ON private_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON private_messages
  FOR DELETE
  USING (auth.uid() = sender_id);
