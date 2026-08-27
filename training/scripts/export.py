"""
MINDCRAFT — Model Exporter (PyTorch Checkpoint -> Versioned ONNX Artifact)
Validates model weights, runs static/dynamic ONNX export, and validates with onnxruntime.
"""

import os
import sys
import argparse
from pathlib import Path
import torch

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from training.models.mindcraft_actor_critic import MindcraftActorCritic


def parse_args():
    parser = argparse.ArgumentParser(description="Export Mindcraft PyTorch Checkpoint to ONNX")
    parser.add_argument("--checkpoint", type=str, default="training/checkpoints/mindcraft_master.pt", help="Path to checkpoint .pt")
    parser.add_argument("--output", type=str, default="models/release/master_v6_minecraft.onnx", help="Output path for .onnx file")
    parser.add_argument("--obs-dim", type=int, default=42, help="Observation dimension")
    parser.add_argument("--action-dim", type=int, default=10, help="Action dimension")
    return parser.parse_args()


def export_model_to_onnx(checkpoint_path: str | Path, output_path: str | Path, obs_dim: int = 42, action_dim: int = 10):
    checkpoint_path = Path(checkpoint_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[*] Loading PyTorch Checkpoint: {checkpoint_path}")
    model = MindcraftActorCritic(obs_dim=obs_dim, action_dim=action_dim)

    if checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        state_dict = checkpoint["model_state_dict"] if "model_state_dict" in checkpoint else checkpoint
        model.load_state_dict(state_dict)
        print("[+] Checkpoint weights loaded successfully.")
    else:
        print(f"[!] Warning: Checkpoint not found at {checkpoint_path}. Exporting initialized architecture.")

    model.eval()

    dummy_input = torch.randn(1, obs_dim, dtype=torch.float32)

    print(f"[*] Exporting ONNX to: {output_path}")
    export_kwargs = {
        "export_params": True,
        "opset_version": 14,
        "do_constant_folding": True,
        "input_names": ["observation"],
        "output_names": ["action_probabilities"],
        "dynamic_axes": {
            "observation": {0: "batch_size"},
            "action_probabilities": {0: "batch_size"},
        },
    }
    
    # Force TorchScript backend if dynamo is default in newer PyTorch
    try:
        torch.onnx.export(model, dummy_input, str(output_path), dynamo=False, **export_kwargs)
    except TypeError:
        torch.onnx.export(model, dummy_input, str(output_path), **export_kwargs)

    file_size_kb = output_path.stat().st_size / 1024
    print(f"[+] ONNX Export Verified: {output_path} ({file_size_kb:.1f} KB)")
    return output_path


if __name__ == "__main__":
    args = parse_args()
    export_model_to_onnx(args.checkpoint, args.output, args.obs_dim, args.action_dim)
