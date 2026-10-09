import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Pill } from "@/components/sec-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Zap, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/gateway")({
  head: () => ({ meta: [{ title: "Security Gateway — Sentinel AI" }] }),
  component: SecurityGateway,
});

const API_BASE = (import.meta.env as Record<string, string>)["VITE_API_BASE"] || "http://localhost:8000/api";

const MODES = [
  { id: "ALLOW", label: "Allow", desc: "Permit request, log it", color: "text-success" },
  { id: "REDACT", label: "Redact", desc: "Strip sensitive data, then allow", color: "text-primary" },
  { id: "REVIEW", label: "Review", desc: "Hold for human approval", color: "text-warning" },
  { id: "BLOCK", label: "Block", desc: "Deny request entirely", color: "text-destructive" },
];

interface GatewayStatus {
  status: string;
  latency_ms?: number;
  checks_enabled?: string[];
}

function SecurityGateway() {
  const qc = useQueryClient();
  const [blockEnabled, setBlockEnabled] = useState(true);
  const [redactEnabled, setRedactEnabled] = useState(true);
  const [reviewEnabled, setReviewEnabled] = useState(true);

  const { data: health, isLoading } = useQuery<GatewayStatus>({
    queryKey: ["gatewayHealth"],
    queryFn: async () => {
      try {
        const r = await fetch(`${API_BASE}/gateway/health`);
        if (!r.ok) throw new Error("offline");
        return r.json();
      } catch {
        return { status: "online (demo)", latency_ms: 12, checks_enabled: ["injection", "dlp", "policy"] };
      }
    },
    refetchInterval: 15000,
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["pendingApprovals"],
    queryFn: async () => {
      try {
        const r = await fetch(`${API_BASE}/approvals`);
        if (!r.ok) throw new Error("none");
        const d = await r.json();
        return Array.isArray(d) ? d : d.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API_BASE}/approvals/${id}/approve`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pendingApprovals"] }); toast.success("Action approved"); },
    onError: () => toast.error("Approval failed"),
  });

  const denyMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API_BASE}/approvals/${id}/deny`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pendingApprovals"] }); toast.success("Action denied"); },
    onError: () => toast.error("Deny failed"),
  });

  const isOnline = health?.status?.includes("online") || health?.status === "ok";

  return (
    <>
      <PageHeader
        title="Security Gateway"
        subtitle="Core gateway configuration, status, and pending human-review approvals."
        icon={ShieldCheck}
      >
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["gatewayHealth"] })}>
          Refresh
        </Button>
        <Link to="/audit">
          <Button variant="outline" size="sm">View Logs</Button>
        </Link>
      </PageHeader>

      {/* Status row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-5 flex items-center gap-4">
          <div className={`h-3 w-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} shadow-[0_0_8px_currentColor]`} />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Gateway</div>
            <div className="font-semibold">{isLoading ? "Checking…" : (health?.status ?? "Unknown")}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg latency</div>
            <div className="font-semibold">{health?.latency_ms != null ? `${health.latency_ms} ms` : "< 50 ms"}</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <Clock className="h-5 w-5 text-warning" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending reviews</div>
            <div className="font-semibold">{pending.length}</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Decision modes */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Decision Modes</h3>
          <div className="space-y-4">
            {MODES.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <span className={`font-mono font-semibold ${m.color}`}>{m.id}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{m.desc}</span>
                </div>
                <Switch
                  checked={
                    m.id === "BLOCK" ? blockEnabled :
                    m.id === "REDACT" ? redactEnabled :
                    m.id === "REVIEW" ? reviewEnabled : true
                  }
                  disabled={m.id === "ALLOW"}
                  onCheckedChange={(v) => {
                    if (m.id === "BLOCK") { setBlockEnabled(v); toast.info(`BLOCK mode ${v ? "enabled" : "disabled"}`); }
                    if (m.id === "REDACT") { setRedactEnabled(v); toast.info(`REDACT mode ${v ? "enabled" : "disabled"}`); }
                    if (m.id === "REVIEW") { setReviewEnabled(v); toast.info(`REVIEW mode ${v ? "enabled" : "disabled"}`); }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active checks</div>
            <div className="flex flex-wrap gap-2">
              {(health?.checks_enabled ?? ["injection", "dlp", "policy"]).map((c) => (
                <Badge key={c} variant="secondary">{c}</Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Pending approvals */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Pending Reviews</h3>
            {pending.length > 0 && (
              <Badge variant="destructive">{pending.length} waiting</Badge>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No actions awaiting review</p>
              <p className="text-xs text-muted-foreground">
                Run a scenario in the{" "}
                <Link to="/lab" className="text-primary hover:underline">Attack Lab</Link>{" "}
                to generate REVIEW decisions.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {pending.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                    <span className="font-medium text-sm">{item.agent_name ?? item.agent}</span>
                    <Pill tone="REVIEW">REVIEW</Pill>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground truncate">
                    {item.action ?? item.requested_tool} → {item.target ?? item.destination ?? "N/A"}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => approveMut.mutate(item.id)}
                      disabled={approveMut.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => denyMut.mutate(item.id)}
                      disabled={denyMut.isPending}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
