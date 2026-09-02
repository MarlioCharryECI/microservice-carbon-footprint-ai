import { CarbonCalculatorService } from '../src/domain/carbon-calculator';
import { IEmissionFactorProvider } from '../src/domain/emission-factors.provider';
import { VehicleType } from '../src/domain/types';

/**
 * Fake determinista del proveedor de factores: nos permite testear la
 * fórmula de cálculo de forma aislada, sin acoplar estas pruebas a los
 * valores reales de StaticEmissionFactorProvider (que se testea aparte).
 */
class FakeEmissionFactorProvider implements IEmissionFactorProvider {
  getFactor(): number {
    return 0.1; // kg CO2 / ton·km, valor fijo para facilitar la aritmética
  }
}

describe('CarbonCalculatorService', () => {
  const calculator = new CarbonCalculatorService(new FakeEmissionFactorProvider());

  it('calcula las emisiones como distancia × peso × factor × eficiencia', () => {
    const result = calculator.calculate({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 2,
      distanceKm: 100,
      efficiencyFactor: 1,
    });

    // 100 km × 2 t × 0.1 kgCO2/t·km × 1 = 20 kgCO2
    expect(result.totalEmissionsKgCO2).toBeCloseTo(20);
    expect(result.baseEmissionFactorKgPerTonKm).toBe(0.1);
  });

  it('usa 1 como factor de eficiencia por defecto si no se especifica', () => {
    const result = calculator.calculate({
      vehicleType: VehicleType.HYBRID,
      cargoWeightTons: 5,
      distanceKm: 10,
    });

    expect(result.efficiencyFactor).toBe(1);
    // 10 km × 5 t × 0.1 × 1 = 5 kgCO2
    expect(result.totalEmissionsKgCO2).toBeCloseTo(5);
  });

  it('escala linealmente con el factor de eficiencia', () => {
    const base = calculator.calculate({
      vehicleType: VehicleType.ELECTRIC,
      cargoWeightTons: 1,
      distanceKm: 50,
      efficiencyFactor: 1,
    });
    const lessEfficient = calculator.calculate({
      vehicleType: VehicleType.ELECTRIC,
      cargoWeightTons: 1,
      distanceKm: 50,
      efficiencyFactor: 1.5,
    });

    expect(lessEfficient.totalEmissionsKgCO2).toBeCloseTo(base.totalEmissionsKgCO2 * 1.5);
  });

  // --- Casos de borde ---

  it('retorna 0 kgCO2 cuando la distancia es cero', () => {
    const result = calculator.calculate({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 10,
      distanceKm: 0,
    });

    expect(result.totalEmissionsKgCO2).toBe(0);
  });

  it('retorna 0 kgCO2 cuando el peso de la carga es cero', () => {
    const result = calculator.calculate({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 0,
      distanceKm: 500,
    });

    expect(result.totalEmissionsKgCO2).toBe(0);
  });

  it('redondea el resultado a 4 decimales para evitar ruido de punto flotante', () => {
    const result = calculator.calculate({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 1,
      distanceKm: 3,
      efficiencyFactor: 1 / 3,
    });

    expect(Number.isInteger(result.totalEmissionsKgCO2 * 10000)).toBe(true);
  });
});
