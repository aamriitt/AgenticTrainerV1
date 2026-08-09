import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, AlertTriangle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: "upload" | "reindex" | "feedback";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "Document Indexed", desc: "Customer Billing Pipeline v3.pdf vector embeddings sync complete.", time: "10 mins ago", unread: true, type: "upload" },
  { id: "n2", title: "SME Feedback Received", desc: "Priya Sharma responded to thread on Glue Job retry policy.", time: "45 mins ago", unread: true, type: "feedback" },
  { id: "n3", title: "Auto Re-index Nominal", desc: "3 items re-indexed after nightly batch sync.", time: "2 hours ago", unread: false, type: "reindex" },
];

export function NotificationsDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast({
      title: "All notifications read",
      type: "info",
    });
  };

  return (
    <AnimatePresence>
      <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border/80 bg-card p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-extrabold text-foreground">Notifications</h4>
          </div>
          <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-primary hover:underline">
            Mark all read
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border transition-all ${
                n.unread ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <h5 className="text-xs font-bold text-foreground">{n.title}</h5>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{n.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
}
