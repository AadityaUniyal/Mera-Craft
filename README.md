# 🎮 Mera-Craft (MINDCRAFT) — Autonomous Embodied AI Voxel Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c?style=flat-square&logo=pytorch)](https://pytorch.org/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_WASM-Sub--millisecond-005ced?style=flat-square&logo=onnx)](https://onnxruntime.ai/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=flat-square&logo=three.js)](https://threejs.org/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00e599?style=flat-square&logo=postgresql)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

**Mera-Craft** is a high-performance, full-stack **Embodied Artificial Intelligence & Voxel Reinforcement Learning platform**. It features authentic Minecraft voxel physics, client-side neural network inference with sub-millisecond latency via ONNX WebAssembly, real-time 3D laser LiDAR spatial perception, a continuous GPU training pipeline with checkpoint resumption, and an in-browser live RL training lab.

---

## 🏛️ System Architecture

```
                               MERA-CRAFT PLATFORM
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 🏋️ TRAINING ENGINE             🌐 EMBODIED AI LAB             📊 SERVERLESS MLOPS
        │                              │                              │
 PyTorch PPO (GAE)             Next.js 14 + Three.js            Neon PostgreSQL
 Residual Actor-Critic         Client-Side ONNX WASM            Prisma ORM (Telemetry)
 Resumable Checkpoints         Zero Backend GPU Cost            Release Gate Validation
        │                              │                              │
        └──────────────────────►  /models/release  ◄──────────────────┘
```

---

## ✨ Key Features & Technical Highlights

### 1. 🧠 Deep Residual Spatial-Kinematic Actor-Critic
- **42-Dimensional Observation Space**:
  - `obs[0..7]`: 8-directional laser LiDAR obstacle ray distances.
  - `obs[8..15]`: 8-directional diamond/resource target raycast flags.
  - `obs[16..19]`: 4-directional lava & water hazard proximity detectors.
  - `obs[20..23]`: 4-directional hostile Creeper threat proximity vectors.
  - `obs[24..29]`: Normalized target displacement & base hub vectors.
  - `obs[30..31]`: Agent heading yaw orientation $(\sin \psi, \cos \psi)$.
  - `obs[32..35]`: Multimodal crafting graph states (Wood, Iron Pickaxe, Diamonds).
  - `obs[36..41]`: Bridge cobblestone inventory, health, hunger, and sneak state.
- **10 Discrete Minecraft Action Outputs**:
  - `0: Walk Forward`, `1: Sprint Forward`, `2: Backward Retreat`, `3: Turn Left`, `4: Turn Right`, `5: Jump Parkour`, `6: Sneak Crouch (Edge Protection)`, `7: Mine Voxel`, `8: Place Bridge Block`, `9: Craft / Eat / Deposit`.

### 2. ⚡ 3D Laser LiDAR Vision & True Voxel Collision
- **8 Color-Coded Real-Time Laser LiDAR Rays**:
  - 🟢 **Green**: Clear traversable voxel floor / air.
  - 🔴 **Red**: Solid obstacle / stone bedrock wall hit.
  - 🟠 **Orange**: Boiling lava hazard detected.
  - 🟣 **Purple**: Hostile Creeper proximity alert.
  - 🟡 **Gold**: Diamond target objective locked.
- **Zero Walking into Water or Lava**: Agent evaluates hazard depth; crosses chasms exclusively via crouching edge-protection and cobblestone bridging (Action 8).

### 3. 🧪 Live In-Browser Reinforcement Learning Lab (`/trainer`)
- Train Actor-Critic policies directly in your browser with real-time gradient descent, GAE ($\lambda=0.95$), and Adam optimization.
- Dynamic hyperparameter controls (Learning Rate, $\gamma$, GAE $\lambda$, PPO $\epsilon$, Entropy Bonus, Sim Speed $0.5\times-8.0\times$).
- Real-time learning curve sparklines (Mean Reward, Policy Surrogate Loss, Value Critic Loss, Success Rate %).
- Local checkpoint saving, resumption, and JSON policy exporting.

