import { CarbonCalculationInput, CarbonCalculationResult } from './types';
import { IEmissionFactorProvider } from './emission-factors.provider';

/** Valor por defecto cuando el cliente no envía un factor de eficiencia. */
const DEFAULT_EFFICIENCY_FACTOR = 1;

/**
 * Puerto de la lógica de cálculo. Definir la interfaz permite mockear el
 * cálculo en pruebas de integración de controladores sin depender de la
 * implementación concreta (Dependency Inversion / Interface Segregation).
 */
export interface ICarbonCalculator {
  calculate(input: CarbonCalculationInput): CarbonCalculationResult;
}

/**
 * Servicio de dominio: calcula las emisiones de CO2 de un trayecto.
 *
 * Fórmula:
 *   emisiones_kgCO2 = distanciaKm × pesoToneladas × factorBase(tipoVehículo) × factorEficiencia
 *
 * Esta clase asume que `input` YA fue validado (ver CarbonInputValidator).
 * Mantenerla libre de validación de "forma" de los datos es lo que la hace
 * trivial de testear con Jest: es una función pura sobre sus argumentos y
 * el proveedor de factores inyectado.
 */
export class CarbonCalculatorService implements ICarbonCalculator {
  constructor(private readonly emissionFactorProvider: IEmissionFactorProvider) {}

  calculate(input: CarbonCalculationInput): CarbonCalculationResult {
    const efficiencyFactor = input.efficiencyFactor ?? DEFAULT_EFFICIENCY_FACTOR;
    const baseEmissionFactorKgPerTonKm = this.emissionFactorProvider.getFactor(
      input.vehicleType,
    );

    const rawEmissions =
      input.distanceKm * input.cargoWeightTons * baseEmissionFactorKgPerTonKm * efficiencyFactor;

    return {
      vehicleType: input.vehicleType,
      cargoWeightTons: input.cargoWeightTons,
      distanceKm: input.distanceKm,
      efficiencyFactor,
      baseEmissionFactorKgPerTonKm,
      // Redondeo a 4 decimales: suficiente precisión para reportes sin
      // arrastrar errores de punto flotante en la capa de presentación.
      totalEmissionsKgCO2: Number(rawEmissions.toFixed(4)),
    };
  }
}
