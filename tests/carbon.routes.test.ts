import request from 'supertest';
import { createApp } from '../src/app';

/**
 * Prueba de la capa HTTP completa (Express real, sin mocks) usando
 * supertest. Verifica que los errores de dominio se traducen al código
 * de estado correcto y que la respuesta exitosa tiene la forma esperada.
 */
describe('POST /api/v1/carbon-footprint', () => {
  const app = createApp();

  it('responde 200 con el desglose del cálculo para una entrada válida', async () => {
    const response = await request(app).post('/api/v1/carbon-footprint').send({
      vehicleType: 'ELECTRIC',
      cargoWeightTons: 4,
      distanceKm: 25,
      efficiencyFactor: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      vehicleType: 'ELECTRIC',
      cargoWeightTons: 4,
      distanceKm: 25,
    });
    expect(typeof response.body.data.totalEmissionsKgCO2).toBe('number');
  });

  it('responde 400 cuando cargoWeightTons es negativo', async () => {
    const response = await request(app).post('/api/v1/carbon-footprint').send({
      vehicleType: 'DIESEL',
      cargoWeightTons: -10,
      distanceKm: 5,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 422 cuando el tipo de vehículo no está soportado', async () => {
    const response = await request(app).post('/api/v1/carbon-footprint').send({
      vehicleType: 'SCOOTER',
      cargoWeightTons: 1,
      distanceKm: 5,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('UNSUPPORTED_VEHICLE_TYPE');
  });

  it('responde 200 en GET /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
