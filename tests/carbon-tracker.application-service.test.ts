import { CarbonTrackerApplicationService } from '../src/services/carbon-tracker.application-service';
import { CarbonInputValidator } from '../src/domain/carbon-input.validator';
import { CarbonCalculatorService } from '../src/domain/carbon-calculator';
import { StaticEmissionFactorProvider } from '../src/domain/emission-factors.provider';
import { UnsupportedVehicleTypeError, ValidationError } from '../src/domain/errors';

/**
 * Prueba de integración "en memoria": ensambla las piezas reales
 * (sin mocks) para verificar que la composición validator → calculator
 * funciona de punta a punta, tal como la usa el controlador.
 */
describe('CarbonTrackerApplicationService (integración)', () => {
  const service = new CarbonTrackerApplicationService(
    new CarbonInputValidator(),
    new CarbonCalculatorService(new StaticEmissionFactorProvider()),
  );

  it('valida y calcula de punta a punta para una entrada válida', () => {
    const result = service.calculateFootprint({
      vehicleType: 'HYBRID',
      cargoWeightTons: 2,
      distanceKm: 50,
      efficiencyFactor: 1,
    });

    expect(result.totalEmissionsKgCO2).toBeGreaterThan(0);
  });

  it('propaga ValidationError cuando la entrada es inválida', () => {
    expect(() =>
      service.calculateFootprint({ vehicleType: 'DIESEL', cargoWeightTons: -1, distanceKm: 1 }),
    ).toThrow(ValidationError);
  });

  it('propaga UnsupportedVehicleTypeError para un tipo de vehículo desconocido', () => {
    expect(() =>
      service.calculateFootprint({
        vehicleType: 'HORSE_CART',
        cargoWeightTons: 1,
        distanceKm: 1,
      }),
    ).toThrow(UnsupportedVehicleTypeError);
  });
});
