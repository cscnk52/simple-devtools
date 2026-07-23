import AddCommand from "./AddCommand";
import CommandList from "./CommandList";
import PathInput from "./PathInput";
import Toolbar from "./Toolbar";

export default function PathPanel() {
  return (
    <aside className="flex h-full w-84 shrink-0 flex-col border-r border-kumo-hairline bg-kumo-base">
      <PathInput />
      <Toolbar />
      <CommandList />
      <AddCommand />
    </aside>
  );
}
