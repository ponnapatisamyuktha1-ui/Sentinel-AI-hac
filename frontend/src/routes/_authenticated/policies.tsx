import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Pill } from "@/components/sec-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/policies")({
  head: () => ({ meta: [{ title: "Policy Manager — Sentinel AI" }] }),
  component: PolicyManager,
});

interface Policy {
  id: number;
  name: string;
  agents: string[];
  rules: string[];
  enabled: boolean;
  expanded: boolean;
}

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 1,
    name: "Employee Policy",
    agents: ["InboxAssistant", "FinanceBot"],
    rules: ["Block external email sends", "Redact PII", "Block credential exfiltration", "Log all file reads"],
    enabled: true,
    expanded: false,
  },
  {
    id: 2,
    name: "DevOps Policy",
    agents: ["DevOpsAgent"],
    rules: ["Block /etc/* file access", "Require approval for production writes", "Redact API keys in logs"],
    enabled: true,
    expanded: false,
  },
  {
    id: 3,
    name: "Default Catch-All Policy",
    agents: ["All agents"],
    rules: ["Block prompt injection", "Block unknown tool calls"],
    enabled: true,
    expanded: false,
  },
];

function PolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>(DEFAULT_POLICIES);
  const [newName, setNewName] = useState("");
  const [newAgent, setNewAgent] = useState("");
  const [newRule, setNewRule] = useState("");
  const [showNew, setShowNew] = useState(false);

  function toggleEnabled(id: number) {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, enabled: !p.enabled };
        toast.info(`"${p.name}" ${next.enabled ? "enabled" : "disabled"}`);
        return next;
      })
    );
  }

  function toggleExpanded(id: number) {
    setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, expanded: !p.expanded } : p));
  }

  function deletePolicy(id: number) {
    const p = policies.find((x) => x.id === id);
    setPolicies((prev) => prev.filter((x) => x.id !== id));
    toast.success(`"${p?.name}" deleted`);
  }

  function addRule(policyId: number, rule: string) {
    if (!rule.trim()) return;
    setPolicies((prev) =>
      prev.map((p) => p.id === policyId ? { ...p, rules: [...p.rules, rule.trim()] } : p)
    );
    toast.success("Rule added");
  }

  function removeRule(policyId: number, ruleIndex: number) {
    setPolicies((prev) =>
      prev.map((p) => p.id === policyId ? { ...p, rules: p.rules.filter((_, i) => i !== ruleIndex) } : p)
    );
  }

  function createPolicy() {
    if (!newName.trim()) { toast.error("Policy name is required"); return; }
    const policy: Policy = {
      id: Date.now(),
      name: newName.trim(),
      agents: newAgent ? newAgent.split(",").map((s) => s.trim()).filter(Boolean) : ["All agents"],
      rules: newRule ? [newRule.trim()] : [],
      enabled: true,
      expanded: true,
    };
    setPolicies((prev) => [...prev, policy]);
    setNewName(""); setNewAgent(""); setNewRule(""); setShowNew(false);
    toast.success(`"${policy.name}" created`);
  }

  return (
    <>
      <PageHeader
        title="Policy Manager"
        subtitle="Define and enforce security policies for each AI agent."
        icon={SlidersHorizontal}
      >
        <Button size="sm" onClick={() => setShowNew((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> New Policy
        </Button>
      </PageHeader>

      {/* Create new policy */}
      {showNew && (
        <Card className="p-5 mb-4 border-primary/40">
          <div className="font-semibold mb-3">New Policy</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" placeholder="Policy name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pagents">Agents (comma-separated)</Label>
              <Input id="pagents" placeholder="AgentA, AgentB" value={newAgent} onChange={(e) => setNewAgent(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prule">First rule</Label>
              <Input id="prule" placeholder="e.g. Block external sends" value={newRule} onChange={(e) => setNewRule(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={createPolicy}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {policies.map((p) => {
          const [addRuleVal, setAddRuleVal] = useState("");
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Pill tone={p.enabled ? "ALLOW" : "muted"}>{p.enabled ? "Enabled" : "Disabled"}</Pill>
                    <span className="text-xs text-muted-foreground">{p.rules.length} rules</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.agents.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Switch checked={p.enabled} onCheckedChange={() => toggleEnabled(p.id)} />
                  <button
                    onClick={() => toggleExpanded(p.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={p.expanded ? "Collapse" : "Expand"}
                  >
                    {p.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deletePolicy(p.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete policy"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {p.expanded && (
                <div className="mt-4 border-t border-border pt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rules</div>
                  {p.rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rules. Add one below.</p>
                  ) : (
                    p.rules.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <span>{r}</span>
                        <button onClick={() => removeRule(p.id, i)} className="text-muted-foreground hover:text-destructive ml-2">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add a rule…"
                      value={addRuleVal}
                      onChange={(e) => setAddRuleVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { addRule(p.id, addRuleVal); setAddRuleVal(""); } }}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={() => { addRule(p.id, addRuleVal); setAddRuleVal(""); }}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
