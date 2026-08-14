import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, RefreshCw, Cpu, Database, Boxes, Mic, GitBranch, Eye, ShieldCheck, Users, Save, Terminal, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { initials } from "@/utils/format";
import { InviteUserForm } from "./components/invite-user-form";

const ROLE_LABEL: Record<string, string> = {
  knowledge_admin: "Knowledge Admin",
  sme_contributor: "SME Contributor",
  viewer: "Viewer",
};

const MODEL_ICONS = [Cpu, Database, Boxes, Mic, GitBranch];

const ROLE_CARDS = [
  { role: "Knowledge Admin", desc: "Full access — manage uploads, reindexing, model configuration, and team members.", icon: ShieldCheck },
  { role: "SME Contributor", desc: "Upload and tag knowledge, respond to feedback threads on their specific topics.", icon: Users },
  { role: "Viewer", desc: "Ask Atlas and browse the repository; read-only access.", icon: Eye },
];

export function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminService.getUsers });
  const modelStatus = useQuery({ queryKey: ["admin", "model-status"], queryFn: adminService.getModelStatus });
  const logs = useQuery({ queryKey: ["admin", "logs"], queryFn: adminService.getLogs });
  const pending = useQuery({ queryKey: ["admin", "pending"], queryFn: adminService.listPending });

  const [tab, setTab] = useState("users");
  const [selectedLlm, setSelectedLlm] = useState("Claude 3.5 Sonnet");
  const [selectedEmbedder, setSelectedEmbedder] = useState("BGE-base-en-v1.5");
  const [isReindexing, setIsReindexing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");

  const handleSaveModelConfig = () => {
    toast({
      title: "Model preferences noted",
      description: `UI preference saved locally. Runtime LLM is controlled by server OLLAMA_MODEL.`,
      type: "info",
    });
  };

  const handleReindexAll = async () => {
    setIsReindexing(true);
    try {
      const result = await adminService.reindexApproved();
      toast({
        title: "SME re-index complete",
        description: `${result.corrections_reindexed} approved correction(s) re-embedded into ChromaDB.`,
        type: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "model-status"] });
    } catch (err) {
      toast({
        title: "Re-index failed",
        description: err instanceof Error ? err.message : "Could not reindex",
        type: "error",
      });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleReview = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (action === "approve") await adminService.approve(id, "Approved via Admin console");
      else await adminService.reject(id, "Rejected via Admin console");
      toast({
        title: action === "approve" ? "Correction approved" : "Correction rejected",
        description: `Feedback #${id} updated.`,
        type: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "pending"] });
    } catch (err) {
      toast({
        title: "Review failed",
        description: err instanceof Error ? err.message : "Could not update review",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const filteredLogs = (logs.data ?? []).filter(
    (l) => logFilter === "all" || l.level.toLowerCase() === logFilter
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="bg-card border border-border p-1 rounded-xl">
        <TabsTrigger value="users" className="rounded-lg text-xs font-semibold">Team Users</TabsTrigger>
        <TabsTrigger value="sme" className="rounded-lg text-xs font-semibold">SME Review</TabsTrigger>
        <TabsTrigger value="roles" className="rounded-lg text-xs font-semibold">Role Permissions</TabsTrigger>
        <TabsTrigger value="model" className="rounded-lg text-xs font-semibold">Model Settings</TabsTrigger>
        <TabsTrigger value="logs" className="rounded-lg text-xs font-semibold">System Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/30">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Team Members & SME Contributors</h3>
              <p className="text-xs text-muted-foreground">Manage user roles and platform permissions</p>
            </div>
            <InviteUserForm />
          </div>

          {users.isLoading || !users.data ? (
            <div className="p-4"><Skeleton className="h-40" /></div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-left">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-atlas-indigo to-atlas-emerald text-[11.5px] font-bold text-white shadow-xs">
                        {initials(u.name)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-semibold">{ROLE_LABEL[u.role] || u.role}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="sme">
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/30">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Pending SME Corrections</h3>
              <p className="text-xs text-muted-foreground">Thumbs-down feedback waiting for approve/reject, then re-index</p>
            </div>
            <Button onClick={handleReindexAll} disabled={isReindexing} className="rounded-xl gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isReindexing ? "animate-spin" : ""}`} />
              {isReindexing ? "Re-indexing…" : "Re-index approved"}
            </Button>
          </div>
          {pending.isLoading ? (
            <div className="p-4"><Skeleton className="h-40" /></div>
          ) : !pending.data?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No pending corrections in the SME queue.</div>
          ) : (
            <div className="divide-y divide-border">
              {pending.data.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground">#{item.id} · {new Date(item.created_at).toLocaleString()}</div>
                  <div className="text-sm font-bold text-foreground">{item.question}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">Atlas answer: {item.answer}</div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-foreground">
                    Suggested correction: {item.correction || "(none provided)"}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={busyId === item.id} onClick={() => handleReview(item.id, "approve")} className="gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => handleReview(item.id, "reject")} className="gap-1.5">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="roles">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {ROLE_CARDS.map((r) => (
            <Card key={r.role} className="border border-border/80 shadow-xs">
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="mb-1 text-sm font-extrabold text-foreground">{r.role}</div>
                <p className="text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="model">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {modelStatus.isLoading || !modelStatus.data
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
              : modelStatus.data.map((m, i) => {
                  const Icon = MODEL_ICONS[i % MODEL_ICONS.length];
                  return (
                    <Card key={m.id} className="border border-border/80 shadow-xs">
                      <CardContent className="p-4">
                        <div className="mb-2.5 flex justify-between items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          <StatusBadge status={m.online ? "healthy" : "offline"} />
                        </div>
                        <div className="text-[13.5px] font-extrabold text-foreground">{m.name}</div>
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{m.detail}</div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>

          <Card className="border border-border/80 p-5 shadow-xs">
            <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-atlas-indigo" /> Reasoning & Embedding Model Selection
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Primary LLM Engine</label>
                <select
                  value={selectedLlm}
                  onChange={(e) => setSelectedLlm(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none"
                >
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Google)</option>
                  <option value="GPT-4o">GPT-4o (OpenAI)</option>
                  <option value="Llama 3 70B">Llama 3 70B (Meta)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Embedding Model</label>
                <select
                  value={selectedEmbedder}
                  onChange={(e) => setSelectedEmbedder(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none"
                >
                  <option value="text-embedding-3-large">text-embedding-3-large (3072 dims)</option>
                  <option value="Cohere Embed v3">Cohere Embed v3 (1024 dims)</option>
                  <option value="BGE-Large-EN">BGE-Large-EN (Open Source)</option>
                </select>
              </div>
            </div>

            <Button onClick={handleSaveModelConfig} className="rounded-xl gap-2 shadow-sm">
              <Save className="h-4 w-4" /> Save Model Preferences
            </Button>
          </Card>

          <Card className="border border-border/80 shadow-xs">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-[18px]">
              <div>
                <div className="text-[13.5px] font-bold text-foreground">Re-embed Approved SME Corrections</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Pushes approved thumbs-down corrections into ChromaDB so Ask Atlas learns from them.</div>
              </div>
              <Button onClick={handleReindexAll} disabled={isReindexing} className="rounded-xl gap-2 shadow-sm">
                <RefreshCw className={`h-3.5 w-3.5 ${isReindexing ? "animate-spin" : ""}`} />
                {isReindexing ? "Re-indexing…" : "Re-index approved"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <Card className="overflow-hidden border border-border/80 bg-slate-950 p-0 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">System Trace Log Console</span>
            </div>

            <div className="flex rounded-lg bg-slate-800 p-0.5 text-[11px]">
              {(["all", "info", "warn", "error"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all ${
                    logFilter === lvl ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {logs.isLoading || !logs.data ? (
            <div className="p-4"><Skeleton className="h-40" /></div>
          ) : (
            <div className="space-y-2 p-[18px] font-mono text-xs leading-relaxed text-emerald-300 max-h-[360px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-500">[{new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}]</span>
                  <span className={`font-bold uppercase ${
                    log.level === "info" ? "text-emerald-400" : log.level === "warn" ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {log.level.padEnd(5)}
                  </span>
                  <span className="text-slate-400">{log.source} •</span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
