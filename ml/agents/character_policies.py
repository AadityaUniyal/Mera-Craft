"""
MINDCRAFT — Character Neural Policy Architectures (PyTorch)
Implements:
  - Shared Feature Encoder with Residual LayerNorm blocks
  - Specialized Policy & Value Heads for Explorer, Guardian, and Builder
  - Unified Multi-Head Actor-Critic Brain with Character DNA conditioning
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Dict, Any


class ResidualBlock(nn.Module):
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.fc1 = nn.Linear(hidden_dim, hidden_dim)
        self.ln1 = nn.LayerNorm(hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.ln2 = nn.LayerNorm(hidden_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = F.gelu(self.ln1(self.fc1(x)))
        x = self.ln2(self.fc2(x))
        return F.gelu(x + residual)


class SharedObservationEncoder(nn.Module):
    """Encodes the 42-dimensional multi-modal observation space."""
    def __init__(self, obs_dim: int = 42, hidden_dim: int = 128):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Linear(obs_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
        )
        self.res1 = ResidualBlock(hidden_dim)
        self.res2 = ResidualBlock(hidden_dim)

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        x = self.stem(obs)
        x = self.res1(x)
        x = self.res2(x)
        return x


class CharacterActorCritic(nn.Module):
    """Specialized Actor-Critic network for an individual character."""
    def __init__(self, obs_dim: int = 42, action_dim: int = 10, hidden_dim: int = 128):
        super().__init__()
        self.encoder = SharedObservationEncoder(obs_dim, hidden_dim)
        
        # Policy Actor Head
        self.actor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, action_dim),
        )
        
        # Value Critic Head
        self.critic = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, 1),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=1.414)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.0)
        # Low variance on policy logits output
        nn.init.orthogonal_(self.actor[-1].weight, gain=0.01)
        nn.init.orthogonal_(self.critic[-1].weight, gain=1.0)

    def get_action_and_value(
        self, obs: torch.Tensor, action: torch.Tensor = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        features = self.encoder(obs)
        logits = self.actor(features)
        dist = torch.distributions.Categorical(logits=logits)
        
        if action is None:
            action = dist.sample()
            
        value = self.critic(features)
        return action, dist.log_prob(action), dist.entropy(), value

    def get_value(self, obs: torch.Tensor) -> torch.Tensor:
        features = self.encoder(obs)
        return self.critic(features)

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        """Direct inference forward pass returning action probabilities."""
        features = self.encoder(obs)
        logits = self.actor(features)
        return torch.softmax(logits, dim=-1)


class UnifiedMultiHeadBrain(nn.Module):
    """
    Shared trunk brain with 3 specialized character heads:
    - Head 0: Explorer
    - Head 1: Guardian
    - Head 2: Builder
    """
    def __init__(self, obs_dim: int = 42, action_dim: int = 10, hidden_dim: int = 128):
        super().__init__()
        self.shared_encoder = SharedObservationEncoder(obs_dim, hidden_dim)

        self.explorer_actor = nn.Linear(hidden_dim, action_dim)
        self.guardian_actor = nn.Linear(hidden_dim, action_dim)
        self.builder_actor = nn.Linear(hidden_dim, action_dim)
        self.critic = nn.Linear(hidden_dim, 1)

    def forward(self, obs: torch.Tensor, role_id: int = 0) -> torch.Tensor:
        feat = self.shared_encoder(obs)
        if role_id == 1:
            logits = self.guardian_actor(feat)
        elif role_id == 2:
            logits = self.builder_actor(feat)
        else:
            logits = self.explorer_actor(feat)
        return torch.softmax(logits, dim=-1)
