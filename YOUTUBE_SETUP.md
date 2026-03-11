# YouTube Live Broadcast Integration

This guide explains how to set up automatic YouTube broadcasting for the Mai Talent platform.

## Prerequisites

1. A Google Account with a YouTube channel
2. A Supabase project with the database configured
3. Access to the Supabase dashboard to set environment variables

## Step 1: Set Up YouTube API Credentials

### 1.1 Create a Project in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

### 1.2 Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen:
   - User Type: External
   - Add required scopes:
     - `https://www.googleapis.com/auth/youtube`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
   - Add your email as a test user
4. Create the OAuth client:
   - Application type: Web application
   - Add authorized redirect URI: `https://developers.google.com/oauthplayground`
5. Note down the **Client ID** and **Client Secret**

### 1.3 Get a Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (settings)
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the "Step 1 - Select & authorize APIs", search for:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
6. Click "Authorize APIs"
7. In "Step 2 - Exchange authorization code for tokens", click "Exchange authorization code for tokens"
8. Note down the **Refresh Token**

### 1.4 Get Your Channel ID

1. Go to your YouTube account settings
2. Click "Advanced settings"
3. Note down your **Channel ID** (starts with "UC")

## Step 2: Configure Supabase Edge Function

### 2.1 Set Environment Variables

Go to your Supabase dashboard:
1. Navigate to "Edge Functions" 
2. Click "Manage Secrets" or go to Settings > Edge Functions
3. Add the following secrets:

```
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REFRESH_TOKEN=your-refresh-token
YOUTUBE_CHANNEL_ID=your-channel-id
```

### 2.2 Deploy the Edge Function

Run the deployment command:

```bash
npm run deploy:edge-function
```

Or manually deploy via Supabase CLI:

```bash
supabase functions deploy youtube-broadcast
```

## Step 3: Run Database Migrations

Run the SQL migrations in your Supabase SQL Editor:

1. Open the Supabase SQL Editor
2. Copy and run the contents of `supabase-feature-migrations.sql`

This creates:
- New columns in the `shows` table for YouTube broadcast tracking
- A `youtube_broadcast_settings` table for configuration
- Database functions for starting/ending broadcasts

## Step 4: Configure Platform Settings

1. In your app, go to the Admin Dashboard
2. Find the YouTube settings section
3. Enter your YouTube Channel ID
4. Configure the chat promo message settings:
   - Enable/disable periodic chat messages
   - Set the interval (default: 60 seconds)
   - Customize the message (default: "Join the interactive show at MaiTalent.fun to vote and send gifts.")

## Step 5: Start Broadcasting

When a show begins:

1. The admin clicks "Start Broadcast" in the show control panel
2. The system creates a YouTube live broadcast with:
   - Title: "Mai Talent Live Show – [Date]"
   - Description: Platform info and join link
   - Visibility: Public (configurable)
3. An RTMP stream URL and key are generated
4. The stream can be used with OBS or other broadcasting software
5. Periodic chat messages are sent to YouTube Live Chat

When the show ends:
1. The admin clicks "End Broadcast"
2. The broadcast transitions to "complete" status
3. The stream is kept as a replay on YouTube

## Stream Configuration for OBS

To stream to YouTube via the platform:

1. Get the stream URL and key from the show control panel
2. In OBS Studio:
   - Go to Settings > Stream
   - Service: YouTube - RTMP
   - Server: `rtmp://a.rtmp.youtube.com/live2`
   - Stream Key: [paste the stream key from the platform]
3. Start streaming in OBS
4. The broadcast will go live on YouTube

## Features

### Automatic Features
- ✅ Create YouTube live broadcast on show start
- ✅ Generate RTMP stream key
- ✅ Stream title format: "Mai Talent Live Show – [Date]"
- ✅ Stream description with platform info
- ✅ Default visibility: Public
- ✅ Keep replay after show ends
- ✅ Periodic chat messages (configurable)

### Management Features
- Start/end broadcasts from admin panel
- View stream status in real-time
- Configure chat promo messages
- Copy stream URL/key to clipboard

## Troubleshooting

### Broadcast Not Starting
- Check that all environment variables are set correctly
- Verify the YouTube API is enabled in Google Cloud Console
- Check the Edge Function logs in Supabase dashboard

### Stream Not Connecting
- Verify the stream key is correct
- Check that OBS is using the correct RTMP URL
- Ensure firewall allows RTMP connections

### Chat Messages Not Sending
- Verify the broadcast has live chat enabled
- Check that the promo interval is set appropriately

## API Reference

### Edge Function Endpoints

```
POST /functions/v1/youtube-broadcast
```

Actions:
- `create_broadcast`: Create a new YouTube live broadcast
- `create_stream`: Create an RTMP stream
- `bind_broadcast`: Bind broadcast to stream
- `transition_broadcast`: Change broadcast status
- `get_broadcast`: Get broadcast details
- `end_broadcast`: End the broadcast
- `send_chat_message`: Send a message to live chat
