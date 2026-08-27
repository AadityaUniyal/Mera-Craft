import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimiter } from "./lib/rate-limiter";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // 1. IP / Client Identification for Rate Limiting
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  // 2. Route-Based Rate Limiting on API endpoints
  if (path.startsWith("/api/")) {
    let limit = 200; // default 200 req / min
    let tier = "general";

    if (path.startsWith("/api/auth/")) {
      limit = 20; // 20 login/register req / min
      tier = "auth";
    } else if (path.startsWith("/api/ai/")) {
      limit = 30; // 30 AI explain req / min
      tier = "ai";
    } else if (path.startsWith("/api/events/batch")) {
      limit = 120; // 120 telemetry batches / min
      tier = "telemetry";
    }

    const rateResult = rateLimiter.check(`${ip}:${tier}`, limit, 60000);

    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Too Many Requests: Rate limit exceeded. Please retry later.",
          retryAfterSeconds: rateResult.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "x-ratelimit-limit": rateResult.limit.toString(),
            "x-ratelimit-remaining": rateResult.remaining.toString(),
            "x-ratelimit-reset": rateResult.resetSeconds.toString(),
            "retry-after": rateResult.resetSeconds.toString(),
          },
        }
      );
    }
  }

  // 3. Protect /admin and /api/admin routes
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const authCookie = request.cookies.get("mindcraft_auth");
    const authHeader = request.headers.get("authorization");
    const token = authCookie?.value || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);

    if (!token) {
      if (path.startsWith("/api/admin")) {
        return NextResponse.json(
          { error: "Unauthorized: Authentication token required" },
          {
            status: 401,
            headers: { "x-request-id": requestId },
          }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Pass through with Request Correlation Header
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (models, images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|models/|workers/).*)",
  ],
};
