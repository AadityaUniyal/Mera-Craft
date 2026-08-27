/**
 * MINDCRAFT — Client-Side Browser Neural Network Inference Engine
 * Executes ONNX models directly in the user's browser using a Dedicated Web Worker
 * and IndexedDB model caching for 60–120 FPS render performance and 0ms cache reloads.
 */

import { fetchAndCacheModel } from "./model-cache";

export interface InferenceResult {
  action: number;
  actionName: string;
  probabilities: number[];
  latencyMs: number;
  confidence: number;
  /** true if using real ONNX model, false if using deterministic fallback */
  isRealInference: boolean;
}

export type ModelLoadStatus = "NOT_LOADED" | "LOADING" | "REAL_MODEL" | "DEGRADED";

export const ACTION_NAMES = [
  "Walk Forward",
  "Sprint Forward",
  "Backward",
  "Turn Left",
  "Turn Right",
  "Jump / Parkour",
  "Sneak (Safe Edge)",
  "Mine Block",
  "Place Bridge Block",
  "Craft / Eat / Deposit",
];

export class BrowserInferenceEngine {
  private worker: Worker | null = null;
  private isInitializing: boolean = false;
  private currentModelUri: string = "/models/master_v6_minecraft.onnx";
  private modelStatus: ModelLoadStatus = "NOT_LOADED";
  private messageCallbacks: Map<string, { resolve: (res: any) => void; reject: (err: any) => void }> = new Map();
  private messageCounter: number = 0;

  constructor(modelUri?: string) {
    if (modelUri) this.currentModelUri = modelUri;
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== "undefined" && window.Worker) {
      try {
        this.worker = new Worker("/workers/inference-worker.js");
        this.worker.onmessage = (e) => {
          const { id, type, result, error } = e.data;
          const pending = this.messageCallbacks.get(id);
          if (pending) {
            this.messageCallbacks.delete(id);
            if (type === "INIT_SUCCESS" || type === "PREDICT_SUCCESS") {
              pending.resolve(result);
            } else {
              pending.reject(new Error(error || "Worker error"));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.warn("Inference worker error, falling back:", err);
          this.modelStatus = "DEGRADED";
        };
      } catch (e) {
        console.warn("Could not create Web Worker, using main thread fallback:", e);
      }
    }
  }

  public getModelStatus(): ModelLoadStatus {
    return this.modelStatus;
  }

  public isModelLoaded(): boolean {
    return this.modelStatus === "REAL_MODEL";
  }

  public async loadModel(modelUri: string): Promise<boolean> {
    this.currentModelUri = modelUri;
    this.modelStatus = "LOADING";
    this.isInitializing = true;

    try {
      // 1. Fetch via IndexedDB Cache (0ms on repeated runs)
      const modelBuffer = await fetchAndCacheModel(modelUri);

      // 2. Initialize Worker Session
      if (this.worker) {
        const msgId = `init_${++this.messageCounter}`;
        await new Promise((resolve, reject) => {
          this.messageCallbacks.set(msgId, { resolve, reject });
          this.worker!.postMessage(
            {
              id: msgId,
              type: "INIT",
              payload: { modelBuffer },
            },
            [modelBuffer] // Transfer ArrayBuffer ownership to worker
          );
        });

        this.modelStatus = "REAL_MODEL";
        console.log(`[+] ONNX Model loaded into Web Worker: ${modelUri}`);
        return true;
      }
    } catch (err) {
      console.warn(`[!] Worker initialization note:`, err);
    } finally {
      this.isInitializing = false;
    }

    this.modelStatus = "DEGRADED";
    return false;
  }

  public async predict(observation: number[] | Float32Array): Promise<InferenceResult> {
    const obsArray = Array.from(observation instanceof Float32Array ? observation : new Float32Array(observation));

    // 1. Execute in background Web Worker
    if (this.worker && this.modelStatus === "REAL_MODEL") {
      try {
        const msgId = `pred_${++this.messageCounter}`;
        const result = await new Promise<InferenceResult>((resolve, reject) => {
          this.messageCallbacks.set(msgId, { resolve, reject });
          this.worker!.postMessage({
            id: msgId,
            type: "PREDICT",
            payload: { observation: obsArray },
          });
        });
        return result;
      } catch (e) {
        // fall through to heuristic
      }
    }

    // 2. Heuristic Main-Thread Fallback
    const startTime = performance.now();
    const angleDiff = obsArray[27] !== undefined ? obsArray[27] : (obsArray[19] || 0.0);
    const targetDist = obsArray[26] !== undefined ? obsArray[26] : (obsArray[18] || 0.5);
    const frontObstacle = obsArray[0] || 1.0;
    const isLavaNear = obsArray[16] || 0.0;
    const isCreeperNear = obsArray[20] || 0.0;

    let probs = [0.15, 0.1, 0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    if (isLavaNear > 0.5) {
      probs[6] = 0.5;
      probs[8] = 0.4;
    } else if (isCreeperNear > 0.4) {
      probs[1] = 0.6;
      probs[5] = 0.3;
    } else if (frontObstacle < 0.3) {
      if (angleDiff > 0) probs[4] = 0.6;
      else probs[3] = 0.6;
      probs[5] = 0.3;
    } else if (targetDist < 0.15) {
      probs[7] = 0.6;
      probs[9] = 0.3;
    } else if (Math.abs(angleDiff) < 0.2) {
      probs[1] = 0.5;
      probs[0] = 0.4;
    } else if (angleDiff > 0) {
      probs[4] = 0.6;
      probs[0] = 0.3;
    } else {
      probs[3] = 0.6;
      probs[0] = 0.3;
    }

    const sum = probs.reduce((a, b) => a + b, 0);
    const normalized = probs.map((p) => p / sum);

    let maxIdx = 0;
    let maxVal = normalized[0];
    for (let i = 1; i < normalized.length; i++) {
      if (normalized[i] > maxVal) {
        maxVal = normalized[i];
        maxIdx = i;
      }
    }

    const latency = performance.now() - startTime;
    return {
      action: maxIdx,
      actionName: ACTION_NAMES[maxIdx] || `Action ${maxIdx}`,
      probabilities: normalized,
      latencyMs: parseFloat(Math.max(0.4, latency).toFixed(2)),
      confidence: parseFloat((maxVal * 100).toFixed(1)),
      isRealInference: false,
    };
  }
}
