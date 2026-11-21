import { NirvaatErrorCode } from '@nirvaat/contracts';

export class NirvaatError extends Error {
  public readonly code: NirvaatErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: NirvaatErrorCode = 'INTERNAL_ERROR',
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NirvaatError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends NirvaatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class SecurityViolationError extends NirvaatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SECURITY_VIOLATION', 403, details);
    this.name = 'SecurityViolationError';
  }
}

export class UpstreamServiceError extends NirvaatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UPSTREAM_SERVICE_ERROR', 502, details);
    this.name = 'UpstreamServiceError';
  }
}

export class AuditFailureError extends NirvaatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUDIT_FAILURE', 422, details);
    this.name = 'AuditFailureError';
  }
}
