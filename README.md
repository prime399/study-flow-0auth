# StudyFlow AI 🎓

> Enterprise-grade study management platform powered by Heroku Managed Inference, Model Context Protocol (MCP), and Auth0 hybrid authentication

StudyFlow AI is a comprehensive learning platform that combines advanced AI capabilities with real-time analytics to help students optimize their study habits. Built on Heroku's Managed Inference infrastructure with MCP tool integration, it features MentorMind - an intelligent AI assistant capable of processing external resources and providing context-aware study guidance. Google Calendar and Spotify are connected via Auth0 machine-to-machine token injection, giving MentorMind seamless access to your schedule and music without separate OAuth flows.

## ✨ Key Features

### Core Functionality
- **🕒 Smart Study Timer** - Customizable Pomodoro sessions with automatic progress tracking and statistics
- **🤖 MentorMind AI Assistant** - RAG-powered AI with MCP tool integration for external resource access
- **📈 Performance Analytics** - Comprehensive visual dashboards with trend analysis and insights
- **👥 Study Groups** - Collaborative workspaces with real-time messaging and leaderboards
- **✅ Task Management** - Kanban-style todo board with drag-and-drop, priorities, and status tracking
- **🏆 Competitive Features** - Global and group-specific leaderboards to encourage engagement
- **📅 Google Calendar Integration** - Study sessions auto-synced to Google Calendar via Auth0 M2M token injection
- **🎵 Spotify Integration** - Background music during study sessions, connected via Auth0 OAuth

### AI Capabilities (MentorMind)
- **Multi-Model Architecture** - Dynamic routing between GPT-OSS 120B, Nova Lite/Pro, and Claude 4.5 Sonnet
- **MCP Tool Integration** - Automatic external resource fetching and processing via Model Context Protocol
- **Context-Aware Responses** - Personalized advice based on user study patterns, performance metrics, and group data
- **URL Processing** - Automatic extraction and analysis of content from study materials (PDFs, articles, documentation)
- **Real-Time Adaptation** - Continuously learns from user interactions and study outcomes

## 🚀 Quick Start

### Prerequisites

