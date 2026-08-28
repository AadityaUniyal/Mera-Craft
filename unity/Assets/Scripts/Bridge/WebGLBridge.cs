using System;
using System.Runtime.InteropServices;
using UnityEngine;
using Mindcraft.Agents;
using Mindcraft.Environment;

namespace Mindcraft.Bridge
{
    public class WebGLBridge : MonoBehaviour
    {
        [DllImport("__Internal")]
        private static extern void SendTelemetryToReact(string jsonPayload);

        [SerializeField] private MindcraftAgent agent;
        [SerializeField] private VoxelWorldGenerator worldGenerator;

        // JS Invokable methods
        public void SetWorldSeed(string seedStr)
        {
            if (int.TryParse(seedStr, out int seed))
            {
                worldGenerator.GenerateWorld(seed, 1);
            }
        }

        public void SetCurriculumLevel(int level)
        {
            worldGenerator.GenerateWorld(worldGenerator.CurrentSeed, level);
        }

        public void EmitSessionSummary(string sessionId, bool isSuccess)
        {
            string json = $"{{\"sessionId\":\"{sessionId}\",\"success\":{(isSuccess ? "true" : "false")},\"reward\":{agent.CumulativeReward},\"steps\":{agent.EpisodeSteps}}}";
            #if UNITY_WEBGL && !UNITY_EDITOR
            SendTelemetryToReact(json);
            #else
            Debug.Log($"[Telemetry Emit] {json}");
            #endif
        }
    }
}
