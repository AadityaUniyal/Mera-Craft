"""
MINDCRAFT — Champion vs Candidate Benchmark Evaluator
Evaluates:
  1. Candidate Model (Explorer v2) vs Baseline/Champion (Explorer v1)
  2. 50 completely unseen procedural river & chasm maps (Seeds: 5001 - 5050)
  3. Metrics: Success rate %, Generalization Score, Mean Reward, Mean Steps, Hazard Falls
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import json
import time
import torch
import numpy as np
from ml.environments.mindcraft_world_env import MindcraftWorldEnvironment
from ml.agents.character_policies import CharacterActorCritic

def evaluate_model_on_unseen_scenarios(
    model_path: str,
    character_role: int = MindcraftWorldEnvironment.ROLE_EXPLORER,
    num_episodes: int = 50,
    seed_start: int = 5001
) -> dict:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    agent = CharacterActorCritic(obs_dim=42, action_dim=10).to(device)

    if os.path.exists(model_path):
        try:
            ckpt = torch.load(model_path, map_location=device, weights_only=True)
            state_dict = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
            agent.load_state_dict(state_dict)
            agent.eval()
        except Exception as e:
            print(f"[!] Warning loading {model_path}: {e}")
    else:
        print(f"[!] Warning: Model path {model_path} not found, evaluating uninitialized baseline.")

    env = MindcraftWorldEnvironment(grid_size=32, character_role=character_role, curriculum_level=5)
    
    successes = 0
    total_rewards = []
    total_steps = []
    hazard_falls = 0
    latencies = []

    for ep in range(num_episodes):
        obs, _ = env.reset(seed=seed_start + ep)
        done = False
        ep_reward = 0.0
        ep_steps = 0

        while not done and ep_steps < 240:
            ep_steps += 1
            obs_t = torch.tensor(obs, dtype=torch.float32).unsqueeze(0).to(device)
            
            t0 = time.perf_counter()
            with torch.no_grad():
                probs = agent(obs_t)
                action = torch.argmax(probs, dim=-1).item()
            latencies.append((time.perf_counter() - t0) * 1000.0)

            obs, r, term, trunc, info = env.step(action)
            ep_reward += r
            done = term or trunc

            if info.get("hazard_hit", False):
                hazard_falls += 1
            if info.get("success", False):
                successes += 1
                break

        total_rewards.append(ep_reward)
        total_steps.append(ep_steps)

    success_rate = (successes / num_episodes) * 100.0
    mean_reward = float(np.mean(total_rewards))
    mean_steps = float(np.mean(total_steps))
    avg_latency = float(np.mean(latencies))
    generalization_score = float(np.clip((success_rate / 100.0) * (1.0 - (hazard_falls / num_episodes)), 0.0, 1.0))

    return {
        "num_episodes": num_episodes,
        "success_rate_percent": round(success_rate, 2),
        "mean_reward": round(mean_reward, 2),
        "mean_steps": round(mean_steps, 2),
        "hazard_falls": hazard_falls,
        "avg_latency_ms": round(avg_latency, 3),
        "generalization_score": round(generalization_score, 3),
    }

def run_champion_candidate_audit():
    print("========================================================================")
    print("  MINDCRAFT — CHAMPION VS CANDIDATE GENERALIZATION AUDIT               ")
    print("  Evaluating on 50 Untouched Held-Out Procedural River Maps (Seeds 5001-5050)")
    print("========================================================================")

    # 1. Baseline Model (Explorer v1 Baseline)
    print("[*] Evaluating Baseline Candidate (Explorer v1)...")
    v1_results = evaluate_model_on_unseen_scenarios("models/checkpoints/explorer_v1_baseline.pt", seed_start=5001)

    # 2. Production Model (Explorer v2 Curriculum PPO)
    print("[*] Evaluating Production Model (Explorer v2)...")
    v2_results = evaluate_model_on_unseen_scenarios("models/checkpoints/explorer_v2.pt", seed_start=5001)

    audit = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scenario": "50 Held-Out Procedural River Maps (River Width 3-6)",
        "models": {
            "explorer_v1_baseline": v1_results,
            "explorer_v2_candidate": v2_results,
        },
        "comparison": {
            "success_delta_percent": round(v2_results["success_rate_percent"] - v1_results["success_rate_percent"], 2),
            "hazard_reduction_percent": round((1.0 - (v2_results["hazard_falls"] / max(1, v1_results["hazard_falls"]))) * 100.0, 2),
            "gate_passed": v2_results["success_rate_percent"] >= 80.0,
        }
    }

    os.makedirs("training/metrics", exist_ok=True)
    report_path = "training/metrics/champion_vs_candidate_report.json"
    with open(report_path, "w") as f:
        json.dump(audit, f, indent=2)

    print("\n------------------------------------------------------------------------")
    print(f"  Explorer v1 (Baseline) Success: {v1_results['success_rate_percent']}% | Falls: {v1_results['hazard_falls']}")
    print(f"  Explorer v2 (Candidate) Success: {v2_results['success_rate_percent']}% | Falls: {v2_results['hazard_falls']}")
    print(f"  Success Delta: +{audit['comparison']['success_delta_percent']}% | Gate Status: {'[PASS]' if audit['comparison']['gate_passed'] else '[FAIL]'}")
    print("------------------------------------------------------------------------")
    print(f"[+] Audit report written to: {report_path}")

if __name__ == "__main__":
    run_champion_candidate_audit()
