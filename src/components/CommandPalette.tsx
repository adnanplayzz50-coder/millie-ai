import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Brain, Code2, FolderKanban, MessageSquare, Plus, Settings2, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useChatStore } from "@/lib/chat-store";
import { useUI } from "@/lib/ui-store";

export function CommandPalette() {
  const ui = useUI();
  const navigate = useNavigate();
  const convs = useChatStore((s) => s.conversations);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui]);

  const run = (fn: () => void) => {
    ui.setPaletteOpen(false);
    fn();
  };

  return (
    <CommandDialog open={ui.paletteOpen} onOpenChange={ui.setPaletteOpen}>
      <CommandInput placeholder="Search chats or type a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => navigate({ to: "/chat" }))}>
            <Plus /> New chat
          </CommandItem>
          <CommandItem onSelect={() => run(() => { ui.setMode(ui.mode === "chat" ? "code" : "chat"); navigate({ to: "/chat" }); })}>
            <Code2 /> Switch to {ui.mode === "chat" ? "C0DE" : "Chat"} mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => ui.setCustomizeOpen(true))}>
            <Settings2 /> Open settings
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/projects" }))}>
            <FolderKanban /> Projects
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/memory" }))}>
            <Brain /> Memory
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/account" }))}>
            <User /> Account
          </CommandItem>
        </CommandGroup>
        {convs.length > 0 && (
          <CommandGroup heading="Chats">
            {convs.map((c) => (
              <CommandItem key={c.id} value={`${c.title} ${c.id}`} onSelect={() => run(() => navigate({ to: "/chat/$id", params: { id: c.id } }))}>
                <MessageSquare /> {c.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
