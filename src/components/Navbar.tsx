"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5">
        <Link
          href="/"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isActive("/")
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          Visual Arts
        </Link>
        <Link
          href="/wallpapers"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isActive("/wallpapers")
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          Wallpapers
        </Link>
        <Link
          href="/game-of-life"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            isActive("/game-of-life")
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          Game of Life
        </Link>
      </div>
    </div>
  );
}