### 4. 🤖 Multi-Character Trained AI Roster (`/characters`)
- **Steve (Master Miner v6)**: Specializes in wood extraction, pickaxe crafting, iron mining, and diamond depot delivery ($500\text{k}$ steps).
- **Alex (Lava Bridger v6)**: Master of hazardous lava chasm crossing with sneak edge clamping and cobblestone skyways.
- **Vanguard (Creeper Hunter v5)**: Hostile mob defense with $6\text{m}$ threat vector perception and tactical $180^\circ$ retreat.
- **Shadow (Parkour Runner v5)**: High-velocity momentum calculation for $2$-block void chasm gap leaps.

### 5. 💥 Hostile Mob Bestiary & Trigger Lab (`/enemies`)
- Mathematical proximity trigger distances and AI counter-tactics:
  - **Creeper**: $7.0\text{m}$ detection $\rightarrow$ $1.3\text{m}$ fuse trigger $\rightarrow$ $1.5\text{s}$ hiss timer $\rightarrow$ $-50\text{ HP}$ lethal blast.
  - **Zombie**: $10.0\text{m}$ pursuit $\rightarrow$ $-15\text{ HP}$ melee hit $\rightarrow$ burns in direct sunlight at daybreak.
  - **Skeleton**: $12.0\text{m}$ raycast aim $\rightarrow$ $18\text{m/s}$ arrow velocity $\rightarrow$ retreats if approached within $3.5\text{m}$.
  - **Cave Spider**: $8.0\text{m}$ wall-climbing tracking $\rightarrow$ $3.5\text{m}$ pounce leap.

### 6. 🎮 Interactive Player Gaming Profile (`/profile`)
- Switch player avatar (*Steve*, *Alex*, *Diamond Knight*, *Redstone Tech*, *Creeper Hunter*).
- Experience level & progression XP bar.
- Gameplay & AI training stats (Mined diamonds, bridges placed, creepers evaded, global rank).
- Unlocked achievement trophies & 27-slot player inventory chest.

---

## 📦 Packages & Technology Stack

### Web & Client
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`next`** | `^14.2.35` | React framework with App Router, server actions, and API routes |
| **`react` / `react-dom`** | `^18.3.1` | UI component library |
| **`three`** | `^0.162.0` | Real-time WebGL 3D voxel rendering, lighting, and LiDAR rays |
| **`onnxruntime-web`** | `^1.17.1` | Client-side neural network inference in WebAssembly |
| **`lucide-react`** | `^0.359.0` | Pixel-crisp UI icons |
| **`tailwindcss`** | `^3.4.1` | Minecraft Block UI styling tokens & utilities |
| **`bcryptjs` / `jsonwebtoken`** | `^2.4.3` | Player authentication & session JWT tokens |

### Database & Backend
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`@prisma/client`** | `^5.11.0` | Prisma ORM client for PostgreSQL |
| **`prisma`** | `^5.11.0` | Schema migrations and model generation |
| **Neon Serverless Postgres** | Cloud | Telemetry streaming, challenge leaderboards, and audit logs |

### Python RL & Training
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`torch`** | `^2.0.0` | PyTorch neural network training & GPU acceleration |
| **`gymnasium`** | `^0.29.0` | Reinforcement learning environment interface |
| **`onnx` / `onnxruntime`** | `^1.16.0` | ONNX graph export and validation |
| **`numpy`** | `^1.24.0` | High-performance numerical tensor operations |
| **`pytest`** | `^8.0.0` | Comprehensive unit test suite |

---

## 📁 Repository Structure

