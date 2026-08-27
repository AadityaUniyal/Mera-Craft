import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing.");
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN" | "MODERATOR" | "ML_OPERATOR";
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
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
    const cookie = req.cookies.get("mindcraft_auth");
    if (cookie) token = cookie.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
        profile: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) return null;
    return { user, role: user.role };
  } catch (e) {
    console.error("Auth lookup error:", e);
    return null;
  }
}
