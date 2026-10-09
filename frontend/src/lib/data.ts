import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

const q = <T,>(key: string, fn: () => Promise<T>) => queryOptions({ queryKey: [key], queryFn: fn });

export const agentsQ = q("agents", async () => {
  try {
    return await api.getAgents();
  } catch {
    console.warn("Backend agents unavailable, using mock data");
    return [
      { id: "agent_email_summarizer", name: "Email Summarizer", status: "active", created_at: new Date().toISOString() },
      { id: "agent_doc_assistant", name: "Document Assistant", status: "active", created_at: new Date().toISOString() },
      { id: "agent_finance_ops", name: "Finance Operations", status: "inactive", created_at: new Date().toISOString() },
    ];
  }
});

export const emailsQ = q("emails", async () => {
  try {
    const emails = await api.getEmails();
    return emails.length > 0 ? emails : api.getMockEmails();
  } catch {
    console.warn("Backend emails unavailable, using mock data");
    return api.getMockEmails();
  }
});

export const logsQ = q("audit_logs", async () => {
  try {
    return await api.getLogs();
  } catch {
    console.warn("Backend audit logs unavailable");
    return [];
  }
});
