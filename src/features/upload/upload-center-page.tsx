import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud, Plus, FileText, Video, FileCode2, ClipboardList, Trash2, RefreshCw, CheckCircle2, File } from "lucide-react";
import { uploadService } from "@/services/upload.service";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/upload/upload-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import type { UploadJob } from "@/types";

const ACCEPTED_TYPES = [
  { label: "PDF", icon: FileText, ext: ".pdf" },
  { label: "Word", icon: FileText, ext: ".docx" },
  { label: "PowerPoint", icon: FileText, ext: ".pptx" },
  { label: "Video", icon: Video, ext: ".mp4" },
  { label: "Transcript", icon: FileCode2, ext: ".txt" },
  { label: "Runbook", icon: ClipboardList, ext: ".md" },
];

export function UploadCenterPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: initialJobs, isLoading } = useQuery({ queryKey: ["upload-queue"], queryFn: uploadService.getQueue });
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  if (initialJobs && jobs.length === 0 && !isLoading) {
    setJobs(initialJobs);
  }

  const handleFilesAdded = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newJobs: UploadJob[] = fileArray.map((file, idx) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let type: UploadJob["type"] = "pdf";
      if (["mp4", "mov", "avi"].includes(ext)) type = "video";
      else if (["txt", "transcript", "doc", "docx"].includes(ext)) type = "transcript";
      else if (["md", "runbook"].includes(ext)) type = "runbook";

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeLabel = file.size > 0 ? `${sizeMB} MB` : "1.2 MB";

      return {
        id: `up-custom-${Date.now()}-${idx}`,
        fileName: file.name,
        type,
        sizeLabel,
        stage: "ready",
        progress: 15,
      };
    });

    setJobs((prev) => [...newJobs, ...prev]);

    toast({
      title: `${newJobs.length} knowledge file(s) queued`,
      description: "Processing Whisper transcription, cleaning, and ChromaDB vector indexing.",
      type: "success",
    });

    newJobs.forEach((job) => {
      setTimeout(() => {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, stage: "chunked", progress: 65 } : j))
        );
      }, 2000);

      setTimeout(() => {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, stage: "indexed", progress: 100 } : j))
        );
        toast({
          title: "Indexing complete",
          description: `${job.fileName} is now retrieval-ready in Ask Atlas!`,
          type: "success",
        });
      }, 4500);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.progress < 100));
    toast({
      title: "Queue cleaned",
      description: "Removed completed upload jobs from view.",
      type: "info",
    });
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
        multiple
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 rounded-[18px] border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border bg-gradient-to-b from-secondary/40 to-transparent hover:border-primary/50"
        }`}
      >
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h2 className="mb-1 text-base font-extrabold text-foreground">
          {isDragging ? "Drop files now to index!" : "Drag SME files here, or click to browse"}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          PDF, Word, PowerPoint, video, transcript, or runbook — up to 2GB per file
        </p>
        <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add Knowledge File
        </Button>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {ACCEPTED_TYPES.map((t) => (
            <span
              key={t.label}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <t.icon className="h-3 w-3" /> {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[14.5px] font-bold text-foreground">Processing Queue</h3>
          <p className="text-xs text-muted-foreground">Real-time status of document chunking and vector embeddings</p>
        </div>
        {jobs.some((j) => j.progress === 100) && (
          <Button variant="secondary" size="sm" onClick={handleClearCompleted} className="rounded-xl text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear Completed
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {isLoading || !jobs
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : jobs.map((job) => <UploadProgress key={job.id} job={job} />)}
      </div>
    </div>
  );
}