#### Required
- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **Git** for version control
- **Convex account** ([convex.dev](https://convex.dev)) - Backend infrastructure
- **Heroku Inference API** access for AI features

#### Recommended
- **Vercel account** for frontend deployment
- **Code editor** with TypeScript support (VS Code recommended)
- **API testing tool** (Postman, Insomnia, or similar) for development

### 1. Clone & Install

```bash
git clone https://github.com/prime399/study-flow.git
cd study-flow
pnpm install
```

### 2. Environment Configuration

Create `.env.local` in the project root for Next.js environment variables:

```bash
# ======================
# CONVEX CONFIGURATION
# ======================
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# ======================
# HEROKU INFERENCE - AI MODELS
# ======================
# Base URL for Heroku Managed Inference
HEROKU_INFERENCE_URL=https://us.inference.heroku.com

# Model identifiers (comma-separated for multi-model support)
HEROKU_INFERENCE_MODEL_ID=gpt-oss-120b,nova-lite,claude-4-5-sonnet,nova-pro

# API Keys for each model (at least one required)
HEROKU_INFERENCE_KEY_OSS=your-oss-key          # For GPT-OSS 120B
HEROKU_INFERENCE_KEY_CLAUDE=your-claude-key    # For Claude 4.5 Sonnet
HEROKU_INFERENCE_KEY_NOVA_LITE=your-lite-key   # For Nova Lite
HEROKU_INFERENCE_KEY_NOVA_PRO=your-pro-key     # For Nova Pro

# ======================
# APPLICATION SETTINGS
# ======================
# Base URL for API endpoints (required for MCP tool discovery)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ======================
# ANALYTICS (Optional)
# ======================
VERCEL_ANALYTICS_ID=your-analytics-id
```

#### Obtaining API Keys

**Heroku Inference API Keys:**
1. Sign up at [Heroku](https://www.heroku.com)
2. Navigate to Account Settings → API Keys
3. Generate separate keys for each model you plan to use
4. Copy the keys to your `.env.local` file

**Important Notes:**
- At least **one AI model key** is required for MentorMind to function
- `NEXT_PUBLIC_APP_URL` must match your deployment URL in production
- Never commit `.env.local` to version control

### 3. Convex Setup

```bash
# Initialize Convex
npx convex dev

# Set up Convex Auth fallback providers (used if Auth0 is unavailable)
npx convex env set AUTH_GITHUB_ID your-github-client-id
npx convex env set AUTH_GITHUB_SECRET your-github-secret
npx convex env set AUTH_GOOGLE_ID your-google-client-id
npx convex env set AUTH_GOOGLE_SECRET your-google-secret

# Auth0 domain for JWT verification
npx convex env set AUTH0_DOMAIN your-tenant.auth0.com
npx convex env set AUTH0_CLIENT_ID your-auth0-client-id
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 📁 Project Structure

```
StudyFlow/
├── app/                    # Next.js app directory
│   ├── (protected)/       # Protected routes (dashboard, groups, etc.)
│   │   └── dashboard/
│   │       ├── ai-helper/  # MentorMind AI assistant
│   │       ├── study/      # Study timer and analytics
│   │       ├── todos/      # Task management board
│   │       ├── groups/     # Study groups and messaging
│   │       └── calendar/   # Study session planning
│   ├── api/               # API routes
│   │   └── ai-helper/     # AI assistant endpoints
│   └── signin/            # Authentication pages
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui)
│   └── ...               # Feature-specific components
├── convex/               # Backend functions and schema
│   ├── _generated/       # Generated Convex types
│   ├── schema.ts         # Database schema definition
│   ├── auth.ts           # Authentication functions
│   ├── study.ts          # Study session management
│   ├── groups.ts         # Group management
│   ├── todos.ts          # Task management
│   └── ...               # Other backend functions
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and shared logic
├── store/                # State management
├── types/                # TypeScript type definitions
└── public/              # Static assets and favicons
```

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router and Server Components
- **Language**: TypeScript with strict mode enabled
- **UI Library**: Shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Convex React hooks with optimistic updates
- **Real-time Communication**: WebSocket connections via Convex

### Backend Infrastructure
- **Database**: Convex (serverless, real-time NoSQL)
- **Authentication**: Hybrid Auth0 + Convex Auth (see below)
- **API Layer**: Next.js API routes with TypeScript
- **AI Integration**: Heroku Managed Inference with multi-model support
- **MCP Tools**: Model Context Protocol for external resource access

### MentorMind AI Architecture

#### RAG (Retrieval-Augmented Generation) Pipeline

```
User Query → Context Retrieval → Model Selection → Response Generation
     ↓              ↓                    ↓                  ↓
  Message     Study Data          AI Model           Personalized
  History     Performance        (via Heroku)          Response
              Group Info
```

**Components:**

1. **Context Retrieval Layer**
   - Fetches user study statistics from Convex
   - Retrieves group membership and collaboration data
   - Collects performance metrics and learning patterns
   - Builds comprehensive user profile for contextualization

2. **Model Routing Engine**
   - Analyzes query complexity and requirements
   - Selects optimal AI model (GPT-OSS, Nova, Claude)
   - Routes requests to appropriate Heroku Inference endpoint
   - Falls back to alternative models if primary unavailable

3. **MCP Tool Integration**
   - Discovers available tools from `/v1/mcp/servers` endpoint
   - Automatically provisions all tools to AI agent
   - Parses Server-Sent Events (SSE) responses
   - Handles tool invocations transparently

4. **Response Processing**
   - Extracts AI-generated content from responses
   - Processes tool invocation results
   - Formats output for user consumption
   - Maintains conversation context

#### MCP (Model Context Protocol) Implementation

The MCP integration enables MentorMind to access external resources dynamically:

**Architecture Flow:**

```typescript
// 1. Tool Discovery (on each request)
const mcpTools = await fetchAvailableMcpTools()
// Fetches from: /v1/mcp/servers

// 2. System Prompt Enhancement
systemPrompt += `
You have access to the following MCP tools:
${toolsList}
Use these tools proactively when they can help.
`

// 3. Request to Heroku Agents Endpoint
POST /v1/agents/heroku
{
  model: "gpt-oss-120b",
  messages: [...],
  tools: [
    { type: "mcp", name: "fetch/read_url" },
    // All available tools included
  ]
}

// 4. SSE Response Parsing
data: {"object": "chat.completion", "choices": [...]}
data: [DONE]
```

**Key Design Decisions:**
- **Dynamic Tool Discovery**: Tools are fetched on every request to ensure availability
- **All-Tools Provisioning**: All discovered tools are sent to the AI, letting it decide usage
- **Graceful Degradation**: Falls back to standard chat completions if no tools available
- **SSE Parsing**: Custom parser handles Heroku's streaming response format

## 🚢 Deployment

### Vercel (Frontend)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   ```bash
   CONVEX_DEPLOYMENT=your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   HEROKU_INFERENCE_URL=https://api.heroku.com/ai
   HEROKU_INFERENCE_KEY_OSS=your-oss-key
   # Auth0
   AUTH0_SECRET=your-auth0-secret
   AUTH0_BASE_URL=https://your-domain.com
   AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
   AUTH0_CLIENT_ID=your-auth0-client-id
   AUTH0_CLIENT_SECRET=your-auth0-client-secret
   AUTH0_AUDIENCE=your-api-audience
   # ... other AI model keys
   ```
3. **Deploy** - Vercel will automatically build and deploy

### Convex (Backend)

```bash
# Deploy to production
npx convex deploy

# Set production environment variables
npx convex env set AUTH_GITHUB_ID your-github-id --prod
npx convex env set AUTH_GITHUB_SECRET your-github-secret --prod
npx convex env set AUTH0_DOMAIN your-tenant.auth0.com --prod
npx convex env set AUTH0_CLIENT_ID your-auth0-client-id --prod
# ... repeat for other variables
```

## 🛠️ Development

### Available Scripts

```bash
pnpm dev          # Start development (frontend + backend)
pnpm dev:frontend # Start only Next.js dev server
pnpm dev:backend  # Start only Convex dev server
pnpm build        # Build for production
pnpm lint         # Run ESLint
```

### Database Schema

The app uses Convex with the following main tables:
- **users** - User profiles and authentication
- **studySessions** - Study session tracking
- **studySettings** - User preferences and goals
- **groups** - Study group information
- **groupMembers** - Group membership and roles
- **messages** - Group chat messages
- **todos** - Task management with status and priority

## 🔧 Advanced Configuration

### AI Model Selection

Configure at least one AI model for MentorMind functionality. Each model has different characteristics:

| Model | Environment Variable | Use Case | Response Time | Cost |
|-------|---------------------|----------|---------------|------|
| **GPT-OSS 120B** | `HEROKU_INFERENCE_KEY_OSS` | General-purpose, recommended default | Medium | Low |
| **Nova Lite** | `HEROKU_INFERENCE_KEY_NOVA_LITE` | Quick responses, simple queries | Fast | Low |
| **Nova Pro** | `HEROKU_INFERENCE_KEY_NOVA_PRO` | Balanced performance and quality | Medium | Medium |
| **Claude 4.5 Sonnet** | `HEROKU_INFERENCE_KEY_CLAUDE` | Complex reasoning, analysis | Slower | Higher |

**Model Routing Logic:**
- User can manually select model from UI dropdown
- "Auto" mode analyzes query complexity and routes to optimal model
- System automatically falls back to available models if primary is unavailable

### MCP (Model Context Protocol) Setup

#### Prerequisites for MCP Tools

1. **Heroku MCP Servers**: Must be deployed and registered with Heroku Inference
2. **API Access**: Requires valid `HEROKU_INFERENCE_KEY_OSS` or equivalent
3. **Network Access**: Application must reach `https://us.inference.heroku.com`

#### Available MCP Tools

The system dynamically discovers tools from `/v1/mcp/servers`. Common tools include:

- **fetch/read_url** - Fetches and reads content from URLs
- **fetch/read_pdf** - Extracts text from PDF documents
- **search/web_search** - Performs web searches (if configured)

#### Deploying Custom MCP Servers

To add custom MCP tools to your deployment:

```bash
# 1. Create MCP server following Heroku's specifications
# Reference: https://github.com/heroku/mcp-doc-reader

# 2. Deploy server to Heroku
heroku create my-mcp-server
git push heroku main

# 3. Register with Heroku Inference
# Contact Heroku support to register your MCP server

# 4. Tools will automatically appear in StudyFlow
```

#### MCP Configuration Verification

Test your MCP setup:

```bash
# Check if MCP endpoint is accessible
curl -H "Authorization: Bearer YOUR_KEY" \
  https://us.inference.heroku.com/v1/mcp/servers

# Should return JSON array of available servers and tools
```

### Authentication Architecture

StudyFlow uses a **hybrid Auth0 + Convex Auth** model that combines the strengths of both systems.

#### How It Works

```
User Login
    │
    ├── Auth0 (primary)
    │     ├── Google OAuth  ──→ Google Calendar tokens injected via M2M
    │     ├── GitHub OAuth
    │     └── Session + refresh token management
    │
    └── Convex Auth (fallback)
          ├── Activates if Auth0 session is unavailable
          ├── GitHub + Google OAuth (direct)
          └── Manages Convex user identity & real-time subscriptions
```

**Auth0 (primary layer)**
- Handles login, session cookies, and token refresh automatically
- Google and Spotify connections request the necessary OAuth scopes at login time — no separate OAuth flow needed
- Google Calendar tokens (`access_token`, `refresh_token`) are passed to MentorMind via Auth0 machine-to-machine (M2M) token injection, using a post-login Action that embeds upstream Google tokens as custom claims
- Spotify tokens follow the same pattern — Auth0 acts as the broker, and the app reads tokens from the session claims
- Fine-grained calendar permissions (read/create/modify/delete) are stored in Convex and enforced at the API level

**Convex Auth (fallback layer)**
- If the Auth0 session is missing or expired and cannot be refreshed, Convex Auth takes over
- Convex Auth maintains its own GitHub/Google OAuth flow and issues its own session tokens
- All Convex backend functions (`getAuthUserId`) continue to work regardless of which layer authenticated the user
- This ensures zero downtime: users stay logged in even during Auth0 outages

**Machine-to-Machine token flow (Google Calendar & Spotify)**

```
Auth0 Post-Login Action
    │
    ├── Reads upstream Google/Spotify access + refresh tokens
    │   from event.user.identities
    │
    └── Embeds as custom claims in the Auth0 ID token
              │
              ▼
    MentorMind AI Helper (/api/ai-helper)
              │
              ├── Reads tokens from Auth0 session claims
              ├── Injects into calendar-executor via injectUserTokensToMCP()
              └── Stores/refreshes in Convex googleCalendarTokens table
```

This means users connect Google Calendar and Spotify once at login — no separate "Connect Google Calendar" OAuth popup is needed.

#### Required Auth0 Configuration

1. **Google Social Connection** — enable with your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
2. **Spotify Social Connection** — enable with your Spotify app credentials
3. **Auth0 API** — create with an audience (e.g. `https://studyflow.api`), enable "Allow Offline Access"
4. **Post-Login Action** — embeds upstream Google/Spotify tokens as custom ID token claims
5. **Refresh Token Rotation** — enable under Security settings

#### Environment Variables (Auth0)

```bash
AUTH0_SECRET=<random 32+ char string>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://<your-tenant>.auth0.com
AUTH0_CLIENT_ID=<from Auth0 dashboard>
AUTH0_CLIENT_SECRET=<from Auth0 dashboard>
AUTH0_AUDIENCE=<your API identifier>
AUTH0_SCOPE="openid profile email offline_access"
```

### Authentication Providers

> **Note**: GitHub and Google OAuth are configured in Auth0 as social connections. The Convex env vars below are for the Convex Auth fallback layer only.

#### GitHub OAuth Setup

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - **Application name**: StudyFlow AI
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://<your-tenant>.auth0.com/login/callback`
4. Copy Client ID and Client Secret
5. Add to Auth0: Dashboard → Authentication → Social → GitHub
6. Also add to Convex for fallback:
   ```bash
   npx convex env set AUTH_GITHUB_ID your-client-id
   npx convex env set AUTH_GITHUB_SECRET your-client-secret
   ```

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Navigate to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
4. Configure OAuth consent screen — add Google Calendar API scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://<your-tenant>.auth0.com/login/callback` (for Auth0)
   - `https://your-deployment.convex.site/api/auth/callback/google` (for Convex fallback)
7. Copy Client ID and Client Secret
8. Add to Auth0: Dashboard → Authentication → Social → Google
9. Also add to Convex for fallback:
   ```bash
   npx convex env set AUTH_GOOGLE_ID your-client-id
   npx convex env set AUTH_GOOGLE_SECRET your-client-secret
   ```

### Coin System Configuration

StudyFlow uses a coin-based system for AI interactions:

- **Earn Coins**: 1 coin per second of active study time
- **Spend Coins**: 5 coins per AI query (configurable)
- **Starting Balance**: 100 coins for new users

To modify coin costs, update in `app/api/ai-helper/_lib/coin-system.ts`:

```typescript
export const COINS_PER_QUERY = 5  // Adjust as needed
export const INITIAL_BALANCE = 100
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### MentorMind Not Responding

**Symptom**: AI assistant shows error or doesn't respond to queries

**Possible Causes & Solutions**:

1. **Missing API Keys**
   ```bash
   # Verify environment variables are set
   echo $HEROKU_INFERENCE_KEY_OSS
   # Should output your API key, not empty
   ```
   **Solution**: Ensure at least one model API key is configured in `.env.local`

2. **Invalid API Key**
   ```bash
   # Test API key validity
   curl -H "Authorization: Bearer YOUR_KEY" \
     https://us.inference.heroku.com/v1/models
   ```
   **Solution**: If 401/403 error, regenerate API key from Heroku dashboard

3. **Insufficient Coins**
   - Check coin balance in UI footer
   - **Solution**: Start a study session to earn coins (1 coin/second)

#### MCP Tools Not Working

**Symptom**: AI can't access external URLs or PDFs

**Diagnostics**:

```bash
# 1. Check MCP servers endpoint
curl -H "Authorization: Bearer YOUR_KEY" \
  https://us.inference.heroku.com/v1/mcp/servers

# 2. Verify NEXT_PUBLIC_APP_URL is set correctly
echo $NEXT_PUBLIC_APP_URL
# Should match your deployment URL

# 3. Check browser console for errors
# Look for: "Failed to fetch MCP tools"
```

**Solutions**:
- Ensure `NEXT_PUBLIC_APP_URL` environment variable is set
- Verify Heroku MCP servers are deployed and registered
- Check network connectivity to Heroku Inference API

#### Convex Connection Issues

**Symptom**: "Connecting to Convex..." stuck or data not updating

**Solutions**:

1. **Check Convex Status**
   - Visit [Convex Status](https://status.convex.dev/)
   - Verify no ongoing incidents

2. **Verify Deployment URL**
   ```bash
   # Check NEXT_PUBLIC_CONVEX_URL
   grep CONVEX_URL .env.local
   # Should match your Convex dashboard URL
   ```

3. **Re-authenticate with Convex**
   ```bash
   npx convex dev
   # Follow prompts to re-authenticate
   ```

#### Build Errors

**Issue**: TypeScript compilation errors

```bash
# Common fixes:

# 1. Clear Next.js cache
rm -rf .next
pnpm dev

# 2. Regenerate Convex types
npx convex dev
# Let it run until types are generated

# 3. Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 4. Check Node.js version
node --version
# Should be 18.x or higher
```

#### Authentication Not Working

**Symptom**: Can't sign in with GitHub/Google

**Checklist**:
- [ ] Auth0 application created and configured
- [ ] Google/GitHub social connections enabled in Auth0
- [ ] Callback URLs set in Auth0 app: `https://your-domain.com/api/auth/callback`
- [ ] All `AUTH0_*` environment variables set in `.env.local`
- [ ] Auth0 API created with correct audience
- [ ] Application is using HTTPS (required for OAuth)

**Debugging**:
```bash
# Check Auth0 env vars are set
grep AUTH0 .env.local

# Check Convex fallback auth vars
npx convex env list | grep AUTH

# Should show AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH0_DOMAIN, AUTH0_CLIENT_ID
```

#### Study Sessions Not Saving

**Symptom**: Study timer runs but sessions don't appear in analytics

**Possible Causes**:
1. **Not authenticated** - User must be signed in
2. **Convex connection lost** - Check network tab in browser devtools
3. **Database mutation failed** - Check Convex dashboard logs

**Solution**:
```javascript
// Check browser console for errors
// Look for: "Failed to create study session"

// Verify user is authenticated
// Check: User profile icon appears in top-right
```

### Performance Issues

#### Slow AI Responses

1. **Switch to faster model**: Select "Nova Lite" from model dropdown
2. **Check network latency**: 
   ```bash
   ping us.inference.heroku.com
   ```
3. **Verify no rate limiting**: Check Heroku dashboard for API limits

#### UI Lag or Freezing

1. **Clear browser cache**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Disable browser extensions**: Test in incognito mode
3. **Check system resources**: AI responses can be memory-intensive

### Getting Help

If issues persist after trying these solutions:

1. **Check Logs**:
   - Browser Console (F12 → Console tab)
   - Convex Dashboard Logs
   - Vercel Deployment Logs

2. **Create Issue**: [GitHub Issues](https://github.com/prime399/study-flow/issues)
   - Include error messages
   - Describe steps to reproduce
   - Share environment details (OS, browser, Node version)

3. **Community Support**: Join discussions in GitHub Discussions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Technical Stack Summary

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type-safe development |
| Tailwind CSS | 3.x | Utility-first styling |
| Shadcn/ui | Latest | Component library |
| Radix UI | Latest | Accessible primitives |

### Backend & Infrastructure
| Technology | Purpose |
|------------|---------|
| Convex | Real-time serverless database |
| Auth0 | Primary auth — OAuth, session management, M2M token injection |
| Convex Auth | Fallback auth — activates if Auth0 session is unavailable |
| Heroku Managed Inference | Multi-model AI hosting |
| Model Context Protocol (MCP) | External resource integration |
| Vercel | Frontend hosting and deployment |

### AI Models
| Model | Provider | Use Case |
|-------|----------|----------|
| GPT-OSS 120B | Heroku | General-purpose queries |
| Nova Lite | Heroku | Fast responses |
| Nova Pro | Heroku | Balanced performance |
| Claude 4.5 Sonnet | Anthropic (via Heroku) | Complex reasoning |

## 🔗 Resources & Links

### Application
- **Live Demo**: [study-flow.tech](https://www.study-flow.tech)
- **GitHub Repository**: [github.com/prime399/study-flow](https://github.com/prime399/study-flow)
- **Report Issues**: [GitHub Issues](https://github.com/prime399/study-flow/issues)

### Documentation
- **Convex**: [docs.convex.dev](https://docs.convex.dev)
- **Auth0**: [auth0.com/docs](https://auth0.com/docs)
- **Auth0 Actions**: [auth0.com/docs/customize/actions](https://auth0.com/docs/customize/actions)
- **Heroku Inference**: [devcenter.heroku.com/articles/heroku-inference](https://devcenter.heroku.com)
- **MCP Protocol**: [GitHub MCP Examples](https://github.com/heroku/mcp-server-examples)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)

### Community
- **Discussions**: [GitHub Discussions](https://github.com/prime399/study-flow/discussions)
- **Feature Requests**: [GitHub Issues](https://github.com/prime399/study-flow/issues/new?labels=enhancement)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for complete details.

## 🙏 Acknowledgments

- **Heroku** for Managed Inference platform and MCP infrastructure
- **Convex** for real-time database and backend services
- **Auth0** for authentication, M2M token injection, and fine-grained authorization
- **Vercel** for seamless frontend hosting
- **Anthropic** for Claude models
- **Open-source community** for various tools and libraries

---

**StudyFlow AI** - Enterprise-grade study management powered by Heroku Managed Inference and Model Context Protocol.

Built for students worldwide. Transform your study habits with intelligent AI assistance. 
