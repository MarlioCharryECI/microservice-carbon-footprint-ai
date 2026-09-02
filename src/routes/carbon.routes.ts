import { Router } from 'express';
import { CarbonController } from '../controllers/carbon.controller';

export function createCarbonRoutes(controller: CarbonController): Router {
  const router = Router();

  /**
   * POST /api/v1/carbon-footprint
   * Body: { vehicleType, cargoWeightTons, distanceKm, efficiencyFactor? }
   */
  router.post('/carbon-footprint', controller.calculateFootprint);

  return router;
}
