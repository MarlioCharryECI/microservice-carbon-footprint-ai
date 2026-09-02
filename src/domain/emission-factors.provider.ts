import { VehicleType } from './types';
import { UnsupportedVehicleTypeError } from './errors';

/**
 * Puerto (interfaz) para obtener el factor base de emisión de una
 * categoría de vehículo. Dependency Inversion Principle: el servicio de
 * cálculo depende de esta abstracción, no de una tabla concreta, así que
 * mañana el factor puede venir de una base de datos o de un proveedor
 * externo (p. ej. Climatiq, DEFRA) sin tocar la lógica de negocio.
 */
export interface IEmissionFactorProvider {
  /**
   * @returns factor base en kg de CO2 por tonelada-kilómetro (kg CO2 / t·km)
   * @throws UnsupportedVehicleTypeError si el tipo no está registrado
   */
  getFactor(vehicleType: VehicleType): number;
}

/**
 * Implementación en memoria con factores de referencia (fuente: promedios
 * de literatura de logística de última milla / EPA-DEFRA, simplificados
 * para el ejercicio). En producción esta tabla se sustituiría por una
 * consulta a una fuente regulada y versionada.
 */
export class StaticEmissionFactorProvider implements IEmissionFactorProvider {
  private static readonly FACTORS_KG_CO2_PER_TON_KM: Record<VehicleType, number> = {
    [VehicleType.DIESEL]: 0.162,
    [VehicleType.HYBRID]: 0.09,
    [VehicleType.ELECTRIC]: 0.045,
  };

  getFactor(vehicleType: VehicleType): number {
    const factor = StaticEmissionFactorProvider.FACTORS_KG_CO2_PER_TON_KM[vehicleType];
    if (factor === undefined) {
      throw new UnsupportedVehicleTypeError(String(vehicleType));
    }
    return factor;
  }
}
