import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../domain/errors';

/**
 * Middleware centralizado de errores. Mantener el mapeo error → HTTP en
 * un solo lugar evita que cada controlador reinvente sus propios códigos
 * de estado y asegura una forma de respuesta consistente para el cliente.
 *
 * IMPORTANTE (seguridad): para errores no reconocidos (bugs, fallos de
 * infraestructura) NUNCA se devuelve `error.message` ni el stack al
 * cliente — solo se registra en el log del servidor — para no filtrar
 * detalles internos (rutas de archivo, dependencias, stack traces).
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (error instanceof DomainError) {
    res.status(error.httpStatusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado. Intenta nuevamente más tarde.',
    },
  });
}
