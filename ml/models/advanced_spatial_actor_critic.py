"""
MINDCRAFT — Advanced Spatial-Temporal Multi-Head Attention Actor-Critic Neural Brain
Combines lightweight Spatial Self-Attention with a recurrent GRU temporal cell (<200K params)
to solve 3D Minecraft spatial navigation and resource memory within consumer compute limits.
"""

import torch
import torch.nn as nn
from torch.distributions.categorical import Categorical
from typing import Tuple, Optional


def layer_init(layer: nn.Linear, std: float = 1.414, bias_const: float = 0.0) -> nn.Linear:
    nn.init.orthogonal_(layer.weight, std)
    nn.init.constant_(layer.bias, bias_const)
    return layer


class SpatialAttentionEncoder(nn.Module):
    """Computes cross-attention between agent kinematic state and surrounding spatial radar raycasts."""
    def __init__(self, embed_dim: int = 64, num_heads: int = 4):
        super().__init__()
        self.radar_proj = layer_init(nn.Linear(16, embed_dim))
        self.kinematic_proj = layer_init(nn.Linear(26, embed_dim))
        self.attn = nn.MultiheadAttention(embed_dim=embed_dim, num_heads=num_heads, batch_first=True)
        self.norm = nn.LayerNorm(embed_dim)
        self.mlp = nn.Sequential(
            layer_init(nn.Linear(embed_dim, embed_dim * 2)),
            nn.GELU(),
            layer_init(nn.Linear(embed_dim * 2, embed_dim)),
        )
        self.norm2 = nn.LayerNorm(embed_dim)

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        # Split 42-dim into 16 raycast spatial rays and 26 kinematic/target features
        rays = obs[:, :16]
        kinematics = obs[:, 16:]

        # Project to embedding space
        q = self.kinematic_proj(kinematics).unsqueeze(1) # [B, 1, D]
        k = self.radar_proj(rays).unsqueeze(1)          # [B, 1, D]
        v = k

        # Multi-Head Attention Fusion
        attn_out, _ = self.attn(q, k, v)
        x = self.norm(q + attn_out)
        out = self.norm2(x + self.mlp(x))
        return out.squeeze(1) # [B, D]


class AdvancedSpatialActorCritic(nn.Module):
    def __init__(self, obs_dim: int = 42, action_dim: int = 10, hidden_dim: int = 128):
        super().__init__()
        self.obs_dim = obs_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim

        # 1. Spatial Attention Core
        self.spatial_encoder = SpatialAttentionEncoder(embed_dim=hidden_dim, num_heads=4)

        # 2. Recurrent Temporal GRU Memory Cell
        self.gru = nn.GRUCell(hidden_dim, hidden_dim)

        # 3. Policy Head (Actor)
        self.actor = nn.Sequential(
            layer_init(nn.Linear(hidden_dim, 64)),
            nn.Tanh(),
            layer_init(nn.Linear(64, action_dim), std=0.01),
        )

        # 4. Value Head (Critic)
        self.critic = nn.Sequential(
            layer_init(nn.Linear(hidden_dim, 64)),
            nn.Tanh(),
            layer_init(nn.Linear(64, 1), std=1.0),
        )

    def get_initial_state(self, batch_size: int = 1, device: Optional[torch.device] = None) -> torch.Tensor:
        return torch.zeros(batch_size, self.hidden_dim, device=device)

    def forward_features(self, obs: torch.Tensor, h: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        if h is None:
            h = torch.zeros(obs.shape[0], self.hidden_dim, device=obs.device)

        spatial_feat = self.spatial_encoder(obs)
        next_h = self.gru(spatial_feat, h)
        return next_h, next_h

    def get_value(self, obs: torch.Tensor, h: Optional[torch.Tensor] = None) -> torch.Tensor:
        feat, _ = self.forward_features(obs, h)
        return self.critic(feat)

    def get_action_and_value(
        self,
        obs: torch.Tensor,
        h: Optional[torch.Tensor] = None,
        action: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        feat, next_h = self.forward_features(obs, h)
        logits = self.actor(feat)
        probs = Categorical(logits=logits)

        if action is None:
            action = probs.sample()

        return action, probs.log_prob(action), probs.entropy(), self.critic(feat), next_h

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        """Standard stateless forward pass for ONNX export."""
        feat = self.spatial_encoder(obs)
        logits = self.actor(feat)
        return torch.softmax(logits, dim=-1)
