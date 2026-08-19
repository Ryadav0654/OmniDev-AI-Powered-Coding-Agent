<div align="center">

```
 ██████  ███    ███ ███    ██ ██ ██████  ███████ ██    ██
██    ██ ████  ████ ████   ██ ██ ██   ██ ██      ██    ██
██    ██ ██ ████ ██ ██ ██  ██ ██ ██   ██ █████   ██    ██
██    ██ ██  ██  ██ ██  ██ ██ ██ ██   ██ ██       ██  ██
 ██████  ██      ██ ██   ████ ██ ██████  ███████   ████
```

**An AI coding agent that lives in your terminal — not your browser.**

_Read your codebase. Plan features. Modify files. Run commands. All staged, diffed, and approved by you._

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff)](#)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-000?logo=vercel&logoColor=fff)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

</div>

---

## The Problem

Every developer's workflow today looks something like this:

1. Open ChatGPT / Claude in a browser tab
2. Copy-paste code from the editor into the chat
3. Read the response, mentally diff it against your code
4. Copy-paste the suggestion back, hope nothing breaks

This loop is **slow, error-prone, and context-destroying**. The AI never sees your full project. You're the bottleneck, acting as a human clipboard between two systems.

Fully autonomous agents (like letting an LLM run wild on your filesystem) solve the copy-paste problem — but create a _scarier_ one: **the AI can hallucinate, overwrite files, or execute destructive commands without your knowledge.**

## What OmniDev Does

OmniDev eliminates the copy-paste loop by embedding an AI agent **directly into your terminal**. It reads your workspace natively, navigates your file tree autonomously, and proposes changes — but **never writes a single byte without your explicit approval.**

Every file creation, modification, deletion, and shell command is intercepted, staged, and presented as a visual diff. You review and approve. Only then does it hit the disk.

> **TL;DR** — It's an AI coding assistant with a built-in git-staging-like safety net, a multi-step planner with web search, and a Telegram bot for remote access. All running locally on Bun.

---

## Modes

OmniDev operates in four distinct modes, each with different capabilities and constraints:

| Mode            | What it does                                                                      | Can modify files? | Has web access? |
| --------------- | --------------------------------------------------------------------------------- | :---------------: | :-------------: |
| **🤖 Agent**    | Execute coding tasks — create, edit, delete files and run shell commands          |    ✅ (staged)    |       ❌        |
| **🧭 Plan**     | Break a goal into steps, research the codebase + web, then execute selected steps |    ✅ (staged)    |       ✅        |
| **❓ Ask**      | Read-only Q&A about your codebase with optional answer export to `.md`            |        ❌         |       ✅        |
| **📱 Telegram** | Remote-control all three modes above from your phone                              |    ✅ (staged)    |       ✅        |

### Agent Mode

Give it a concrete task. The agent autonomously navigates your project using tools (`read_file`, `list_files`, `search_files`, `analyze_codebase`), formulates changes, and stages them. You see a diff, approve or reject, done.

### Plan Mode

Describe a high-level goal. A dedicated **Planner agent** researches your codebase and the web (via Firecrawl), then outputs a structured, step-by-step plan with complexity hints. You select which steps to execute. Each selected step spawns an Agent that carries it out — all staged for approval.

### Ask Mode

Interrogate your codebase without risk. The agent reads files, searches patterns, and answers your question. Optionally save the Q&A to a markdown file (also staged for approval).

### Telegram Mode

A secure bot interface. Every command (`/ask`, `/agent`, `/plan`) triggers the same agent pipeline on your local machine. Plan mode renders interactive inline keyboards for step selection. File changes are diffed and sent as Telegram messages with Accept/Reject buttons. Only the whitelisted `TELEGRAM_OWNER_ID` can interact.

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │                 Entry Point                  │
                    │         index.ts → tui/wakeup.ts            │
                    └──────────┬──────────────┬───────────────────┘
                               │              │
                    ┌──────────▼──┐    ┌──────▼──────────┐
                    │  CLI Mode   │    │  Telegram Mode   │
                    │  modes/cli  │    │  modes/telegram  │
                    └──┬───┬───┬──┘    └───────┬─────────┘
                       │   │   │               │
              ┌────────┘   │   └────────┐      │
              ▼            ▼            ▼      │
        ┌──────────┐ ┌──────────┐ ┌─────────┐ │
        │  Agent   │ │   Plan   │ │   Ask   │◄┘
        │Orchestr. │ │Orchestr. │ │Orchestr.│
        └────┬─────┘ └────┬─────┘ └────┬────┘
             │             │            │
             └──────┬──────┘────────────┘
                    ▼
        ┌───────────────────────┐
        │     Vercel AI SDK     │   ← LLM tool-loop with Zod-typed tools
        │   ToolLoopAgent /     │
        │   generateText        │
        └───────────┬───────────┘
                    │ tool calls
                    ▼
        ┌───────────────────────┐
        │    Agent Tools        │   ← read_file, modify_file, execute_shell…
        │   agent-tools.ts      │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │    Tool Executor      │   ← Sandbox: path validation, exclusion,
        │   tool-executor.ts    │     virtual overlay for staged writes
        └───────────┬───────────┘
                    │ mutations intercepted
                    ▼
        ┌───────────────────────┐
        │    Action Tracker     │   ← Logs every action as pending/executed
        │   action-tracker.ts   │
        └───────────┬───────────┘
                    │ pending mutations
                    ▼
        ┌───────────────────────┐
        │    Approval Flow      │   ← Interactive diff review (CLI) or
        │   approval.ts         │     Accept/Reject buttons (Telegram)
        └───────────┬───────────┘
                    │ approved only
                    ▼
            ┌───────────────┐
            │   Filesystem  │
            │   / Shell     │
            └───────────────┘
```

### The Safety Pipeline — How it Actually Works

The core design insight is separating **intent** from **execution**:

1. **Tool Executor** receives a write/delete/shell call from the LLM. Instead of touching the filesystem, it writes to an **in-memory overlay** (`Map<string, string>`) and logs the action as `pending` in the Action Tracker.

2. **Action Tracker** is a simple append-only log. Each entry has a type (`file_create`, `file_modify`, `file_delete`, `folder_create`, `tool_execute`), a status (`pending` → `approved` | `rejected`), and before/after content snapshots.

3. **Approval Flow** groups pending mutations by file path, composes before/after snapshots across multiple edits to the same file, and generates unified diffs using the `diff` library. The user reviews each group and accepts or rejects.

4. **Apply** — only `approved` actions are executed. For files, only the **last approved action per path** is applied (deduplication). Shell commands run via `spawnSync` in the workspace root.

5. **Staging is cleared** after every cycle, regardless of outcome.

### Key Design Decisions

- **Full-file replacement, not patches**: When the LLM modifies a file, it sends the complete new content. This avoids the complexity of merge conflicts and partial-apply bugs. The diff is computed _for display only_.
- **Virtual overlay reads**: After staging a write, subsequent `read_file` calls from the LLM return the staged content (not the disk content). This lets the agent make coherent multi-file changes without intermediate commits.
- **Path sandboxing**: Every path operation goes through `resolveSafe()`, which resolves relative to the workspace root and rejects anything that escapes it (e.g., `../../etc/passwd`).
- **Exclusion patterns**: `node_modules`, `.git`, `dist`, `.env*`, etc. are excluded by default. The LLM cannot read or write to them.

---

## Tech Stack

| Layer                  | Technology                                                                                                                                              | Why                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Runtime**            | [Bun](https://bun.sh/)                                                                                                                                  | Fast cold starts, native TS execution, built-in fs/child_process                           |
| **Language**           | TypeScript (strict)                                                                                                                                     | Type safety across tool schemas, action logs, and config                                   |
| **AI SDK**             | [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`)                                                                                                          | Standardized tool-loop abstraction, `ToolLoopAgent`, structured output via `Output.object` |
| **LLM Provider**       | [OpenRouter](https://openrouter.ai/) (`@openrouter/ai-sdk-provider`)                                                                                    | Single API key, model-agnostic — switch between Claude, GPT-4o, Llama, etc.                |
| **Tool Schemas**       | [Zod](https://zod.dev/)                                                                                                                                 | Runtime validation of LLM tool-call arguments                                              |
| **CLI Framework**      | [Commander.js](https://github.com/tj/commander.js)                                                                                                      | Command routing (`wakeup` subcommand)                                                      |
| **TUI Prompts**        | [@clack/prompts](https://github.com/bombshell-dev/clack)                                                                                                | Beautiful select menus, text inputs, confirmations                                         |
| **Terminal Rendering** | [chalk](https://github.com/chalk/chalk), [figlet](https://github.com/patorjk/figlet.js), [marked-terminal](https://github.com/mikaelbr/marked-terminal) | Colored output, ASCII banner, markdown-in-terminal                                         |
| **Diff Engine**        | [diff](https://github.com/kpdecker/jsdiff)                                                                                                              | Unified diffs for the approval flow                                                        |
| **Web Crawling**       | [Firecrawl](https://www.firecrawl.dev/) (`@mendable/firecrawl-js`)                                                                                      | Search the web and scrape URLs into clean markdown                                         |
| **Bot Framework**      | [Telegraf](https://telegraf.js.org/)                                                                                                                    | Telegram Bot API with inline keyboards and callback queries                                |

---

## Project Structure

```
omnidev-cli/
├── index.ts                    # CLI entry point (Commander.js)
├── ai/
│   └── ai.config.ts            # OpenRouter model factory
├── tui/
│   ├── wakeup.ts               # ASCII banner + mode selector
│   └── terminal-md.ts          # Markdown → terminal renderer
├── modes/
│   ├── cli.ts                  # CLI sub-mode router (Agent/Plan/Ask)
│   ├── agent/
│   │   ├── orchestrator.ts     # Agent mode entry point
│   │   ├── agent-tools.ts      # Zod-typed tool definitions for the LLM
│   │   ├── tool-executor.ts    # Sandbox: fs operations, overlay, path safety
│   │   ├── action-tracker.ts   # Append-only mutation log
│   │   ├── approval.ts         # Interactive diff review flow
│   │   ├── diff-view.ts        # Unified diff generation
│   │   └── types.ts            # ActionLog, AgentConfig, ActionType
│   ├── plan/
│   │   ├── orchestrator.ts     # Plan mode entry point
│   │   ├── planner.ts          # LLM planner with structured JSON output
│   │   ├── selection.ts        # Step selection UI
│   │   ├── web-tools.ts        # Firecrawl: web_search, web_crawl, fetch_url
│   │   └── types.ts            # Plan, PlanStep
│   ├── ask/
│   │   └── orchestrator.ts     # Ask mode: read-only Q&A + save-to-md
│   └── telegram/
│       ├── index.ts            # Bot launcher
│       ├── handlers.ts         # Command & callback handlers
│       ├── agent-run.ts        # Telegram-specific agent/ask/plan runners
│       ├── approval-session.ts # Remote approval with inline keyboards
│       ├── plan-session.ts     # Interactive plan step selection via Telegram
│       ├── auth.ts             # Owner ID whitelist check
│       ├── constants.ts        # Welcome message text
│       └── text.ts             # Telegram message utilities
└── package.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- An [OpenRouter](https://openrouter.ai/) API key

### Install

```bash
git clone https://github.com/<your-username>/omnidev-cli.git
cd omnidev-cli
bun install
```

### Configure

Create a `.env` file in the project root:

```bash
mv .env.example .env
```

OR

```env
# Required
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# Optional — Telegram Mode
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_OWNER_ID=your_numeric_telegram_id

# Optional — Web Search (Plan & Ask modes)
FIRECRAWL_API_KEY=fc-...

# Optional — Custom skill directories (semicolon-separated)
SKILLS_DIRS=./docs/skills;~/.cursor/skills-cursor
```

### Run

```bash
# Start the interactive TUI
bun run ./index.ts wakeup

# Or link globally
bun link
omnidev-cli wakeup
```

You'll see the ASCII banner, then choose between **CLI** (→ Agent / Plan / Ask) or **Telegram** mode.

---

## Skills System

OmniDev reads `SKILL.md` files from configurable directories — similar to Cursor's `.cursorrules`. These files inject project-specific conventions, coding standards, or architectural constraints into the LLM's context.

Default skill search paths:

- Directories listed in `SKILLS_DIRS` env var
- `~/.cursor/skills-cursor/`
- `~/.claude/skills/`

The agent can discover and read skills via the `list_skills` and `read_skill` tools.

---

## Contributing

Contributions are welcome. Some high-impact areas:

- **Test coverage** — The project currently has no automated tests
- **Local model support** — Ollama / llama.cpp provider alongside OpenRouter
- **Persistent staging** — Survive process crashes by persisting the overlay to disk
- **Web dashboard** — Alternative to Telegram for remote access
- **Partial-file edits** — Search-and-replace tool to reduce token usage on large files

```bash
# Fork → clone → branch → hack → PR
bun install
bun run ./index.ts wakeup
```

---

<div align="center">

**Built with Bun, TypeScript, and the Vercel AI SDK.**

_The AI writes the code. You keep the keys._

</div>
