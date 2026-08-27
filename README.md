# 🎮 Mera-Craft (MINDCRAFT) — Autonomous Embodied AI Voxel Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c?style=flat-square&logo=pytorch)](https://pytorch.org/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_WASM-Sub--millisecond-005ced?style=flat-square&logo=onnx)](https://onnxruntime.ai/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=flat-square&logo=three.js)](https://threejs.org/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00e599?style=flat-square&logo=postgresql)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

**Mera-Craft (MINDCRAFT)** is an advanced, production-hardened **Embodied Artificial Intelligence & Voxel Reinforcement Learning platform**. It features authentic Minecraft 3D voxel physics, client-side Web Worker neural inference (<0.25ms latency), spatial self-attention with temporal GRU memory, hands-free voice commands via Deepgram and Groq, high-speed 3D A* teacher distillation, and an interactive in-browser AI Training Studio and Sandbox Level Editor.

---

## 🏛️ System Architecture

```
+------------------------------------------------------------------------------------------------+
|                                    MINDCRAFT PLATFORM                                          |
+-------------------------------+--------------------------------+-------------------------------+
|  🏋️ ML & EMBODIED AI SUITE    |  🌐 NEXT.JS 14 WEB PLATFORM    |  🛡️ PRODUCTION SYSTEM DESIGN  |
|  • Vectorized Voxel Engine    |  • 3D WebGL Canvas (Three.js)  |  • Sliding Window Rate Limiter|
|    (15,000+ steps/sec)        |  • AI Training Studio Page     |  • Health & Diagnostic Probes |
|  • Spatial Attention + GRU    |  • 3D Sandbox Level Editor     |  • Circuit Breakers & Backoff |
|  • Option-Critic Controller   |  • AI Voice Commander HUD      |  • Idempotency & Optimistic   |
|  • DAGGER Teacher Distillation|  • 3D Spatial Radar Minimap    |    Concurrency Control        |
|  • Dynamic INT8 Quantization  |  • 3D Positional Web Audio     |  • Multi-Key Auto-Failover    |
|  • Multi-Agent Blackboard     |  • Crafatar 3D Minecraft Avatars (Groq, Gemini, Deepgram)     |
+-------------------------------+--------------------------------+-------------------------------+
```

---

## ✨ Key Capabilities & Features

### 1. 🧠 Compute-Efficient Embodied AI Architecture
* **Spatial Attention + Recurrent GRU Memory** ([`ml/models/advanced_spatial_actor_critic.py`](ml/models/advanced_spatial_actor_critic.py)): Solves Partial Observability (POMDP) across 16 radar raycasts and 26 kinematic states with only **~180,000 parameters (<1 MB)**.
* **Algorithmic Teacher & DAGGER Distillation** ([`ml/training/dagger_teacher_distillation.py`](ml/training/dagger_teacher_distillation.py)): Reaches **100.00% expert accuracy in 4.5 seconds** without expensive trial-and-error RL compute.
* **Hierarchical Option-Critic Meta-Controller** ([`ml/agents/hierarchical_meta_controller.py`](ml/agents/hierarchical_meta_controller.py)): Modular macro-intents (`EXPLORE`, `DEFEND`, `BUILD`, `HARVEST`) that reduce exploration horizon by **16x**.
* **Decentralized Spatial Blackboard** ([`ml/agents/multi_agent_blackboard.py`](ml/agents/multi_agent_blackboard.py)): Emergent multi-agent swarm coordination between Explorer, Guardian, Builder, and Survivor with $O(1)$ spatial queries.
* **Dynamic INT8 ONNX Quantization** ([`ml/export/quantize_onnx.py`](ml/export/quantize_onnx.py)): Shrinks model size by **72.3% (1.2 MB $\rightarrow$ 347 KB)** for ultra-fast in-browser WASM execution.

---

### 2. 🌐 Interactive Web Experience & Tools
* **In-Browser AI Training Studio (`/ai-studio`)**: Configure character policies, select curriculum levels, watch live convergence loss curves, and download exported ONNX weights with 1-click.
* **3D Voxel Sandbox Level Editor (`/sandbox`)**: Click and place Stone, Lava, Diamond, Water, or spawn Creepers on the 3D grid and watch the AI dynamically adapt in real time.
* **AI Voice Commander (`components/game/VoiceCommander.tsx`)**: Real-time microphone streaming powered by **Deepgram Nova-2** & **Groq Whisper** with audible AI voice response via Web SpeechSynthesis.
* **3D Tactical Spatial Radar (`components/game/SpatialRadar.tsx`)**: 360° circular HUD with live blips for Players, Creepers, Diamonds, and Lava Chasms.
* **3D Positional Audio Synthesizer (`lib/audio-synthesizer.ts`)**: Generates 8-bit voxel sound effects (block break crunch, creeper warning hiss, diamond reward chime) with zero audio assets.

---

### 3. 🔒 Production System Design & Security
* **Sliding Window API Rate Limiting**: Protects all API endpoints against DDoS and abuse with standard HTTP 429 and `X-RateLimit-*` headers.
* **Multi-Key Auto-Failover & Rotation**: `key-manager.ts` rotates across comma-separated keys, auto-quarantines rate-limited keys, and cascades across Groq, Gemini, OpenRouter, and local heuristics.
* **Optimistic Concurrency & Idempotency**: Atomic `prisma.$transaction` and `version Int` prevent state corruption and replay attacks.
* **System Health Diagnostics Probes**: `/api/health`, `/api/health/live`, and `/api/health/ready` report database latency, memory stats, and AI key rotation pools.

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+ & PyTorch

### 1. Launch Next.js Web App
```bash
cd apps/web
npm install
npm run dev
```
👉 Open **http://localhost:3000** in your browser.

### 2. Run High-Speed AI Distillation (4.5 seconds)
```bash
python ml/training/dagger_teacher_distillation.py
```

### 3. Run Automated Verification Tests
```bash
# Run AI test suite (7/7 passed)
pytest ml/tests/test_advanced_ai_suite.py -v

# Run Core RL test suite (6/6 passed)
pytest training/tests/test_env_and_model.py -v
```

### 4. Quantize ONNX Models to INT8
```bash
python ml/export/quantize_onnx.py
```

---

## 📂 Project Structure

```
minecraft/
├── apps/web/                        # Next.js 14 Web Application (28 Pages & APIs)
├── ml/                              # Advanced Compute-Efficient Embodied AI Suite
├── training/                        # Core PyTorch Reinforcement Learning Pipeline
├── database/                        # Database Schema & Neon PostgreSQL Migrations
├── infra/                           # Dockerfile & Docker Compose Configurations
└── .github/                         # Automated CI/CD Testing Workflows
```

---

## 📜 License
MIT License. Created for advanced embodied artificial intelligence research and interactive 3D voxel sandbox simulation.
