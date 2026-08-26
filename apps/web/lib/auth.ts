import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "mindcraft_production_hardened_jwt_secret_key_2026_secure";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN" | "MODERATOR" | "ML_OPERATOR";
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getAuthenticatedUser(req: NextRequest): Promise<{ user: any; role: string } | null> {
  const authHeader = req.headers.get("authorization");
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    // Check cookies
    const cookie = req.cookies.get("mindcraft_auth");
    if (cookie) token = cookie.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    if (!user) return null;
    return { user, role: user.role };
  } catch (e) {
    console.error("Auth lookup error:", e);
    return null;
  }
}
