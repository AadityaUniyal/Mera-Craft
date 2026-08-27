/**
 * MINDCRAFT — Dedicated Browser Inference Web Worker
 * Offloads ONNX neural network execution from the main UI thread
 * to maintain 60–120 FPS render performance.
 */

/* global importScripts, ort, self */

let session = null;
let isLoaded = false;

// Action labels
const ACTION_NAMES = [
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

// Load onnxruntime-web in worker scope
try {
  importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js");
  if (typeof ort !== "undefined") {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
  }
} catch (e) {
  console.warn("Worker: onnxruntime-web script load error:", e);
}

self.onmessage = async function (e) {
  const { id, type, payload } = e.data;

  if (type === "INIT") {
    try {
      if (typeof ort === "undefined") {
        throw new Error("ort is undefined in worker scope");
      }

      const { modelBuffer } = payload;
      session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ["wasm"],
      });
      isLoaded = true;
      self.postMessage({ id, type: "INIT_SUCCESS" });
    } catch (err) {
      self.postMessage({ id, type: "INIT_ERROR", error: String(err) });
    }
    return;
  }

  if (type === "PREDICT") {
    const startTime = performance.now();
    const { observation } = payload;
    const obsArray = new Float32Array(observation);
    const obsDim = obsArray.length;

    if (session && isLoaded && typeof ort !== "undefined") {
      try {
        const tensor = new ort.Tensor("float32", obsArray, [1, obsDim]);
        const feeds = { observation: tensor };
        const results = await session.run(feeds);
        const outputTensor = results.action_probabilities || Object.values(results)[0];
        const rawProbs = Array.from(outputTensor.data);

        let maxIdx = 0;
        let maxVal = rawProbs[0];
        for (let i = 1; i < rawProbs.length; i++) {
          if (rawProbs[i] > maxVal) {
            maxVal = rawProbs[i];
            maxIdx = i;
          }
        }

        const latency = performance.now() - startTime;
        self.postMessage({
          id,
          type: "PREDICT_SUCCESS",
          result: {
            action: maxIdx,
            actionName: ACTION_NAMES[maxIdx] || `Action ${maxIdx}`,
            probabilities: rawProbs,
            latencyMs: parseFloat(latency.toFixed(2)),
            confidence: parseFloat((maxVal * 100).toFixed(1)),
            isRealInference: true,
          },
        });
        return;
      } catch (err) {
        // Fallback to rule heuristic
      }
    }

    // Heuristic Fallback
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
    self.postMessage({
      id,
      type: "PREDICT_SUCCESS",
      result: {
        action: maxIdx,
        actionName: ACTION_NAMES[maxIdx] || `Action ${maxIdx}`,
        probabilities: normalized,
        latencyMs: parseFloat(Math.max(0.4, latency).toFixed(2)),
        confidence: parseFloat((maxVal * 100).toFixed(1)),
        isRealInference: false,
      },
    });
  }
};
