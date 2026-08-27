# 🌐 MINDCRAFT — Next.js 14 Web & 3D WebGL Platform

Production-hardened, full-stack Next.js 14 application featuring client-side Web Worker ONNX inference, Three.js 3D voxel graphics, AI Voice Commander, 3D Spatial Radar HUD, and resilient multi-provider AI Gateway.

---

## 🏛️ Application Layout & Routes

```
apps/web/
├── app/
│   ├── (auth)/login & register        # User authentication with JWT & bcrypt
│   ├── admin/                         # Enterprise MLOps dashboard & model registry
│   ├── ai-studio/                     # Interactive In-Browser Policy Training Studio
│   ├── challenges/                    # 5-Tier Minecraft RL Curriculum Challenges
│   ├── characters/                    # Policy role showcase (Explorer, Guardian, Builder, Survivor)
│   ├── demo/ & game/                  # 3D Voxel Simulation & WebGL Canvas
│   ├── models/                        # Live active & production model registry
│   ├── sandbox/                       # Interactive 3D Voxel Brush Level Editor
│   ├── signature-demo/                # Champion vs Candidate statistical benchmark
│   └── api/                           # Hardened API Endpoints
│       ├── admin/*                    # MLOps publishing, rollback, audit logs
│       ├── ai/explain                 # Tactical neural action explanation
│       ├── ai/train                   # In-browser training simulation endpoint
│       ├── auth/*                     # Login, register, logout, session me
│       ├── challenges/*               # Challenge verification & score submission
│       ├── events/batch               # Telemetry ingestion with idempotency
│       ├── game/save                  # Game state save with optimistic locking
│       ├── health                     # System diagnostics, DB latency, model inventory
│       ├── health/live & ready        # Kubernetes liveness & readiness probes
│       └── voice/transcribe           # Deepgram Nova-2 / Groq Whisper transcription
├── components/
│   ├── common/MinecraftAvatar.tsx     # Crafatar & MC-Heads 3D isometric avatar renderer
│   ├── game/SpatialRadar.tsx          # 360° tactical spatial radar minimap HUD
│   ├── game/VoiceCommander.tsx        # Microphone streaming & audible voice response
│   ├── layout/Navbar.tsx & Footer.tsx # App navigation header & footer
│   └── voxel/VoxelCanvas.tsx          # Three.js 3D voxel renderer
├── lib/
│   ├── ai-gateway.ts                  # Multi-provider cascade (Groq -> Gemini -> OpenRouter)
│   ├── key-manager.ts                 # Multi-key rotation & quarantine manager
│   ├── audio-synthesizer.ts           # Web Audio API 8-bit procedural 3D sound synthesizer
│   ├── rate-limiter.ts                # Sliding window rate limiter
│   └── resilience.ts                  # Circuit breaker with exponential backoff
├── middleware.ts                      # Edge auth protection & request rate limiting
└── public/
    ├── models/*.onnx                  # Static ONNX neural model artifacts
    └── workers/inference-worker.js    # Off-thread Web Worker tensor inference
```

---

## ⚡ Quickstart

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build
```
👉 Access the web application at **http://localhost:3000**.
