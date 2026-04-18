# CareerCompass

CareerCompass is a React app with a small Node backend for:

- Gemini-powered profile extraction and outreach drafting
- Gmail OAuth connection to your own account
- Job tracking from application emails in Gmail
- Hunter-powered contact discovery
- Pending-approval outreach emails sent from your Gmail
- Profile onboarding assets pulled in from `feature/profile`

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

Or run both together:

```bash
npm run dev:all
```

The frontend runs on `http://localhost:3000`.
The backend runs on `http://localhost:3001`.

## Required `.env`

Add these values to `.env`:

```env
REACT_APP_GEMINI_API_KEY=your_gemini_key
REACT_APP_HUNTER_API_KEY=your_hunter_key

GEMINI_API_KEY=your_gemini_key
HUNTER_API_KEY=your_hunter_key
ANTHROPIC_API_KEY=optional_claude_key

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/oauth/callback
FRONTEND_URL=http://localhost:3000
AUTOMATION_TIMEZONE=America/Chicago
MAX_APPLICATIONS_PER_RUN=10
MAX_OUTREACH_PER_RUN=10
```

## What The Pipeline Does

1. Reads Gmail messages that look like job applications.
2. Infers company and role from the email.
3. Looks up likely contacts with Hunter.
4. Uses Gemini to draft outreach emails.
5. Queues drafts for approval before sending.
6. Sends approved emails from your Gmail account.

## Notes

- Keep the backend running if you want scheduled automation to fire.
- OAuth tokens are stored locally under `server/tokens/`.
- Automation state is stored locally under `server/data/`.
- LinkedIn sending is not automated here. Gmail sending is.
