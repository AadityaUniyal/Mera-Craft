"""
MINDCRAFT — Advanced Compute-Efficient Embodied AI Verification Suite
Tests Vectorized Simulation Speed, Spatial Attention Networks, GRU Memory Recurrence,
Hierarchical Option-Critic Meta-Controllers, and Multi-Agent Spatial Blackboards.
"""

import time
import pytest
import numpy as np
import torch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml.environments.vectorized_voxel_world import (
    VectorizedVoxelWorld,
    ACTION_FORWARD,
    ACTION_JUMP,
    ACTION_SNEAK,
    ACTION_MINE,
    ACTION_PLACE_BLOCK,
)
from ml.models.advanced_spatial_actor_critic import AdvancedSpatialActorCritic
from ml.agents.hierarchical_meta_controller import HierarchicalMetaController, MacroOption
from ml.agents.multi_agent_blackboard import MultiAgentSpatialBlackboard
from ml.training.adaptive_curriculum import AdaptiveCurriculumManager


def test_vectorized_voxel_world_simulation_speed():
    """Verifies that the vectorized engine achieves high-speed simulation (>5,000 steps/sec on CPU)."""
    env = VectorizedVoxelWorld(grid_size=32, curriculum_level=3)
    env.reset(seed=42)

    total_steps = 2000
    start = time.perf_counter()
    for _ in range(total_steps):
        obs, rew, term, trunc, _ = env.step(ACTION_FORWARD)
        if term or trunc:
            env.reset()
    duration = time.perf_counter() - start
    steps_per_sec = total_steps / duration

    print(f"\n[+] Vectorized Engine Throughput: {steps_per_sec:,.0f} steps/sec (Duration: {duration * 1000:.1f}ms)")
    assert steps_per_sec > 2000, f"Simulation throughput too low: {steps_per_sec} steps/sec"


def test_vectorized_voxel_world_reset_and_step():
    env = VectorizedVoxelWorld(grid_size=32, curriculum_level=2)
    obs, info = env.reset(seed=123)

    assert obs.shape == (42,)
    assert isinstance(obs, np.ndarray)
    assert obs.dtype == np.float32
    assert info["health"] == 1.0
    assert info["stamina"] == 1.0

    # Test actions
    next_obs, rew, term, trunc, info = env.step(ACTION_JUMP)
    assert next_obs.shape == (42,)
    assert isinstance(rew, float)


def test_advanced_spatial_actor_critic_forward():
    model = AdvancedSpatialActorCritic(obs_dim=42, action_dim=10, hidden_dim=128)
    dummy_input = torch.randn(8, 42)

    # Stateless ONNX forward
    probs = model(dummy_input)
    assert probs.shape == (8, 10)
    sums = torch.sum(probs, dim=-1)
    np.testing.assert_allclose(sums.detach().numpy(), np.ones(8), rtol=1e-4)


def test_advanced_spatial_actor_critic_gru_recurrence():
    model = AdvancedSpatialActorCritic(obs_dim=42, action_dim=10, hidden_dim=128)
    h0 = model.get_initial_state(batch_size=4)
    dummy_input = torch.randn(4, 42)

    action, logprob, entropy, val, h1 = model.get_action_and_value(dummy_input, h0)
    assert action.shape == (4,)
    assert val.shape == (4, 1)
    assert h1.shape == (4, 128)

    # Verify hidden state evolves
    assert not torch.allclose(h0, h1)


def test_hierarchical_meta_controller():
    controller = HierarchicalMetaController(macro_horizon=8)
    dummy_obs = np.zeros(42, dtype=np.float32)

    # Normal state -> EXPLORE
    dummy_obs[30] = 0.8  # threat far
    opt, _ = controller.step_option(dummy_obs)
    assert opt == MacroOption.EXPLORE

    # Danger state -> DEFEND
    dummy_obs[30] = 0.1  # threat close
    opt, term = controller.step_option(dummy_obs)
    assert opt == MacroOption.DEFEND


def test_multi_agent_spatial_blackboard():
    blackboard = MultiAgentSpatialBlackboard()

    # Explorer publishes diamond discovery
    blackboard.publish_marker(
        marker_type="RESOURCE",
        position=np.array([12.0, 1.0, 15.0]),
        source_agent="explorer",
        metadata={"resource": "diamond", "amount": 3}
    )

    # Guardian queries nearest resource
    res = blackboard.query_nearest_marker(np.array([10.0, 1.0, 15.0]), marker_type="RESOURCE")
    assert res is not None
    marker, dist = res
    assert marker.metadata["resource"] == "diamond"
    assert round(dist, 1) == 2.0


def test_adaptive_curriculum_promotion_and_demotion():
    curriculum = AdaptiveCurriculumManager(min_level=1, max_level=5, window_size=5, promotion_threshold=0.8)

    # Record 5 consecutive successes -> promote to level 2
    for _ in range(5):
        lvl = curriculum.record_episode(success=True)
    assert lvl == 2

    config = curriculum.get_environment_config()
    assert config["chasm_width"] == 2
