type ApiErrorPayload = {
  error?: {
    code?: string;
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
  skipAuthRecovery?: boolean;
};

const DEVELOPMENT_API_BASE_URL = 'http://127.0.0.1:3000/api';
const REQUEST_TIMEOUT_MS = 15000;

let accessToken: string | null = null;
let unauthorizedRecoveryHandler: (() => Promise<string | null>) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload: unknown,
    readonly code: string | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setHttpAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedRecoveryHandler(
  handler: (() => Promise<string | null>) | null
): void {
  unauthorizedRecoveryHandler = handler;
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
  const abortController =
    typeof AbortController === 'undefined' ? null : new AbortController();
  const timeoutId =
    abortController === null
      ? null
      : setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: abortController?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'Kết nối tới máy chủ quá lâu. Vui lòng thử lại.',
        0,
        null,
        'REQUEST_TIMEOUT'
      );
    }

    throw new ApiError(
      'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng hoặc địa chỉ API rồi thử lại.',
      0,
      null,
      'NETWORK_ERROR'
    );
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }

  let rawText = await response.text();
  let payload = rawText ? safeParseJson(rawText) : null;

  if (
    response.status === 401 &&
    options.auth &&
    !options.skipAuthRecovery &&
    unauthorizedRecoveryHandler
  ) {
    const recoveredAccessToken = await unauthorizedRecoveryHandler();

    if (recoveredAccessToken) {
      headers.Authorization = `Bearer ${recoveredAccessToken}`;

      response = await fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: abortController?.signal
      });

      rawText = await response.text();
      payload = rawText ? safeParseJson(rawText) : null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload) ?? getDefaultErrorMessage(response.status),
      response.status,
      payload,
      extractErrorCode(payload)
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

  if (configuredValue) {
    return configuredValue.endsWith('/')
      ? configuredValue.slice(0, -1)
      : configuredValue;
  }

  if (__DEV__) {
    return DEVELOPMENT_API_BASE_URL;
  }

  throw new ApiError(
    'Ứng dụng chưa được cấu hình địa chỉ máy chủ. Hãy đặt EXPO_PUBLIC_API_BASE_URL trước khi tạo bản build Android nội bộ.',
    0,
    null,
    'API_BASE_URL_MISSING'
  );
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

function extractErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as ApiErrorPayload;

  if (
    candidate.error &&
    typeof candidate.error === 'object' &&
    typeof candidate.error.code === 'string'
  ) {
    return candidate.error.code;
  }

  return null;
}

function getDefaultErrorMessage(statusCode: number): string {
  if (statusCode === 401) {
    return 'Bạn cần đăng nhập lại để tiếp tục.';
  }

  if (statusCode === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }

  if (statusCode === 404) {
    return 'Không tìm thấy dữ liệu yêu cầu.';
  }

  if (statusCode >= 500) {
    return 'Máy chủ đang tạm bận. Vui lòng thử lại sau ít phút.';
  }

  return 'Yêu cầu thất bại';
}
