import { NextFunction, Request, Response } from 'express';
import { CarbonTrackerApplicationService } from '../services/carbon-tracker.application-service';

/**
 * Controlador HTTP: sólo traduce entre Express (req/res) y la capa de
 * aplicación. No contiene reglas de negocio — si mañana esto se expone
 * por gRPC o por un worker de cola, la lógica de domain/ y services/ se
 * reutiliza sin cambios.
 */
export class CarbonController {
  constructor(private readonly appService: CarbonTrackerApplicationService) {}

  /** POST /api/v1/carbon-footprint */
  calculateFootprint = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = this.appService.calculateFootprint(req.body);
      res.status(200).json({ data: result });
    } catch (error) {
      // Los DomainError son mapeados a códigos HTTP por el middleware
      // centralizado de errores (ver middleware/error-handler.ts).
      next(error);
    }
  };
}
