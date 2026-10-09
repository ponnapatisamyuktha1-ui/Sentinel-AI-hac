import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MOCK_AGENTS, MOCK_EMAILS, MOCK_LOGS } from "@/lib/mock-data";

const q = <T,>(key: string, fn: () => Promise<T>) =>
  queryOptions({ queryKey: [key], queryFn: fn });

export const agentsQ = q("agents", async () => {
  try {
    const data = await api.getAgents();
    return data.length > 0 ? data : MOCK_AGENTS;
  } catch {
    return MOCK_AGENTS;
  }
});

export const emailsQ = q("emails", async () => {
  try {
    const data = await api.getEmails();
    return data.length > 0 ? data : MOCK_EMAILS;
  } catch {
    return MOCK_EMAILS;
  }
});

export const logsQ = q("audit_logs", async () => {
  try {
    const data = await api.getLogs();
    return data.length > 0 ? data : MOCK_LOGS;
  } catch {
    return MOCK_LOGS;
  }
});
