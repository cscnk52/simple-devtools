import { TooltipProvider } from "@cloudflare/kumo";

import Canvas from "@/components/canvas";
import PathPanel from "@/components/panel";

export default function App() {
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-kumo-canvas text-kumo-default">
        <PathPanel />
        <div className="relative flex-1">
          <Canvas />
        </div>
      </div>
    </TooltipProvider>
  );
}