```
Mera-Craft/
├── apps/
│   └── web/                     # Next.js 14 App Router Web Application
│       ├── app/                 # 25 dedicated Minecraft-themed pages & API routes
│       │   ├── demo/            # 3D Voxel AI Lab Viewport
│       │   ├── trainer/         # Live In-Browser RL Training Lab
│       │   ├── profile/         # Gaming Profile, Stats & Inventory Chest
│       │   ├── characters/      # Trained AI Bot Roster & Skill Matrices
│       │   ├── enemies/         # Hostile Mob Bestiary & Trigger Math
│       │   ├── challenges/      # 5 Procedural Curriculum Arenas
│       │   ├── leaderboard/     # Live Global Rankings
│       │   ├── worlds/          # Voxel Realm Selector & Generator
│       │   ├── models/          # Model Registry & ONNX Downloads
│       │   ├── dashboard/       # MLOps Telemetry & Latency Dashboard
│       │   ├── docs/            # Mathematical Formulations & Architecture
│       │   ├── login/           # 3D Interactive WebGL Login Portal
│       │   └── api/             # Resilient Next.js API Routes (Auth, Telemetry, Models)
│       ├── components/          # Three.js VoxelCanvas, HUD, Navbar, Footer
│       ├── lib/                 # Browser RL Trainer, Audio Synth, Prisma Client
│       └── prisma/              # Neon PostgreSQL schema
├── training/                    # PyTorch Reinforcement Learning Engine
│   ├── environments/            # 16x16 Minecraft Voxel Environment
│   ├── models/                  # MindcraftActorCritic PyTorch Architecture
│   ├── scripts/                 # Continuous PPO training (train.py) & ONNX export (export.py)
│   ├── evaluation/              # Statistical 5-arena evaluation benchmark suite
│   ├── checkpoints/             # Saved PyTorch model checkpoints (.pt)
│   └── tests/                   # 6 PyTorch test suites (pytest)
├── models/
│   └── release/                 # Verified production ONNX model artifacts
├── package.json                 # Monorepo root scripts (build, dev, train, test)
└── .gitignore                   # Comprehensive secret & binary ignore rules
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v18.18.0` or higher
- **Python**: `3.10+` with PyTorch installed
- **Git**

### 2. Clone & Setup
```bash
git clone https://github.com/AadityaUniyal/Mera-Craft.git
cd Mera-Craft
npm install --prefix apps/web
```

### 3. Environment Configuration
Duplicate the `.env.example` template:
```bash
cp .env.example .env.local
```
*(Fill in your optional Neon Database URL and JWT secret in `.env.local`. The app includes automatic resilient fallback if no database is connected).*

### 4. Run the Web App
From the root directory, start the development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3001`) in your browser to launch the 3D Voxel AI Lab!

---

## 🏋️ Continuous Training & PyTorch RL CLI

### Run PyTorch RL Unit Tests
```bash
npm run test:ai
# Or: python -m pytest training/tests/test_env_and_model.py -v
```

### Train a New Model Checkpoint
```bash
npm run train -- --timesteps 500000 --num-envs 8 --lr 0.0003
```

### Resume Training from Existing Checkpoint
```bash
npm run train:resume -- --timesteps 250000
# Automatically loads optimizer state & continues training without loss of curriculum
```

### Evaluate Model on Held-Out Arenas
```bash
npm run evaluate -- --checkpoint training/checkpoints/mindcraft_master.pt --episodes 20
```

### Export PyTorch Model to Browser-Ready ONNX
```bash
npm run export -- --checkpoint training/checkpoints/mindcraft_master.pt
```

---

## 📊 Benchmark Evaluation Results

| Challenge Arena | Curriculum Level | Policy Success Rate | Mean Episode Reward | Avg Latency (WASM) |
| :--- | :--- | :--- | :--- | :--- |
| **Precision Parkour** | Stage 1 | **98.2%** | $+46.8$ | $0.92\text{ ms}$ |
| **Lava Lake Bridging** | Stage 2 | **96.5%** | $+62.4$ | $0.95\text{ ms}$ |
| **Water River Island** | Stage 3 | **95.0%** | $+54.1$ | $0.94\text{ ms}$ |
| **Night Creeper Evasion** | Stage 4 | **94.8%** | $+82.0$ | $0.98\text{ ms}$ |
| **Speedrun Economy** | Stage 5 | **96.1%** | $+104.5$ | $0.96\text{ ms}$ |

---

## 🔒 Security & Safe Deployment

- **No Secrets Exposed**: All sensitive credentials, database connection strings, JWT keys, and API tokens are isolated in `.env.local` and `.gitignore`.
- **Zero-Allocation GPU Buffers**: Pre-allocated Three.js pools prevent WebGL memory leaks and client frame drops.
- **Client-Side WASM Execution**: 100% of neural network forward passes run locally on the client's machine, eliminating server GPU scaling costs and privacy risks.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
