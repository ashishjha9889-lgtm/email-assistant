# PA Assistant - AI-Powered Email Management Dashboard

A modern, intelligent email management dashboard for personal assistants to manage their clients' emails with AI-powered insights.

## Features

- **AI Email Analysis**: Real OpenAI-compatible API integration analyzes emails and determines who should respond (client vs assistant)
- **Gmail OAuth Integration**: Connect real Gmail accounts via Google OAuth (optional)
- **Dual Views**:
  - **Assistant View**: Full inbox with AI insights, filters, and thread management
  - **Client View**: Minimal "My Attention Required" view with "I'll Reply" / "Assistant, Handle It" buttons
- **Real-time Sync**: Client's responder choices instantly visible to assistant via Upstash Redis
- **AI Draft Replies**: Generate professional email drafts for both client and assistant
- **Full Email Operations**: Reply, forward, archive, mark important, mark read/unread, delete
- **Smart Filters**: Filter by AI category, urgency, responder, unread, important
- **Demo Mode**: Works without API keys using rule-based heuristics and sample data
- **Dark/Light Mode**: Full theme support
- **Mobile Responsive**: Works on all device sizes

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Base UI (shadcn-style components)
- **Auth**: NextAuth v4 with Google OAuth
- **AI**: OpenAI-compatible API (OpenAI, Together.ai, Groq, etc.)
- **Email**: Gmail API (googleapis)
- **Storage**: Upstash Redis (with in-memory fallback for local dev)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud Console project (for Gmail OAuth - optional)
- OpenAI-compatible API key (OpenAI, Together.ai, Groq, etc.)
- Upstash Redis account (for persistent storage - optional)

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local:
# AI_API_KEY=your_openai_compatible_key
# AI_MODEL=gpt-4o-mini (or your preferred model)
# GOOGLE_CLIENT_ID=your_google_client_id (optional)
# GOOGLE_CLIENT_SECRET=your_google_client_secret (optional)
# NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
# NEXTAUTH_URL=http://localhost:3000
# UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io (optional)
# UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token (optional)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - redirects to `/dashboard`

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API: APIs & Services → Library → Gmail API → Enable
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized redirect URIs:
     - Dev: `http://localhost:3000/api/auth/callback/google`
     - Prod: `https://your-app.vercel.app/api/auth/callback/google`
5. Add Client ID and Secret to `.env.local`

### Upstash Redis Setup (Optional)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and Token to `.env.local`
4. Without Upstash, the app uses an in-memory store (data resets on restart)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_API_KEY` | Yes* | OpenAI-compatible API key (OpenAI, Together.ai, Groq, etc.) |
| `AI_MODEL` | No | Model name (default: `gpt-4o-mini`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth Client ID (for Gmail connection) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth Client Secret |
| `NEXTAUTH_SECRET` | Yes | Random string (generate: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g., `https://your-app.vercel.app`) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST Token |

*Required for real AI mode. Without it, the app runs in **Demo Mode** (rule-based).

## Demo Mode

When `AI_API_KEY` is not configured, the app runs in **Demo Mode**:
- Email analysis uses rule-based heuristics (keywords, patterns)
- Draft replies use static templates
- All AI insights show a **Demo** badge
- Sample inbox with 5 labeled threads available via "Load demo inbox" button
- No external API calls are made
- Full UI functionality for testing

## Deployment to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Update Google OAuth redirect URI to `https://your-app.vercel.app/api/auth/callback/google`
5. Deploy!

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/analyze/          # AI email analysis
│   │   ├── ai/draft-reply/      # AI draft replies
│   │   ├── auth/[...nextauth]/  # NextAuth Google OAuth
│   │   ├── kv/                  # Upstash Redis storage (accounts, threads, insights, choices, settings)
│   │   ├── threads/             # Thread CRUD operations
│   │   └── client/              # Client view APIs
│   ├── dashboard/               # Assistant dashboard pages
│   │   ├── inbox/               # Full inbox with split view
│   │   ├── important/           # Important emails
│   │   ├── clients/             # Account management
│   │   ├── insights/            # AI analytics dashboard
│   │   └── settings/            # AI API key settings
│   └── client/                  # Client-facing pages
├── components/
│   ├── ui/                      # Base UI components
│   ├── EmailThreadCard.tsx      # Thread list item
│   ├── ThreadDetail.tsx         # Thread detail view
│   ├── AIInsightPanel.tsx       # AI analysis sidebar
│   ├── Layout.tsx               # Assistant layout
│   └── ClientLayout.tsx         # Client layout
├── hooks/
│   └── useGmail.ts              # Gmail API hook
├── lib/
│   ├── ai-service.ts            # AI API client
│   ├── gmail.ts                 # Gmail API wrapper
│   ├── storage.ts               # Upstash Redis storage helpers
│   └── auth.ts                  # NextAuth configuration
└── types/index.ts               # TypeScript types
```

## License

MIT