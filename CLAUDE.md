# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `yarn dev` - Start backend API only (port 60000, no frontend)
- `yarn dev:gui` - Start backend + Electron desktop client (recommended for full experience)

### Building
- `yarn build` - Compile TypeScript to build/ directory
- `yarn dist:win` - Build Windows desktop app
- `yarn dist:mac` - Build macOS desktop app
- `yarn dist:linux` - Build Linux desktop app

### Quality
- `yarn lint` - Run TypeScript type checking

### Docker
- Makefile commands for Docker management (see `make help`)
  - `make start` - Quick start with local build
  - `make start-online` - Deploy with GitHub source
  - `make start-gitee` - Deploy with Gitee source (faster in China)
  - `make ps` - Show container status
  - `make logs` - View logs

### AI Debugging
- `yarn debug:ai` - Launch AI SDK visual debug tools

## Architecture Overview

Toonflow is an AI-powered short drama creation tool that converts novels into video content through multiple stages: character generation, script generation, storyboard creation, and video synthesis.

### Core Components

**Backend (Node.js/Express + TypeScript)**
- Entry point: `src/app.ts` - initializes Express server, middleware, and routes
- Routes: `src/routes/` - organized by feature domain (assets, novel, outline, project, script, storyboard, video, etc.)
- Router registration: `src/router.ts` - auto-generated file that registers all routes
- Database: SQLite via better-sqlite3, initialized in `src/lib/initDB.ts`

**AI Integration**
- AI utilities: `src/utils/ai/` - unified interface for text/image/video AI services
  - `text/` - LLM APIs (supports multiple providers: OpenAI, Anthropic, DeepSeek, Google, etc.)
  - `image/` - Image generation APIs
  - `video/` - Video generation APIs (Sora, Doubao)
- AI configuration stored in database `t_ai_model` table

**Electron Desktop**
- Electron entry: `scripts/main.ts`
- File storage: Electron uses `app.getPath('userData')/uploads`, production uses `./uploads`

**WebSocket Support**
- Real-time endpoints for AI streaming: `/ws/outline/agentsOutline`, `/ws/storyboard/chatStoryboard`
- Prefix configurable via `WS_PREFIX` env var

### Database Schema

Key tables (see `src/lib/initDB.ts` for full schema):
- `t_user` - User accounts
- `t_project` - Project management
- `t_novel` - Novel/story text storage
- `t_outline` - Story outlines and timelines
- `t_script` - Generated scripts
- `t_storyboard` - Storyboard/shot descriptions
- `t_assets` - Character assets (generated images)
- `t_video` - Video generation tasks
- `t_ai_model` - AI service configurations (api keys, endpoints)
- `t_setting` - System settings (auth keys, etc.)

### Authentication Middleware

JWT-based authentication in `src/app.ts`:
- Token verified from `Authorization` header or `?token=` query param
- Whitelisted path: `/other/login`
- Token key from `t_setting.tokenKey`

### Route Pattern

Each route file exports an Express Router mounted at its file path:
- `src/routes/novel/getNovel.ts` → `/novel/getNovel`
- Routes that need WebSocket use express-ws and are prefixed with `WS_PREFIX`

### Build Process

`scripts/build.ts`:
- Compiles TypeScript from `src/` to `build/`
- Embedded frontend assets served from `scripts/web/` (via `scripts/main.ts`)

### Frontend

Frontend source is in separate repository [Toonflow-web](https://github.com/HBAI-Ltd/Toonflow-web).
Embedded frontend is pre-built in `scripts/web/` directory.

## Working with AI Services

AI services are configured dynamically from database. When adding AI-dependent features:
1. Load model config from `t_ai_model` table
2. Use `await u.ai.text.invoke()` or `await u.ai.stream()` for text
3. Use `await u.ai.image.generate()` for images
4. Use `await u.ai.video.generate()` for videos
5. Configuration format: `{ model, apiKey, baseURL, manufacturer }`

See `src/utils/ai/text/index.ts` for the unified AI interface.

## Default Credentials
- Username: `admin`
- Password: `admin123`

## Ports
- Backend API: 60000 (default)
- Frontend (Docker): 80 (random port in online mode)
