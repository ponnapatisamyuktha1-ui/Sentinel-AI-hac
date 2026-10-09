import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { emailsQ } from "@/lib/data";
import { Empty, PageHeader, Pill, fmtTime } from "@/components/sec-ui";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({ meta: [{ title: "Email Security Center — Sentinel AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(emailsQ),
  component: Emails,
});

interface EmailData {
  id: string | number;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
  scan?: any;
}

function Emails() {
  const { data: emails } = useSuspenseQuery(emailsQ);
  const [selected, setSelected] = useState<string | number | null>(emails[0]?.id ?? null);
  const selectedEmail = emails.find((e: EmailData) => e.id === selected) as EmailData | undefined;

  return (
    <>
      <PageHeader 
        title="Email Security Center" 
        subtitle="Scan emails for prompt injection, hidden instructions, and sensitive data leaks." 
      />
      
      {emails.length === 0 ? (
        <Empty title="No emails">Add test emails to scan for security threats.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Email List */}
          <div className="panel divide-y divide-border overflow-hidden">
            {emails.map((e: EmailData) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`block w-full p-4 text-left transition-colors hover:bg-muted ${
                  selected === e.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{e.subject}</span>
                  {e.scan ? (
                    <Pill tone={e.scan.level || "medium"}>Scanned</Pill>
                  ) : (
                    <Pill>New</Pill>
                  )}
                </div>
                <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {e.sender}
                </div>
              </button>
            ))}
          </div>

          {/* Email Details */}
          {selectedEmail && (
            <div className="space-y-4">
              <Card className="p-5">
                <div>
                  <div className="text-lg font-medium">{selectedEmail.subject}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {selectedEmail.sender} · {fmtTime(selectedEmail.received_at)}
                  </div>
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
                  {selectedEmail.body}
                </pre>
              </Card>

              {selectedEmail.scan && (
                <Card className="p-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      Security Scan Result
                      <Pill tone={selectedEmail.scan.level || "medium"}>
                        {selectedEmail.scan.level?.toUpperCase() || "MEDIUM"}
                      </Pill>
                    </div>
                    
                    {selectedEmail.scan.threats && (
                      <div>
                        <div className="mb-2 text-xs font-semibold text-red-500">Threats Detected:</div>
                        <div className="space-y-1">
                          {selectedEmail.scan.threats.map((t: string) => (
                            <div key={t} className="text-sm flex gap-2">
                              <Pill tone="critical">{t}</Pill>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedEmail.scan.threats && (
                      <div className="text-sm text-green-600">✓ No threats detected</div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

