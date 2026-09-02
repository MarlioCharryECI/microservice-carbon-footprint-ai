import { CarbonInputValidator } from '../domain/carbon-input.validator';
import { ICarbonCalculator } from '../domain/carbon-calculator';
import { CarbonCalculationResult } from '../domain/types';

/**
 * Capa de aplicación: orquesta validación + cálculo. Es el único punto
 * que el controlador HTTP conoce, así que el transporte (Express, una
 * cola de mensajes, un CLI) queda desacoplado del dominio.
 */
export class CarbonTrackerApplicationService {
  constructor(
    private readonly validator: CarbonInputValidator,
    private readonly calculator: ICarbonCalculator,
  ) {}

  calculateFootprint(rawInput: unknown): CarbonCalculationResult {
    const validInput = this.validator.validate(rawInput);
    return this.calculator.calculate(validInput);
  }
}
