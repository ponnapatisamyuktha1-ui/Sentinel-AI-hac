import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Pill, ResultCard } from "@/components/sec-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FlaskConical, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, type SimulationResult, type SimulationScenario } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({ meta: [{ title: "Attack Simulation Lab — Sentinel AI" }] }),
  component: AttackLab,
});

function difficultyFromCategory(category: string, expected: string): string {
  if (expected === "BLOCK" && category.toLowerCase().includes("inject")) return "hard";
  if (expected === "BLOCK") return "high";
  if (expected === "REDACT") return "medium";
  return "low";
}

function AttackLab() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SimulationResult>>({});

  const { data: scenarios = [], isLoading, refetch } = useQuery<SimulationScenario[]>({
    queryKey: ["simulationScenarios"],
    queryFn: () => api.getScenarios(),
  });

  async function runScenario(scenario: SimulationScenario) {
    setRunning(scenario.id);
    try {
      const result = await api.runScenario(scenario.id);
      setResults((prev) => ({ ...prev, [scenario.id]: result }));
      toast.success(`${scenario.name} — ${result.decision}`);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    for (const s of scenarios) {
      setRunning(s.id);
      try {
        const result = await api.runScenario(s.id);
        setResults((prev) => ({ ...prev, [s.id]: result }));
      } catch {
        // continue
      }
    }
    setRunning(null);
    toast.success("All scenarios complete");
  }

  const passCount = Object.values(results).filter((r) => r.decision === "ALLOW").length;
  const blockCount = Object.values(results).filter((r) => r.decision === "BLOCK").length;
  const runCount = Object.keys(results).length;

  return (
    <>
      <PageHeader
        title="Attack Simulation Lab"
        subtitle="Run real scenarios against the security gateway — no live data affected."
        icon={FlaskConical}
      >
        {runCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pill tone="ALLOW">{passCount} allowed</Pill>
            <Pill tone="BLOCK">{blockCount} blocked</Pill>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reload
        </Button>
        <Button size="sm" disabled={isLoading || running !== null} onClick={runAll}>
          {running !== null ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</> : "Run All"}
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading scenarios…
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((s) => {
            const difficulty = difficultyFromCategory(s.category, s.expected_decision);
            const result = results[s.id];
            return (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <Pill tone={difficulty === "hard" ? "critical" : difficulty === "high" ? "high" : difficulty === "medium" ? "medium" : "low"}>
                        {s.category}
                      </Pill>
                      <Pill tone={s.expected_decision}>expect: {s.expected_decision}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    {s.explanation && !result && (
                      <p className="mt-1 text-xs text-muted-foreground/70 italic">{s.explanation}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={running === s.id}
                    onClick={() => runScenario(s)}
                  >
                    {running === s.id
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</>
                      : result ? "Re-run" : "Run Test"
                    }
                  </Button>
                </div>

                {result && (
                  <div className="mt-4">
                    {s.expected_decision && (
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        {result.decision === s.expected_decision
                          ? <span className="text-green-500">✓ Gateway behaved as expected</span>
                          : <span className="text-destructive">✗ Unexpected decision (expected {s.expected_decision})</span>
                        }
                        {result.latency_ms != null && (
                          <span className="text-muted-foreground">· {result.latency_ms.toFixed(1)} ms</span>
                        )}
                      </div>
                    )}
                    <ResultCard r={result} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
