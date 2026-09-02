import express, { Express } from 'express';
import { StaticEmissionFactorProvider } from './domain/emission-factors.provider';
import { CarbonCalculatorService } from './domain/carbon-calculator';
import { CarbonInputValidator } from './domain/carbon-input.validator';
import { CarbonTrackerApplicationService } from './services/carbon-tracker.application-service';
import { CarbonController } from './controllers/carbon.controller';
import { createCarbonRoutes } from './routes/carbon.routes';
import { errorHandler } from './middleware/error-handler';

/**
 * Composition root: aquí y solo aquí se instancian las implementaciones
 * concretas y se inyectan en sus dependientes. El resto del código nunca
 * hace `new StaticEmissionFactorProvider()` directamente, lo que permite
 * sustituir cualquier pieza (por ejemplo, un proveedor de factores desde
 * base de datos) sin tocar domain/ ni controllers/.
 */
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const emissionFactorProvider = new StaticEmissionFactorProvider();
  const calculator = new CarbonCalculatorService(emissionFactorProvider);
  const validator = new CarbonInputValidator();
  const applicationService = new CarbonTrackerApplicationService(validator, calculator);
  const controller = new CarbonController(applicationService);

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api/v1', createCarbonRoutes(controller));

  app.use(errorHandler);

  return app;
}
