export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, status: number, requestId: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

interface ProblemDetails {
  title: string;
  status: number;
  detail: string;
  requestId?: string | null;
}

let authToken: string | null = null;

/** Set once by AuthProvider on sign-in/sign-out; read by every request below. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`/api/v1${path}`, { ...init, headers });

  if (!response.ok) {
    let problem: ProblemDetails | null = null;
    try {
      problem = await response.json();
    } catch {
      // Non-JSON error body - fall through to the generic message below.
    }
    throw new ApiError(
      problem?.detail ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
      problem?.requestId ?? null,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
};
