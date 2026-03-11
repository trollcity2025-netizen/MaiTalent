-- Insert a preview show for testing
INSERT INTO shows (
  title,
  description,
  thumbnail,
  start_time,
  end_time,
  status,
  viewer_count,
  host_id,
  youtube_video_id
) 
VALUES (
  'MaiTalent Live Preview',
  'A preview show to test the platform! Join us for amazing performances.',
  'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800',
  NOW() + interval '5 minutes',
  NOW() + interval '2 hours',
  'upcoming',
  0,
  (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
  NULL
)
RETURNING id, title, start_time, status;
