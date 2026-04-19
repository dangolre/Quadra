# Quadra

CareerCompass is an AI-assisted job-search workspace that helps you:

- Build a structured candidate profile from resume and links
- Connect Gmail and detect recent application emails
- Find likely contacts at target companies (Hunter)
- Draft personalized outreach with Gemini
- Review/approve outreach before sending
- Track automation status and send approved drafts

This repository contains the main app in the careercompass directory.

## Table of Contents

- Overview
- Key Features
- Project Structure
- Tech Stack
- Prerequisites
- Quick Start
- Environment Variables
- Available Scripts
- API Endpoints
- Automation Behavior
- Data Storage and Security Notes
- Troubleshooting
- Future Improvements

## Overview

CareerCompass combines a React frontend with a Node.js/Express backend.

- Frontend:
	- Profile onboarding and dashboard UX
	- LinkedIn pipeline interface
	- Outreach drafting/approval workflow
	- Local browser persistence for profile/resume state
- Backend:
	- Google OAuth + Gmail API integration
	- Application email sync and parsing
	- Hunter domain contact search
	- AI-assisted assistant actions and outreach orchestration
	- Nightly automation scheduler

## Key Features

- Profile Builder:
	- Paste resume text or upload resume file (pdf/doc/docx/txt)
	- Add target roles, employment type, relocation preference, experience level, and target companies
- Gmail Integration:
	- OAuth connect flow with Google
	- Reads likely application-related emails
	- Sends approved outreach emails from your Gmail account
- Application Tracker:
	- Syncs recent job application emails
	- Deduplicates and stores application entries
- Contact Discovery:
	- Looks up likely people at a company via Hunter API
- AI Drafting:
	- Uses Gemini for profile extraction and message generation
	- Supports role/style-aware networking draft generation
- Approval-first Sending:
	- Outreach drafts are queued for review before send
- Automation:
	- Nightly run at 11:00 PM in a configurable timezone
	- Manual run endpoint also available

## Project Structure

Top-level:

- README.md
- careercompass/

Inside careercompass:

- src/: React app
- server/: Express backend and schemas
- public/: static web assets
- build/ and build-check/: generated build artifacts
- package.json: scripts and dependencies

## Tech Stack

- Frontend: React (react-scripts), TypeScript support, Tailwind config present
- Backend: Node.js, Express
- Integrations:
	- Google APIs (Gmail + OAuth)
	- Hunter API
	- Gemini API
- Scheduling: node-cron
- Validation: zod

## Prerequisites

- Node.js 18+ recommended
- npm 9+ recommended
- A Google Cloud OAuth client for Gmail scopes
- API keys for Gemini and Hunter (for full functionality)

## Quick Start

1. Install dependencies

```bash
npm --prefix careercompass install
```

2. Create your environment file

```bash
cp careercompass/.env.example careercompass/.env
```

3. Update careercompass/.env with your real credentials

4. Start frontend + backend together

```bash
npm --prefix careercompass run dev:all
```

5. Open the app

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Environment Variables

Add these to careercompass/.env.

Required for most real workflows:

- REACT_APP_GEMINI_API_KEY: Gemini key used by frontend AI flows
- GEMINI_API_KEY: Gemini key used by backend flows
- HUNTER_API_KEY: Hunter API key for company/domain people lookup
- GOOGLE_CLIENT_ID: Google OAuth client ID
- GOOGLE_CLIENT_SECRET: Google OAuth client secret
- GOOGLE_REDIRECT_URI: usually http://localhost:3001/api/google/oauth/callback
- FRONTEND_URL: usually http://localhost:3000

Optional or fallback:

- ANTHROPIC_API_KEY: optional alternative model key for assistant internals
- CLAUDE_API_KEY: fallback alias for Anthropic key
- REACT_APP_HUNTER_API_KEY: frontend-accessible Hunter key (optional depending on flow)
- PORT: backend port (default 3001)
- AUTOMATION_TIMEZONE: cron timezone (default America/Chicago)
- MAX_APPLICATIONS_PER_RUN: default 10
- MAX_OUTREACH_PER_RUN: default 10

Important:

- Do not commit .env.
- OAuth tokens and state are stored locally and excluded from git.

## Available Scripts

Run from careercompass:

- npm run dev:all: start backend + frontend concurrently
- npm start: run frontend only
- npm run server: run backend only
- npm run build: production frontend build
- npm test: test runner

From repo root, you can use npm --prefix careercompass <script>.

## API Endpoints

Backend base URL: http://localhost:3001

- GET /api/health
	- Returns basic server, config, and Gmail connection status
- GET /api/automation/status
	- Returns automation config/state, profile sync status, pending drafts, run summaries
- POST /api/profile
	- Syncs extracted profile and resume text into automation state
- POST /api/assistant/action
	- Runs assistant action logic (draft/help/send intent)
- GET /api/google/oauth/start
	- Starts Google OAuth flow
- GET /api/google/oauth/callback
	- OAuth callback endpoint
- GET /api/applications
	- Returns cached applications and last sync time
- POST /api/applications/sync
	- Pulls latest application-like emails from Gmail
- GET /api/hunter/company-search?q=<company-or-domain>
	- Returns contact candidates for a company/domain
- POST /api/automation/run
	- Executes automation run now
- POST /api/automation/send-approved
	- Sends approved draft IDs via Gmail

## Data Storage and Security Notes

- Local backend storage:
	- careercompass/server/data/automation-state.json
	- careercompass/server/tokens/google-oauth-token.json
- Browser localStorage is used for some frontend state (profile/resume convenience)
- Keep API keys and OAuth secrets in .env only
- Avoid sharing token files or screenshots with secrets


## Future Improvements

- Add persistent DB (instead of file-based state)
- Add auth/session layer for multi-user support
- Add richer observability and structured logs
- Add automated tests for parsing and outreach flow
- Add Docker/devcontainer setup for one-command onboarding
