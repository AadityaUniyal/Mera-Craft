import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateOTP, savePendingVerification, sendVerificationEmail } from "@/lib/email-service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password, displayName } = body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanDisplayName = displayName && typeof displayName === "string"
      ? displayName.trim().slice(0, 50)
      : cleanEmail.split("@")[0].slice(0, 50);

    // Check if user exists in DB
    try {
      const existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    } catch {
      console.warn("DB offline during email lookup, continuing with verification");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generateOTP();

    // Save pending verification for 15 minutes
    savePendingVerification({
      email: cleanEmail,
      code: otpCode,
      displayName: cleanDisplayName,
      passwordHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(cleanEmail, cleanDisplayName, otpCode);

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      previewUrl: emailResult.previewUrl,
      message: `Verification code sent to ${cleanEmail}`,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
