-- Payment records table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paypal_order_id TEXT NOT NULL,
  paypal_capture_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  coins_purchased INTEGER NOT NULL,
  bonus_coins INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Function to add coins after payment is confirmed
CREATE OR REPLACE FUNCTION complete_payment(
  p_paypal_order_id TEXT,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_total_coins INTEGER;
BEGIN
  -- Get the pending payment
  SELECT * INTO v_payment
  FROM payments
  WHERE paypal_order_id = p_paypal_order_id
    AND user_id = p_user_id
    AND status = 'pending';

  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found or already processed';
  END IF;

  -- Calculate total coins
  v_total_coins := v_payment.coins_purchased + v_payment.bonus_coins;

  -- Update payment status
  UPDATE payments
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = v_payment.id;

  -- Add coins to user's balance
  UPDATE users
  SET coins = coins + v_total_coins
  WHERE id = p_user_id;

  RETURN v_total_coins;
END;
$$;
