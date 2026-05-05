"use client";

import { useState } from "react";
import MorphingBlobs from "@/components/arts/MorphingBlobs";
import FlowField from "@/components/arts/FlowField";
import GrowingCircles from "@/components/arts/GrowingCircles";
import OrganicWaves from "@/components/arts/OrganicWaves";
import ParticleCloud from "@/components/arts/ParticleCloud";
import CellularGrowth from "@/components/arts/CellularGrowth";

const artComponents = [
  { id: "blobs", name: "Morphing Blobs", component: MorphingBlobs },
  { id: "flow", name: "Flow Field", component: FlowField },
  { id: "circles", name: "Growing Circles", component: GrowingCircles },
  { id: "waves", name: "Organic Waves", component: OrganicWaves },
  { id: "particles", name: "Particle Cloud", component: ParticleCloud },
  { id: "cellular", name: "Cellular Growth", component: CellularGrowth },
];

export default function Home() {
  const [selected, setSelected] = useState(0);
  const SelectedComponent = artComponents[selected].component;

  return (
    <div className="h-screen bg-black text-white pt-16 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {artComponents.map((art, index) => (
            <button
              key={art.id}
              onClick={() => setSelected(index)}
              className={`p-1 rounded-xl transition-all ${
                selected === index
                  ? "ring-2 ring-white"
                  : "hover:ring-1 hover:ring-white/30"
              }`}
            >
              <art.component size={120} />
            </button>
          ))}
        </div>
        <div className="mt-4">
          <SelectedComponent size={200} />
        </div>
      </div>
    </div>
  );
}
