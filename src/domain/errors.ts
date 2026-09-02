/**
 * Errores de dominio. Se modelan como clases propias (en vez de lanzar
 * `Error` genéricos o devolver `null`) para que la capa de controladores
 * pueda distinguir "entrada inválida" (400) de "tipo no soportado" (422)
 * de un fallo inesperado (500), sin acoplarse a strings mágicos.
 */

export abstract class DomainError extends Error {
  abstract readonly httpStatusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  readonly httpStatusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
  }
}

export class UnsupportedVehicleTypeError extends DomainError {
  readonly httpStatusCode = 422;
  readonly code = 'UNSUPPORTED_VEHICLE_TYPE';

  constructor(vehicleType: string) {
    super(
      `Tipo de vehículo no soportado: "${vehicleType}". Tipos válidos: ELECTRIC, DIESEL, HYBRID.`,
    );
  }
}
