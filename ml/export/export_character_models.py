"""
MINDCRAFT — Character ONNX Model Exporter
Converts PyTorch checkpoint weights for Explorer, Guardian, Builder, and Master
into optimized ONNX models with dynamic batching and SHA-256 metadata manifests.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import json
import hashlib
import torch
import shutil
from training.models.minecraft_actor_critic import MinecraftActorCritic
from ml.agents.character_policies import CharacterActorCritic

def export_model_to_onnx(
    checkpoint_path: str,
    output_onnx_path: str,
    web_public_path: str,
    version_tag: str,
    default_arch=CharacterActorCritic
):
    os.makedirs(os.path.dirname(output_onnx_path), exist_ok=True)
    os.makedirs(os.path.dirname(web_public_path), exist_ok=True)

    device = torch.device("cpu")
    model = default_arch(obs_dim=42, action_dim=10).to(device)

    if os.path.exists(checkpoint_path):
        try:
            ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
            if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                state_dict = ckpt["model_state_dict"]
            elif isinstance(ckpt, dict):
                state_dict = ckpt
            else:
                state_dict = ckpt.state_dict()

            # Smart architecture detection based on layer keys
            if "input_encoder.0.weight" in state_dict:
                model = MinecraftActorCritic(obs_dim=42, action_dim=10).to(device)
            elif "encoder.stem.0.weight" in state_dict:
                model = CharacterActorCritic(obs_dim=42, action_dim=10).to(device)

            model.load_state_dict(state_dict)
            print(f"[*] Successfully loaded weights from {checkpoint_path} using {model.__class__.__name__}")
        except Exception as e:
            print(f"[!] Warning loading {checkpoint_path}: {e}")
    else:
        print(f"[!] Warning: {checkpoint_path} not found. Exporting initialized {model.__class__.__name__} architecture.")

    model.eval()
    dummy_input = torch.randn(1, 42, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["observation"],
        output_names=["action_probabilities"],
        dynamic_axes={
            "observation": {0: "batch_size"},
            "action_probabilities": {0: "batch_size"},
        },
    )

    # Copy to web public
    shutil.copy2(output_onnx_path, web_public_path)

    # Compute SHA-256
    with open(output_onnx_path, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    file_size_kb = os.path.getsize(output_onnx_path) / 1024.0

    print(f"[+] Exported ONNX: {output_onnx_path} ({file_size_kb:.2f} KB | SHA-256: {file_hash[:16]}...)")
    return {
        "version_tag": version_tag,
        "artifact_uri": f"/models/{os.path.basename(web_public_path)}",
        "sha256": file_hash,
        "file_size_kb": round(file_size_kb, 2),
    }

def main():
    print("========================================================================")
    print("  MINDCRAFT — EXPORTING CHARACTER MODELS TO ONNX                        ")
    print("========================================================================")

    manifest = []
    models_to_export = [
        ("models/checkpoints/explorer_v2.pt", "models/release/explorer_v2.onnx", "apps/web/public/models/explorer_v2.onnx", "explorer_v2", CharacterActorCritic),
        ("models/checkpoints/guardian_v1.pt", "models/release/guardian_v1.onnx", "apps/web/public/models/guardian_v1.onnx", "guardian_v1", CharacterActorCritic),
        ("models/checkpoints/builder_v1.pt", "models/release/builder_v1.onnx", "apps/web/public/models/builder_v1.onnx", "builder_v1", CharacterActorCritic),
        ("models/checkpoints/explorer_v1_baseline.pt", "models/release/explorer_v1.onnx", "apps/web/public/models/explorer_v1.onnx", "explorer_v1_baseline", CharacterActorCritic),
        ("training/checkpoints/mindcraft_master.pt", "models/release/master_v6_minecraft.onnx", "apps/web/public/models/master_v6_minecraft.onnx", "master_v6_minecraft", MinecraftActorCritic),
    ]

    for ckpt, rel, web, tag, arch in models_to_export:
        meta = export_model_to_onnx(ckpt, rel, web, tag, default_arch=arch)
        manifest.append(meta)

    os.makedirs("models/manifests", exist_ok=True)
    with open("models/manifests/active_models.json", "w") as f:
        json.dump({"active_models": manifest, "timestamp": "2026-08-28T00:00:00Z"}, f, indent=2)

    print("[+] Model manifest saved to models/manifests/active_models.json")

if __name__ == "__main__":
    main()
