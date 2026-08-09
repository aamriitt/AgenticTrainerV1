import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (options: { title: string; description?: string; type?: ToastType }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(({ title, description, type = "success" }: { title: string; description?: string; type?: ToastType }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md"
            >
              {t.type === "success" && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />}
              {t.type === "error" && <XCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />}
              {t.type === "warning" && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />}
              {t.type === "info" && <Info className="h-5 w-5 flex-shrink-0 text-blue-500 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground">{t.title}</h4>
                {t.description && <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-relaxed">{t.description}</p>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
