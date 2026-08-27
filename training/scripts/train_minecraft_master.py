"""
MINDCRAFT — Complete Minecraft PPO Training Pipeline (v6 Pro)
Trains across all 5 Minecraft Challenge Modes simultaneously with bridging, crouching, sprint, and mob evasion.
"""

import os
import sys
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from training.environments.minecraft_voxel_env import MinecraftVoxelEnvironment
from training.models.minecraft_actor_critic import MinecraftActorCritic


def train_minecraft_master_policy(
    total_timesteps: int = 180000,
    num_steps: int = 128,
    num_envs: int = 8,
    learning_rate: float = 3e-4,
    gamma: float = 0.99,
    gae_lambda: float = 0.95,
    clip_coef: float = 0.2,
    ent_coef: float = 0.02,
    vf_coef: float = 0.5,
    max_grad_norm: float = 0.5,
    update_epochs: int = 4,
    num_minibatches: int = 4,
    seed: int = 42,
    device: str = "auto"
):
    print("=" * 72)
    print("  MINDCRAFT — TRAINING MINECRAFT MASTER EMBODIED BRAIN (v6 PRO)  ")
    print("=" * 72)

    if device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device)
    print(f"[*] Compute Engine: {device}")

    torch.manual_seed(seed)
    np.random.seed(seed)

    # 8 Parallel Environments with distributed challenge modes
    challenge_modes = [0, 1, 2, 3, 4, 1, 2, 3] # Parkour, Bridging, Night, Economy, Mountain...
    envs = [
        MinecraftVoxelEnvironment(
            challenge_mode=challenge_modes[i],
        ) for i in range(num_envs)
    ]

    obs_dim = envs[0].observation_dim
    action_dim = envs[0].action_space.n

    agent = MinecraftActorCritic(obs_dim=obs_dim, action_dim=action_dim).to(device)
    optimizer = optim.Adam(agent.parameters(), lr=learning_rate, eps=1e-5)

    obs_buf = torch.zeros((num_steps, num_envs, obs_dim), dtype=torch.float32).to(device)
    actions_buf = torch.zeros((num_steps, num_envs), dtype=torch.long).to(device)
    logprobs_buf = torch.zeros((num_steps, num_envs), dtype=torch.float32).to(device)
    rewards_buf = torch.zeros((num_steps, num_envs), dtype=torch.float32).to(device)
    dones_buf = torch.zeros((num_steps, num_envs), dtype=torch.float32).to(device)
    values_buf = torch.zeros((num_steps, num_envs), dtype=torch.float32).to(device)

    global_step = 0
    start_time = time.time()
    batch_size = num_steps * num_envs
    minibatch_size = batch_size // num_minibatches
    num_updates = total_timesteps // batch_size

    episode_rewards = []
    episode_successes = []
    history = {
        "timesteps": [],
        "mean_rewards": [],
        "success_rates": [],
        "policy_losses": [],
        "value_losses": [],
    }

    next_obs = torch.zeros((num_envs, obs_dim), dtype=torch.float32).to(device)
    next_done = torch.zeros(num_envs, dtype=torch.float32).to(device)
    env_seeds = [seed + i * 50 for i in range(num_envs)]

    for i, env in enumerate(envs):
        o, _ = env.reset(seed=env_seeds[i])
        next_obs[i] = torch.tensor(o, dtype=torch.float32, device=device)

    current_env_rewards = [0.0] * num_envs

    print(f"[*] Updates: {num_updates} | Total Timesteps: {total_timesteps} | Batch Size: {batch_size}")

    for update in range(1, num_updates + 1):
        for step in range(num_steps):
            global_step += num_envs
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
                    env_seeds[i] += 100
                    o, _ = env.reset(seed=env_seeds[i])

                next_obs[i] = torch.tensor(o, dtype=torch.float32, device=device)
                next_done[i] = 1.0 if done else 0.0

        # GAE Calculation
        with torch.no_grad():
            next_value = agent.get_value(next_obs).flatten()
            advantages = torch.zeros_like(rewards_buf, device=device)
            lastgaelam = 0.0
            for t in reversed(range(num_steps)):
                if t == num_steps - 1:
                    nextnonterminal = 1.0 - next_done
                    nextvalues = next_value
                else:
                    nextnonterminal = 1.0 - dones_buf[t + 1]
                    nextvalues = values_buf[t + 1]
                delta = rewards_buf[t] + gamma * nextvalues * nextnonterminal - values_buf[t]
                advantages[t] = lastgaelam = delta + gamma * gae_lambda * nextnonterminal * lastgaelam
            returns = advantages + values_buf

        b_obs = obs_buf.reshape((-1, obs_dim))
        b_logprobs = logprobs_buf.reshape(-1)
        b_actions = actions_buf.reshape(-1)
        b_advantages = advantages.reshape(-1)
        b_returns = returns.reshape(-1)
        b_values = values_buf.reshape(-1)

        b_inds = np.arange(batch_size)
        pg_losses, v_losses = [], []

        for epoch in range(update_epochs):
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

                pg_loss1 = -mb_advantages * ratio
                pg_loss2 = -mb_advantages * torch.clamp(ratio, 1 - clip_coef, 1 + clip_coef)
                pg_loss = torch.max(pg_loss1, pg_loss2).mean()

                newvalue = newvalue.view(-1)
                v_loss_unclipped = (newvalue - b_returns[mb_inds]) ** 2
                v_clipped = b_values[mb_inds] + torch.clamp(
                    newvalue - b_values[mb_inds], -clip_coef, clip_coef
                )
                v_loss_clipped = (v_clipped - b_returns[mb_inds]) ** 2
                v_loss = 0.5 * torch.max(v_loss_unclipped, v_loss_clipped).mean()

                entropy_loss = entropy.mean()
                loss = pg_loss - ent_coef * entropy_loss + v_loss * vf_coef

                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(agent.parameters(), max_grad_norm)
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

            print(
                f"Update {update:3d}/{num_updates} | "
                f"Step: {global_step:6d} | "
                f"Rew: {recent_rew:6.2f} | "
                f"Success: {recent_succ*100:5.1f}% | "
                f"SPS: {sps}"
            )

    checkpoints_dir = Path(__file__).resolve().parent.parent / "checkpoints"
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    save_path = checkpoints_dir / "mindcraft_minecraft_master_v6.pt"
    torch.save({
        "model_state_dict": agent.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "history": history
    }, save_path)
    print(f"\n[+] Minecraft Master Checkpoint (v6 Pro) saved to: {save_path}")

    return agent, history


if __name__ == "__main__":
    train_minecraft_master_policy()
