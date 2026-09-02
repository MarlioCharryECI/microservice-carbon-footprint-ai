import { CarbonInputValidator } from '../src/domain/carbon-input.validator';
import { UnsupportedVehicleTypeError, ValidationError } from '../src/domain/errors';
import { VehicleType } from '../src/domain/types';

describe('CarbonInputValidator', () => {
  const validator = new CarbonInputValidator();

  it('acepta una entrada válida completa y normaliza el tipo de vehículo', () => {
    const result = validator.validate({
      vehicleType: 'diesel',
      cargoWeightTons: 3.5,
      distanceKm: 120,
      efficiencyFactor: 0.9,
    });

    expect(result).toEqual({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 3.5,
      distanceKm: 120,
      efficiencyFactor: 0.9,
    });
  });

  it('acepta una entrada válida sin efficiencyFactor (queda undefined, no error)', () => {
    const result = validator.validate({
      vehicleType: 'ELECTRIC',
      cargoWeightTons: 1,
      distanceKm: 10,
    });

    expect(result.efficiencyFactor).toBeUndefined();
  });

  // --- Casos de borde / errores ---

  it('rechaza un body que no es un objeto', () => {
    expect(() => validator.validate(null)).toThrow(ValidationError);
    expect(() => validator.validate('un string')).toThrow(ValidationError);
    expect(() => validator.validate(42)).toThrow(ValidationError);
  });

  it('rechaza un tipo de vehículo no soportado', () => {
    expect(() =>
      validator.validate({
        vehicleType: 'GASOLINE',
        cargoWeightTons: 1,
        distanceKm: 1,
      }),
    ).toThrow(UnsupportedVehicleTypeError);
  });

  it('rechaza vehicleType ausente o vacío', () => {
    expect(() =>
      validator.validate({ cargoWeightTons: 1, distanceKm: 1 }),
    ).toThrow(ValidationError);
    expect(() =>
      validator.validate({ vehicleType: '  ', cargoWeightTons: 1, distanceKm: 1 }),
    ).toThrow(ValidationError);
  });

  it('rechaza cargoWeightTons negativo (carga negativa)', () => {
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: -5,
        distanceKm: 10,
      }),
    ).toThrow(ValidationError);
  });

  it('rechaza distanceKm negativo', () => {
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 5,
        distanceKm: -1,
      }),
    ).toThrow(ValidationError);
  });

  it('acepta distanceKm y cargoWeightTons en cero (no son errores, son trayectos triviales)', () => {
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 0,
        distanceKm: 0,
      }),
    ).not.toThrow();
  });

  it('rechaza cargoWeightTons o distanceKm no numéricos, NaN o Infinity', () => {
    expect(() =>
      validator.validate({ vehicleType: VehicleType.DIESEL, cargoWeightTons: '5', distanceKm: 1 }),
    ).toThrow(ValidationError);
    expect(() =>
      validator.validate({ vehicleType: VehicleType.DIESEL, cargoWeightTons: NaN, distanceKm: 1 }),
    ).toThrow(ValidationError);
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 1,
        distanceKm: Infinity,
      }),
    ).toThrow(ValidationError);
  });

  it('rechaza efficiencyFactor cero o negativo', () => {
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 1,
        distanceKm: 1,
        efficiencyFactor: 0,
      }),
    ).toThrow(ValidationError);
    expect(() =>
      validator.validate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 1,
        distanceKm: 1,
        efficiencyFactor: -0.5,
      }),
    ).toThrow(ValidationError);
  });
});
