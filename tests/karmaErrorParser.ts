import {
  ConflictError,
  InternalError,
  NotFoundError,
  SerializationError,
  ValidationError,
} from '@decaf-ts/db-decorators';

export function runAndParseError(func: () => any) {
  try {
    return func();
  } catch (e: unknown) {
    throw parseKarmaError(e as Error);
  }
}

export function parseKarmaError(e: Error) {
  const regexp = /^\[(.+?)\](.+)$/gs;
  const m = regexp.exec(e.message);
  if (!m) return e;
  switch (m[1]) {
    case ConflictError.name:
      return new ConflictError(m[2]);
    case InternalError.name:
      return new InternalError(m[2]);
    case NotFoundError.name:
      return new NotFoundError(m[2]);
    case SerializationError.name:
      return new SerializationError(m[2]);
    case ValidationError.name:
      return new ValidationError(m[2]);
    default:
      return e;
  }
}
