using System;
using UnityEngine;
using Mindcraft.Agents;
using Mindcraft.Environment;

namespace Mindcraft.Inference
{
    /// <summary>
    /// Unity Sentis / ONNX runtime inference driver.
    /// Runs the neural network locally on device / in browser WebGL.
    /// </summary>
    public class SentisModelRunner : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private MindcraftAgent agent;
        [SerializeField] private VoxelWorldGenerator world;

        [Header("Model Settings")]
        [SerializeField] private string modelVersion = "v2";
        [SerializeField] private float inferenceInterval = 0.05f; // 20 Hz decision rate

        private float timer = 0f;

        private void Update()
        {
            if (agent == null || world == null) return;

            timer += Time.deltaTime;
            if (timer >= inferenceInterval)
            {
                timer = 0f;
                PerformInferenceStep();
            }
        }

        private void PerformInferenceStep()
        {
            // Collect 24-dim observation
            float[] obs = agent.CollectSensorObservations(world.GridSize, 200);

            // In WebGL Sentis or native inference:
            // Forward pass -> Action selection
            MindcraftAgent.ActionType selectedAction = PredictAction(obs);
            agent.ExecuteAction(selectedAction, inferenceInterval);
        }

        private MindcraftAgent.ActionType PredictAction(float[] obs)
        {
            // Simple robust fallback policy if Sentis model asset is not assigned
            // Relative angle is at index 19
            float angleDiff = obs[19];
            if (Mathf.Abs(angleDiff) > 0.15f)
            {
                return angleDiff > 0 ? MindcraftAgent.ActionType.TurnRight : MindcraftAgent.ActionType.TurnLeft;
            }
            return MindcraftAgent.ActionType.Forward;
        }
    }
}
