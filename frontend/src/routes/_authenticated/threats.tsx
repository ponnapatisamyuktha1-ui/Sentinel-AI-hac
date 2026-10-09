import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Pill, fmtTime } from "@/components/sec-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/threats")({
  head: () => ({ meta: [{ title: "Threat Detection — Sentinel AI" }] }),
  component: ThreatDetection,
});

// Static fallback threats shown when backend is offline
const FALLBACK_THREATS = [
  { id: 1, category: "Prompt Injection", severity: "critical", agent: "InboxAssistant", time: new Date().toISOString(), blocked: true, action: "send_email" },
  { id: 2, category: "Data Exfiltration", severity: "high", agent: "DevOpsAgent", time: new Date(Date.now() - 3_600_000).toISOString(), blocked: true, action: "file_read" },
  { id: 3, category: "Privilege Escalation", severity: "critical", agent: "FinanceBot", time: new Date(Date.now() - 7_200_000).toISOString(), blocked: true, action: "db_query" },
];

function classifyThreat(log: any): string {
  const reasons = (log.reasons ?? []).join(" ").toLowerCase();
  if (reasons.includes("inject")) return "Prompt Injection";
  if (reasons.includes("pii") || reasons.includes("ssn") || reasons.includes("credit")) return "PII Leakage";
  if (reasons.includes("secret") || reasons.includes("api key") || reasons.includes("password")) return "Credential Exfiltration";
  if (reasons.includes("privilege") || reasons.includes("/etc/")) return "Privilege Escalation";
  if (reasons.includes("exfil") || reasons.includes("external")) return "Data Exfiltration";
  return "Policy Violation";
}

function ThreatDetection() {
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["threatLogs"],
    queryFn: () => api.getLogs(),
    refetchInterval: 30_000,
  });

  const threats = logs
    .filter((l) => l.decision === "BLOCK" || l.threat_level === "critical" || l.threat_level === "high")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayThreats = threats.length > 0 ? threats : null;

  const criticalCount = (displayThreats ?? FALLBACK_THREATS).filter((t: any) => (t.severity ?? t.threat_level) === "critical").length;
  const highCount = (displayThreats ?? FALLBACK_THREATS).filter((t: any) => (t.severity ?? t.threat_level) === "high").length;

  return (
    <>
      <PageHeader
        title="Threat Detection"
        subtitle="Real-time feed of blocked and flagged agent actions."
        icon={Radar}
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Link to="/lab">
          <Button size="sm">Simulate Attack</Button>
        </Link>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-4 border-destructive/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Critical</div>
          <div className="text-3xl font-bold text-destructive mt-1">{criticalCount}</div>
        </Card>
        <Card className="p-4 border-orange-500/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">High</div>
          <div className="text-3xl font-bold text-orange-500 mt-1">{highCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Blocked</div>
          <div className="text-3xl font-bold mt-1">{(displayThreats ?? FALLBACK_THREATS).length}</div>
        </Card>
      </div>

      <div className="panel p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading threats…</p>
        ) : (
          <div className="space-y-1">
            {(displayThreats ?? FALLBACK_THREATS).map((t: any) => {
              const severity = t.severity ?? t.threat_level ?? "high";
              const category = t.category ?? classifyThreat(t);
              const agent = t.agent ?? t.agent_name ?? "Unknown";
              const time = t.time ?? t.created_at;
              const action = t.action ?? t.action ?? "N/A";
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0">
                  <Pill tone={severity} />
                  <span className="font-medium">{category}</span>
                  <Badge variant="secondary">{agent}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{action}</span>
                  <span className="flex-1" />
                  <Pill tone="BLOCK">BLOCKED</Pill>
                  <span className="text-xs text-muted-foreground">{fmtTime(time)}</span>
                </div>
              );
            })}
            {!displayThreats && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Showing demo data — start the backend and run scenarios in the{" "}
                <Link to="/lab" className="text-primary hover:underline">Attack Lab</Link>{" "}
                to see real threats.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
