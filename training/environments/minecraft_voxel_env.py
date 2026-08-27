"""
MINDCRAFT — Complete Minecraft Physics & Challenge Environment (v6)
Features:
  1. Full Minecraft Movement: Walking, Sprinting, Sneaking (Edge-Protection), Parkour Jumping,
     Block Mining (Harvest), Block Placing (Bridging & Pillar-Jumping), and Crafting/Eating.
  2. Day/Night Cycle with Hostile Threat (Creeper) Tracking and Proximity AI.
  3. Health (10 Hearts), Hunger/Stamina, and Multi-Tier Inventory (Wood, Stone, Iron, Diamond, Cobble).
  4. 42-dimensional Observation Space and 10 Discrete Actions.
  5. 5 Distinct Challenge Modes: Parkour Chasm, Lava Bridging, Night Survival, Speedrun Economy, Pillar Mountain.
"""

import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Dict, Any, Tuple, Optional, List


class MinecraftVoxelEnvironment(gym.Env):
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

    # Actions (10-action space)
    ACTION_FORWARD_WALK = 0
    ACTION_SPRINT_FORWARD = 1
    ACTION_BACKWARD = 2
    ACTION_TURN_LEFT = 3
    ACTION_TURN_RIGHT = 4
    ACTION_JUMP_PARKOUR = 5
    ACTION_SNEAK_CROUCH = 6
    ACTION_MINE_BLOCK = 7
    ACTION_PLACE_BLOCK = 8
    ACTION_CRAFT_EAT_DEPOSIT = 9

    ACTION_NAMES = [
        "Walk Forward", "Sprint Forward", "Backward", "Turn Left", "Turn Right",
        "Jump / Parkour", "Sneak (Safe Edge)", "Mine / Break Block", "Place / Bridge Block", "Craft / Eat / Deposit"
    ]

    # Challenge Modes
    MODE_PARKOUR = 0
    MODE_LAVA_BRIDGING = 1
    MODE_NIGHT_SURVIVAL = 2
    MODE_SPEEDRUN_ECONOMY = 3
    MODE_PILLAR_MOUNTAIN = 4

    def __init__(
        self,
        grid_size: int = 16,
        challenge_mode: int = MODE_SPEEDRUN_ECONOMY,
        max_steps: int = 240
    ):
        super().__init__()
        self.grid_size = grid_size
        self.challenge_mode = challenge_mode
        self.max_steps = max_steps

        self.action_space = spaces.Discrete(10)
        self.observation_dim = 42
        self.observation_space = spaces.Box(
            low=-1.0, high=1.0, shape=(self.observation_dim,), dtype=np.float32
        )

        # 3D Grid State: [X, Y, Z] (Y: 0=floor/lava/water, 1=obstacles/ores, 2=high peaks)
        self.grid = np.zeros((self.grid_size, 3, self.grid_size), dtype=np.int32)

        # Agent State
        self.agent_pos = np.array([2.5, 0.0, 2.5], dtype=np.float32)
        self.agent_prev_pos = np.array([2.5, 0.0, 2.5], dtype=np.float32)
        self.agent_yaw = 0.0
        self.health = 1.0          # 1.0 = 10 hearts
        self.hunger_stamina = 1.0  # 1.0 = 10 drumsticks
        self.is_sneaking = False
        self.is_sprinting = False

        # Inventory
        self.inventory_wood = 0
        self.inventory_stone = 0
        self.inventory_iron = 0
        self.inventory_diamond = 0
        self.inventory_placeable_blocks = 5
        self.total_delivered = 0
        self.blocks_placed_count = 0
        self.has_pickaxe = False

        # Hostile Entities (Creeper AI)
        self.creeper_pos = np.array([-10.0, 0.0, -10.0], dtype=np.float32)
        self.creeper_active = False

        # Day/Night Cycle (0.0 = Noon, 0.5 = Midnight, 1.0 = Next Noon)
        self.day_night_phase = 0.0

        # Objectives & Base Hub
        self.base_hub_pos = np.array([2.5, 0.0, 2.5], dtype=np.float32)
        self.target_pos = np.array([8.0, 0.0, 8.0], dtype=np.float32)
        self.resources = []
        self.hazards = []

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

        if options and "challenge_mode" in options:
            self.challenge_mode = options["challenge_mode"]

        self.step_count = 0
        self.health = 1.0
        self.hunger_stamina = 1.0
        self.is_sneaking = False
        self.is_sprinting = False
        self.inventory_wood = 0
        self.inventory_stone = 0
        self.inventory_iron = 0
        self.inventory_diamond = 0
        self.inventory_placeable_blocks = 8 if self.challenge_mode in [self.MODE_LAVA_BRIDGING, self.MODE_PILLAR_MOUNTAIN] else 4
        self.total_delivered = 0
        self.blocks_placed_count = 0
        self.has_pickaxe = False
        self.day_night_phase = 0.5 if self.challenge_mode == self.MODE_NIGHT_SURVIVAL else 0.1

        self.grid.fill(self.BLOCK_AIR)
        self.hazards = []
        self.resources = []

        # 1. Base Grid Setup (Bedrock Perimeter & Ground)
        for x in range(self.grid_size):
            for z in range(self.grid_size):
                if x == 0 or x == self.grid_size - 1 or z == 0 or z == self.grid_size - 1:
                    self.grid[x, 0, z] = self.BLOCK_BEDROCK
                    self.grid[x, 1, z] = self.BLOCK_BEDROCK
                else:
                    self.grid[x, 0, z] = self.BLOCK_GRASS

        # Base Hub at corner
        self.base_hub_pos = np.array([2.5, 0.0, 2.5], dtype=np.float32)
        self.grid[2, 0, 2] = self.BLOCK_BASE_HUB

        # 2. Configure Specific Minecraft Challenge Layouts
        if self.challenge_mode == self.MODE_PARKOUR:
            chasm_z = self.grid_size // 2
            for x in range(1, self.grid_size - 1):
                self.grid[x, 0, chasm_z] = self.BLOCK_LAVA
                self.grid[x, 0, chasm_z + 1] = self.BLOCK_LAVA
                self.hazards.append(np.array([x + 0.5, 0.0, chasm_z + 0.5], dtype=np.float32))
                self.hazards.append(np.array([x + 0.5, 0.0, chasm_z + 1.5], dtype=np.float32))
            mid_x = self.grid_size // 2
            self.grid[mid_x, 0, chasm_z] = self.BLOCK_STONE
            self.grid[mid_x, 1, chasm_z] = self.BLOCK_AIR
            self.agent_pos = np.array([mid_x + 0.5, 0.0, 2.5], dtype=np.float32)
            self.target_pos = np.array([mid_x + 0.5, 0.0, self.grid_size - 3.5], dtype=np.float32)
            self.resources.append({"pos": self.target_pos.copy(), "type": self.BLOCK_DIAMOND, "collected": False})

        elif self.challenge_mode == self.MODE_LAVA_BRIDGING:
            lake_start_x = self.grid_size // 3
            lake_end_x = lake_start_x + 4
            for x in range(lake_start_x, lake_end_x):
                for z in range(3, self.grid_size - 3):
                    self.grid[x, 0, z] = self.BLOCK_LAVA
                    self.hazards.append(np.array([x + 0.5, 0.0, z + 0.5], dtype=np.float32))
            self.agent_pos = np.array([lake_start_x - 1.5, 0.0, self.grid_size // 2 + 0.5], dtype=np.float32)
            self.target_pos = np.array([lake_end_x + 1.5, 0.0, self.grid_size // 2 + 0.5], dtype=np.float32)
            self.resources.append({"pos": self.target_pos.copy(), "type": self.BLOCK_DIAMOND, "collected": False})

        elif self.challenge_mode == self.MODE_NIGHT_SURVIVAL:
            self.creeper_active = True
            self.creeper_pos = np.array([self.grid_size - 3.5, 0.0, self.grid_size - 3.5], dtype=np.float32)
            self.agent_pos = np.array([3.5, 0.0, 3.5], dtype=np.float32)
            self.target_pos = np.array([self.grid_size // 2 + 0.5, 0.0, self.grid_size // 2 + 0.5], dtype=np.float32)
            self.resources.append({"pos": self.target_pos.copy(), "type": self.BLOCK_DIAMOND, "collected": False})

        elif self.challenge_mode == self.MODE_PILLAR_MOUNTAIN:
            px, pz = self.grid_size // 2, self.grid_size // 2
            self.grid[px, 1, pz] = self.BLOCK_STONE
            self.grid[px, 2, pz] = self.BLOCK_STONE
            self.agent_pos = np.array([px - 3.5, 0.0, pz + 0.5], dtype=np.float32)
            self.target_pos = np.array([px + 0.5, 2.0, pz + 0.5], dtype=np.float32)
            self.resources.append({"pos": self.target_pos.copy(), "type": self.BLOCK_DIAMOND, "collected": False})

        else: # MODE_SPEEDRUN_ECONOMY
            self.agent_pos = np.array([2.5, 0.0, 2.5], dtype=np.float32)
            self.resources.append({"pos": np.array([5.5, 0.0, 6.5], dtype=np.float32), "type": self.BLOCK_OAK_WOOD, "collected": False})
            self.resources.append({"pos": np.array([9.5, 0.0, 8.5], dtype=np.float32), "type": self.BLOCK_IRON_ORE, "collected": False})
            self.resources.append({"pos": np.array([12.5, 0.0, 12.5], dtype=np.float32), "type": self.BLOCK_DIAMOND, "collected": False})
            self.target_pos = self.resources[0]["pos"].copy()
            for ox, oz in [(7, 7), (10, 5), (6, 11)]:
                self.grid[ox, 1, oz] = self.BLOCK_STONE
            for lx, lz in [(8, 8), (11, 10)]:
                self.grid[lx, 0, lz] = self.BLOCK_LAVA
                self.hazards.append(np.array([lx + 0.5, 0.0, lz + 0.5], dtype=np.float32))

        self.agent_prev_pos = self.agent_pos.copy()
        self.agent_yaw = self.rng.uniform(0, 2 * math.pi)
        self.prev_target_dist = float(np.linalg.norm(self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]))
        self.prev_base_dist = float(np.linalg.norm(self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]]))

        obs = self._get_observation()
        info = {
            "challenge_mode": self.challenge_mode,
            "agent_pos": self.agent_pos.tolist(),
            "target_pos": self.target_pos.tolist(),
            "health": self.health,
            "hunger_stamina": self.hunger_stamina,
        }
        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        self.step_count += 1
        reward = -0.01
        terminated = False
        truncated = self.step_count >= self.max_steps
        collision = False
        fell_in_lava = False
        mob_defeated = False

        self.agent_prev_pos = self.agent_pos.copy()
        self.day_night_phase = (self.day_night_phase + 0.003) % 1.0

        walk_speed = 0.40
        sprint_speed = 0.72
        turn_speed = 0.35

        self.is_sneaking = (action == self.ACTION_SNEAK_CROUCH)
        self.is_sprinting = (action == self.ACTION_SPRINT_FORWARD)

        if self.is_sprinting:
            self.hunger_stamina = max(0.05, self.hunger_stamina - 0.015)
        elif action == self.ACTION_JUMP_PARKOUR:
            self.hunger_stamina = max(0.05, self.hunger_stamina - 0.01)
        else:
            self.hunger_stamina = min(1.0, self.hunger_stamina + 0.002)

        # Movement Actions
        if action == self.ACTION_FORWARD_WALK:
            eff_speed = walk_speed * (0.6 + 0.4 * self.hunger_stamina)
            dx = math.sin(self.agent_yaw) * eff_speed
            dz = math.cos(self.agent_yaw) * eff_speed
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos):
                self.agent_pos = new_pos
            else:
                collision = True
                reward -= 0.08

        elif action == self.ACTION_SPRINT_FORWARD:
            eff_speed = sprint_speed * (0.7 + 0.3 * self.hunger_stamina)
            dx = math.sin(self.agent_yaw) * eff_speed
            dz = math.cos(self.agent_yaw) * eff_speed
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos):
                self.agent_pos = new_pos
                reward += 0.02
            else:
                collision = True
                reward -= 0.15

        elif action == self.ACTION_BACKWARD:
            eff_speed = walk_speed * 0.6
            dx = -math.sin(self.agent_yaw) * eff_speed
            dz = -math.cos(self.agent_yaw) * eff_speed
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            if self._is_traversable(new_pos):
                self.agent_pos = new_pos
            else:
                collision = True
                reward -= 0.08

        elif action == self.ACTION_TURN_LEFT:
            self.agent_yaw = (self.agent_yaw - turn_speed) % (2 * math.pi)

        elif action == self.ACTION_TURN_RIGHT:
            self.agent_yaw = (self.agent_yaw + turn_speed) % (2 * math.pi)

        elif action == self.ACTION_JUMP_PARKOUR:
            dx = math.sin(self.agent_yaw) * (walk_speed * 1.1)
            dz = math.cos(self.agent_yaw) * (walk_speed * 1.1)
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            new_pos[1] = min(2.0, new_pos[1] + 1.0)
            if self._is_traversable(new_pos, allow_climb=True):
                self.agent_pos = new_pos
                reward += 0.12
            else:
                self.agent_pos[1] = max(0.0, self.agent_pos[1] - 0.5)

        elif action == self.ACTION_SNEAK_CROUCH:
            dx = math.sin(self.agent_yaw) * (walk_speed * 0.4)
            dz = math.cos(self.agent_yaw) * (walk_speed * 0.4)
            new_pos = self.agent_pos.copy()
            new_pos[0] += dx
            new_pos[2] += dz
            gx, gz = int(new_pos[0]), int(new_pos[2])
            if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size:
                if self.grid[gx, 0, gz] != self.BLOCK_LAVA and self.grid[gx, 1, gz] == self.BLOCK_AIR:
                    self.agent_pos = new_pos
                    reward += 0.05

        elif action == self.ACTION_MINE_BLOCK:
            for r in self.resources:
                if not r["collected"]:
                    dist_to_r = np.linalg.norm(r["pos"] - self.agent_pos)
                    if dist_to_r < 1.8:
                        r["collected"] = True
                        if r["type"] == self.BLOCK_OAK_WOOD: self.inventory_wood += 1; reward += 7.0
                        elif r["type"] == self.BLOCK_IRON_ORE: self.inventory_iron += 1; reward += 11.0
                        elif r["type"] == self.BLOCK_DIAMOND: self.inventory_diamond += 1; reward += 18.0

        elif action == self.ACTION_PLACE_BLOCK:
            if self.inventory_placeable_blocks > 0:
                self.inventory_placeable_blocks -= 1
                self.blocks_placed_count += 1
                bx = int(self.agent_pos[0] + math.sin(self.agent_yaw) * 1.0)
                bz = int(self.agent_pos[2] + math.cos(self.agent_yaw) * 1.0)
                if 0 <= bx < self.grid_size and 0 <= bz < self.grid_size:
                    if self.grid[bx, 0, bz] == self.BLOCK_LAVA:
                        self.grid[bx, 0, bz] = self.BLOCK_COBBLE_PLACED
                        reward += 8.0
                    elif self.grid[bx, 1, bz] == self.BLOCK_AIR:
                        self.grid[bx, 1, bz] = self.BLOCK_COBBLE_PLACED
                        reward += 2.0

        elif action == self.ACTION_CRAFT_EAT_DEPOSIT:
            dist_to_base = np.linalg.norm(self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]])
            total_items = self.inventory_wood + self.inventory_iron + self.inventory_diamond
            if dist_to_base < 1.8 and total_items > 0:
                self.total_delivered += total_items
                reward += 15.0 + total_items * 10.0
                self.inventory_wood = 0
                self.inventory_iron = 0
                self.inventory_diamond = 0
                terminated = True
                reward += 30.0
            elif self.inventory_wood >= 1 and not self.has_pickaxe:
                self.has_pickaxe = True
                self.inventory_wood -= 1
                reward += 6.0
            elif self.health < 1.0:
                self.health = min(1.0, self.health + 0.3)
                reward += 3.0

        # Proximity Auto-Harvest / Arrival for any nearby resource
        for r in self.resources:
            if not r["collected"]:
                dist_to_r = np.linalg.norm(r["pos"] - self.agent_pos)
                if dist_to_r < 1.2:
                    r["collected"] = True
                    if r["type"] == self.BLOCK_OAK_WOOD: self.inventory_wood += 1; reward += 7.0
                    elif r["type"] == self.BLOCK_IRON_ORE: self.inventory_iron += 1; reward += 11.0
                    elif r["type"] == self.BLOCK_DIAMOND: self.inventory_diamond += 1; reward += 18.0

        # Retargeting & Termination check
        uncollected = [res for res in self.resources if not res["collected"]]
        if uncollected:
            self.target_pos = uncollected[0]["pos"].copy()
            self.prev_target_dist = float(np.linalg.norm(self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]))
        elif self.challenge_mode != self.MODE_SPEEDRUN_ECONOMY:
            terminated = True
            reward += 25.0

        # Creeper AI
        if self.creeper_active:
            to_agent = self.agent_pos[[0, 2]] - self.creeper_pos[[0, 2]]
            dist_c = float(np.linalg.norm(to_agent))
            if dist_c > 0.1:
                step_c = (to_agent / dist_c) * 0.28
                self.creeper_pos[0] += step_c[0]
                self.creeper_pos[2] += step_c[1]
            if dist_c < 1.3:
                self.health -= 0.5
                reward -= 10.0
                if self.health <= 0.0:
                    mob_defeated = True
                    terminated = True
                    reward -= 20.0

        # Lava Hazard Check
        gx, gz = int(self.agent_pos[0]), int(self.agent_pos[2])
        if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size:
            if self.grid[gx, 0, gz] == self.BLOCK_LAVA:
                fell_in_lava = True
                reward -= 25.0
                terminated = True

        for h in self.hazards:
            dist_h = np.linalg.norm(h[[0, 2]] - self.agent_pos[[0, 2]])
            if dist_h < 1.8:
                reward -= (1.8 - dist_h) * 1.2

        # Potential Delta Shaping
        total_items = self.inventory_wood + self.inventory_iron + self.inventory_diamond
        if self.challenge_mode == self.MODE_SPEEDRUN_ECONOMY and total_items >= 2:
            curr_base_dist = float(np.linalg.norm(self.base_hub_pos[[0, 2]] - self.agent_pos[[0, 2]]))
            base_delta = self.prev_base_dist - curr_base_dist
            reward += base_delta * 3.5
            self.prev_base_dist = curr_base_dist
        else:
            curr_target_dist = float(np.linalg.norm(self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]))
            target_delta = self.prev_target_dist - curr_target_dist
            reward += target_delta * 3.2
            self.prev_target_dist = curr_target_dist

        obs = self._get_observation()
        is_success = (terminated and not fell_in_lava and not mob_defeated and (self.total_delivered > 0 or (self.inventory_wood + self.inventory_iron + self.inventory_diamond > 0)))

        info = {
            "step": self.step_count,
            "agent_pos": self.agent_pos.tolist(),
            "target_pos": self.target_pos.tolist(),
            "health": self.health,
            "hunger_stamina": self.hunger_stamina,
            "inventory_wood": self.inventory_wood,
            "inventory_iron": self.inventory_iron,
            "inventory_diamond": self.inventory_diamond,
            "blocks_placed": self.blocks_placed_count,
            "total_delivered": self.total_delivered,
            "collision": collision,
            "fell_in_lava": fell_in_lava,
            "mob_defeated": mob_defeated,
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
        max_ray_dist = 7.0

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
                if gx < 0 or gx >= self.grid_size or gz < 0 or gz >= self.grid_size or self.grid[gx, 1, gz] not in [self.BLOCK_AIR, self.BLOCK_WATER]:
                    dist_hit = step_d
                    break
                if np.linalg.norm(np.array([tx, tz]) - self.target_pos[[0, 2]]) < 0.65:
                    target_hit = 1.0

            obs[i] = dist_hit / max_ray_dist
            obs[8 + i] = target_hit

        cardinal_angles = [0.0, 1.571, 3.1415, 4.712]
        for j, angle in enumerate(cardinal_angles):
            ray_yaw = (self.agent_yaw + angle) % (2 * math.pi)
            hx = self.agent_pos[0] + math.sin(ray_yaw) * 1.5
            hz = self.agent_pos[2] + math.cos(ray_yaw) * 1.5
            gx, gz = int(hx), int(hz)
            if 0 <= gx < self.grid_size and 0 <= gz < self.grid_size and self.grid[gx, 0, gz] == self.BLOCK_LAVA:
                obs[16 + j] = 1.0

        if self.creeper_active:
            to_creeper = self.creeper_pos[[0, 2]] - self.agent_pos[[0, 2]]
            dist_c = np.linalg.norm(to_creeper)
            if dist_c < 6.0:
                c_angle = math.atan2(to_creeper[0], to_creeper[1])
                diff = (c_angle - self.agent_yaw + math.pi) % (2 * math.pi) - math.pi
                if -math.pi / 4 <= diff < math.pi / 4: obs[20] = 1.0 - (dist_c / 6.0)
                elif math.pi / 4 <= diff < 3 * math.pi / 4: obs[21] = 1.0 - (dist_c / 6.0)
                elif -3 * math.pi / 4 <= diff < -math.pi / 4: obs[23] = 1.0 - (dist_c / 6.0)
                else: obs[22] = 1.0 - (dist_c / 6.0)

        norm_scale = float(self.grid_size * 1.414)
        rel_target = self.target_pos[[0, 2]] - self.agent_pos[[0, 2]]
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

        obs[32] = min(1.0, self.inventory_wood / 3.0)
        obs[33] = min(1.0, self.inventory_stone / 3.0)
        obs[34] = min(1.0, self.inventory_iron / 3.0)
        obs[35] = min(1.0, self.inventory_diamond / 3.0)

        obs[36] = min(1.0, self.inventory_placeable_blocks / 8.0)

        vel = self.agent_pos[[0, 2]] - self.agent_prev_pos[[0, 2]]
        obs[37] = np.clip(vel[0] * 2.0, -1.0, 1.0)
        obs[38] = np.clip(vel[1] * 2.0, -1.0, 1.0)

        obs[39] = self.health
        obs[40] = self.hunger_stamina
        obs[41] = self.day_night_phase

        return obs
