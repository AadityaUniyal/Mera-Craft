"""
MINDCRAFT — Deep Residual Spatial-Kinematic Actor-Critic Architecture
Unified Neural Brain for Autonomous Minecraft Survival, Bridging, Combat, and Economy.
Observation: 42-dimensional physical sensory vector.
Action: 10 discrete Minecraft actions.
"""

import torch
import torch.nn as nn
from torch.distributions.categorical import Categorical


def layer_init(layer: nn.Linear, std: float = 1.414, bias_const: float = 0.0):
    nn.init.orthogonal_(layer.weight, std)
    nn.init.constant_(layer.bias, bias_const)
    return layer


class ResidualBlock(nn.Module):
    def __init__(self, dim: int):
        super().__init__()
        self.fc1 = layer_init(nn.Linear(dim, dim))
        self.ln1 = nn.LayerNorm(dim)
        self.act1 = nn.Tanh()
        self.fc2 = layer_init(nn.Linear(dim, dim))
        self.ln2 = nn.LayerNorm(dim)
        self.act2 = nn.Tanh()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.act1(self.ln1(self.fc1(x)))
        out = self.ln2(self.fc2(out))
        return self.act2(out + residual)


class MindcraftActorCritic(nn.Module):
    def __init__(self, obs_dim: int = 42, action_dim: int = 10, hidden_dim: int = 256):
        super().__init__()
        self.obs_dim = obs_dim
        self.action_dim = action_dim

        # Input Spatial-Kinematic Encoder
        self.input_encoder = nn.Sequential(
            layer_init(nn.Linear(obs_dim, hidden_dim)),
            nn.LayerNorm(hidden_dim),
            nn.Tanh(),
        )

        # Deep Residual Feature Fusion
        self.res1 = ResidualBlock(hidden_dim)
        self.res2 = ResidualBlock(hidden_dim)

        self.dense = nn.Sequential(
            layer_init(nn.Linear(hidden_dim, 128)),
            nn.LayerNorm(128),
            nn.Tanh(),
        )

        # Policy Head (Actor)
        self.actor = nn.Sequential(
            layer_init(nn.Linear(128, 64)),
            nn.Tanh(),
            layer_init(nn.Linear(64, action_dim), std=0.01),
        )

        # Value Head (Critic)
        self.critic = nn.Sequential(
            layer_init(nn.Linear(128, 64)),
            nn.Tanh(),
            layer_init(nn.Linear(64, 1), std=1.0),
        )

    def _extract_features(self, x: torch.Tensor) -> torch.Tensor:
        h = self.input_encoder(x)
        h = self.res1(h)
        h = self.res2(h)
        return self.dense(h)

    def get_value(self, x: torch.Tensor) -> torch.Tensor:
        features = self._extract_features(x)
        return self.critic(features)

    def get_action_and_value(self, x: torch.Tensor, action: torch.Tensor = None):
        features = self._extract_features(x)
        logits = self.actor(features)
        probs = Categorical(logits=logits)

        if action is None:
            action = probs.sample()

        return action, probs.log_prob(action), probs.entropy(), self.critic(features)

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        """Forward pass for ONNX export & client-side browser WASM inference."""
        features = self._extract_features(obs)
        logits = self.actor(features)
        return torch.softmax(logits, dim=-1)
