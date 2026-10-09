import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsQ, logsQ } from "@/lib/data";
import { PageHeader, Pill, fmtTime } from "@/components/sec-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, RefreshCw, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({ meta: [{ title: "Agent Monitor — Sentinel AI" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(agentsQ),
      context.queryClient.ensureQueryData(logsQ),
    ]),
  component: AgentMonitor,
});

function AgentMonitor() {
  const { data: agents } = useSuspenseQuery(agentsQ);
  const { data: logs } = useSuspenseQuery(logsQ);
  const qc = useQueryClient();

  function getAgentStats(name: string) {
    const agentLogs = logs.filter((l) => l.agent_name === name);
    return {
      total: agentLogs.length,
      blocked: agentLogs.filter((l) => l.decision === "BLOCK").length,
      lastSeen: agentLogs[0]?.created_at,
      lastDecision: agentLogs[0]?.decision,
    };
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["agents"] });
    qc.invalidateQueries({ queryKey: ["audit_logs"] });
    toast.success("Agent data refreshed");
  }

  return (
    <>
      <PageHeader
        title="Agent Monitor"
        subtitle="Track AI agent status, activity counts, and security decisions."
        icon={Bot}
      >
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
        <Link to="/lab">
          <Button size="sm">Run Scenario</Button>
        </Link>
      </PageHeader>

      <div className="space-y-4">
        {agents.length === 0 ? (
          <p className="text-muted-foreground">No agents configured.</p>
        ) : (
          agents.map((a: { id: string; name?: string | undefined; status: string; created_at: string }) => {
            const stats = getAgentStats(a.name ?? a.id);
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${a.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <div>
                      <div className="font-semibold">{a.name ?? a.id}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.id}</div>
                    </div>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-mono font-semibold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Actions</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-mono font-semibold ${stats.blocked > 0 ? "text-destructive" : "text-success"}`}>{stats.blocked}</div>
                      <div className="text-xs text-muted-foreground">Blocked</div>
                    </div>
                    {stats.lastDecision && (
                      <Pill tone={stats.lastDecision}>last: {stats.lastDecision}</Pill>
                    )}
                    {stats.lastSeen && (
                      <span className="text-xs text-muted-foreground">{fmtTime(stats.lastSeen)}</span>
                    )}
                  </div>
                </div>

                {stats.total === 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    No recorded actions yet.{" "}
                    <Link to="/lab" className="text-primary hover:underline">
                      Run a simulation
                    </Link>{" "}
                    to generate activity.
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
