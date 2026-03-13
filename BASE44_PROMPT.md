# Complete Prompt for Recreating Mai Talent Platform

Use this prompt with Base44 (or any AI coding assistant) to recreate the Mai Talent platform.

---

## Project Overview

**Mai Talent** is an interactive online talent competition platform (like a virtual talent show/TV show) where users can perform, host, judge, and watch live talent shows. It features live video streaming, virtual currency (coins), competitive shows with rounds, audience participation, and monetization through PayPal.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (with custom theme)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Live Streaming**: Agora RTC SDK (video/audio streaming)
- **Video Player**: @mux/mux-player-react
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Payments**: PayPal integration (checkout + payouts)
- **Notifications**: React OneSignal

---

## Color Scheme (CSS Variables)

These are the exact colors used throughout the platform:

```css
/* Primary Colors */
--color-candy-red: #ff1a1a;
--color-candy-red-dark: #cc0000;
--color-candy-red-light: #ff4d4d;

/* Accent Colors */
--color-neon-yellow: #ffe600;
--color-neon-yellow-light: #fff066;
--color-neon-gold: #ffd700;
--color-neon-pink: #ff69b4;
--color-neon-orange: #ff8c00;

/* Background Colors */
--color-stage-dark: #0a0a0a;
--color-stage-dark-2: #151515;
--color-glass-white: rgba(255, 255, 255, 0.1);
--color-glass-black: rgba(0, 0, 0, 0.3);

/* Judge Purple */
Judge panels use: #9333ea (purple gradient)
```

---

## Design System Features

### Neon Glow Effects
- Red glow: `box-shadow: 0 0 5px #ff1a1a, 0 0 10px #ff1a1a, 0 0 20px #ff1a1a, 0 0 40px #ff1a1a`
- Gold glow: `box-shadow: 0 0 5px #ffd700, 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 40px #ffd700`
- Mixed red-gold glow

### Glassmorphism
- Glass effect: `background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1)`

### Shimmer Animations
- Gold shimmer: Animated gradient text with `shimmer-gold` class
- Red shimmer: Animated gradient text with `shimmer-red` class

### Gradients
- Candy red: `linear-gradient(135deg, #ff1a1a 0%, #cc0000 50%, #ff1a1a 100%)`
- Neon gold: `linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%)`
- Red to gold: `linear-gradient(135deg, #ff1a1a 0%, #ffd700 100%)`

### Stage Effects
- Spotlight beam animations
- Particle float effects
- Confetti animations
- Curtain opening/closing animations
- Fire glow effects for trending performers
- Scanlines overlay

---

## Pages & Routes

```
/                   → HomePage (live shows, featured content)
/shows              → HomePage (live shows)
/calendar           → CalendarPage (show schedule)
/auditions          → AuditionPage (audition submissions)
/competition        → CompetitionPage (season competitions)
/champions          → HallOfChampionsPage (past winners)
/leaderboard        → LeaderboardPage (rankings)
/profile            → ProfilePage (user profile)
/profile/:id        → ProfilePage (other user profiles)
/chats              → MaiChatsPage (chat rooms)
/fans               → FansPage (followers/following)
/admin              → AdminDashboardPage (admin controls)
/show/:id           → LiveShowPage (live video show)
/auth               → AuthPage (login/signup)
/terms              → TermsPage (terms of service)
/reset-password     → ResetPasswordPage
```

---

## Core Features

### 1. Authentication & User Management
- Email/password signup and login
- Terms acceptance required for signup
- User roles: Admin, CEO, Performer, Judge, Regular User
- Profile management (avatar, bio, talent category)
- Follower/following system
- Date of birth verification (18+ requirement)

### 2. Virtual Currency (Coins)
- Users purchase coins via StoreModal (PayPal checkout)
- Coins used to:
  - Send gifts to performers
  - Boost performers in shows
  - Unlock audience saves
- **ALL COIN SALES ARE FINAL - NO REFUNDS**

