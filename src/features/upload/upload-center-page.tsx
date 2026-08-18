import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Plus, FileText, Video, FileCode2, ClipboardList, Trash2, Building2 } from "lucide-react";
import { uploadService } from "@/services/upload.service";
import { knowledgeStore } from "@/services/knowledge-store.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadProgress } from "@/components/upload/upload-progress";
import { UploadMetadataModal } from "@/components/upload/upload-metadata-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { useAuth } from "@/contexts/auth-context";
import type { UploadJob, KnowledgeItem } from "@/types";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: initialJobs, isLoading } = useQuery({ queryKey: ["upload-queue"], queryFn: uploadService.getQueue });
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  if (initialJobs && jobs.length === 0 && !isLoading) {
    setJobs(initialJobs);
  }

  const openMetadataStep = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setPendingFiles(fileArray);
  };

  const handleMetadataConfirm = async (metadata: { department: string; branch: string; specification: string }) => {
    const fileArray = pendingFiles ?? [];
    setPendingFiles(null);
    if (fileArray.length === 0) return;

    const prepared: Array<{ file: File; job: UploadJob }> = fileArray.map((file, idx) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let type: UploadJob["type"] = "pdf";
      if (["mp4", "mov", "avi"].includes(ext)) type = "video";
      else if (["txt", "transcript", "doc", "docx"].includes(ext)) type = "transcript";
      else if (["md", "runbook"].includes(ext)) type = "runbook";

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeLabel = file.size > 0 ? `${sizeMB} MB` : "0 MB";

      return {
        file,
        job: {
          id: `up-custom-${Date.now()}-${idx}`,
          fileName: file.name,
          type,
          sizeLabel,
          stage: "uploaded",
          progress: 20,
          department: metadata.department,
          branch: metadata.branch,
          specification: metadata.specification,
        },
      };
    });

    setJobs((prev) => [...prepared.map((p) => p.job), ...prev]);
    toast({
      title: `${prepared.length} file(s) uploading`,
      description: `Indexing into Atlas via the API (${metadata.department} / ${metadata.branch}).`,
      type: "info",
    });

    for (const { file, job } of prepared) {
      try {
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, stage: "chunked", progress: 55 } : j)));
        const result = await uploadService.uploadFile(file);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, stage: "indexed", progress: 100 } : j)));

        const newItem: KnowledgeItem = {
          id: job.id,
          title: result.filename,
          type: job.type,
          sme: user?.name ?? "Unknown SME",
          uploadedAt: new Date().toISOString(),
          tags: [metadata.department.toLowerCase()],
          status: "active",
          embeddingStatus: "complete",
          lastIndexedAt: new Date().toISOString(),
          sizeLabel: job.sizeLabel,
          department: metadata.department,
          branch: metadata.branch,
          specification: metadata.specification || undefined,
        };
        knowledgeStore.add(newItem);
        queryClient.invalidateQueries({ queryKey: ["repository"] });

        toast({
          title: "Indexing complete",
          description: `${result.filename}: ${result.chunks_indexed} chunks ready in Ask Atlas.`,
          type: "success",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, stage: "uploaded", progress: 0 } : j)));
        toast({ title: `Failed: ${job.fileName}`, description: message, type: "error" });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) openMetadataStep(e.dataTransfer.files);
  };

  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.progress < 100));
    toast({ title: "Queue cleaned", description: "Removed completed upload jobs from view.", type: "info" });
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && openMetadataStep(e.target.files)}
        multiple
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 rounded-[18px] border-2 border-dashed p-10 text-center transition-all ${
          isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-gradient-to-b from-secondary/40 to-transparent hover:border-primary/50"
        }`}
      >
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h2 className="mb-1 text-base font-extrabold text-foreground">
          {isDragging ? "Drop files now to index!" : "Drag SME files here, or click to browse"}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          PDF, Word, PowerPoint, video, transcript, or runbook — files are indexed on the API
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
          <p className="text-xs text-muted-foreground">Chunking and vector embeddings via FastAPI</p>
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
          : jobs.map((job) => (
              <div key={job.id}>
                <UploadProgress job={job} />
                {job.department && (
                  <div className="mt-1.5 flex gap-1.5 px-1">
                    <Badge variant="indigo" className="gap-1">
                      <Building2 className="h-3 w-3" /> {job.department}
                    </Badge>
                    <Badge>{job.branch}</Badge>
                  </div>
                )}
              </div>
            ))}
      </div>

      <UploadMetadataModal
        isOpen={pendingFiles !== null}
        fileCount={pendingFiles?.length ?? 0}
        onCancel={() => setPendingFiles(null)}
        onConfirm={handleMetadataConfirm}
      />
    </div>
  );
}
