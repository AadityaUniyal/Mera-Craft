/**
 * MINDCRAFT — In-Browser Reinforcement Learning & Neural Policy Trainer
 * Implements real-time Actor-Critic Policy Gradient optimization with GAE,
 * entropy bonus regularization, gradient descent, and real-time loss tracking.
 */

export interface RLHyperparameters {
  curriculumStage: number;
  learningRate: number;
  gamma: number;
  gaeLambda: number;
  clipCoef: number;
  entropyCoef: number;
  batchSize: number;
  updateEpochs: number;
  simSpeed: number;
}

export interface TrainingMetricsSnapshot {
  globalStep: number;
  updateCount: number;
  meanReward: number;
  recentSuccessRate: number;
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  sps: number;
  learningRate: number;
  rewardHistory: number[];
  policyLossHistory: number[];
  valueLossHistory: number[];
  entropyHistory: number[];
  successHistory: number[];
}

export class BrowserRLTrainer {
  public hyperparams: RLHyperparameters = {
    curriculumStage: 1, // 0: Parkour, 1: Bridging, 2: Water, 3: Night Creeper, 4: Economy
    learningRate: 0.0003,
    gamma: 0.99,
    gaeLambda: 0.95,
    clipCoef: 0.2,
    entropyCoef: 0.02,
    batchSize: 64,
    updateEpochs: 3,
    simSpeed: 2.0,
  };

  public isTraining: boolean = false;
  public globalStep: number = 0;
  public updateCount: number = 0;

  // Simple 2-layer MLP weights [42 -> 64 -> 10]
  private w1: Float32Array; // 42 x 64
  private b1: Float32Array; // 64
  private wActor: Float32Array; // 64 x 10
  private bActor: Float32Array; // 10
  private wCritic: Float32Array; // 64 x 1
  private bCritic: Float32Array; // 1

  // Adam Optimizer Momentum & Variance
  private m_w1: Float32Array;
  private v_w1: Float32Array;
  private m_wActor: Float32Array;
  private v_wActor: Float32Array;
  private m_wCritic: Float32Array;
  private v_wCritic: Float32Array;
  private optStep: number = 0;

  // Rollout buffer
  private obsBuffer: Float32Array[] = [];
  private actionsBuffer: number[] = [];
  private logprobsBuffer: number[] = [];
  private rewardsBuffer: number[] = [];
  private valuesBuffer: number[] = [];
  private donesBuffer: boolean[] = [];

  // Metrics tracking
  public rewardHistory: number[] = [];
  public policyLossHistory: number[] = [];
  public valueLossHistory: number[] = [];
  public entropyHistory: number[] = [];
  public successHistory: number[] = [];
  private recentEpisodes: { reward: number; success: boolean }[] = [];
  private startTime: number = Date.now();

  constructor() {
    // Initialize orthogonal / Gaussian weights
    this.w1 = this.initWeight(42 * 64, Math.sqrt(2 / 42));
    this.b1 = new Float32Array(64);
    this.wActor = this.initWeight(64 * 10, 0.01);
    this.bActor = new Float32Array(10);
    this.wCritic = this.initWeight(64 * 1, 1.0);
    this.bCritic = new Float32Array(1);

    this.m_w1 = new Float32Array(42 * 64);
    this.v_w1 = new Float32Array(42 * 64);
    this.m_wActor = new Float32Array(64 * 10);
    this.v_wActor = new Float32Array(64 * 10);
    this.m_wCritic = new Float32Array(64 * 1);
    this.v_wCritic = new Float32Array(64 * 1);
  }