### 3. Live Shows
- **Performers**: Stream live video/audio via Agora
- **Judges**: Score performances (1-10 scale)
- **Audience**: Watch, chat, send gifts, vote
- **Hosts**: Manage show flow, eliminate contestants
- Features:
  - Video player with controls
  - Live chat
  - Gift panel (animated gift effects)
  - Voting system
  - Elimination meter
  - Sudden death rounds
  - Crowd boost overlay
  - YouTube broadcasting integration

### 4. Competition System
- Seasons with multiple rounds
- Auditions (video submissions)
- Round types: Preliminaries, Semifinals, Finals
- Scoring: Judge scores + audience votes
- Leaderboard tracking
- Prize distribution

### 5. Hall of Champions
- Past season winners
- Championship history
- Winner profiles with stats

### 6. Admin Dashboard
- User management (ban, promote)
- Show management
- Payout processing
- Broadcast control
- Analytics

### 7. Monetization
- **Coin purchases**: PayPal checkout integration
- **Payouts**: Performers convert coins to cash via PayPal (weekly on Fridays)
- Platform takes percentage

### 8. Social Features
- User follows
- Chat rooms (Mai Chats)
- Profile pages
- Badges/achievements

---

## Key Components

### Header
- Logo with shimmer effect
- Navigation
- User avatar/menu
- Coins display
- Notification bell
- Live indicator

### Sidebar
- Collapsible navigation
- Live Now button (links to current show)
- Wallet section with:
  - Coin balance
  - Buy Coins button
  - Request Payout button
  - PayPal settings

### Live Show Page
- Full-screen video player
- Performer video grid
- Judge panel
- Voting buttons
- Gift panel
- Chat sidebar
- Audience overlay
- Elimination controls
- YouTube broadcast controls

### Store Modal
- Coin packages
- PayPal checkout integration

### Payout Modal
- Coin to cash conversion
- PayPal payout request
- Balance history

---

## Database Schema (Supabase)

### Tables needed:
- `users` - User profiles
- `shows` - Live shows
- `show_participants` - Performers/judges in shows
- `rounds` - Competition rounds
- `auditions` - Audition submissions
- `votes` - Performance votes
- `gifts` - Gift definitions
- `gift_transactions` - Gift sent history
- `coin_purchases` - Purchase history
- `payouts` - Payout requests
- `follows` - Follow relationships
- `badges` - User badges
- `chat_messages` - Chat history
- `terms_acceptances` - Terms version tracking
- `banned_ips` - IP ban list

---

## Edge Functions (Supabase)

- `youtube-broadcast` - YouTube live streaming
- `paypal-checkout` - Coin purchase processing
- `paypal-payout` - Performer payouts
- `video-compressor` - Video compression
- `send-notification` - Push notifications

---

## Terms of Service Content

Include these sections:
1. Platform Description
2. Age Requirement (18+)
3. Coins & Virtual Currency Policy (NO REFUNDS)
4. Earnings & Weekly Payouts
5. Recording & Media Usage Consent (users grant permission for recordings on YouTube and other platforms for advertisement)
6. Content & Conduct Rules
7. Fraud & Abuse
8. Account Termination
9. Intellectual Property & Copyright (ILLEGAL TO COPY platform content)
10. Changes to Terms

Footer: "© 2026 Mai Talent. All Rights Reserved."

---

## UI/UX Details

- Dark theme throughout (background: #0a0a0a)
- Neon accent lighting effects
- Glassmorphism cards and modals
- Animated stage effects
- Responsive design (mobile-friendly)
- Custom scrollbars (red theme)
- Live badge animations
- Gold shimmer on headings
- Red glow on buttons

---

## Environment Variables Needed

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AGORA_APP_ID=your_agora_app_id
```

---

## Deployment

- Frontend: Vercel/Netlify
- Backend: Supabase
- Edge Functions: Supabase Edge Functions
- Live Streaming: Agora
- Video Hosting: Mux

---

This is the complete blueprint for recreating the Mai Talent platform exactly as it exists today.
