-- ============================================
-- MUX VIDEO COMPRESSION WEBHOOK SETUP
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create database function to handle storage webhooks
CREATE OR REPLACE FUNCTION handle_storage_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process INSERT events in 'shows' bucket with video content
  IF TG_OP = 'INSERT' AND NEW.bucket_id = 'shows' THEN
    -- Check if it's a video file
    IF NEW.name ~* '\.(mp4|webm|mov|m4v)$' THEN
      -- Call the edge function via HTTP (async)
      PERFORM (
        SELECT net.http_post(
          url := 'https://tknepjvwalphimbglnab.supabase.co/functions/v1/video-compressor',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
          ),
          body := jsonb_build_object(
            'type', 'INSERT',
            'record', jsonb_build_object(
              'bucket_id', NEW.bucket_id,
              'name', NEW.name,
              'id', NEW.id,
              'size', NEW.size
            )
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_storage_upload ON storage.objects;
CREATE TRIGGER on_storage_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_storage_upload();

-- ============================================
-- NOTE: Replace <PROJECTREF> and <SERVICE_ROLE_KEY> 
-- with your actual Supabase project details
-- in the edge function URL above
-- ============================================

-- Environment variables to set in Supabase:
-- MUX_TOKEN_ID = your_mux_token_id
-- MUX_TOKEN_SECRET = your_mux_token_secret
