"""
MINDCRAFT — Decentralized Multi-Agent Spatial Blackboard
Enables emergent swarm coordination between Explorer, Guardian, Builder, and Survivor
without requiring computationally expensive centralized multi-agent neural networks.
"""

import numpy as np
import time
from typing import List, Dict, Any, Optional, Tuple


class SpatialMarker:
    def __init__(
        self,
        marker_type: str,
        position: np.ndarray,
        source_agent: str,
        priority: float = 1.0,
        ttl_seconds: float = 60.0,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.marker_type = marker_type  # "RESOURCE", "THREAT", "BRIDGE", "BASE"
        self.position = np.array(position, dtype=np.float32)
        self.source_agent = source_agent
        self.priority = priority
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds
        self.metadata = metadata or {}

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class MultiAgentSpatialBlackboard:
    """Decentralized shared spatial state repository with zero neural inference cost."""
    def __init__(self):
        self.markers: List[SpatialMarker] = []
        self.agent_positions: Dict[str, np.ndarray] = {}

    def update_agent_pose(self, agent_id: str, pos: np.ndarray):
        self.agent_positions[agent_id] = np.array(pos, dtype=np.float32)

    def publish_marker(
        self,
        marker_type: str,
        position: np.ndarray,
        source_agent: str,
        priority: float = 1.0,
        ttl_seconds: float = 60.0,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self._prune_expired()
        marker = SpatialMarker(marker_type, position, source_agent, priority, ttl_seconds, metadata)
        self.markers.append(marker)

    def query_nearest_marker(
        self,
        query_pos: np.ndarray,
        marker_type: Optional[str] = None
    ) -> Optional[Tuple[SpatialMarker, float]]:
        self._prune_expired()
        best_marker = None
        min_dist = float("inf")

        for m in self.markers:
            if marker_type is not None and m.marker_type != marker_type:
                continue

            dist = float(np.linalg.norm(query_pos - m.position))
            if dist < min_dist:
                min_dist = dist
                best_marker = m

        if best_marker:
            return best_marker, min_dist
        return None

    def query_all_threats(self) -> List[SpatialMarker]:
        self._prune_expired()
        return [m for m in self.markers if m.marker_type == "THREAT"]

    def _prune_expired(self):
        self.markers = [m for m in self.markers if not m.is_expired()]


# Global shared blackboard instance
global_blackboard = MultiAgentSpatialBlackboard()
