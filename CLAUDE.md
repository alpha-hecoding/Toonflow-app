# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toonflow is an AI-powered short drama creation tool that converts novels into scripts, storyboards, and videos. It's a Node.js/TypeScript application with both web API and Electron desktop client support.

## Development Commands

### Running the Application
- `yarn dev` - Start backend API server only (port 60000, no frontend)
- `yarn dev:gui` - Start Electron desktop client with built-in frontend and backend (recommended for full experience)

### Building
- `yarn build` - Compile TypeScript to JavaScript
- `yarn lint` - Run TypeScript type checking (no output files)
- `yarn dist:win` - Build Windows desktop executable
- `yarn dist:mac` - Build macOS desktop executable
- `yarn dist:linux` - Build Linux desktop executable

### Development Tools
- `yarn debug:ai` - Launch AI SDK visual debugging tools
- `yarn test` - Run production build

### Docker
- `yarn docker:build` - Build and run with Docker (online deployment)
- `yarn docker:local` - Build and run with Docker (local source)

## Architecture

### Auto-Routing System
Routes are automatically generated from `src/routes/**/*.ts` files. The routing system (`src/core.ts`) scans the routes directory and generates `src/router.ts` automatically. Route paths follow the file structure:
- `src/routes/index/index.ts` → `/index`
- `src/routes/novel/addNovel.ts` → `/novel/addNovel`

**Important**: When adding new routes, place them in `src` and the build script will auto-generate the router.

### Database Layer
- **ORM**: Knex.js with SQLite (better-sqlite3)
- **Schema**: Defined in `src/types/database.d.ts` (auto-generated from database)
- **Tables**: t_project, t_novel, t_outline, t_script, t_storyboard, t_assets, t_video, t_user, t_setting, t_config, etc.
- **Access**: Database queries use `u.db("tableName")` from `src/utils.ts`

### AI Agent System
Two main agent classes in `src/agents/`:

1. **OutlineScript Agent** (`src/agents/outlineScript/index.ts`)
   - Generates storylines from novel chapters
   - Creates episode outlines with structure (起承转合)
   - Manages assets (characters, props, scenes)
   - Sub-agents: AI1 (storyteller), AI2 (outliner), director
   - Tools: getChapter, getStoryline, saveStoryline, getOutline, saveOutline, updateOutline, deleteOutline, generateAssets

2. **Storyboard Agent** (`src/agents/storyboard/index.ts`)
   - Generates segments from scripts
   - Creates storyboard shots with AI image prompts
   - Generates actual images using AI image models
   - Sub-agents: segmentAgent, shotAgent
   - Tools: getScript, getAssets, getSegments, updateSegments, addShots, updateShots, deleteShots, generateShotImage

Both agents use:
- Event emitters for real-time progress updates
- Streaming responses via WebSocket
- Tool calling pattern with Zod schemas
- Conversation history management

### Utility Layer
Centralized utilities in `src/utils.ts`:
- `u.db` - Database query interface
- `u.oss` - File storage (OSS)
- `u.ai.text` - AI text generation
- `u.ai.image` - AI image generation
- `u.ai.video` - AI video generation
- `u.editImage` - Image editing
- `u.getConfig` - Configuration retrieval
- `u.uuid` - UUID generation
- `u.error` - Error handling

### Authentication
- JWT-based authentication middleware in `src/app.ts`
- Token validation on all routes except `/other/login`
- Token key stored in `t_setting` table

### WebSocket Support
- Express-WS integration for real-time communication
- Used for streaming AI agent responses and progress updates

## Core Workflow

1. **Novel Import** → User uploads novel text (t_novel)
2. **Storyline Generation** → AI analyzes chapters and creates storyline (t_storyline)
3. **Outline Generation** → AI creates episode outlines with structure (t_outline)
4. **Asset Extraction** → Characters, props, scenes extracted from outlines (t_assets)
5. **Script Generation** → AI generates detailed scripts (t_script)
6. **Storyboard Creation** → AI generates segments and shot prompts (t_storyboard)
7. **Image Generation** → AI generates images for each shot
8. **Video Generation** → AI generates final videos (t_video)

## AI Integration

The application supports multiple AI providers through Vercel AI SDK:
- Text models: OpenAI, Anthropic, Google, DeepSeek, xAI, Qwen, Zhipu
- Image models: Multiple providers including Kling, Apimart, GRS AI, Gemini
- Video models: Sora, Doubao, and others

AI configurations are stored in `t_config` and `t_setting` tables.

## File Storage

- Uploads directory: `uploads/` (or app data directory in Electron)
- OSS interface abstracts file storage operations
- Images and videos stored with project/script IDs in path structure

## Important Notes

- Node.js version requirement: 23.11.1+
- Package manager: Yarn
- Frontend is pre-built in `scripts/web/` for desktop app
- For frontend development, see separate [Toonflow-web repository](https://github.com/HBAI-Ltd/Toonflow-web)
- PR submissions should go to `develop` branch, not `master`
