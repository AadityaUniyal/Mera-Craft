import { NextRequest, NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";

export const dynamic = "force-dynamic";

/**
 * POST /api/voice/transcribe
 * Accepts audio chunks or base64 audio and transcribes via Deepgram Nova-2 / Groq Whisper.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.audioBase64) {
      return NextResponse.json({ error: "Missing audioBase64 payload" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(body.audioBase64, "base64");
    const mimeType = body.mimeType || "audio/webm";

    // 1. Try Deepgram Nova-2 (Ultra-fast speech recognition)
    try {
      const transcript = await keyManager.executeWithKeyFailover("deepgram", async (apiKey) => {
        const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": mimeType,
          },
          body: audioBuffer,
        });

        if (!res.ok) {
          const error: any = new Error(`Deepgram error: ${res.status}`);
          error.status = res.status;
          throw error;
        }

        const data = await res.json();
        const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
        return text || "";
      });

      if (transcript) {
        return NextResponse.json({
          transcript,
          provider: "Deepgram Nova-2",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (dgErr) {
      console.warn("Deepgram transcription failed, falling back to Groq Whisper:", dgErr);
    }

    // 2. Failover to Groq Whisper Large v3
    try {
      const transcript = await keyManager.executeWithKeyFailover("groq", async (apiKey) => {
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append("file", blob, "audio.webm");
        formData.append("model", "whisper-large-v3");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const error: any = new Error(`Groq Whisper error: ${res.status}`);
          error.status = res.status;
          throw error;
        }

        const data = await res.json();
        return data?.text?.trim() || "";
      });

      return NextResponse.json({
        transcript,
        provider: "Groq Whisper Large v3",
        timestamp: new Date().toISOString(),
      });
    } catch (groqErr) {
      console.warn("Groq Whisper transcription failed:", groqErr);
    }

    return NextResponse.json({ error: "Speech transcription unavailable" }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
