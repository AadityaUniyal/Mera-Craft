"""
MINDCRAFT — Self-Paced Adaptive Curriculum & Domain Randomization Engine
Dynamically adjusts environmental difficulty (hazards, enemy speeds, elevation gaps)
based on agent competence to maximize sample efficiency without manual tuning.
"""

from collections import deque
from typing import Dict, Any


class AdaptiveCurriculumManager:
    def __init__(
        self,
        min_level: int = 1,
        max_level: int = 5,
        window_size: int = 20,
        promotion_threshold: float = 0.80,
        demotion_threshold: float = 0.35
    ):
        self.min_level = min_level
        self.max_level = max_level
        self.current_level = min_level
        self.window_size = window_size
        self.promotion_threshold = promotion_threshold
        self.demotion_threshold = demotion_threshold
        self.success_window = deque(maxlen=window_size)
        self.total_episodes = 0

    def record_episode(self, success: bool) -> int:
        """Records an episode outcome and returns the newly adjusted curriculum level."""
        self.total_episodes += 1
        self.success_window.append(1.0 if success else 0.0)

        if len(self.success_window) >= self.window_size:
            avg_success = sum(self.success_window) / len(self.success_window)

            # Check promotion
            if avg_success >= self.promotion_threshold and self.current_level < self.max_level:
                self.current_level += 1
                self.success_window.clear()
                print(f"[▲] Curriculum Promoted! Level: {self.current_level} (Success: {avg_success * 100:.1f}%)")
            # Check demotion
            elif avg_success <= self.demotion_threshold and self.current_level > self.min_level:
                self.current_level -= 1
                self.success_window.clear()
                print(f"[▼] Curriculum Demoted. Level: {self.current_level} (Success: {avg_success * 100:.1f}%)")

        return self.current_level

    def get_environment_config(self) -> Dict[str, Any]:
        """Returns curriculum parameter configuration for the environment."""
        configs = {
            1: {"chasm_width": 0, "lava_present": False, "creeper_speed": 0.0, "description": "Flat Plains & Direct Navigation"},
            2: {"chasm_width": 2, "lava_present": False, "creeper_speed": 0.15, "description": "River Chasm & Slow Creepers"},
            3: {"chasm_width": 3, "lava_present": False, "creeper_speed": 0.25, "description": "Wide River & Standard Threat Interception"},
            4: {"chasm_width": 3, "lava_present": True, "creeper_speed": 0.35, "description": "Lava Hazards & Fast Creepers"},
            5: {"chasm_width": 4, "lava_present": True, "creeper_speed": 0.45, "description": "Master Challenge: Full Hazard Matrix"},
        }
        return configs.get(self.current_level, configs[1])
