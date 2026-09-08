import type { AnswerSelection, CommitResult, ConnectionInput, DocumentView, WorkspaceView } from "../shared/types.js";

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable: boolean) { super(message); }
}

const request = async (url: string, body?: unknown): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("CONNECTION_LOST", "로컬 앱에 연결할 수 없습니다. 앱 실행 상태를 확인한 뒤 다시 시도하세요.", true);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.error?.code ?? "REQUEST_FAILED", payload?.error?.message ?? "요청을 완료할 수 없습니다.", payload?.error?.retryable === true);
  }
  return response;
};
const json = async <T>(url: string, body?: unknown): Promise<T> => (await request(url, body)).json() as Promise<T>;
const query = (values: Record<string, string>) => new URLSearchParams(values).toString();

export const api = {
  recent: () => json<{ recentConnection: ConnectionInput | null }>("/api/connection"),
  connect: (input: ConnectionInput) => json<WorkspaceView>("/api/connection", input),
  workspace: (snapshotId: string) => json<WorkspaceView>(`/api/workspace?${query({ snapshotId })}`),
  document: (snapshotId: string, documentKey: string) => json<DocumentView>(`/api/document?${query({ snapshotId, documentKey })}`),
  confirm: (snapshotId: string, selections: AnswerSelection[]) => json<CommitResult>("/api/answers", { snapshotId, selections }),
  download: async (snapshotId: string, documentKey: string) => {
    const response = await request(`/api/export?${query({ snapshotId, documentKey })}`);
    const encoded = response.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    const fileName = encoded ? decodeURIComponent(encoded) : "document.md";
    return { fileName, blob: await response.blob() };
  }
};
