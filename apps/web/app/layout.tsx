import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "MINDCRAFT — A Living Voxel World Powered by Trained AI",
  description:
    "Explore a browser-based voxel world where autonomous AI agents navigate, gather, and survive using trained reinforcement learning policies. Build. Explore. Learn.",
  keywords: [
    "MINDCRAFT",
    "Voxel Game",
    "AI World",
    "Reinforcement Learning",
    "PPO",
    "ONNX",
    "Browser Game",
    "Embodied AI",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
