/**
 * MINDCRAFT — Client-Side Browser Neural Network Inference Engine
 * Executes ONNX models directly in the user's browser using ONNX Runtime Web / WebAssembly.
 * Supports 24-dim, 32-dim, 36-dim, and 42-dim observation inputs and 10 discrete Minecraft actions.
 * 
 * IMPORTANT: The deterministic fallback is clearly marked and never claims to be real inference.
 */

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
  "Craft / Eat / Deposit"
];

export class BrowserInferenceEngine {
  private session: any = null;
  private isInitializing: boolean = false;
  private currentModelUri: string = "/models/master_v6_minecraft.onnx";
  private modelStatus: ModelLoadStatus = "NOT_LOADED";

  constructor(modelUri?: string) {
    if (modelUri) this.currentModelUri = modelUri;
  }

  /** Returns the current model loading status */
  public getModelStatus(): ModelLoadStatus {
    return this.modelStatus;
  }

  /** Returns true only if a real ONNX model is loaded */
  public isModelLoaded(): boolean {
    return this.session !== null && this.modelStatus === "REAL_MODEL";
  }

  public async loadModel(modelUri: string): Promise<boolean> {
    this.currentModelUri = modelUri;
    this.modelStatus = "LOADING";
    try {
      this.isInitializing = true;
      if (typeof window !== "undefined") {
        const ort = (window as any).ort;
        if (ort && ort.InferenceSession) {
          this.session = await ort.InferenceSession.create(modelUri, {
            executionProviders: ["wasm"],
          });
          this.modelStatus = "REAL_MODEL";
          console.log(`[+] ONNX Model loaded successfully in browser: ${modelUri}`);
          return true;
        }
      }
    } catch (err) {
      console.warn(`[!] ONNX Runtime Web note:`, err);
    } finally {
      this.isInitializing = false;
    }
    this.modelStatus = "DEGRADED";
    return false;
  }

  public async predict(observation: number[] | Float32Array): Promise<InferenceResult> {
    const startTime = performance.now();
    const obsArray = observation instanceof Float32Array ? observation : new Float32Array(observation);
    const obsDim = obsArray.length;

    // 1. If active browser ONNX session is loaded — REAL inference
    if (this.session && typeof window !== "undefined") {
      try {
        const ort = (window as any).ort;
        const tensor = new ort.Tensor("float32", obsArray, [1, obsDim]);
        const feeds = { observation: tensor };
        const results = await this.session.run(feeds);
        const outputTensor = results.action_probabilities || Object.values(results)[0];
        const rawProbs = Array.from(outputTensor.data as Float32Array);
        
        const latency = performance.now() - startTime;
        let maxIdx = 0;
        let maxVal = rawProbs[0];
        for (let i = 1; i < rawProbs.length; i++) {
          if (rawProbs[i] > maxVal) {
            maxVal = rawProbs[i];
            maxIdx = i;
          }
        }

        return {
          action: maxIdx,
          actionName: ACTION_NAMES[maxIdx] || `Action ${maxIdx}`,
          probabilities: rawProbs,
          latencyMs: parseFloat(latency.toFixed(2)),
          confidence: parseFloat((maxVal * 100).toFixed(1)),
          isRealInference: true,
        };
      } catch (e) {
        console.warn("ONNX step fallback:", e);
      }
    }

    // 2. Deterministic development fallback — NOT real neural inference
    // This is clearly marked and must never be presented as a real model to users
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
