"use client";

export class ClientApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ClientApiError(res.status, body.error ?? "Erro na requisição.", body.details);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function apiGet(path: string, params?: QueryParams) {
  let url = path;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) url += (path.includes("?") ? "&" : "?") + qs;
  }
  return fetch(url).then(handle);
}

function apiSend(method: string, path: string, body?: unknown) {
  return fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export const apiPost = (path: string, body?: unknown) => apiSend("POST", path, body);
export const apiPut = (path: string, body?: unknown) => apiSend("PUT", path, body);
export const apiPatch = (path: string, body?: unknown) => apiSend("PATCH", path, body);
export const apiDelete = (path: string, body?: unknown) => apiSend("DELETE", path, body);
