# Product Requirements - Fuut

## Goal
Create a web app (PWA) to bet on football match results between friends for the 2026 World Cup. The app should have a retro/pixel art aesthetic, be extremely low-friction for non-technical users, and focus on social engagement within private leagues.

## Core Features

### 1. League Management
- **Creation:** A logged-in user can create a "league" by simply providing a name.
- **Admin Tools:** The league creator (Admin) can rename the league, remove members, reset scores, or archive the league.
- **Monetization:** Free for small groups (e.g., up to 4 or 10 players). Larger groups require a paid plan to handle the increased load and maintain the service.

### 2. Easy Invite & Account Flow
- **Invite:** Admins share a link or a unique 6-digit code via WhatsApp/Telegram.
- **Entry:** Invitees enter the league via the link/code and immediately pick a nickname to start participating.
- **Account Creation:** To reduce friction, users can view matches and start filling in scores without a login. However, **to save their first prediction**, they must provide an email and password to secure their account. This ensures they can return to the league from different devices or if their session expires.

### 3. Match Predictions
- **Standard Scoring:** Predict exact scores or match winners. Points are configurable (e.g., Exact Score = 3 pts, Winner = 1 pt).
- **Locking:** Predictions close X minutes before the match starts (X is configurable by the system or league admin).

### 4. Micro-predictions (Bonus Points)
- **Concept:** Fun, "random" bets to keep users engaged even after a match is over or between match days.
- **Sources:**
  - **League Admin:** Can define custom bets for their league (e.g., "Will Trump attend the opening match?").
  - **Players:** Can suggest a micro-prediction to the admin, who must then approve it for the league.
  - **Game Owners:** Global "official" micro-predictions proposed to all users.
- **Resolution:** Since these are custom, the league admin is responsible for manually entering the final result to trigger point distribution.

### 5. Leaderboards & Social
- **Live Ranking:** A real-time leaderboard showing points and positions within the league.
- **Match History:** Ability to see how everyone else predicted (only after the prediction window is closed) to foster competition.
- **Shareable Snapshots:** Generate a summary image/link of the current ranking to share on social media.

### 6. Visual Style
- **Aesthetic:** Retro 8-bit / Pixel Art style inspired by old football arcade machines.
- **Interface:** Simple, playful, and "creepy-cool" (as per the vision).

### 7. Match Data & Results
- **Schedule:** Pre-loaded FIFA 2026 World Cup schedule.
- **Results:** Can be fetched from an API if available, but the system must support manual result entry by a "Global Admin" or "League Admin" for fallback and for the custom micro-predictions.