import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ScanSearch, FileDown, ShieldAlert } from "lucide-react";
import { rebootxService } from "@/services/rebootx.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/toast-context";
import type { RebootxAssessment, RebootxRiskLevel, RebootxTech } from "@/types";

const RISK_VARIANT: Record<RebootxRiskLevel, "emerald" | "amber" | "rose" | "default"> = {
  Low: "emerald",
  Medium: "amber",
  High: "rose",
  Critical: "rose",
};

export function TechRefreshPage() {
  const { toast } = useToast();
  const status = useQuery({ queryKey: ["rebootx", "status"], queryFn: rebootxService.status });

  const [tech, setTech] = useState<RebootxTech>("python");
  const [currentVersion, setCurrentVersion] = useState("Python 3.9");
  const [targetVersion, setTargetVersion] = useState("Python 3.12");
  const [dependencies, setDependencies] = useState("numpy==1.21, pandas==1.3");
  const [integrations, setIntegrations] = useState("Airflow DAGs, EMR Spark jobs");
  const [environment, setEnvironment] = useState("production");
  const [scanTarget, setScanTarget] = useState("Python 3.12");
  const [busy, setBusy] = useState<"assess" | "scan" | null>(null);
  const [assessment, setAssessment] = useState<RebootxAssessment | null>(null);

  const runAssess = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("assess");
    try {
      const result = await rebootxService.assess({
        technology_type: tech,
        current_version: currentVersion,
        target_version: targetVersion,
        dependencies: dependencies.split(",").map((s) => s.trim()).filter(Boolean),
        integrations: integrations.split(",").map((s) => s.trim()).filter(Boolean),
        environment,
      });
      setAssessment(result);
      toast({ title: "Assessment complete", description: `${result.overall_risk} risk · ${result.analysis_mode}`, type: "success" });
    } catch (err) {
      toast({ title: "Assessment failed", description: err instanceof Error ? err.message : "Unknown error", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const runScan = async () => {
    setBusy("scan");
    try {
      const result = await rebootxService.scanAndAssess({
        repo_path: ".",
        target_version: scanTarget,
        environment: "production",
      });
      setAssessment(result.assessment);
      toast({
        title: "Repo scanned",
        description: `${result.assessment.overall_risk} risk from ${result.upgrade_request.dependencies?.length ?? 0} dependencies`,
        type: "success",
      });
    } catch (err) {
      toast({ title: "Scan failed", description: err instanceof Error ? err.message : "Unknown error", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const download = async (format: "html" | "pdf") => {
    if (!assessment) return;
    try {
      await rebootxService.downloadReport(assessment, format);
    } catch (err) {
      toast({ title: "Report failed", description: err instanceof Error ? err.message : "Unknown error", type: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold">Tech refresh (RebootX)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assess database, EMR, Python, or MWAA upgrades with compatibility knowledge, a risk engine, and optional Ollama reasoning.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Compatibility docs</CardDescription>
            <CardTitle>{status.data?.knowledge_documents ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Analysis mode</CardDescription>
            <CardTitle className="capitalize">{status.data?.analysis_mode ?? "…"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>LLM</CardDescription>
            <CardTitle className="text-sm font-semibold leading-snug">
              {status.data?.llm.available ? status.data.llm.model : status.data?.llm.detail ?? "Checking…"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manual upgrade assessment</CardTitle>
            <CardDescription>Same contract as RebootX POST /assess-upgrade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={runAssess}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tech">Technology</Label>
                <select
                  id="tech"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={tech}
                  onChange={(e) => setTech(e.target.value as RebootxTech)}
                >
                  <option value="python">Python</option>
                  <option value="database">Database</option>
                  <option value="emr">EMR</option>
                  <option value="mwaa">MWAA</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="current">Current version</Label>
                  <Input id="current" value={currentVersion} onChange={(e) => setCurrentVersion(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="target">Target version</Label>
                  <Input id="target" value={targetVersion} onChange={(e) => setTargetVersion(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deps">Dependencies (comma-separated)</Label>
                <Input id="deps" value={dependencies} onChange={(e) => setDependencies(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ints">Integrations (comma-separated)</Label>
                <Input id="ints" value={integrations} onChange={(e) => setIntegrations(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="env">Environment</Label>
                <Input id="env" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy !== null}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                {busy === "assess" ? "Assessing…" : "Assess upgrade"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scan this repository</CardTitle>
            <CardDescription>
              Walks Atlas source, builds a dependency graph, then runs the same risk engine. Local paths stay inside this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scan-target">Target version</Label>
              <Input id="scan-target" value={scanTarget} onChange={(e) => setScanTarget(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" onClick={runScan} disabled={busy !== null}>
              <ScanSearch className="mr-1.5 h-4 w-4" />
              {busy === "scan" ? "Scanning…" : "Scan project and assess"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {assessment && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                {assessment.verdict || assessment.overall_risk} · {assessment.current_version} → {assessment.target_version}
              </CardTitle>
              <CardDescription className="mt-1 max-w-3xl">{assessment.summary}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={RISK_VARIANT[assessment.overall_risk]}>{assessment.overall_risk}</Badge>
              {assessment.overall_score != null && <Badge variant="indigo">Score {assessment.overall_score}</Badge>}
              <Badge variant="blue">{assessment.analysis_mode}</Badge>
              <Badge>{assessment.confidence} confidence</Badge>
              <Button size="sm" variant="secondary" onClick={() => download("html")}>
                <FileDown className="mr-1 h-3.5 w-3.5" /> HTML
              </Button>
              <Button size="sm" variant="secondary" onClick={() => download("pdf")}>
                <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {assessment.risks.map((risk, idx) => (
                <li key={`${risk.title}-${idx}`} className="rounded-xl border border-border p-4">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={RISK_VARIANT[risk.risk_level]}>{risk.risk_level}</Badge>
                    {risk.priority && <Badge variant="default">{risk.priority}</Badge>}
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{risk.category}</span>
                  </div>
                  <div className="text-sm font-bold">{risk.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{risk.explanation}</p>
                  <p className="mt-2 text-sm"><span className="font-semibold">Do next:</span> {risk.recommendation}</p>
                </li>
              ))}
            </ul>
            {assessment.recommended_actions.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Recommended actions</div>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {assessment.recommended_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
