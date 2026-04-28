export class AppError extends Error {
  constructor(message, { code = "app_error", status = 400, details = {} } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toErrorResponse(error) {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  return {
    error: {
      code: "internal_error",
      message: error?.message || "Unexpected error",
      details: {}
    }
  };
}

