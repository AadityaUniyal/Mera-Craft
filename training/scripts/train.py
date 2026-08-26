"""
MINDCRAFT — Continuous PPO Training Engine (Heavy Computation & Checkpointing)
Supports full GAE, multi-curriculum vectorized environments, cosine LR annealing,
entropy bonus scheduling, and `--resume` for indefinite continuous training.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from training.environments.minecraft_voxel_env import MinecraftVoxelEnvironment
from training.models.mindcraft_actor_critic import MindcraftActorCritic


def parse_args():
    parser = argparse.ArgumentParser(description="MINDCRAFT Continuous PPO Training Engine")
    parser.add_argument("--timesteps", type=int, default=150000, help="Total timesteps to train in this session")
    parser.add_argument("--num-steps", type=int, default=128, help="Rollout length per environment")
    parser.add_argument("--num-envs", type=int, default=8, help="Number of parallel challenge environments")
    parser.add_argument("--learning-rate", type=float, default=3e-4, help="Initial Adam learning rate")
    parser.add_argument("--gamma", type=float, default=0.99, help="Discount factor")
    parser.add_argument("--gae-lambda", type=float, default=0.95, help="GAE lambda parameter")
    parser.add_argument("--clip-coef", type=float, default=0.2, help="PPO surrogate clipping coefficient")
    parser.add_argument("--ent-coef", type=float, default=0.02, help="Entropy loss coefficient")
    parser.add_argument("--vf-coef", type=float, default=0.5, help="Value loss coefficient")
    parser.add_argument("--max-grad-norm", type=float, default=0.5, help="Max gradient norm clipping")
    parser.add_argument("--update-epochs", type=int, default=4, help="PPO update epochs per rollout batch")
    parser.add_argument("--num-minibatches", type=int, default=4, help="Number of minibatches per epoch")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--device", type=str, default="auto", help="Compute device (auto, cuda, cpu)")
    parser.add_argument("--resume", type=str, default=None, help="Path to checkpoint .pt to resume training from")
    parser.add_argument("--save-interval", type=int, default=25000, help="Timesteps interval for saving checkpoints")
    parser.add_argument("--export-onnx", action="store_true", default=True, help="Auto-export ONNX on completion")
    return parser.parse_args()


def train(args):
    print("=" * 76)
    print("  MINDCRAFT — CONTINUOUS DEEP REINFORCEMENT LEARNING ENGINE  ")
    print("=" * 76)

    device_str = args.device
    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)
    print(f"[*] Compute Engine: {device}")

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    # Initialize Parallel Environments across curriculum challenge modes
    # Modes: 0: Parkour, 1: Lava Bridging, 2: Night Creeper, 3: Speedrun Economy, 4: Pillar Mountain
    challenge_modes = [i % 5 for i in range(args.num_envs)]
    envs = [MinecraftVoxelEnvironment(challenge_mode=challenge_modes[i]) for i in range(args.num_envs)]

    obs_dim = envs[0].observation_dim
    action_dim = envs[0].action_space.n

    agent = MindcraftActorCritic(obs_dim=obs_dim, action_dim=action_dim).to(device)
    optimizer = optim.Adam(agent.parameters(), lr=args.learning_rate, eps=1e-5)

    global_step = 0
    history = {
        "timesteps": [],
        "mean_rewards": [],
        "success_rates": [],
        "policy_losses": [],
        "value_losses": [],
        "learning_rates": [],
    }

    # Handle Continuous Training Resumption
    if args.resume and os.path.exists(args.resume):
        print(f"[+] Resuming continuous training from checkpoint: {args.resume}")
        checkpoint = torch.load(args.resume, map_location=device)
        agent.load_state_dict(checkpoint["model_state_dict"])
        if "optimizer_state_dict" in checkpoint:
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        if "history" in checkpoint:
            history = checkpoint["history"]
        if "global_step" in checkpoint:
            global_step = checkpoint["global_step"]
        print(f"[*] Loaded state at global_step: {global_step}")

    # Storage buffers
    obs_buf = torch.zeros((args.num_steps, args.num_envs, obs_dim), dtype=torch.float32).to(device)
    actions_buf = torch.zeros((args.num_steps, args.num_envs), dtype=torch.long).to(device)
    logprobs_buf = torch.zeros((args.num_steps, args.num_envs), dtype=torch.float32).to(device)
    rewards_buf = torch.zeros((args.num_steps, args.num_envs), dtype=torch.float32).to(device)
    dones_buf = torch.zeros((args.num_steps, args.num_envs), dtype=torch.float32).to(device)
    values_buf = torch.zeros((args.num_steps, args.num_envs), dtype=torch.float32).to(device)

    start_time = time.time()
    batch_size = args.num_steps * args.num_envs
    minibatch_size = batch_size // args.num_minibatches
    num_updates = args.timesteps // batch_size

    episode_rewards = []
    episode_successes = []
    best_success_rate = 0.0

    next_obs = torch.zeros((args.num_envs, obs_dim), dtype=torch.float32).to(device)
    next_done = torch.zeros(args.num_envs, dtype=torch.float32).to(device)
    env_seeds = [args.seed + i * 100 for i in range(args.num_envs)]

    for i, env in enumerate(envs):
        o, _ = env.reset(seed=env_seeds[i])
        next_obs[i] = torch.tensor(o, dtype=torch.float32)

    current_env_rewards = [0.0] * args.num_envs
    checkpoints_dir = Path(__file__).resolve().parent.parent / "checkpoints"
    checkpoints_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Updates: {num_updates} | Session Timesteps: {args.timesteps} | Batch Size: {batch_size}")

    for update in range(1, num_updates + 1):
        # Anneal Learning Rate
        frac = 1.0 - (update - 1.0) / num_updates
        lr_now = frac * args.learning_rate
        optimizer.param_groups[0]["lr"] = lr_now

        for step in range(args.num_steps):
            global_step += args.num_envs
            obs_buf[step] = next_obs
            dones_buf[step] = next_done

            with torch.no_grad():
                action, logprob, _, value = agent.get_action_and_value(next_obs)
                values_buf[step] = value.flatten()

            actions_buf[step] = action
            logprobs_buf[step] = logprob

            actions_np = action.cpu().numpy()
            for i, env in enumerate(envs):
                o, r, term, trunc, info = env.step(actions_np[i])
                rewards_buf[step, i] = float(r)
                current_env_rewards[i] += float(r)

                done = term or trunc
                if done:
                    episode_rewards.append(current_env_rewards[i])
                    episode_successes.append(1.0 if info.get("success", False) else 0.0)
                    current_env_rewards[i] = 0.0
                    env_seeds[i] += 50
                    o, _ = env.reset(seed=env_seeds[i])

                next_obs[i] = torch.tensor(o, dtype=torch.float32)
                next_done[i] = 1.0 if done else 0.0

        # Generalized Advantage Estimation (GAE)
        with torch.no_grad():
            next_value = agent.get_value(next_obs).reshape(1, -1)
            advantages = torch.zeros_like(rewards_buf).to(device)
            lastgaelam = 0
            for t in reversed(range(args.num_steps)):
                if t == args.num_steps - 1:
                    nextnonterminal = 1.0 - next_done
                    nextvalues = next_value
                else:
                    nextnonterminal = 1.0 - dones_buf[t + 1]
                    nextvalues = values_buf[t + 1]
                delta = rewards_buf[t] + args.gamma * nextvalues * nextnonterminal - values_buf[t]
                advantages[t] = lastgaelam = delta + args.gamma * args.gae_lambda * nextnonterminal * lastgaelam
            returns = advantages + values_buf

        # Flatten buffers for optimization
        b_obs = obs_buf.reshape((-1, obs_dim))
        b_logprobs = logprobs_buf.reshape(-1)
        b_actions = actions_buf.reshape(-1)
        b_advantages = advantages.reshape(-1)
        b_returns = returns.reshape(-1)
        b_values = values_buf.reshape(-1)

        b_inds = np.arange(batch_size)
        pg_losses, v_losses = [], []

        for epoch in range(args.update_epochs):
            np.random.shuffle(b_inds)
            for start in range(0, batch_size, minibatch_size):
                end = start + minibatch_size
                mb_inds = b_inds[start:end]

                _, newlogprob, entropy, newvalue = agent.get_action_and_value(
                    b_obs[mb_inds], b_actions[mb_inds]
                )
                logratio = newlogprob - b_logprobs[mb_inds]
                ratio = logratio.exp()

                mb_advantages = b_advantages[mb_inds]
                mb_advantages = (mb_advantages - mb_advantages.mean()) / (mb_advantages.std() + 1e-8)

                # Policy Loss (Surrogate Clipping)
                pg_loss1 = -mb_advantages * ratio
                pg_loss2 = -mb_advantages * torch.clamp(ratio, 1 - args.clip_coef, 1 + args.clip_coef)
                pg_loss = torch.max(pg_loss1, pg_loss2).mean()

                # Value Loss (Value Clipping)
                newvalue = newvalue.view(-1)
                v_loss_unclipped = (newvalue - b_returns[mb_inds]) ** 2
                v_clipped = b_values[mb_inds] + torch.clamp(
                    newvalue - b_values[mb_inds], -args.clip_coef, args.clip_coef
                )
                v_loss_clipped = (v_clipped - b_returns[mb_inds]) ** 2
                v_loss = 0.5 * torch.max(v_loss_unclipped, v_loss_clipped).mean()

                entropy_loss = entropy.mean()
                loss = pg_loss - args.ent_coef * entropy_loss + v_loss * args.vf_coef

                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(agent.parameters(), args.max_grad_norm)
                optimizer.step()

                pg_losses.append(pg_loss.item())
                v_losses.append(v_loss.item())

        recent_succ = np.mean(episode_successes[-40:]) if len(episode_successes) >= 20 else 0.0
        recent_rew = np.mean(episode_rewards[-40:]) if len(episode_rewards) >= 20 else 0.0

        if update % 5 == 0 or update == num_updates:
            sps = int(global_step / (time.time() - start_time))
            history["timesteps"].append(global_step)
            history["mean_rewards"].append(float(recent_rew))
            history["success_rates"].append(float(recent_succ))
            history["policy_losses"].append(float(np.mean(pg_losses)))
            history["value_losses"].append(float(np.mean(v_losses)))
            history["learning_rates"].append(float(lr_now))

            print(
                f"Update {update:3d}/{num_updates} | "
                f"Step: {global_step:7d} | "
                f"Rew: {recent_rew:6.2f} | "
                f"Success: {recent_succ*100:5.1f}% | "
                f"LR: {lr_now:.2e} | "
                f"SPS: {sps}"
            )

            # Save best checkpoint
            if recent_succ >= best_success_rate:
                best_success_rate = recent_succ
                torch.save({
                    "global_step": global_step,
                    "model_state_dict": agent.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "history": history,
                    "best_success_rate": best_success_rate,
                }, checkpoints_dir / "best_model.pt")

        # Periodic checkpoint
        if global_step % args.save_interval < batch_size or update == num_updates:
            save_path = checkpoints_dir / f"checkpoint_step_{global_step}.pt"
            torch.save({
                "global_step": global_step,
                "model_state_dict": agent.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "history": history,
            }, save_path)

    # Save latest master checkpoint
    final_path = checkpoints_dir / "mindcraft_master.pt"
    torch.save({
        "global_step": global_step,
        "model_state_dict": agent.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "history": history,
    }, final_path)
    print(f"\n[+] Master Training Checkpoint saved to: {final_path}")

    # Auto-export ONNX if requested
    if args.export_onnx:
        from training.scripts.export import export_model_to_onnx
        release_path = Path(__file__).resolve().parent.parent.parent / "models" / "release" / "master_v6_minecraft.onnx"
        web_path = Path(__file__).resolve().parent.parent.parent / "apps" / "web" / "public" / "models" / "master_v6_minecraft.onnx"
        export_model_to_onnx(final_path, release_path)
        export_model_to_onnx(final_path, web_path)

    return agent, history


if __name__ == "__main__":
    args = parse_args()
    train(args)
