import { useState, useMemo } from "react";

import Canvas from "@/components/canvas";
import PathPanel from "@/components/panel";
import { parsePath } from "@/utils/path";

export default function App() {
  const [pathString, setPathString] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const commands = useMemo(() => parsePath(pathString), [pathString]);

  const handlePathChange = (d: string) => {
    setPathString(d);
    setSelectedId(null);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <PathPanel
        commands={commands}
        pathString={pathString}
        onPathChange={handlePathChange}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="flex-1 relative">
        <Canvas pathString={pathString} commands={commands} />
      </div>
    </div>
  );
}
