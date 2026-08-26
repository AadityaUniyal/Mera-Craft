using System;
using System.Collections.Generic;
using UnityEngine;

namespace Mindcraft.Environment
{
    /// <summary>
    /// Deterministic procedural voxel world generator for Unity ML-Agents & WebGL.
    /// Replicates identical map topologies given identical integer seeds.
    /// </summary>
    public class VoxelWorldGenerator : MonoBehaviour
    {
        public enum BlockType
        {
            Air = 0,
            Dirt = 1,
            Stone = 2,
            OakWood = 3,
            IronOre = 4,
            Diamond = 5,
            Bedrock = 6
        }

        [Header("World Configuration")]
        [SerializeField] private int gridSize = 12;
        [SerializeField] private int currentSeed = 42;
        [SerializeField] private int curriculumLevel = 0;

        [Header("Prefabs & Materials")]
        [SerializeField] private GameObject dirtBlockPrefab;
        [SerializeField] private GameObject stoneBlockPrefab;
        [SerializeField] private GameObject woodBlockPrefab;
        [SerializeField] private GameObject bedrockBlockPrefab;

        private BlockType[,] worldGrid;
        private System.Random rng;
        private List<GameObject> spawnedBlocks = new List<GameObject>();

        public int GridSize => gridSize;
        public int CurrentSeed => currentSeed;

        public void GenerateWorld(int seed, int level)
        {
            currentSeed = seed;
            curriculumLevel = level;
            rng = new System.Random(seed);

            // Clear previous geometry
            foreach (var block in spawnedBlocks)
            {
                if (block != null) Destroy(block);
            }
            spawnedBlocks.Clear();

            // Set grid dimension based on level
            gridSize = level == 0 ? 10 : (level == 1 ? 12 : (level == 2 ? 16 : 20));
            worldGrid = new BlockType[gridSize, gridSize];

            // 1. Build Bedrock Perimeter
            for (int x = 0; x < gridSize; x++)
            {
                for (int z = 0; z < gridSize; z++)
                {
                    if (x == 0 || x == gridSize - 1 || z == 0 || z == gridSize - 1)
                    {
                        worldGrid[x, z] = BlockType.Bedrock;
                        SpawnVoxel(x, 0, z, BlockType.Bedrock);
                    }
                    else
                    {
                        worldGrid[x, z] = BlockType.Air;
                        // Floor tile
                        SpawnVoxel(x, -1, z, BlockType.Dirt);
                    }
                }
            }

            // 2. Place Obstacles based on curriculum
            int obstacleCount = level == 1 ? 4 : (level == 2 ? 10 : (level >= 3 ? 20 : 0));
            int placed = 0;
            while (placed < obstacleCount)
            {
                int ox = rng.Next(2, gridSize - 2);
                int oz = rng.Next(2, gridSize - 2);
                if (worldGrid[ox, oz] == BlockType.Air)
                {
                    worldGrid[ox, oz] = BlockType.Stone;
                    SpawnVoxel(ox, 0, oz, BlockType.Stone);
                    placed++;
                }
            }
        }

        public bool IsTraversable(float worldX, float worldZ)
        {
            int gx = Mathf.FloorToInt(worldX);
            int gz = Mathf.FloorToInt(worldZ);
            if (gx < 0 || gx >= gridSize || gz < 0 || gz >= gridSize) return false;
            return worldGrid[gx, gz] == BlockType.Air;
        }

        private void SpawnVoxel(int x, int y, int z, BlockType type)
        {
            Vector3 pos = new Vector3(x + 0.5f, y + 0.5f, z + 0.5f);
            GameObject obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obj.transform.position = pos;
            obj.transform.parent = this.transform;
            obj.name = $"Voxel_{type}_{x}_{z}";

            Renderer r = obj.GetComponent<Renderer>();
            if (r != null)
            {
                if (type == BlockType.Bedrock) r.material.color = new Color(0.2f, 0.2f, 0.2f);
                else if (type == BlockType.Stone) r.material.color = new Color(0.5f, 0.5f, 0.55f);
                else if (type == BlockType.Dirt) r.material.color = new Color(0.35f, 0.55f, 0.25f);
            }
            spawnedBlocks.Add(obj);
        }
    }
}
