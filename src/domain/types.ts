/**
 * Tipos de vehículo soportados por el Carbon Tracker Service.
 * Usar un enum (en vez de strings sueltos) evita errores de tipeo
 * y centraliza los valores válidos en un solo lugar (Open/Closed:
 * añadir un tipo nuevo solo exige tocar este enum y el proveedor
 * de factores de emisión).
 */
export enum VehicleType {
  ELECTRIC = 'ELECTRIC',
  DIESEL = 'DIESEL',
  HYBRID = 'HYBRID',
}

/**
 * Datos de entrada para calcular la huella de carbono de un trayecto.
 */
export interface CarbonCalculationInput {
  /** Tipo de vehículo utilizado en el trayecto. */
  vehicleType: VehicleType;
  /** Peso de la carga transportada, en toneladas. Debe ser >= 0. */
  cargoWeightTons: number;
  /** Distancia recorrida, en kilómetros. Debe ser >= 0. */
  distanceKm: number;
  /**
   * Factor de eficiencia del combustible/energía del vehículo concreto,
   * relativo al promedio de su categoría (1 = promedio, <1 = más eficiente,
   * >1 = menos eficiente). Debe ser estrictamente positivo. Opcional:
   * si no se especifica, se asume 1 (eficiencia estándar).
   */
  efficiencyFactor?: number;
}

/**
 * Resultado del cálculo, con el desglose necesario para que el
 * consumidor (API, dashboard, motor de gamificación) pueda auditar
 * cómo se llegó al número final.
 */
export interface CarbonCalculationResult {
  vehicleType: VehicleType;
  cargoWeightTons: number;
  distanceKm: number;
  efficiencyFactor: number;
  /** Factor base de emisión de la categoría, en kg CO2 por tonelada-km. */
  baseEmissionFactorKgPerTonKm: number;
  /** Emisiones totales estimadas, en kilogramos de CO2. */
  totalEmissionsKgCO2: number;
}
