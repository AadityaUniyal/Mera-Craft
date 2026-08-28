using System;
using System.Collections.Generic;
using UnityEngine;

namespace Mindcraft.Agents
{
    public class MindcraftAgent : MonoBehaviour
    {
        public enum ActionType
        {
            Forward = 0,
            Backward = 1,
            TurnLeft = 2,
            TurnRight = 3,
            Jump = 4,
            Collect = 5,
            Stop = 6
        }

        [Header("Sensory Array Configuration")]
        [SerializeField] private float rayDistance = 6.0f;
        [SerializeField] private LayerMask obstacleLayer;
        [SerializeField] private LayerMask resourceLayer;

        [Header("Movement Specs")]
        [SerializeField] private float moveSpeed = 4.5f;
        [SerializeField] private float turnSpeed = 120.0f;

        [Header("Current Telemetry State")]
        public Vector3 TargetPosition;
        public int InventoryCount = 0;
        public float CumulativeReward = 0.0f;
        public int EpisodeSteps = 0;

        private float prevDistanceToTarget = 0.0f;
        private Rigidbody rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
        }

        public float[] CollectSensorObservations(int gridSize, int maxSteps)
        {
            float[] obs = new float[24];
            Vector3 agentPos = transform.position;
            float yawRad = transform.eulerAngles.y * Mathf.Deg2Rad;

            // 1. 8-Directional Raycast Sensors
            float[] rayAngles = new float[] { 0f, 45f, 90f, 135f, 180f, 225f, 270f, 315f };
            for (int i = 0; i < 8; i++)
            {
                float angle = (yawRad + rayAngles[i] * Mathf.Deg2Rad) % (2 * Mathf.PI);
                Vector3 dir = new Vector3(Mathf.Sin(angle), 0f, Mathf.Cos(angle));

                RaycastHit hit;
                if (Physics.Raycast(agentPos + Vector3.up * 0.5f, dir, out hit, rayDistance, obstacleLayer))
                {
                    obs[i] = hit.distance / rayDistance;
                }
                else
                {
                    obs[i] = 1.0f;
                }

                // Check if target is along ray
                Vector3 toTarget = TargetPosition - agentPos;
                float dot = Vector3.Dot(dir.normalized, toTarget.normalized);
                obs[8 + i] = (dot > 0.85f && toTarget.magnitude < rayDistance) ? 1.0f : 0.0f;
            }

            // 2. Relative Target Vector
            Vector3 relTarget = TargetPosition - agentPos;
            float normScale = gridSize * 1.414f;
            obs[16] = Mathf.Clamp(relTarget.x / normScale, -1f, 1f);
            obs[17] = Mathf.Clamp(relTarget.z / normScale, -1f, 1f);
            obs[18] = Mathf.Clamp(relTarget.magnitude / normScale, 0f, 1f);

            // Angle difference
            float targetAngle = Mathf.Atan2(relTarget.x, relTarget.z);
            float angleDiff = Mathf.DeltaAngle(transform.eulerAngles.y, targetAngle * Mathf.Rad2Deg) * Mathf.Deg2Rad;
            obs[19] = angleDiff / Mathf.PI;

            // 3. Agent Orientation
            obs[20] = Mathf.Sin(yawRad);
            obs[21] = Mathf.Cos(yawRad);

            // 4. Progress Metrics
            obs[22] = Mathf.Min(1.0f, InventoryCount / 5.0f);
            obs[23] = Mathf.Min(1.0f, EpisodeSteps / (float)maxSteps);

            return obs;
        }

        public void ExecuteAction(ActionType action, float deltaTime)
        {
            EpisodeSteps++;
            CumulativeReward -= 0.01f; // Base step penalty

            switch (action)
            {
                case ActionType.Forward:
                    transform.position += transform.forward * (moveSpeed * deltaTime);
                    break;
                case ActionType.Backward:
                    transform.position -= transform.forward * (moveSpeed * 0.6f * deltaTime);
                    break;
                case ActionType.TurnLeft:
                    transform.Rotate(Vector3.up, -turnSpeed * deltaTime);
                    break;
                case ActionType.TurnRight:
                    transform.Rotate(Vector3.up, turnSpeed * deltaTime);
                    break;
                case ActionType.Jump:
                    if (rb != null && Mathf.Abs(rb.linearVelocity.y) < 0.05f)
                    {
                        rb.AddForce(Vector3.up * 5.0f, ForceMode.Impulse);
                    }
                    transform.position += transform.forward * (moveSpeed * 0.8f * deltaTime);
                    break;
                case ActionType.Collect:
                    CheckResourceCollection();
                    break;
                case ActionType.Stop:
                    break;
            }

            // Calculate shaped distance reward delta
            float currentDist = Vector3.Distance(transform.position, TargetPosition);
            float distDelta = prevDistanceToTarget - currentDist;
            CumulativeReward += distDelta * 2.5f;
            prevDistanceToTarget = currentDist;
        }

        private void CheckResourceCollection()
        {
            Collider[] hits = Physics.OverlapSphere(transform.position, 1.5f, resourceLayer);
            foreach (var hit in hits)
            {
                Destroy(hit.gameObject);
                InventoryCount++;
                CumulativeReward += 8.0f;
            }
        }
    }
}
