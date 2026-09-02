import { CarbonCalculationInput, VehicleType } from './types';
import { UnsupportedVehicleTypeError, ValidationError } from './errors';

/**
 * Valida y normaliza la entrada cruda (por ejemplo, el body de un POST)
 * antes de que llegue a la lógica de cálculo. Separar esto en su propia
 * clase (Single Responsibility) permite testearlo de forma aislada y
 * reutilizarlo desde otros entrypoints (CLI, cola de mensajes) además
 * del controlador HTTP.
 */
export class CarbonInputValidator {
  private static readonly SUPPORTED_TYPES = new Set<string>(Object.values(VehicleType));

  validate(raw: unknown): CarbonCalculationInput {
    if (typeof raw !== 'object' || raw === null) {
      throw new ValidationError('El cuerpo de la solicitud debe ser un objeto JSON.', 'body');
    }

    const input = raw as Record<string, unknown>;

    const vehicleType = this.validateVehicleType(input.vehicleType);
    const cargoWeightTons = this.validateNonNegativeNumber(
      input.cargoWeightTons,
      'cargoWeightTons',
    );
    const distanceKm = this.validateNonNegativeNumber(input.distanceKm, 'distanceKm');
    const efficiencyFactor = this.validateEfficiencyFactor(input.efficiencyFactor);

    return { vehicleType, cargoWeightTons, distanceKm, efficiencyFactor };
  }

  private validateVehicleType(value: unknown): VehicleType {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError('vehicleType es requerido y debe ser un string.', 'vehicleType');
    }
    const normalized = value.trim().toUpperCase();
    if (!CarbonInputValidator.SUPPORTED_TYPES.has(normalized)) {
      throw new UnsupportedVehicleTypeError(value);
    }
    return normalized as VehicleType;
  }

  private validateNonNegativeNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError(`${field} es requerido y debe ser un número finito.`, field);
    }
    if (value < 0) {
      throw new ValidationError(`${field} no puede ser negativo (recibido: ${value}).`, field);
    }
    return value;
  }

  private validateEfficiencyFactor(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError('efficiencyFactor debe ser un número finito.', 'efficiencyFactor');
    }
    if (value <= 0) {
      throw new ValidationError(
        `efficiencyFactor debe ser estrictamente positivo (recibido: ${value}).`,
        'efficiencyFactor',
      );
    }
    return value;
  }
}
