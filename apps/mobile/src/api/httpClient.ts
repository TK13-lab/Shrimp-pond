type ApiErrorPayload = {
  error?: {
    message?: string | string[];
  };
  message?: string | string[];
  statusCode?: number;
};

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestOptions = {
  auth?: boolean;
  body?: JsonValue;
  headers?: Record<string, string>;
  method?: 'GET' | 'PATCH' | 'POST';
};

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000/api';

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setHttpAccessToken(token: string | null): void {
  accessToken = token;
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiError('Không thể kết nối đến máy chủ', 0, null);
  }

  const rawText = await response.text();
  const payload = rawText ? safeParseJson(rawText) : null;

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload) ?? 'Yêu cầu thất bại',
      response.status,
      payload
    );
  }

  return payload as T;
}

function getApiBaseUrl(): string {
  const env =
    (
      globalThis as typeof globalThis & {
        process?: {
          env?: Record<string, string | undefined>;
        };
      }
    ).process?.env ?? {};
  const configuredValue = env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const baseUrl = configuredValue || DEFAULT_API_BASE_URL;

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function safeParseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as ApiErrorPayload;

  if (typeof candidate.message === 'string') {
    return candidate.message;
  }

  if (Array.isArray(candidate.message)) {
    return candidate.message.join(', ');
  }

  if (
    candidate.error &&
    typeof candidate.error === 'object' &&
    typeof candidate.error.message === 'string'
  ) {
    return candidate.error.message;
  }

  if (
    candidate.error &&
    typeof candidate.error === 'object' &&
    Array.isArray(candidate.error.message)
  ) {
    return candidate.error.message.join(', ');
  }

  return null;
}
