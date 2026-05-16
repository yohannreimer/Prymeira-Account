import type { FastifyReply } from "fastify";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string
  ) {
    super(message);
  }
}

export function sendApiError(reply: FastifyReply, error: ApiError) {
  return reply.status(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message
    }
  });
}
