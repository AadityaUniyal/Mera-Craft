"""
MINDCRAFT — Procedural 32x32 Voxel World Environment (ML Subsystem)
Supports:
  - 32x32x16 procedural terrain with river, bridge, trees, hill, base, and threat entities
  - 42-dimensional structured observation vector with character role embeddings
  - 10 discrete actions
  - Multi-character specialized objectives (Explorer, Guardian, Builder, Survivor)
"""

import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Dict, Any, Tuple, Optional, List


class MindcraftWorldEnvironment(gym.Env):
    metadata = {"render_modes": ["rgb_array", "human"], "render_fps": 30}

    # Block Types
    BLOCK_AIR = 0
    BLOCK_GRASS = 1
    BLOCK_DIRT = 2
    BLOCK_STONE = 3
    BLOCK_OAK_WOOD = 4
    BLOCK_IRON_ORE = 5
    BLOCK_DIAMOND = 6
    BLOCK_BEDROCK = 7
    BLOCK_LAVA = 8
    BLOCK_WATER = 9
    BLOCK_BASE_HUB = 10
    BLOCK_COBBLE_PLACED = 11

    # Actions (10 Discrete Actions)
    ACTION_MOVE_FORWARD = 0
    ACTION_SPRINT_FORWARD = 1
    ACTION_MOVE_BACKWARD = 2
    ACTION_MOVE_LEFT = 3
    ACTION_MOVE_RIGHT = 4
    ACTION_JUMP = 5
    ACTION_SNEAK = 6
    ACTION_INTERACT_MINE = 7
    ACTION_PLACE_BLOCK = 8
    ACTION_CRAFT_EAT_DEPOSIT = 9

    # Character Roles
    ROLE_EXPLORER = 0
    ROLE_GUARDIAN = 1
    ROLE_BUILDER = 2
    ROLE_SURVIVOR = 3

    def __init__(
        self,
        grid_size: int = 32,
        character_role: int = ROLE_EXPLORER,
        max_steps: int = 240,
        curriculum_level: int = 1
    ):
        super().__init__()
        self.grid_size = grid_size
        self.character_role = character_role
        self.max_steps = max_steps
        self.curriculum_level = curriculum_level

        self.action_space = spaces.Discrete(10)
        self.observation_dim = 42
        self.observation_space = spaces.Box(
            low=-1.0, high=1.0, shape=(self.observation_dim,), dtype=np.float32
        )

        # 3D Grid State: [X, Y, Z] (Y: 0=floor/river/lava, 1=obstacles/ores/structures, 2=hills)
        self.grid = np.zeros((self.grid_size, 3, self.grid_size), dtype=np.int32)

        # Character State
        self.agent_pos = np.array([4.0, 0.0, 4.0], dtype=np.float32)
        self.agent_prev_pos = np.array([4.0, 0.0, 4.0], dtype=np.float32)
        self.agent_yaw = 0.0
        self.health = 1.0
        self.stamina = 1.0
        self.is_sneaking = False
        self.is_sprinting = False

        # Inventory
        self.inventory_wood = 0
        self.inventory_stone = 0
        self.inventory_iron = 0
        self.inventory_diamond = 0
        self.inventory_placeable_blocks = 16 if self.character_role == self.ROLE_BUILDER else 4
        self.blocks_placed_count = 0
        self.total_delivered = 0

        # World Elements
        self.base_hub_pos = np.array([3.5, 0.0, 3.5], dtype=np.float32)
        self.target_pos = np.array([28.0, 0.0, 28.0], dtype=np.float32)
        self.threat_pos = np.array([20.0, 0.0, 20.0], dtype=np.float32)
        self.threat_active = (self.character_role == self.ROLE_GUARDIAN or self.curriculum_level >= 5)
        self.river_x_start = 14
        self.river_width = 4
        self.hazards = []
        self.resources = []

        self.step_count = 0
        self.prev_target_dist = 0.0
        self.prev_base_dist = 0.0
        self.rng = np.random.RandomState(42)

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        if seed is not None:
            self.rng = np.random.RandomState(seed)

        if options:
            if "character_role" in options: self.character_role = options["character_role"]
            if "curriculum_level" in options: self.curriculum_level = options["curriculum_level"]

        self.step_count = 0
        self.health = 1.0
        self.stamina = 1.0
        self.is_sneaking = False
        self.is_sprinting = False
        self.inventory_wood = 0
        self.inventory_stone = 0
        self.inventory_iron = 0
        self.inventory_diamond = 0
        self.inventory_placeable_blocks = 16 if self.character_role == self.ROLE_BUILDER else 6
        self.blocks_placed_count = 0
        self.total_delivered = 0

        self.grid.fill(self.BLOCK_AIR)
        self.hazards = []
        self.resources = []

        # 1. Perimeter Bedrock & Ground
        for x in range(self.grid_size):
            for z in range(self.grid_size):
                if x == 0 or x == self.grid_size - 1 or z == 0 or z == self.grid_size - 1:
                    self.grid[x, 0, z] = self.BLOCK_BEDROCK
                    self.grid[x, 1, z] = self.BLOCK_BEDROCK
                else:
                    self.grid[x, 0, z] = self.BLOCK_GRASS

        # Base Hub at corner
        self.base_hub_pos = np.array([3.5, 0.0, 3.5], dtype=np.float32)
        self.grid[3, 0, 3] = self.BLOCK_BASE_HUB

        # 2. Procedural River Generation (Curriculum Dependent)
        if self.curriculum_level >= 3 or self.character_role in [self.ROLE_EXPLORER, self.ROLE_BUILDER]:
            self.river_width = int(self.rng.choice([3, 4, 5, 6]))
            self.river_x_start = int(self.rng.randint(12, 18))
            for rx in range(self.river_x_start, self.river_x_start + self.river_width):
                for z in range(1, self.grid_size - 1):
                    self.grid[rx, 0, z] = self.BLOCK_WATER
                    self.hazards.append(np.array([rx + 0.5, 0.0, z + 0.5], dtype=np.float32))

            # If not Builder scenario, place a natural bridge crossing at random Z
            if self.character_role != self.ROLE_BUILDER:
                bridge_z = int(self.rng.randint(6, self.grid_size - 6))
                for rx in range(self.river_x_start, self.river_x_start + self.river_width):
                    self.grid[rx, 0, bridge_z] = self.BLOCK_STONE

        # 3. Procedural Forest & Resources
        forest_center_x, forest_center_z = int(self.rng.randint(5, 10)), int(self.rng.randint(15, 25))
        for ox in range(forest_center_x - 2, forest_center_x + 3):
            for oz in range(forest_center_z - 2, forest_center_z + 3):
                if 0 < ox < self.grid_size - 1 and 0 < oz < self.grid_size - 1:
                    if self.rng.rand() > 0.6:
                        self.grid[ox, 1, oz] = self.BLOCK_OAK_WOOD
                        self.resources.append({"pos": np.array([ox + 0.5, 0.0, oz + 0.5], dtype=np.float32), "type": self.BLOCK_OAK_WOOD, "collected": False})

        # Hill / Mountain
        hill_x, hill_z = int(self.rng.randint(22, 28)), int(self.rng.randint(8, 16))
        for hx in range(hill_x - 2, hill_x + 2):
            for hz in range(hill_z - 2, hill_z + 2):
                if 0 < hx < self.grid_size - 1 and 0 < hz < self.grid_size - 1:
                    self.grid[hx, 1, hz] = self.BLOCK_STONE
                    self.grid[hx, 2, hz] = self.BLOCK_STONE

        # Diamond Objective across the river
        target_x = float(self.rng.randint(24, 30))
        target_z = float(self.rng.randint(20, 28))
        self.target_pos = np.array([target_x, 0.0, target_z], dtype=np.float32)
        self.resources.append({"pos": self.target_pos.copy(), "type": self.BLOCK_DIAMOND, "collected": False})

        # 4. Spawns & Threat Entity
        if self.character_role == self.ROLE_BUILDER:
            self.agent_pos = np.array([self.river_x_start - 1.5, 0.0, 16.5], dtype=np.float32)
            self.target_pos = np.array([self.river_x_start + self.river_width + 1.5, 0.0, 16.5], dtype=np.float32)
        elif self.character_role == self.ROLE_GUARDIAN:
            self.agent_pos = np.array([5.0, 0.0, 5.0], dtype=np.float32)
            self.threat_active = True
            self.threat_pos = np.array([float(self.rng.randint(18, 26)), 0.0, float(self.rng.randint(18, 26))], dtype=np.float32)
        else:
            self.agent_pos = np.array([4.0, 0.0, 4.0], dtype=np.float32)
            self.threat_active = (self.curriculum_level >= 5)
            self.threat_pos = np.array([22.0, 0.0, 22.0], dtype=np.float32)

        self.agent_prev_pos = self.agent_pos.copy()
        self.agent_yaw = float(self.rng.uniform(0, 2 * math.pi))
        if self.character_role == self.ROLE_GUARDIAN:
            self.prev_target_dist = float(np.linalg.norm(self.threat_pos[[0, 2]] - self.agent_pos[[0, 2]]))
        else:
            self.prev_target_dist = float(np.linalg.norm(self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]))
        self.prev_base_dist = float(np.linalg.norm(self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]]))

        obs = self._get_observation()
        info = {
            "character_role": self.character_role,
            "agent_pos": self.agent_pos.tolist(),
            "target_pos": self.target_pos.tolist(),
            "health": self.health,
            "stamina": self.stamina,
        }
        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        self.step_count += 1
        reward = -0.01
        terminated = False
        truncated = self.step_count >= self.max_steps
        collision = False
        hazard_hit = False
        threat_defeated = False

        self.agent_prev_pos = self.agent_pos.copy()

        walk_speed = 0.45
        sprint_speed = 0.80
        turn_speed = 0.35

        self.is_sneaking = (action == self.ACTION_SNEAK)
        self.is_sprinting = (action == self.ACTION_SPRINT_FORWARD)

        if self.is_sprinting:
            self.stamina = max(0.05, self.stamina - 0.015)
        elif action == self.ACTION_JUMP:
            self.stamina = max(0.05, self.stamina - 0.01)
        else:
            self.stamina = min(1.0, self.stamina + 0.002)

        # 1. Action Traversal Execution
        if action == self.ACTION_MOVE_FORWARD:
            eff_speed = walk_speed * (0.6 + 0.4 * self.stamina)
            dx = math.sin(self.agent_yaw) * eff_speed
            dz = math.cos(self.agent_yaw) * eff_speed
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos): self.agent_pos = new_pos
            else: collision = True; reward -= 0.05

        elif action == self.ACTION_SPRINT_FORWARD:
            eff_speed = sprint_speed * (0.7 + 0.3 * self.stamina)
            dx = math.sin(self.agent_yaw) * eff_speed
            dz = math.cos(self.agent_yaw) * eff_speed
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos): self.agent_pos = new_pos; reward += 0.02
            else: collision = True; reward -= 0.12

        elif action == self.ACTION_MOVE_BACKWARD:
            dx = -math.sin(self.agent_yaw) * (walk_speed * 0.5)
            dz = -math.cos(self.agent_yaw) * (walk_speed * 0.5)
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos): self.agent_pos = new_pos
            else: collision = True; reward -= 0.05

        elif action == self.ACTION_MOVE_LEFT:
            self.agent_yaw = (self.agent_yaw - turn_speed) % (2 * math.pi)

        elif action == self.ACTION_MOVE_RIGHT:
            self.agent_yaw = (self.agent_yaw + turn_speed) % (2 * math.pi)

        elif action == self.ACTION_JUMP:
            dx = math.sin(self.agent_yaw) * (walk_speed * 1.2)
            dz = math.cos(self.agent_yaw) * (walk_speed * 1.2)
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            new_pos[1] = min(2.0, new_pos[1] + 1.0)
            if self._is_traversable(new_pos, allow_climb=True): self.agent_pos = new_pos; reward += 0.1
            else: self.agent_pos[1] = max(0.0, self.agent_pos[1] - 0.5)

        elif action == self.ACTION_SNEAK:
            # Edge Protection clamp & collision check
            dx = math.sin(self.agent_yaw) * (walk_speed * 0.35)
            dz = math.cos(self.agent_yaw) * (walk_speed * 0.35)
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            gx, gz = int(new_pos[0]), int(new_pos[2])
            if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size:
                if self._is_traversable(new_pos):
                    if self.grid[gx, 0, gz] != self.BLOCK_WATER and self.grid[gx, 0, gz] != self.BLOCK_LAVA:
                        self.agent_pos = new_pos
                        reward += 0.05
                else:
                    collision = True
                    reward -= 0.05

        elif action == self.ACTION_INTERACT_MINE:
            for r in self.resources:
                if not r["collected"]:
                    dist_to_r = np.linalg.norm(r["pos"] - self.agent_pos)
                    if dist_to_r < 2.0:
                        r["collected"] = True
                        if r["type"] == self.BLOCK_OAK_WOOD: self.inventory_wood += 1; reward += 8.0
                        elif r["type"] == self.BLOCK_DIAMOND: self.inventory_diamond += 1; reward += 25.0

        elif action == self.ACTION_PLACE_BLOCK:
            if self.inventory_placeable_blocks > 0:
                self.inventory_placeable_blocks -= 1
                self.blocks_placed_count += 1
                bx = int(self.agent_pos[0] + math.sin(self.agent_yaw) * 1.2)
                bz = int(self.agent_pos[2] + math.cos(self.agent_yaw) * 1.2)
                if 0 <= bx < self.grid_size and 0 <= bz < self.grid_size:
                    if self.grid[bx, 0, bz] == self.BLOCK_WATER:
                        self.grid[bx, 0, bz] = self.BLOCK_COBBLE_PLACED
                        reward += 12.0 # High reward for bridging over water!
                    elif self.grid[bx, 1, bz] == self.BLOCK_AIR:
                        self.grid[bx, 1, bz] = self.BLOCK_COBBLE_PLACED
                        reward += 3.0

        elif action == self.ACTION_CRAFT_EAT_DEPOSIT:
            dist_to_base = np.linalg.norm(self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]])
            if dist_to_base < 2.0 and (self.inventory_wood > 0 or self.inventory_diamond > 0):
                total_del = self.inventory_wood + self.inventory_diamond
                self.total_delivered += total_del
                reward += 20.0 + total_del * 15.0
                self.inventory_wood = 0
                self.inventory_diamond = 0
                terminated = True

        # 2. Proximity Arrival
        dist_to_target = float(np.linalg.norm(self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]))
        if dist_to_target < 1.4:
            terminated = True
            reward += 35.0
            self.inventory_diamond += 1

        # 3. Threat / Guardian Proximity & Combat
        if self.threat_active:
            to_base = self.base_hub_pos[[0, 2]] - self.threat_pos[[0, 2]]
            dist_to_base = float(np.linalg.norm(to_base))
            if dist_to_base > 0.1:
                step_vec = (to_base / dist_to_base) * 0.22  # Creeper advances on Base
                self.threat_pos[0] += step_vec[0]
                self.threat_pos[2] += step_vec[1]

            dist_guardian_threat = float(np.linalg.norm(self.threat_pos[[0, 2]] - self.agent_pos[[0, 2]]))
            if self.character_role == self.ROLE_GUARDIAN:
                if dist_guardian_threat < 2.0:
                    threat_defeated = True
                    terminated = True
                    reward += 40.0 # High reward for intercepting threat before base breach
                elif dist_to_base < 2.0:
                    terminated = True
                    reward -= 30.0 # Threat breached base
            else:
                if dist_guardian_threat < 1.5:
                    self.health -= 0.5
                    reward -= 15.0
                    if self.health <= 0:
                        terminated = True
                        reward -= 20.0

        # 4. Water / Lava Hazard Check
        gx, gz = int(self.agent_pos[0]), int(self.agent_pos[2])
        if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size:
            if self.grid[gx, 0, gz] in [self.BLOCK_WATER, self.BLOCK_LAVA]:
                hazard_hit = True
                reward -= 25.0
                terminated = True

        # 5. Potential Delta Shaping
        if self.character_role == self.ROLE_GUARDIAN:
            curr_dist = float(np.linalg.norm(self.threat_pos[[0, 2]] - self.agent_pos[[0, 2]]))
            delta = self.prev_target_dist - curr_dist
            reward += delta * 3.5
            self.prev_target_dist = curr_dist
        else:
            delta = self.prev_target_dist - dist_to_target
            reward += delta * 3.2
            self.prev_target_dist = dist_to_target

        obs = self._get_observation()
        is_success = (terminated and not hazard_hit and (threat_defeated or self.inventory_diamond > 0 or self.total_delivered > 0 or dist_to_target < 1.4))

        info = {
            "step": self.step_count,
            "agent_pos": self.agent_pos.tolist(),
            "target_pos": self.target_pos.tolist(),
            "health": self.health,
            "stamina": self.stamina,
            "inventory_wood": self.inventory_wood,
            "inventory_diamond": self.inventory_diamond,
            "blocks_placed": self.blocks_placed_count,
            "total_delivered": self.total_delivered,
            "collision": collision,
            "hazard_hit": hazard_hit,
            "threat_defeated": threat_defeated,
            "success": is_success,
        }
        return obs, reward, terminated, truncated, info

    def _is_traversable(self, pos: np.ndarray, allow_climb: bool = False) -> bool:
        gx, gz = int(pos[0]), int(pos[2])
        if gx < 0 or gx >= self.grid_size or gz < 0 or gz >= self.grid_size:
            return False
        if self.grid[gx, 1, gz] == self.BLOCK_BEDROCK:
            return False
        if self.grid[gx, 1, gz] in [self.BLOCK_STONE, self.BLOCK_COBBLE_PLACED]:
            return allow_climb
        return True

    def _get_observation(self) -> np.ndarray:
        obs = np.zeros(self.observation_dim, dtype=np.float32)
        ray_angles = [0.0, 0.785, 1.571, 2.356, 3.1415, 3.927, 4.712, 5.498]
        max_ray_dist = 10.0

        for i, angle_offset in enumerate(ray_angles):
            ray_yaw = (self.agent_yaw + angle_offset) % (2 * math.pi)
            rdx = math.sin(ray_yaw)
            rdz = math.cos(ray_yaw)
            dist_hit = max_ray_dist
            target_hit = 0.0

            for step_d in np.linspace(0.2, max_ray_dist, 20):
                tx = self.agent_pos[0] + rdx * step_d
                tz = self.agent_pos[2] + rdz * step_d
                gx, gz = int(tx), int(tz)
                if gx < 0 or gx >= self.grid_size or gz < 0 or gz >= self.grid_size or self.grid[gx, 1, gz] != self.BLOCK_AIR:
                    dist_hit = step_d
                    break
                if np.linalg.norm(np.array([tx, tz]) - self.target_pos[[0, 2]]) < 1.0:
                    target_hit = 1.0

            obs[i] = dist_hit / max_ray_dist
            obs[8 + i] = target_hit

        # Water/Lava Proximity
        cardinal_angles = [0.0, 1.571, 3.1415, 4.712]
        for j, angle in enumerate(cardinal_angles):
            ray_yaw = (self.agent_yaw + angle) % (2 * math.pi)
            hx = self.agent_pos[0] + math.sin(ray_yaw) * 2.0
            hz = self.agent_pos[2] + math.cos(ray_yaw) * 2.0
            gx, gz = int(hx), int(hz)
            if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size and self.grid[gx, 0, gz] in [self.BLOCK_WATER, self.BLOCK_LAVA]:
                obs[16 + j] = 1.0

        # Threat Proximity
        if self.threat_active:
            to_threat = self.threat_pos[[0, 2]] - self.agent_pos[[0, 2]]
            dist_t = np.linalg.norm(to_threat)
            if dist_t < 12.0:
                t_angle = math.atan2(to_threat[0], to_threat[1])
                diff = (t_angle - self.agent_yaw + math.pi) % (2 * math.pi) - math.pi
                if -math.pi / 4 <= diff < math.pi / 4: obs[20] = 1.0 - (dist_t / 12.0)
                elif math.pi / 4 <= diff < 3 * math.pi / 4: obs[21] = 1.0 - (dist_t / 12.0)
                elif -3 * math.pi / 4 <= diff < -math.pi / 4: obs[23] = 1.0 - (dist_t / 12.0)
                else: obs[22] = 1.0 - (dist_t / 12.0)

        norm_scale = float(self.grid_size * 1.414)
        active_target = self.threat_pos if self.character_role == self.ROLE_GUARDIAN else self.target_pos
        rel_target = active_target[[0, 2]] - self.agent_pos[[0, 2]]
        dist_target = float(np.linalg.norm(rel_target))
        obs[24] = np.clip(rel_target[0] / norm_scale, -1.0, 1.0)
        obs[25] = np.clip(rel_target[1] / norm_scale, -1.0, 1.0)
        obs[26] = np.clip(dist_target / norm_scale, 0.0, 1.0)

        target_angle = math.atan2(rel_target[0], rel_target[1])
        angle_diff = (target_angle - self.agent_yaw + math.pi) % (2 * math.pi) - math.pi
        obs[27] = angle_diff / math.pi

        rel_base = self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]]
        obs[28] = np.clip(rel_base[0] / norm_scale, -1.0, 1.0)
        obs[29] = np.clip(rel_base[1] / norm_scale, -1.0, 1.0)

        obs[30] = math.sin(self.agent_yaw)
        obs[31] = math.cos(self.agent_yaw)

        obs[32] = min(1.0, self.inventory_wood / 4.0)
        obs[33] = min(1.0, self.inventory_stone / 8.0)
        obs[34] = min(1.0, self.inventory_iron / 4.0)
        obs[35] = min(1.0, self.inventory_diamond / 2.0)
        obs[36] = min(1.0, self.inventory_placeable_blocks / 16.0)

        vel = self.agent_pos[[0, 2]] - self.agent_prev_pos[[0, 2]]
        obs[37] = np.clip(vel[0] * 2.0, -1.0, 1.0)
        obs[38] = np.clip(vel[1] * 2.0, -1.0, 1.0)

        obs[39] = self.health
        obs[40] = self.stamina
        obs[41] = float(self.character_role) / 3.0 # Character DNA Role Embedding

        return obs
