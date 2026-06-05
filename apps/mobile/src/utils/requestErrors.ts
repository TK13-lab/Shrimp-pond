import { ApiError } from '../api/httpClient';

type RequestErrorContext = 'authenticated' | 'generic' | 'sign-in';

export function getRequestErrorMessage(
  error: unknown,
  fallbackMessage: string,
  context: RequestErrorContext = 'generic'
): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 0) {
      return error.message;
    }

    if (error.statusCode === 401 && context === 'authenticated') {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
    }

    if (error.statusCode >= 500) {
      return 'Máy chủ đang tạm bận. Vui lòng thử lại sau ít phút.';
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  return fallbackMessage;
}

export function isRetryableRequestError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.statusCode === 0 ||
      error.statusCode === 408 ||
      error.statusCode === 429 ||
      error.statusCode >= 500
    );
  }

  return true;
}
