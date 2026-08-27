"""
MINDCRAFT — Guardian Training Script (PPO Threat Interception & Base Defense)
Trains Guardian character to detect approaching Creepers, calculate lead angles, sprint to intercept,
and eliminate threats before base penetration.
"""

import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from ml.environments.mindcraft_world_env import MindcraftWorldEnvironment
from ml.agents.character_policies import CharacterActorCritic

def train_guardian(
    total_timesteps: int = 40000,
    num_envs: int = 8,
    num_steps: int = 128,
    learning_rate: float = 3e-4,
    gamma: float = 0.99,
    gae_lambda: float = 0.95,
    clip_coef: float = 0.2,
    ent_coef: float = 0.02,
    vf_coef: float = 0.5,
    max_grad_norm: float = 0.5,
    seed: int = 42,
    save_path: str = "models/checkpoints/guardian_v1.pt"
):
    torch.manual_seed(seed)
    np.random.seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("========================================================================")
    print("  MINDCRAFT — TRAINING GUARDIAN POLICY (THREAT DEFENSE PPO)             ")
    print(f"[*] Hardware Compute: {device} | Vector Envs: {num_envs} | Steps: {total_timesteps}")
    print("========================================================================")

    envs = [MindcraftWorldEnvironment(grid_size=32, character_role=MindcraftWorldEnvironment.ROLE_GUARDIAN, curriculum_level=4) for _ in range(num_envs)]
    agent = CharacterActorCritic(obs_dim=42, action_dim=10).to(device)
    optimizer = optim.Adam(agent.parameters(), lr=learning_rate, eps=1e-5)

    batch_size = num_envs * num_steps
    num_updates = total_timesteps // batch_size

    obs_buf = torch.zeros((num_steps, num_envs, 42), device=device)
    actions_buf = torch.zeros((num_steps, num_envs), device=device)
    logprobs_buf = torch.zeros((num_steps, num_envs), device=device)
    rewards_buf = torch.zeros((num_steps, num_envs), device=device)
    dones_buf = torch.zeros((num_steps, num_envs), device=device)
    values_buf = torch.zeros((num_steps, num_envs), device=device)

    next_obs = torch.tensor(np.array([env.reset(seed=i * 200 + seed)[0] for i, env in enumerate(envs)]), dtype=torch.float32, device=device)
    next_done = torch.zeros(num_envs, device=device)

    start_time = time.time()
    for update in range(1, num_updates + 1):
        for step in range(num_steps):
            obs_buf[step] = next_obs
            dones_buf[step] = next_done

            with torch.no_grad():
                action, logprob, _, value = agent.get_action_and_value(next_obs)
                values_buf[step] = value.flatten()

            actions_buf[step] = action
            logprobs_buf[step] = logprob

            step_rewards, step_dones = [], []
            for i, env in enumerate(envs):
                o, r, term, trunc, info = env.step(action[i].item())
                d = term or trunc
                step_rewards.append(r)
                step_dones.append(d)
                if d:
                    o, _ = env.reset(seed=int(time.time() * 1000) % 100000 + i)
                next_obs[i] = torch.tensor(o, dtype=torch.float32, device=device)

            rewards_buf[step] = torch.tensor(step_rewards, dtype=torch.float32, device=device)
            next_done = torch.tensor(step_dones, dtype=torch.float32, device=device)

        # GAE Advantage Estimation
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

        # Flatten buffers for PPO Update
        b_obs = obs_buf.reshape((-1, 42))
        b_logprobs = logprobs_buf.reshape(-1)
        b_actions = actions_buf.reshape(-1)
        b_advantages = advantages.reshape(-1)
        b_returns = returns.reshape(-1)

        b_inds = np.arange(batch_size)
        for epoch in range(4):
            np.random.shuffle(b_inds)
            for start in range(0, batch_size, 256):
                end = start + 256
                mb_inds = b_inds[start:end]

                _, newlogprob, entropy, newvalue = agent.get_action_and_value(b_obs[mb_inds], b_actions[mb_inds])
                logratio = newlogprob - b_logprobs[mb_inds]
                ratio = logratio.exp()

                mb_advantages = b_advantages[mb_inds]
                mb_advantages = (mb_advantages - mb_advantages.mean()) / (mb_advantages.std() + 1e-8)

                # Policy loss with PPO clipping
                pg_loss1 = -mb_advantages * ratio
                pg_loss2 = -mb_advantages * torch.clamp(ratio, 1.0 - clip_coef, 1.0 + clip_coef)
                pg_loss = torch.max(pg_loss1, pg_loss2).mean()

                # Value loss
                v_loss = 0.5 * ((newvalue.view(-1) - b_returns[mb_inds]) ** 2).mean()
                entropy_loss = entropy.mean()

                loss = pg_loss - ent_coef * entropy_loss + vf_coef * v_loss

                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(agent.parameters(), max_grad_norm)
                optimizer.step()

        if update % 10 == 0 or update == num_updates:
            sps = int(update * batch_size / max(1e-3, time.time() - start_time))
            mean_rew = rewards_buf.mean().item() * 100
            print(f"Update {update:3d}/{num_updates} | Guardian Mean Rew: {mean_rew:6.2f} | SPS: {sps}")

    torch.save(agent.state_dict(), save_path)
    print(f"[+] Guardian Policy successfully trained & saved to: {save_path}")

if __name__ == "__main__":
    train_guardian()
