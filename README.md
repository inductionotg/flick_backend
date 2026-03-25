# Flick — Backend

Stateless image-to-image generation server. Accepts a photo and a style, calls an AI provider, and returns a stylized image.

**Deployed (Render):** [https://flick-backend-eqs8.onrender.com](https://flick-backend-eqs8.onrender.com)

---

## Setup

### Prerequisites

- **Node.js** v18+
- An API key from **Replicate** or **OpenAI**

### Install & Run

```bash
cd backend
npm install

# copy the example env and fill in your key
cp .env.example .env

# development (auto-restart on changes)
npm run dev

# production
npm start
```

The server binds on `0.0.0.0:<PORT>` (default `3000`), so it is reachable from the Expo app on the same LAN.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP listen port |
| `AI_PROVIDER` | No | `openai` | `replicate` or `openai` |
| `REPLICATE_API_TOKEN` | When provider = replicate | — | Replicate API token |
| `OPENAI_API_KEY` | When provider = openai | — | OpenAI API key |
| `OPENAI_IMAGE_MODEL` | No | `gpt-image-1.5` | Override the OpenAI model used for `images.edit` |

---

## API

### `GET /health`

Returns `{ status, timestamp }`. Use for uptime checks.

### `POST /api/generate`

Multipart form data.

| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | File | Yes | Any image MIME, max 25 MB |
| `style` | String | Yes | `cartoon`, `flat`, `anime`, `pixel`, or `sketch` |
| `promptExtra` | String | No | Extra visual direction (max 400 chars) |

**Success (200)**

```json
{ "imageUrl": "https://…", "style": "cartoon" }
```

**Rate limit**: 2 requests per hour per IP (429 when exceeded).

---

## Project Structure

```
backend/
├── index.js              # Express app, middleware, error handler
├── routes/
│   └── generate.js       # POST /api/generate — upload, validate, call adapter
├── services/
│   └── aiAdapter.js      # Provider-agnostic AI layer (Replicate / OpenAI)
├── utils/
│   └── promptGuard.js    # Sanitize & blocklist user prompt text
├── .env.example
└── package.json
```

---

## Tech Decisions

### Express (no framework, no TypeScript)

The backend is a thin BFF (Backend For Frontend) — one route, no database, no sessions. Express with plain JS keeps the dependency surface tiny and the startup instant. TypeScript would add build tooling overhead with little benefit at this scale.

### Pluggable AI adapter (`AI_PROVIDER`)

`services/aiAdapter.js` exposes a single `createAdapter()` factory. Switching between Replicate and OpenAI is a one-line env change — no code change required. This lets us compare quality, latency, and cost across providers without touching the route layer. Each adapter converts the base64 buffer into whatever format its SDK expects and normalizes the response back to `{ imageUrl }`.

### Multer with in-memory storage

Uploaded images are held in RAM (`memoryStorage`). The buffer is base64-encoded and forwarded to the AI provider in the same request cycle. No temp files to clean up, no disk I/O, and no object-storage dependency.

### express-rate-limit (2 req/hour)

AI image generation is expensive. The rate limiter caps usage at 2 generations per hour per IP using `draft-8` standard headers. This prevents runaway spend during development and provides a basic abuse gate without needing user auth.

### Prompt guard (`promptGuard.js`)

User-supplied `promptExtra` is sanitized before it reaches any AI provider: control chars are stripped, length is capped at 400 characters, and a regex blocklist rejects common prompt-injection patterns (`ignore previous instructions`, `SYSTEM:`, `<script>`, etc.). This is lightweight hygiene — not a full content-moderation pipeline — but it raises the bar for casual injection.

### Style-specific prompts & denoising

Each style (`cartoon`, `flat`, `anime`, `pixel`, `sketch`) maps to a curated prompt and a tuned denoising strength in the Replicate adapter. The prompt instructs the model to preserve subject, pose, and composition while transforming the aesthetic. Denoising values are per-style (0.6–0.7) to balance fidelity vs. stylization.

---

## Tradeoffs

| Decision | Upside | Downside |
|---|---|---|
| **In-memory file upload** | Zero disk cleanup, simple code path | High memory pressure under concurrent large uploads; not viable if the server scales horizontally without sticky sessions |
| **No database** | Nothing to provision or migrate; fully stateless | No history, no saved generations, no per-user quotas — rate limit is IP-based only |
| **No authentication** | Frictionless local/LAN development with Expo | Unsafe if exposed to the public internet; anyone who can reach the server can burn API credits |
| **IP-based rate limit (2/hr)** | Strong cost protection during dev | Too restrictive for multi-user prod; shared NAT means all users behind one IP share the budget |

