import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, MapPin, FileEdit, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEPARTMENTS, BRANCHES } from "@/constants/departments";

interface UploadMetadata {
  department: string;
  branch: string;
  specification: string;
}

interface UploadMetadataModalProps {
  isOpen: boolean;
  fileCount: number;
  onCancel: () => void;
  onConfirm: (metadata: UploadMetadata) => void;
}

/**
 * Captures department/branch/specification before a file enters the
 * processing queue, so retrieval can later be scoped correctly and there's
 * no cross-department mismatch when someone asks Atlas for a specific
 * department's documents.
 */
export function UploadMetadataModal({ isOpen, fileCount, onCancel, onConfirm }: UploadMetadataModalProps) {
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [branch, setBranch] = useState<string>(BRANCHES[0]);
  const [specification, setSpecification] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ department, branch, specification: specification.trim() });
    setSpecification("");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Tag this upload</h3>
              <p className="text-xs text-muted-foreground">
                {fileCount} file{fileCount !== 1 ? "s" : ""} — help Atlas retrieve it in the right context
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department" className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Department
              </Label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branch" className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Branch / location
              </Label>
              <select
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spec" className="flex items-center gap-1.5">
                <FileEdit className="h-3 w-3" /> Specification / notes <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                id="spec"
                rows={3}
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="e.g. Q3 policy revision, access restricted to regional leads…"
                className="w-full rounded-lg border border-input bg-card p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onCancel} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirm} className="rounded-xl gap-2">
              <Check className="h-3.5 w-3.5" /> Start upload
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
