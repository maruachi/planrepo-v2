export type AppErrorCode =
  | "INVALID_INPUT"
  | "INVALID_SELECTION"
  | "FORBIDDEN_ORIGIN"
  | "FORBIDDEN_HOST"
  | "DOCUMENT_NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_ACCESS_DENIED"
  | "SOURCE_REDIRECT"
  | "STALE_CONTEXT"
  | "DECISION_CONFLICT"
  | "SOURCE_RATE_LIMIT"
  | "SOURCE_TIMEOUT"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_INVALID"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_INVALID"
  | "INTERNAL_ERROR"
  | "RENDER_FAILED"
  | "EXPORT_MISMATCH";

const statusByCode: Record<AppErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_SELECTION: 400,
  FORBIDDEN_ORIGIN: 403,
  FORBIDDEN_HOST: 403,
  DOCUMENT_NOT_FOUND: 404,
  SOURCE_NOT_FOUND: 404,
  SOURCE_ACCESS_DENIED: 422,
  SOURCE_REDIRECT: 422,
  STALE_CONTEXT: 409,
  DECISION_CONFLICT: 409,
  SOURCE_RATE_LIMIT: 503,
  SOURCE_TIMEOUT: 504,
  SOURCE_UNAVAILABLE: 502,
  SOURCE_INVALID: 502,
  STORAGE_UNAVAILABLE: 503,
  STORAGE_INVALID: 500,
  INTERNAL_ERROR: 500,
  RENDER_FAILED: 500,
  EXPORT_MISMATCH: 409
};

export class AppError extends Error {
  public readonly statusCode: number;

  public constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly retryable: boolean,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "AppError";
    this.statusCode = statusByCode[code];
  }

  public toResponse(): { error: { code: AppErrorCode; message: string; retryable: boolean } } {
    return { error: { code: this.code, message: this.message, retryable: this.retryable } };
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const internalError = (error: unknown): AppError => {
  if (isAppError(error)) return error;
  return new AppError("INTERNAL_ERROR", "The operation could not be completed.", false, { cause: error });
};
