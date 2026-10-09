import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { logsQ } from "@/lib/data";
import { type AuditLog } from "@/lib/api";
import { PageHeader, Pill, fmtTime, Empty } from "@/components/sec-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, AlertTriangle, Clock, Shield, RefreshCw,
  Activity, Server, FileWarning, ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Threat Notifications — Sentinel AI" },
      { name: "description", content: "Threat notifications and security alerts" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(logsQ),
  component: NotificationsPage,
});

// Derive a structured notification from an audit log entry
interface Notification {
  id: string | number;
  agent_name: string;
  action: string;
  resource: string;
  threat_category: string;
  severity: "critical" | "high" | "medium" | "low";
  decision: string;
  reasons: string[];
  timestamp: string;
  latency_ms?: number | undefined;
  sensitive_entities_detected?: number | undefined;
}

function classifyCategory(log: AuditLog): string {
  const reasons = log.reasons.join(" ").toUpperCase();
  if (reasons.includes("INJECT") || reasons.includes("OVERRIDE") || reasons.includes("GOD MODE")) return "Prompt Injection";
  if (reasons.includes("PII") || reasons.includes("SSN") || reasons.includes("CREDIT")) return "PII Leakage";
  if (reasons.includes("SECRET") || reasons.includes("API KEY") || reasons.includes("PASSWORD") || reasons.includes("CREDENTIAL")) return "Credential Exfiltration";
  if (reasons.includes("UNAUTHORIZED") || reasons.includes("PRIVILEGE") || reasons.includes("SCOPE")) return "Unauthorized Access";
  if (reasons.includes("EXFIL") || reasons.includes("DESTINATION") || reasons.includes("BLACKLIST")) return "Data Exfiltration";
  if (log.decision === "BLOCK") return "Policy Violation";
  if (log.decision === "REDACT") return "Sensitive Data Redacted";
  return "Security Alert";
}

function threatIcon(category: string) {
  if (category.includes("Inject")) return AlertTriangle;
  if (category.includes("Exfil") || category.includes("Credential")) return FileWarning;
  if (category.includes("Unauthorized") || category.includes("Privilege")) return ShieldAlert;
  return Shield;
}

function logToNotification(log: AuditLog): Notification {
  return {
    id: log.id,
    agent_name: log.agent_name,
    action: log.action,
    resource: log.target,
    threat_category: classifyCategory(log),
    severity: log.threat_level,
    decision: log.decision,
    reasons: log.reasons,
    timestamp: log.created_at,
    latency_ms: log.latency_ms,
    sensitive_entities_detected: log.sensitive_entities_detected,
  };
}

function severityTone(s: string) {
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function NotificationsPage() {
  const { data: logs } = useSuspenseQuery(logsQ);
  const qc = useQueryClient();

  // Only surface non-trivial events as notifications
  const notifications: Notification[] = logs
    .filter((l) => l.decision === "BLOCK" || l.decision === "REDACT" || l.decision === "REVIEW" || l.threat_level === "high" || l.threat_level === "critical")
    .map(logToNotification)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const allNotifications: Notification[] = logs
    .map(logToNotification)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const [selectedId, setSelectedId] = useState<string | number | null>(
    notifications[0]?.id ?? allNotifications[0]?.id ?? null
  );

  const displayList = notifications.length > 0 ? notifications : allNotifications;
  const selected = displayList.find((n) => n.id === selectedId);

  const criticalCount = displayList.filter((n) => n.severity === "critical").length;
  const highCount = displayList.filter((n) => n.severity === "high").length;
  const blockedCount = displayList.filter((n) => n.decision === "BLOCK").length;
  const totalCount = allNotifications.length;

  return (
    <>
      <PageHeader
        title="Threat Notifications"
        subtitle="Security alerts derived from every agent action inspected by the gateway."
        icon={Bell}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["audit_logs"] })}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Critical</div>
          <div className="text-3xl font-bold text-destructive">{criticalCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">High Severity</div>
          <div className="text-3xl font-bold text-orange-500">{highCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Blocked</div>
          <div className="text-3xl font-bold text-red-600">{blockedCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Events</div>
          <div className="text-3xl font-bold">{totalCount}</div>
        </Card>
      </div>

      {displayList.length === 0 ? (
        <Empty title="No alerts yet">
          Run scenarios in the Attack Simulation Lab to generate security events.
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* List */}
          <div className="panel divide-y divide-border overflow-y-auto max-h-[600px]">
            {displayList.map((n) => {
              const Icon = threatIcon(n.threat_category);
              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`block w-full p-4 text-left transition-colors hover:bg-muted ${
                    selectedId === n.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${
                          n.severity === "critical" ? "text-destructive" :
                          n.severity === "high" ? "text-orange-500" : "text-warning"
                        }`} />
                        <span className="truncate text-sm font-medium">{n.threat_category}</span>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {n.agent_name} · {n.action}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmtTime(n.timestamp)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Pill tone={severityTone(n.severity)}>{n.severity}</Pill>
                      <Pill tone={n.decision}>{n.decision}</Pill>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected ? (
            <div className="space-y-4">
              {/* Header card */}
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      {selected.decision === "BLOCK"
                        ? <AlertTriangle className="h-5 w-5 text-destructive" />
                        : selected.decision === "REDACT"
                        ? <FileWarning className="h-5 w-5 text-warning" />
                        : <Clock className="h-5 w-5 text-warning" />
                      }
                      {selected.threat_category}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{fmtTime(selected.timestamp)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Pill tone={severityTone(selected.severity)}>{selected.severity}</Pill>
                    <Pill tone={selected.decision}>{selected.decision}</Pill>
                  </div>
                </div>
              </Card>

              {/* Details grid */}
              <Card className="p-5">
                <div className="font-semibold mb-3">Incident Details</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Agent</div>
                    <div className="font-mono">{selected.agent_name}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Action</div>
                    <div className="font-mono">{selected.action}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Resource / Target</div>
                    <div className="font-mono truncate">{selected.resource}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Category</div>
                    <div>{selected.threat_category}</div>
                  </div>
                  {selected.latency_ms != null && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Latency</div>
                      <div className="font-mono">{selected.latency_ms.toFixed(1)} ms</div>
                    </div>
                  )}
                  {selected.sensitive_entities_detected != null && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Sensitive Entities</div>
                      <div className="font-mono">{selected.sensitive_entities_detected}</div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Reasons / threat signals */}
              <Card className="p-5">
                <div className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Threat Signals
                </div>
                <div className="space-y-1.5">
                  {selected.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <span className="mt-0.5 text-destructive flex-shrink-0">▸</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gateway decision explanation */}
              <Card className="p-5 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Gateway Decision</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selected.decision === "BLOCK" &&
                    "The gateway fully blocked this action. It was not executed and no data was accessed or transmitted."}
                  {selected.decision === "REDACT" &&
                    "Sensitive data was automatically redacted from the content before the action was permitted to proceed."}
                  {selected.decision === "REVIEW" &&
                    "This action was held for human review and has not yet been executed."}
                  {selected.decision === "ALLOW" &&
                    "This action passed all security checks and was permitted to execute."}
                </p>
              </Card>
            </div>
          ) : (
            <div className="panel flex items-center justify-center p-12 text-muted-foreground">
              Select an alert to view details
            </div>
          )}
        </div>
      )}
    </>
  );
}
