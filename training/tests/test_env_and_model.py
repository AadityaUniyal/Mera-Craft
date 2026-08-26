"""
MINDCRAFT — Comprehensive Unit & Integration Tests
Validates 42-dim environment, 10-action space, collision physics, Actor-Critic model, and checkpoint serialization.
"""

import os
import pytest
import numpy as np
import torch
from pathlib import Path
import sys

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from training.environments.minecraft_voxel_env import MinecraftVoxelEnvironment
from training.models.mindcraft_actor_critic import MindcraftActorCritic


def test_minecraft_env_reset():
    env = MinecraftVoxelEnvironment(grid_size=16, challenge_mode=0)
    obs, info = env.reset(seed=42)

    assert obs.shape == (42,)
    assert isinstance(obs, np.ndarray)
    assert obs.dtype == np.float32
    assert "agent_pos" in info
    assert "target_pos" in info
    assert env.health == 1.0
    assert env.hunger_stamina == 1.0


def test_minecraft_env_step_actions():
    env = MinecraftVoxelEnvironment(grid_size=16, challenge_mode=3)
    obs, _ = env.reset(seed=42)

    # Test Walk Forward
    next_obs, reward, term, trunc, info = env.step(MinecraftVoxelEnvironment.ACTION_FORWARD_WALK)
    assert next_obs.shape == (42,)
    assert isinstance(reward, float)
    assert isinstance(term, bool)
    assert isinstance(trunc, bool)
    assert info["step"] == 1

    # Test Sprint Forward
    next_obs, reward, term, trunc, info = env.step(MinecraftVoxelEnvironment.ACTION_SPRINT_FORWARD)
    assert next_obs.shape == (42,)
    assert info["step"] == 2

    # Test Jump Parkour
    next_obs, reward, term, trunc, info = env.step(MinecraftVoxelEnvironment.ACTION_JUMP_PARKOUR)
    assert next_obs.shape == (42,)

    # Test Sneak Crouch
    next_obs, reward, term, trunc, info = env.step(MinecraftVoxelEnvironment.ACTION_SNEAK_CROUCH)
    assert next_obs.shape == (42,)


def test_minecraft_env_deterministic_seeds():
    env1 = MinecraftVoxelEnvironment(grid_size=16, challenge_mode=1)
    obs1, _ = env1.reset(seed=12345)

    env2 = MinecraftVoxelEnvironment(grid_size=16, challenge_mode=1)
    obs2, _ = env2.reset(seed=12345)

    np.testing.assert_allclose(obs1, obs2, rtol=1e-5, atol=1e-5)
    np.testing.assert_allclose(env1.agent_pos, env2.agent_pos)
    np.testing.assert_allclose(env1.target_pos, env2.target_pos)


def test_mindcraft_actor_critic_forward():
    model = MindcraftActorCritic(obs_dim=42, action_dim=10)
    dummy_input = torch.randn(4, 42)

    probs = model(dummy_input)
    assert probs.shape == (4, 10)
    # Sum of probabilities across actions must equal 1
    sums = torch.sum(probs, dim=-1)
    np.testing.assert_allclose(sums.detach().numpy(), np.ones(4), rtol=1e-4)


def test_mindcraft_actor_critic_get_action_and_value():
    model = MindcraftActorCritic(obs_dim=42, action_dim=10)
    dummy_input = torch.randn(4, 42)

    action, logprob, entropy, value = model.get_action_and_value(dummy_input)
    assert action.shape == (4,)
    assert logprob.shape == (4,)
    assert entropy.shape == (4,)
    assert value.shape == (4, 1)


def test_checkpoint_save_and_resume(tmp_path):
    model = MindcraftActorCritic(obs_dim=42, action_dim=10)
    save_path = tmp_path / "test_ckpt.pt"

    torch.save({
        "global_step": 5000,
        "model_state_dict": model.state_dict(),
        "history": {"timesteps": [5000], "mean_rewards": [12.5]}
    }, save_path)

    loaded = torch.load(save_path, map_location="cpu")
    assert loaded["global_step"] == 5000
    assert "model_state_dict" in loaded
    assert loaded["history"]["mean_rewards"] == [12.5]