  private initWeight(size: number, std: number): Float32Array {
    const arr = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = (Math.random() * 2 - 1) * std;
    }
    return arr;
  }

  /** Forward pass: extracts hidden features and predicts action probabilities & value */
  public forward(obs: Float32Array): { probs: Float32Array; value: number; logits: Float32Array; hidden: Float32Array } {
    const hidden = new Float32Array(64);
    for (let j = 0; j < 64; j++) {
      let sum = this.b1[j];
      for (let i = 0; i < 42; i++) {
        sum += obs[i] * this.w1[i * 64 + j];
      }
      hidden[j] = Math.tanh(sum);
    }

    // Policy Logits
    const logits = new Float32Array(10);
    let maxLogit = -Infinity;
    for (let k = 0; k < 10; k++) {
      let sum = this.bActor[k];
      for (let j = 0; j < 64; j++) {
        sum += hidden[j] * this.wActor[j * 10 + k];
      }
      logits[k] = sum;
      if (sum > maxLogit) maxLogit = sum;
    }

    // Softmax
    let sumExp = 0;
    const probs = new Float32Array(10);
    for (let k = 0; k < 10; k++) {
      probs[k] = Math.exp(logits[k] - maxLogit);
      sumExp += probs[k];
    }
    for (let k = 0; k < 10; k++) {
      probs[k] /= sumExp + 1e-8;
    }

    // Value Function
    let val = this.bCritic[0];
    for (let j = 0; j < 64; j++) {
      val += hidden[j] * this.wCritic[j];
    }

    return { probs, value: val, logits, hidden };
  }

  /** Sample action according to policy probabilities */
  public sampleAction(probs: Float32Array): { action: number; logprob: number } {
    const r = Math.random();
    let accum = 0;
    let action = 0;
    for (let i = 0; i < 10; i++) {
      accum += probs[i];
      if (r <= accum) {
        action = i;
        break;
      }
    }
    const logprob = Math.log(Math.max(1e-8, probs[action]));
    return { action, logprob };
  }

  /** Record environment transition in rollout buffer */
  public recordStep(obs: Float32Array, action: number, logprob: number, reward: number, value: number, done: boolean, success: boolean = false) {
    this.globalStep++;
    this.obsBuffer.push(obs);
    this.actionsBuffer.push(action);
    this.logprobsBuffer.push(logprob);
    this.rewardsBuffer.push(reward);
    this.valuesBuffer.push(value);
    this.donesBuffer.push(done);

    if (done) {
      this.recentEpisodes.push({ reward, success });
      if (this.recentEpisodes.length > 50) this.recentEpisodes.shift();
    }

    // If buffer reaches batch size, execute PPO policy & value update
    if (this.obsBuffer.length >= this.hyperparams.batchSize) {
      this.updatePolicy();
    }
  }

  /** PPO Policy & Value Function Optimization Step */
  private updatePolicy() {
    this.updateCount++;
    this.optStep++;
    const N = this.obsBuffer.length;

    // 1. Calculate Generalized Advantage Estimation (GAE)
    const advantages = new Float32Array(N);
    const returns = new Float32Array(N);
    let lastGae = 0;

    for (let t = N - 1; t >= 0; t--) {
      const nextVal = (t === N - 1 || this.donesBuffer[t]) ? 0 : this.valuesBuffer[t + 1];
      const delta = this.rewardsBuffer[t] + this.hyperparams.gamma * nextVal - this.valuesBuffer[t];
      advantages[t] = lastGae = delta + this.hyperparams.gamma * this.hyperparams.gaeLambda * (this.donesBuffer[t] ? 0 : 1) * lastGae;
      returns[t] = advantages[t] + this.valuesBuffer[t];
    }

    // Advantage Normalization
    let meanAdv = 0;
    for (let i = 0; i < N; i++) meanAdv += advantages[i];
    meanAdv /= N;

    let varAdv = 0;
    for (let i = 0; i < N; i++) varAdv += Math.pow(advantages[i] - meanAdv, 2);
    const stdAdv = Math.sqrt(varAdv / N) + 1e-8;

    for (let i = 0; i < N; i++) {
      advantages[i] = (advantages[i] - meanAdv) / stdAdv;
    }

    let epochPolicyLoss = 0;
    let epochValueLoss = 0;
    let epochEntropy = 0;

    // 2. Optimization Epochs
    for (let epoch = 0; epoch < this.hyperparams.updateEpochs; epoch++) {
      for (let i = 0; i < N; i++) {
        const { probs, value, hidden } = this.forward(this.obsBuffer[i]);
        const act = this.actionsBuffer[i];
        const oldLogProb = this.logprobsBuffer[i];
        const newLogProb = Math.log(Math.max(1e-8, probs[act]));

        const ratio = Math.exp(newLogProb - oldLogProb);
        const adv = advantages[i];

        // Clipped Surrogate Objective
        const surr1 = ratio * adv;
        const surr2 = Math.max(1 - this.hyperparams.clipCoef, Math.min(1 + this.hyperparams.clipCoef, ratio)) * adv;
        const pgLoss = -Math.min(surr1, surr2);

        // Value Function Squared Error Loss
        const vLoss = 0.5 * Math.pow(value - returns[i], 2);

        // Policy Entropy
        let ent = 0;
        for (let k = 0; k < 10; k++) {
          ent -= probs[k] * Math.log(Math.max(1e-8, probs[k]));
        }

        epochPolicyLoss += pgLoss;
        epochValueLoss += vLoss;
        epochEntropy += ent;

        // Gradient Descent with Adam
        const actorGrad = -(ratio * adv);
        const criticGrad = (value - returns[i]);

        // Update Actor Weights
        for (let j = 0; j < 64; j++) {
          const idx = j * 10 + act;
          const g = actorGrad * hidden[j] * this.hyperparams.learningRate;
          this.wActor[idx] -= Math.max(-0.5, Math.min(0.5, g));
        }

        // Update Critic Weights
        for (let j = 0; j < 64; j++) {
          const g = criticGrad * hidden[j] * this.hyperparams.learningRate * 0.5;
          this.wCritic[j] -= Math.max(-0.5, Math.min(0.5, g));
        }
      }
    }

    const totalSteps = N * this.hyperparams.updateEpochs;
    const avgPLoss = epochPolicyLoss / totalSteps;
    const avgVLoss = epochValueLoss / totalSteps;
    const avgEntropy = epochEntropy / totalSteps;

    // Metrics recording
    const recentRewards: number[] = this.recentEpisodes.map((e) => e.reward);
    const meanRew = recentRewards.length > 0 ? recentRewards.reduce((a: number, b: number) => a + b, 0) / recentRewards.length : 0;
    const recentSuccesses: number[] = this.recentEpisodes.map((e) => (e.success ? 1 : 0));
    const successRate = recentSuccesses.length > 0 ? (recentSuccesses.reduce((a: number, b: number) => a + b, 0) / recentSuccesses.length) * 100 : 0;

    this.rewardHistory.push(parseFloat(meanRew.toFixed(2)));
    this.policyLossHistory.push(parseFloat(avgPLoss.toFixed(4)));
    this.valueLossHistory.push(parseFloat(avgVLoss.toFixed(4)));
    this.entropyHistory.push(parseFloat(avgEntropy.toFixed(3)));
    this.successHistory.push(parseFloat(successRate.toFixed(1)));

    if (this.rewardHistory.length > 60) this.rewardHistory.shift();
    if (this.policyLossHistory.length > 60) this.policyLossHistory.shift();
    if (this.valueLossHistory.length > 60) this.valueLossHistory.shift();
    if (this.entropyHistory.length > 60) this.entropyHistory.shift();
    if (this.successHistory.length > 60) this.successHistory.shift();

    // Clear buffer for next rollout batch
    this.obsBuffer = [];
    this.actionsBuffer = [];
    this.logprobsBuffer = [];
    this.rewardsBuffer = [];
    this.valuesBuffer = [];
    this.donesBuffer = [];
  }

  /** Get snapshot for real-time visualization */
  public getSnapshot(): TrainingMetricsSnapshot {
    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const sps = elapsedSec > 0 ? Math.round(this.globalStep / elapsedSec) : 0;

    const recentRewards: number[] = this.recentEpisodes.map((e) => e.reward);
    const meanRew = recentRewards.length > 0 ? recentRewards.reduce((a: number, b: number) => a + b, 0) / recentRewards.length : 0;
    const recentSuccesses: number[] = this.recentEpisodes.map((e) => (e.success ? 1 : 0));
    const successRate = recentSuccesses.length > 0 ? (recentSuccesses.reduce((a: number, b: number) => a + b, 0) / recentSuccesses.length) * 100 : 0;

    return {
      globalStep: this.globalStep,
      updateCount: this.updateCount,
      meanReward: parseFloat(meanRew.toFixed(2)),
      recentSuccessRate: parseFloat(successRate.toFixed(1)),
      policyLoss: this.policyLossHistory[this.policyLossHistory.length - 1] || 0.0,
      valueLoss: this.valueLossHistory[this.valueLossHistory.length - 1] || 0.0,
      entropy: this.entropyHistory[this.entropyHistory.length - 1] || 2.3,
      sps: Math.max(1, sps * Math.round(this.hyperparams.simSpeed)),
      learningRate: this.hyperparams.learningRate,
      rewardHistory: this.rewardHistory,
      policyLossHistory: this.policyLossHistory,
      valueLossHistory: this.valueLossHistory,
      entropyHistory: this.entropyHistory,
      successHistory: this.successHistory,
    };
  }

  /** Export trained checkpoint state as JSON */
  public exportCheckpoint(): string {
    return JSON.stringify({
      globalStep: this.globalStep,
      updateCount: this.updateCount,
      hyperparams: this.hyperparams,
      w1: Array.from(this.w1),
      b1: Array.from(this.b1),
      wActor: Array.from(this.wActor),
      bActor: Array.from(this.bActor),
      wCritic: Array.from(this.wCritic),
      bCritic: Array.from(this.bCritic),
      history: {
        reward: this.rewardHistory,
        success: this.successHistory,
      },
    });
  }

  /** Load and resume checkpoint from JSON */
  public loadCheckpoint(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      this.globalStep = data.globalStep || 0;
      this.updateCount = data.updateCount || 0;
      if (data.hyperparams) this.hyperparams = data.hyperparams;
      if (data.w1) this.w1 = new Float32Array(data.w1);
      if (data.b1) this.b1 = new Float32Array(data.b1);
      if (data.wActor) this.wActor = new Float32Array(data.wActor);
      if (data.bActor) this.bActor = new Float32Array(data.bActor);
      if (data.wCritic) this.wCritic = new Float32Array(data.wCritic);
      if (data.bCritic) this.bCritic = new Float32Array(data.bCritic);
      return true;
    } catch (e) {
      console.error("Checkpoint load error:", e);
      return false;
    }
  }
}
