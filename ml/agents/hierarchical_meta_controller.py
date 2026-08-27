"""
MINDCRAFT — Hierarchical Option-Critic Meta-Controller
Decomposes long-horizon Minecraft gameplay into modular macro-options
(EXPLORE, DEFEND, BUILD, HARVEST) to drastically reduce PPO exploration sample complexity.
"""

import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Any, Tuple


class MacroOption:
    EXPLORE = 0
    DEFEND = 1
    BUILD = 2
    HARVEST = 3


OPTION_NAMES = ["EXPLORE", "DEFEND", "BUILD", "HARVEST"]


class HierarchicalMetaController:
    """High-level temporal planner operating on a macro-option Markov Decision Process (MDP)."""
    def __init__(self, macro_horizon: int = 16):
        self.macro_horizon = macro_horizon
        self.current_option = MacroOption.EXPLORE
        self.option_timer = 0

    def select_macro_option(self, observation: np.ndarray, goal_type: str = "auto") -> int:
        """Heuristic and value-informed macro-option switching."""
        is_lava_near = observation[16] > 0.3
        target_dist = observation[26]
        threat_dist = observation[30]
        wood_count = observation[32] * 10.0
        cobble_count = observation[36] * 32.0

        # 1. Emergency Defense Option
        if threat_dist < 0.3:
            return MacroOption.DEFEND

        # 2. Chasm / Lava Bridging Option
        if is_lava_near and cobble_count > 0:
            return MacroOption.BUILD

        # 3. Resource Gathering Loop
        if goal_type == "economy" and wood_count < 3:
            return MacroOption.HARVEST

        # 4. Default Autonomous Navigation
        return MacroOption.EXPLORE

    def step_option(self, observation: np.ndarray) -> Tuple[int, bool]:
        """Returns (current_macro_option, has_option_terminated)."""
        self.option_timer += 1
        
        # Check termination condition beta(s)
        threat_dist = observation[30]
        target_dist = observation[26]
        terminated = False

        if threat_dist < 0.25 and self.current_option != MacroOption.DEFEND:
            terminated = True
        elif target_dist < 0.1:
            terminated = True
        elif self.option_timer >= self.macro_horizon:
            terminated = True

        if terminated:
            self.current_option = self.select_macro_option(observation)
            self.option_timer = 0

        return self.current_option, terminated
