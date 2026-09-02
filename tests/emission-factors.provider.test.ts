import { StaticEmissionFactorProvider } from '../src/domain/emission-factors.provider';
import { UnsupportedVehicleTypeError } from '../src/domain/errors';
import { VehicleType } from '../src/domain/types';

describe('StaticEmissionFactorProvider', () => {
  const provider = new StaticEmissionFactorProvider();

  it.each([VehicleType.ELECTRIC, VehicleType.DIESEL, VehicleType.HYBRID])(
    'devuelve un factor positivo para %s',
    (vehicleType) => {
      const factor = provider.getFactor(vehicleType);
      expect(factor).toBeGreaterThan(0);
    },
  );

  it('el factor de DIESEL es mayor que el de HYBRID y ELECTRIC (edge case de negocio)', () => {
    const diesel = provider.getFactor(VehicleType.DIESEL);
    const hybrid = provider.getFactor(VehicleType.HYBRID);
    const electric = provider.getFactor(VehicleType.ELECTRIC);

    expect(diesel).toBeGreaterThan(hybrid);
    expect(hybrid).toBeGreaterThan(electric);
  });

  it('lanza UnsupportedVehicleTypeError para un tipo no soportado', () => {
    // @ts-expect-error: forzamos un valor inválido a propósito para el test
    expect(() => provider.getFactor('GASOLINE')).toThrow(UnsupportedVehicleTypeError);
  });
});
