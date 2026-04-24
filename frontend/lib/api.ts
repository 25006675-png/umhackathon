import type {
  ActiveAlertsResponse,
  DailyReadingInput,
  FarmDataResponse,
  FeedbackInput,
  FlockCreateInput,
  ReadingHistoryResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function registerFlock(data: FlockCreateInput) {
  return request("/api/flocks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitReading(data: DailyReadingInput) {
  return request("/api/readings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getReadingHistory(flockId: string) {
  return request<ReadingHistoryResponse>(`/api/flocks/${flockId}/readings`);
}

export function getAnalysis(flockId: string) {
  return request<FarmDataResponse>(`/api/analysis/${flockId}`);
}

export function getRawAnalysis(flockId: string) {
  return request<FarmDataResponse>(`/api/analysis/${flockId}/raw`);
}

export function getRiskTrend(flockId: string) {
  return request<{ flock_id: string; risk_scores: number[] }>(
    `/api/analysis/${flockId}/trend`,
  );
}

export function getAlerts(flockId: string) {
  return request<ActiveAlertsResponse>(`/api/alerts/${flockId}`);
}

export function submitFeedback(data: FeedbackInput) {
  return request("/api/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
