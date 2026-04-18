# CareerCompass

CareerCompass is a React app with a small Node backend for:

- Gemini-powered outreach drafting
- Gmail OAuth connection to your own account
- Nightly application detection from Gmail
- Automatic outreach emails sent from your Gmail

## Local Run

Open two terminals in `careercompass/`.

Frontend:

```bash
npm start
```

Backend:

```bash
npm run server
```

The frontend runs on `http://localhost:3000`.
The backend runs on `http://localhost:3001`.

## Required `.env`

Add these values to [`.env`](./.env):

```env
REACT_APP_GEMINI_API_KEY=your_gemini_key
REACT_APP_HUNTER_API_KEY=your_hunter_key

GEMINI_API_KEY=your_gemini_key
HUNTER_API_KEY=your_hunter_key

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/oauth/callback
FRONTEND_URL=http://localhost:3000
AUTOMATION_TIMEZONE=America/Chicago
```

## Google Cloud Setup

This app uses Gmail API + OAuth from your own Gmail account.

1. Create or open a Google Cloud project.
2. Enable the Gmail API.
   Source: https://developers.google.com/workspace/gmail/api/quickstart/nodejs
3. Configure the OAuth consent screen.
   Source: https://developers.google.com/workspace/gmail/api/quickstart/nodejs
4. Create an OAuth 2.0 Client ID.
   Use a Web application client.
5. Add this authorized redirect URI:

```text
http://localhost:3001/api/google/oauth/callback
```

6. Copy the client ID and client secret into `.env`.

Google’s OAuth web-server guide is here:
https://developers.google.com/identity/protocols/oauth2/web-server

## What The Automation Does

Each night at `11:00 PM` in your configured timezone, the backend:

1. Reads Gmail messages that look like application confirmations.
2. Infers the company name from the message.
3. Looks up likely contacts for that company with Hunter.
4. Uses Gemini to draft a short “gentle internal nudge” email.
5. Sends the outreach email from your Gmail account with Gmail API.
6. Stops once it has sent `10` outreach emails in that run unless you raise `MAX_OUTREACH_PER_RUN`.

The send endpoint uses Gmail’s `users.messages.send`.
Source: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send

The message scan uses Gmail’s `users.messages.list` with the `q` search parameter.
Source: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list

## Important Notes

- Keep the backend running if you want the nightly schedule to fire.
- OAuth tokens are stored locally under `server/tokens/`.
- Automation state is stored locally under `server/data/`.
- LinkedIn sending is not automated here. Gmail sending is.
- The company detection is heuristic-based. You may want to tighten the Gmail search query for your own inbox later.

## Current Backend Endpoints

- `GET /api/automation/status`
- `POST /api/profile`
- `GET /api/google/oauth/start`
- `GET /api/google/oauth/callback`
- `POST /api/automation/run`
