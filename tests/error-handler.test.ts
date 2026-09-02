import { Request, Response } from 'express';
import { errorHandler } from '../src/middleware/error-handler';
import { ValidationError } from '../src/domain/errors';

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('mapea un DomainError a su httpStatusCode y code correspondientes', () => {
    const res = mockResponse();
    const error = new ValidationError('campo inválido', 'distanceKm');

    errorHandler(error, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'campo inválido' },
    });
  });

  it('devuelve 500 genérico (sin filtrar detalles internos) para un error no reconocido', () => {
    const res = mockResponse();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const internalError = new Error('falla de conexión a la base de datos en 10.0.0.5');

    errorHandler(internalError, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.error.code).toBe('INTERNAL_SERVER_ERROR');
    // El mensaje al cliente NO debe contener detalles internos del error real.
    expect(jsonArg.error.message).not.toContain('10.0.0.5');

    consoleSpy.mockRestore();
  });
});
