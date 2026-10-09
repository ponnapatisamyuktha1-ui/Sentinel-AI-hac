import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { logsQ } from "@/lib/data";
import { PageHeader, Pill, fmtTime } from "@/components/sec-ui";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Sentinel AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(logsQ),
  component: AuditLogs,
});

function AuditLogs() {
  const { data: logs } = useSuspenseQuery(logsQ);

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Complete history of all agent actions." />
      <div className="panel p-6">
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No audit logs.</p>
          ) : (
            logs.slice(0, 50).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-0">
                <Pill tone={l.threat_level} />
                <Pill tone={l.decision} />
                <span className="font-medium">{l.agent_name}</span>
                <span className="font-mono text-xs text-muted-foreground">{l.action} → {l.target}</span>
                <span className="flex-1 truncate text-muted-foreground">{l.reasons[0]}</span>
                <span className="text-xs text-muted-foreground">{fmtTime(l.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
