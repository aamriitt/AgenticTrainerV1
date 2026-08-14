import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "@/constants/navigation";
import { knowledgeStore } from "@/services/knowledge-store.service";
import { useToast } from "@/contexts/toast-context";
import { useAuth } from "@/contexts/auth-context";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectLink = (path: string, label: string) => {
    onClose();
    navigate(path);
    toast({ title: `Navigating to ${label}`, type: "info" });
  };

  // Derived directly from NAV_ITEMS so the palette always matches the sidebar's
  // role-based access — no separate list to fall out of sync.
  const commandLinks = NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false));
  const filteredLinks = commandLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()));
  const filteredDocs = knowledgeStore.list().filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command, doc title, or search page… (Esc to close)"
              className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-3 space-y-4">
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Navigation & Views</div>
              <div className="space-y-1">
                {filteredLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleSelectLink(item.path, item.label)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {filteredDocs.length > 0 && commandLinks.some((l) => l.path === "/repository") && (
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grounding Knowledge Items</div>
                <div className="space-y-1">
                  {filteredDocs.slice(0, 4).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectLink("/repository", doc.title)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-atlas-indigo flex-shrink-0" />
                        <span className="truncate font-medium">{doc.title}</span>
                      </div>
                      <span className="text-[10.5px] text-muted-foreground uppercase font-semibold">{doc.department}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
