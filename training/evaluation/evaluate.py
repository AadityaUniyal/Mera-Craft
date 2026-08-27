"""
MINDCRAFT — Statistical Policy Evaluation Benchmark Suite
Evaluates trained models across all 5 Minecraft challenge curricula and seeds.
"""

import sys
import argparse
from pathlib import Path
import numpy as np
import torch

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from training.environments.minecraft_voxel_env import MinecraftVoxelEnvironment
from training.models.mindcraft_actor_critic import MindcraftActorCritic


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluate Mindcraft Trained Policy")
    parser.add_argument("--checkpoint", type=str, default="training/checkpoints/mindcraft_master.pt", help="Path to checkpoint .pt")
    parser.add_argument("--episodes", type=int, default=50, help="Total evaluation episodes")
    parser.add_argument("--seed", type=int, default=1000, help="Starting random seed")
    return parser.parse_args()


def evaluate_policy(checkpoint_path: str, num_episodes: int = 50, base_seed: int = 1000):
    print("=" * 76)
    print("  MINDCRAFT — EMBODIED POLICY STATISTICAL BENCHMARK SUITE  ")
    print("=" * 76)

    checkpoint_path = Path(checkpoint_path)
    model = MindcraftActorCritic(obs_dim=42, action_dim=10)

    if checkpoint_path.exists():
        ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        state_dict = ckpt["model_state_dict"] if "model_state_dict" in ckpt else ckpt
        model.load_state_dict(state_dict)
        print(f"[+] Loaded Model Checkpoint: {checkpoint_path}")
    else:
        print(f"[!] Warning: Checkpoint {checkpoint_path} not found. Running baseline architecture.")

    model.eval()

    challenge_names = [
        "1. Precision Parkour Gap",
        "2. Lava Lake Bridging",
        "3. Night Creeper Survival",
        "4. Speedrun Economy",
        "5. Mountain Pillar Climb",
    ]

    results_per_mode = {i: {"rewards": [], "successes": [], "steps": [], "lava_falls": []} for i in range(5)}

    episodes_per_mode = num_episodes // 5

    for mode in range(5):
        env = MinecraftVoxelEnvironment(challenge_mode=mode)
        for ep in range(episodes_per_mode):
            seed = base_seed + mode * 100 + ep
            obs, _ = env.reset(seed=seed)
            done = False
            total_rew = 0.0
            steps = 0

            while not done and steps < 240:
                steps += 1
                obs_t = torch.tensor(obs, dtype=torch.float32).unsqueeze(0)
                with torch.no_grad():
                    action, _, _, _ = model.get_action_and_value(obs_t)
                obs, rew, term, trunc, info = env.step(int(action.item()))
                total_rew += rew
                done = term or trunc

            results_per_mode[mode]["rewards"].append(total_rew)
            results_per_mode[mode]["successes"].append(1.0 if info.get("success", False) else 0.0)
            results_per_mode[mode]["steps"].append(steps)
            results_per_mode[mode]["lava_falls"].append(1.0 if info.get("fell_in_lava", False) else 0.0)

    print("\n" + "-" * 76)
    print(f"{'CHALLENGE ARENA':<30} | {'SUCCESS RATE':<14} | {'MEAN REWARD':<14} | {'AVG STEPS':<10}")
    print("-" * 76)

    all_successes = []
    for mode in range(5):
        succ = np.mean(results_per_mode[mode]["successes"]) * 100
        rew = np.mean(results_per_mode[mode]["rewards"])
        stps = np.mean(results_per_mode[mode]["steps"])
        all_successes.extend(results_per_mode[mode]["successes"])
        print(f"{challenge_names[mode]:<30} | {succ:6.1f}%        | {rew:9.2f}    | {stps:6.1f}")

    overall_rate = np.mean(all_successes) * 100
    print("-" * 76)
    print(f"{'OVERALL BENCHMARK SCORE':<30} | {overall_rate:6.1f}%")
    print("=" * 76 + "\n")

    return overall_rate


if __name__ == "__main__":
    args = parse_args()
    evaluate_policy(args.checkpoint, args.episodes, args.seed)
