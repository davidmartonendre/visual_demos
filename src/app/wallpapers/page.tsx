"use client";

import { useState } from "react";
import LiquidMetal from "@/components/wallpapers/LiquidMetal";
import GravityWells from "@/components/wallpapers/GravityWells";
import NeuralMesh from "@/components/wallpapers/NeuralMesh";
import FluidRipples from "@/components/wallpapers/FluidRipples";
import PlasmaField from "@/components/wallpapers/PlasmaField";

const wallpaperComponents = [
  { id: "liquid", name: "Liquid Metal", component: LiquidMetal },
  { id: "gravity", name: "Gravity Wells", component: GravityWells },
  { id: "neural", name: "Neural Mesh", component: NeuralMesh },
  { id: "fluid", name: "Fluid Ripples", component: FluidRipples },
  { id: "plasma", name: "Plasma Field", component: PlasmaField },
];

export default function Wallpapers() {
  const [selected, setSelected] = useState(0);
  const SelectedComponent = wallpaperComponents[selected].component;

  return (
    <div className="h-screen bg-black text-white pt-16 flex flex-col">
      <div className="flex gap-2 flex-wrap justify-center py-3 px-4">
        {wallpaperComponents.map((wp, index) => (
          <button
            key={wp.id}
            onClick={() => setSelected(index)}
            className={`px-4 py-1.5 rounded-full text-sm transition-all ${
              selected === index
                ? "bg-white text-black"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            }`}
          >
            {wp.name}
          </button>
        ))}
      </div>
      <div className="flex-1 px-4 pb-4">
        <div className="w-full h-full rounded-xl overflow-hidden border border-white/10">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}
