"use client";

import React, { useState } from "react";

interface MinecraftAvatarProps {
  usernameOrUuid?: string;
  size?: number;
  type?: "head" | "avatar" | "isometric" | "body";
  className?: string;
  alt?: string;
}

export function MinecraftAvatar({
  usernameOrUuid = "Steve",
  size = 48,
  type = "head",
  className = "",
  alt = "Minecraft Avatar",
}: MinecraftAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // URL construction based on requested render type
  let src = `https://mc-heads.net/avatar/${encodeURIComponent(usernameOrUuid)}/${size}`;
  if (type === "head") {
    src = `https://mc-heads.net/head/${encodeURIComponent(usernameOrUuid)}/${size}`;
  } else if (type === "body") {
    src = `https://mc-heads.net/body/${encodeURIComponent(usernameOrUuid)}/${size}`;
  } else if (type === "isometric") {
    src = `https://crafatar.com/renders/head/${usernameOrUuid === "Steve" ? "853c80ef3c3749fdaa49938b674adae6" : usernameOrUuid}?size=${size}&overlay=true`;
  }

  const fallbackSrc = `https://mc-heads.net/avatar/Steve/${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded border border-white/10 bg-slate-900/80 shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        width={size}
        height={size}
        className="pixelated object-contain transition-transform duration-200 hover:scale-110"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
