# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting Development
```bash
pnpm dev                # Start both frontend and backend (recommended)
pnpm dev:frontend       # Start only Next.js dev server on port 3000
pnpm dev:backend        # Start only Convex dev server
```

The `predev` script automatically runs before `pnpm dev` to ensure Convex is ready and opens the dashboard.

### Building and Linting
```bash
pnpm build             # Build Next.js for production
pnpm lint              # Run ESLint on the codebase
```

### Reviewing Code
```bash
run coderabbit --prompt-only
let it run as long as it needs (run it in the background) and fix any issues.
```


### Convex Operations
```bash
npx convex dev         # Start Convex development server and watch for changes
npx convex deploy      # Deploy Convex backend to production
npx convex env set KEY value    # Set environment variable in Convex
npx convex env list    # List all Convex environment variables
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- **UI Components**: Shadcn/ui (built on Radix UI primitives)
- **Backend**: Convex (serverless real-time database with built-in functions)
- **Authentication**: Convex Auth with OAuth (GitHub, Google)
- **AI Integration**: Heroku Managed Inference with multi-model support
- **Package Manager**: pnpm 10.x (required)

### Directory Structure
- `app/` - Next.js 14 App Router structure
  - `(protected)/dashboard/` - Protected routes requiring authentication
  - `api/` - API route handlers
- `convex/` - Convex backend functions, schema, and authentication
- `components/` - Reusable React components
- `lib/` - Utility functions and shared logic
- `hooks/` - Custom React hooks
- `store/` - Zustand state management
- `types/` - TypeScript type definitions

### Key Architectural Patterns

#### 1. Convex Backend Architecture
Convex provides a serverless real-time backend with:
- **Schema-first design**: Database schema defined in `convex/schema.ts` with strong typing
- **Queries and Mutations**: Functions in `convex/*.ts` files are automatically exposed as API endpoints
- **Real-time subscriptions**: Frontend automatically receives updates when data changes
- **Authentication**: Convex Auth handles OAuth and session management

Main backend files:
- `convex/schema.ts` - Database schema with tables and indexes
- `convex/study.ts` - Study session management and coin system
- `convex/groups.ts` - Study group management
- `convex/messages.ts` - Group chat messages
- `convex/todos.ts` - Task management
- `convex/auth.ts` - Authentication logic

#### 2. MentorMind AI System (RAG Architecture)
The AI assistant uses a sophisticated Retrieval-Augmented Generation (RAG) pipeline:

**Context Retrieval Flow:**
1. User query triggers `app/api/ai-helper/route.ts`
2. System fetches user context from Convex:
   - Study statistics (total time, session history)
   - Performance metrics (completion rate, success patterns)
   - Group memberships and collaboration data
3. Context is injected into system prompt via `_lib/system-prompt.ts`

**Model Routing:**
- Multi-model support (GPT-OSS 120B, Nova Lite/Pro, Claude 3.5 Haiku)
- Automatic model selection based on query complexity
- Manual model override available via UI
- Routing logic in `app/api/ai-helper/_lib/model-router.ts`

**MCP Tool Integration (Hybrid Executor Architecture):**

The AI helper uses a hybrid approach: Chat Completions API for tool decisions, with local or remote execution depending on the tool namespace.

```
User message → Chat Completions API (tool decisions only, no execution)
                    ↓
              Model returns tool_calls?
              ├── Calendar tool → calendar-executor (local MCP server + token injection)
              ├── Non-calendar tool → heroku-executor (Heroku Agents API)
              └── No tool_calls → Return final text response
                    ↓
              Append tool results → Loop back (max 10 iterations)
```

- **Tool discovery**: `mcp-servers-local` endpoint merges Heroku MCP servers + local Google Calendar tools
- **Executor registry** (`_lib/tool-executors/registry.ts`): ordered `{ match, execute }` entries — calendar first, Heroku catch-all last
- **Calendar executor**: injects per-user OAuth tokens via `injectUserTokensToMCP`, then POSTs to `{GOOGLE_CALENDAR_MCP_URL}/tools/call`
- **Heroku executor**: routes non-calendar tools through `/v1/agents/heroku` for server-side execution
- **Tool loop** (`_lib/tool-loop.ts`): converts MCP tools to OpenAI function-calling format, executes via registry, feeds results back to model
- **Deduplication**: when both Heroku and local calendar tools exist, local ones (with `inputSchema`) take priority

**Adding a new MCP namespace:**
1. Create `_lib/tool-executors/<name>-executor.ts` with `match` and `execute` functions
2. Call `registerExecutor()` to self-register
3. Import in `_lib/tool-executors/index.ts` BEFORE the heroku-executor import (order matters)
4. Add tools to `mcp-servers-local/route.ts` if they need local discovery

**Key files:**
- `app/api/ai-helper/route.ts` - Main AI endpoint, configures executors, runs tool loop
- `app/api/ai-helper/_lib/mcp-types.ts` - Shared MCP types, calendar constants, matchers
- `app/api/ai-helper/_lib/tool-loop.ts` - Chat Completions tool execution loop
- `app/api/ai-helper/_lib/tool-executors/registry.ts` - Executor registry
- `app/api/ai-helper/_lib/tool-executors/calendar-executor.ts` - Local calendar tool execution
- `app/api/ai-helper/_lib/tool-executors/heroku-executor.ts` - Heroku Agents fallback
- `app/api/ai-helper/_lib/tool-executors/index.ts` - Barrel file (import order = registration order)
- `app/api/ai-helper/mcp-servers-local/route.ts` - Merged tool discovery (Heroku + local)
- `app/api/ai-helper/_lib/system-prompt.ts` - RAG context builder
- `app/api/ai-helper/_lib/model-router.ts` - Model selection logic
- `app/api/ai-helper/_lib/openai-client.ts` - Heroku API client

#### 3. Coin Economy System
Users earn and spend coins as a gamification mechanism:
- **Earning**: 1 coin per second of completed study time (defined in `convex/study.ts:10`)
- **Spending**: 100 coins per AI query (defined in `convex/study.ts:11` as `AI_HELPER_QUERY_COST`)
- **Initial balance**: 500 coins for new users (defined in `convex/study.ts:9`)
- **Implementation**:
  - Coins earned in `convex/study.ts:completeSession`
  - Coins spent via `convex/study.ts:spendCoins`
  - Refunds handled via `convex/study.ts:refundCoins`

**Important**: When modifying coin costs, update both the backend constant and any frontend references.

#### 4. Authentication Flow
- OAuth providers configured via Convex environment variables
- Callback URLs follow pattern: `https://<deployment>.convex.site/api/auth/callback/<provider>`
- Setup script (`setup.mjs`) guides through OAuth configuration
- User sessions managed automatically by Convex Auth
- Protected routes use `getAuthUserId(ctx)` in Convex functions

#### 5. Spotify Integration
The app includes Spotify OAuth for music playback during study sessions:
- Token storage in `spotifyTokens` table (with encrypted tokens)
- Refresh token flow implemented in `convex/spotify.ts`
- Multiple API route variants (`/api/spotify/*` and `/api/spotify-direct/*`)
- Playlist management and user library detection

### Database Schema Notes

**Key tables:**
- `users` - User profiles (managed by Convex Auth)
- `userSettings` - Onboarding completion status
- `studySettings` - Study preferences, total time, coins, daily goals
- `studySessions` - Individual study session records
- `groups` - Study group metadata
- `groupMembers` - Group membership with roles (admin/member)
- `messages` - Group chat messages
- `todos` - Task management with status and priority
- `spotifyTokens` - Spotify OAuth tokens (encrypted)

**Important indexes:**
- Most tables have `by_user` index for efficient user data queries
- Time-based queries use compound indexes (e.g., `by_user_and_time`)
- Group queries optimized with `by_group` and `by_group_and_user` indexes

### State Management
- **Server state**: Convex React hooks (`useQuery`, `useMutation`) with automatic real-time updates
- **Client state**: Zustand for local UI state (when needed)
- **Forms**: React Hook Form with Zod validation

### AI Helper Configuration

**Environment Variables Required:**
- `HEROKU_INFERENCE_URL` - Base URL for Heroku Managed Inference
- At least one model API key:
  - `HEROKU_INFERENCE_KEY_OSS` - For GPT-OSS 120B
  - `HEROKU_INFERENCE_KEY_CLAUDE` - For Claude 3.5 Haiku
  - `HEROKU_INFERENCE_KEY_NOVA_LITE` - For Nova Lite
  - `HEROKU_INFERENCE_KEY_NOVA_PRO` - For Nova Pro
- `NEXT_PUBLIC_APP_URL` - Required for MCP tool discovery
- `API_KEY_ENCRYPTION_SECRET` - **REQUIRED for BYOK** - 256-bit encryption key (see BYOK Setup below)

**Model Configuration:**
Models are defined in `app/api/ai-helper/_lib/models.ts` with environment key mappings.

### BYOK (Bring Your Own Key) Feature

The app supports user-provided API keys for OpenAI, Anthropic, and OpenRouter:

- **No coins charged** when users use their own keys
- **Automatic fallback** to platform keys if BYOK fails
- **AES-256-GCM encryption** for secure key storage
- **Per-user key management** with usage tracking

**Setup BYOK:**
1. Generate encryption key:
   ```bash
   node scripts/generate-encryption-key.js
   ```
2. Set in Convex:
   ```bash
   npx convex env set API_KEY_ENCRYPTION_SECRET "<generated-key>"
   npx convex env set API_KEY_ENCRYPTION_SECRET "<generated-key>" --prod
   ```
3. Install Anthropic SDK:
   ```bash
   npm install @anthropic-ai/sdk
   ```

**Key Files:**
- `/convex/userApiKeys.ts` - Key management (queries, mutations, actions)
- `/convex/lib/encryption.ts` - AES-256-GCM encryption
- `/app/api/byok/` - Validation and model fetching
- `/app/api/ai-helper/_lib/byok-helper.ts` - BYOK configuration logic
- `/app/api/ai-helper/_lib/providers/` - Provider adapters (OpenAI, Anthropic)
- `/app/(protected)/dashboard/settings/byok/page.tsx` - User settings UI

**How It Works:**
1. User adds API key in Settings → BYOK
2. Key is validated and encrypted before storage
3. When user sends AI query, system checks for active BYOK key
4. If BYOK exists: uses user's key (no coins charged)
5. If BYOK fails or doesn't exist: falls back to platform keys (100 coins)

**Security:**
- Keys encrypted with AES-256-GCM before storage
- Decryption only happens server-side
- Users can only access their own keys
- Keys masked in UI (first 4 + last 4 chars only)

See `docs/BYOK.md` for complete documentation.

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Target: ES2017 for Convex compatibility
- Module resolution: bundler (for Next.js App Router)

## Testing and Debugging

### Checking Convex Connection
If data isn't syncing, check:
1. Convex dev server is running (`pnpm dev:backend`)
2. `NEXT_PUBLIC_CONVEX_URL` matches your Convex dashboard URL
3. Check browser console for WebSocket errors

### Testing AI Features
1. Ensure at least one Heroku API key is configured
2. Check user has sufficient coins (min 100 for one query)
3. Monitor Network tab for API request/response
4. Check Convex logs for coin deduction mutations

### MCP Tools Debugging
If MCP tools aren't working:
1. Verify `NEXT_PUBLIC_APP_URL` is set correctly
2. Check `/api/ai-helper/mcp-servers-local` endpoint returns both Heroku and local tools
3. Ensure Heroku MCP servers are deployed and accessible
4. For calendar tools: verify `GOOGLE_CALENDAR_MCP_URL` and `GOOGLE_CALENDAR_MCP_API_KEY` are set
5. For calendar tools: check that token injection succeeds (look for `[AI Helper] Calendar executor configured` in logs)
6. For non-calendar tools: check Heroku Agents API is reachable at `/v1/agents/heroku`

## Important Notes

### When Modifying Backend Schema
1. Update `convex/schema.ts` with new fields/tables
2. Convex dev server will auto-generate TypeScript types
3. Restart TypeScript server in editor if types don't update
4. Check all queries/mutations that reference modified tables

### When Adding New Convex Functions
- Place in appropriate file: `study.ts`, `groups.ts`, etc.
- Export with `query()` or `mutation()` wrapper
- Use `getAuthUserId(ctx)` for user authentication
- Add proper error handling for unauthenticated users

### When Working with AI Models
- Model routing happens in `_lib/model-router.ts`
- System prompts are built with user context in `_lib/system-prompt.ts`
- All AI responses are processed through `_lib/response-processor.ts`
- SSE parsing for Heroku Agents API is custom (not standard OpenAI format)

### Environment Variable Management
- Frontend: Add to `.env.local` (must start with `NEXT_PUBLIC_` to be accessible in browser)
- Backend: Set via `npx convex env set KEY value`
- Never commit `.env.local` to version control
- Use `setup.mjs` script to guide OAuth setup

### Code Style
- Use TypeScript strict mode
- Prefer functional components and hooks
- Use Convex hooks for data fetching (not fetch/axios)
- Format with Prettier (Tailwind plugin enabled)
- Follow Next.js App Router patterns (Server Components by default)

## Deployment

### Vercel (Frontend)
1. Connect repository to Vercel
2. Set all `NEXT_PUBLIC_*` and `HEROKU_*` environment variables
3. Deploy (automatic on push to main)

### Convex (Backend)
```bash
npx convex deploy                                    # Deploy functions
npx convex env set AUTH_GITHUB_ID "..." --prod      # Set production env vars
npx convex env set AUTH_GITHUB_SECRET "..." --prod
# Repeat for all OAuth providers
```

**Important**: OAuth callback URLs must use production Convex deployment URL in production.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->