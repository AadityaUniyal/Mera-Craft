"""
MINDCRAFT — Builder Training Script (Imitation Learning / Behavioral Cloning + PPO Fine-Tuning)
Implements:
  - Phase A: Expert Demonstration Generation (Bridging across chasm/river)
  - Phase B: Behavioral Cloning (Supervised cross-entropy imitation)
  - Phase C: PPO Reinforcement Learning Fine-Tuning
"""

import os
import time
from typing import Tuple
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from ml.environments.mindcraft_world_env import MindcraftWorldEnvironment
from ml.agents.character_policies import CharacterActorCritic

def generate_expert_demonstrations(num_episodes: int = 60) -> Tuple[np.ndarray, np.ndarray]:
    """Generates scripted expert demonstrations of sneaking and placing bridge blocks across chasms."""
    env = MindcraftWorldEnvironment(grid_size=32, character_role=MindcraftWorldEnvironment.ROLE_BUILDER)
    expert_obs = []
    expert_actions = []

    for ep in range(num_episodes):
        obs, _ = env.reset(seed=ep * 77)
        done = False
        step = 0
        while not done and step < 80:
            step += 1
            # Expert rule: Sneak forward (6), Place block (8), Jump if needed (5)
            if step % 3 == 0:
                action = MindcraftWorldEnvironment.ACTION_PLACE_BLOCK
            elif step % 3 == 1:
                action = MindcraftWorldEnvironment.ACTION_SNEAK
            else:
                action = MindcraftWorldEnvironment.ACTION_MOVE_FORWARD

            expert_obs.append(obs)
            expert_actions.append(action)
            obs, r, term, trunc, _ = env.step(action)
            done = term or trunc

    return np.array(expert_obs, dtype=np.float32), np.array(expert_actions, dtype=np.int64)


def train_builder(
    bc_epochs: int = 20,
    ppo_timesteps: int = 30000,
    num_envs: int = 4,
    num_steps: int = 128,
    seed: int = 42,
    save_path: str = "models/checkpoints/builder_v1.pt"
):
    torch.manual_seed(seed)
    np.random.seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("========================================================================")
    print("  MINDCRAFT — TRAINING BUILDER (BEHAVIORAL CLONING + PPO FINE-TUNING)   ")
    print(f"[*] Hardware Compute: {device} | BC Epochs: {bc_epochs} | PPO Steps: {ppo_timesteps}")
    print("========================================================================")

    # 1. Phase A: Expert Demonstrations
    print("[*] Collecting Expert Bridging Demonstrations...")
    demo_obs, demo_act = generate_expert_demonstrations(num_episodes=50)
    print(f"[+] Collected {len(demo_obs)} expert state-action transitions.")

    agent = CharacterActorCritic(obs_dim=42, action_dim=10).to(device)
    optimizer = optim.Adam(agent.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    # 2. Phase B: Behavioral Cloning Supervised Training
    print("[*] Phase B: Supervised Imitation Learning...")
    obs_t = torch.tensor(demo_obs, dtype=torch.float32, device=device)
    act_t = torch.tensor(demo_act, dtype=torch.long, device=device)

    dataset = torch.utils.data.TensorDataset(obs_t, act_t)
    loader = torch.utils.data.DataLoader(dataset, batch_size=64, shuffle=True)

    for epoch in range(1, bc_epochs + 1):
        total_loss = 0.0
        for batch_o, batch_a in loader:
            features = agent.encoder(batch_o)
            logits = agent.actor(features)
            loss = loss_fn(logits, batch_a)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 5 == 0 or epoch == bc_epochs:
            print(f"BC Epoch {epoch:2d}/{bc_epochs} | Imitation CrossEntropy Loss: {total_loss / len(loader):.4f}")

    # 3. Phase C: PPO Fine-Tuning
    print("[*] Phase C: PPO Reinforcement Learning Fine-Tuning on Variable Width Chasms...")
    envs = [MindcraftWorldEnvironment(grid_size=32, character_role=MindcraftWorldEnvironment.ROLE_BUILDER) for _ in range(num_envs)]
    ppo_opt = optim.Adam(agent.parameters(), lr=2e-4, eps=1e-5)

    batch_size = num_envs * num_steps
    num_updates = max(1, ppo_timesteps // batch_size)

    obs_buf = torch.zeros((num_steps, num_envs, 42), device=device)
    actions_buf = torch.zeros((num_steps, num_envs), device=device)
    logprobs_buf = torch.zeros((num_steps, num_envs), device=device)
    rewards_buf = torch.zeros((num_steps, num_envs), device=device)
    dones_buf = torch.zeros((num_steps, num_envs), device=device)
    values_buf = torch.zeros((num_steps, num_envs), device=device)

    next_obs = torch.tensor(np.array([env.reset(seed=i * 100 + seed)[0] for i, env in enumerate(envs)]), dtype=torch.float32, device=device)
    next_done = torch.zeros(num_envs, device=device)

    gamma = 0.99
    gae_lambda = 0.95
    clip_coef = 0.2

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

        # GAE
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

        b_obs = obs_buf.reshape((-1, 42))
        b_logprobs = logprobs_buf.reshape(-1)
        b_actions = actions_buf.reshape(-1)
        b_advantages = advantages.reshape(-1)
        b_returns = returns.reshape(-1)

        b_inds = np.arange(batch_size)
        for epoch in range(3):
            np.random.shuffle(b_inds)
            for start in range(0, batch_size, 128):
                end = start + 128
                mb_inds = b_inds[start:end]

                _, newlogprob, entropy, newvalue = agent.get_action_and_value(b_obs[mb_inds], b_actions[mb_inds])
                logratio = newlogprob - b_logprobs[mb_inds]
                ratio = logratio.exp()

                mb_advantages = b_advantages[mb_inds]
                mb_advantages = (mb_advantages - mb_advantages.mean()) / (mb_advantages.std() + 1e-8)

                pg_loss1 = -mb_advantages * ratio
                pg_loss2 = -mb_advantages * torch.clamp(ratio, 1.0 - clip_coef, 1.0 + clip_coef)
                pg_loss = torch.max(pg_loss1, pg_loss2).mean()

                v_loss = 0.5 * ((newvalue.view(-1) - b_returns[mb_inds]) ** 2).mean()
                loss = pg_loss - 0.01 * entropy.mean() + 0.5 * v_loss

                ppo_opt.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(agent.parameters(), 0.5)
                ppo_opt.step()

        if update % 5 == 0 or update == num_updates:
            print(f"PPO Update {update:2d}/{num_updates} | Mean Reward: {rewards_buf.mean().item() * 100:.2f}")

    torch.save(agent.state_dict(), save_path)
    print(f"[+] Builder Policy successfully trained & saved to: {save_path}")

if __name__ == "__main__":
    train_builder()
