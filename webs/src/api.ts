import type { ApiResult, GraphQLResponse } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<ApiResult<GraphQLResponse<T>>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl('/query'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await readPayload(response)) as GraphQLResponse<T>;

  if (!response.ok || payload?.errors?.length) {
    const message =
      payload?.errors?.map((item) => item.message).join('\n') ||
      `HTTP ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}

export async function publicPing(): Promise<ApiResult<unknown>> {
  const response = await fetch(apiUrl('/public/ping'));
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status, payload);
  }

  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}
