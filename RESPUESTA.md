# Respuesta

Este documento cubre las dos actividades del enunciado: (1) el ejercicio de reflexión del caso "EcoRoute" y (2) el desarrollo completo del microservicio **Carbon Tracker Service** para EcoLogistics, con bitácora de prompts, código fuente, suite de pruebas y reflexión crítica.

---

## Parte 1 — Ejercicio de Reflexión (Caso EcoRoute)

### 1. Precisión vs. Ambigüedad: ¿de qué manera el prompt eliminó la ambigüedad de "ganar puntos"?

La idea bruta decía solo "si elige el bus, gana puntos", sin definir cuántos puntos, bajo qué condición exacta, ni qué hace que una alternativa cuente como "más verde". El prompt no le pidió a la IA que "mejorara el texto"; le pidió una **estructura obligatoria** (Historia de Usuario con Como/Quiero/Para + Criterios de Aceptación en Gherkin), y esa estructura por sí sola fuerza la desambiguación: un criterio de aceptación tiene que decir un umbral verificable ("si la ruta alternativa reduce más del 30% de emisiones") en vez de un adjetivo vago ("una ruta más verde"). Al pedir además "Consideraciones Técnicas", la IA quedó obligada a explicitar el mecanismo detrás de "ganar puntos" (un motor de reglas de gamificación, no un número fijo hardcodeado). En otras palabras, la ambigüedad no se eliminó porque la IA "entendiera mejor" la frase, sino porque el formato de salida exigido no tiene espacio sintáctico para dejar una regla de negocio sin cuantificar.

### 2. Validación Humana: ¿cuál es el papel del Ingeniero de Software al revisar los criterios de aceptación generados?

El ingeniero no puede tratar la salida de la IA como specification-ready solo porque tiene buen formato. Su rol es específicamente:

- **Verificar factibilidad técnica real**, no solo narrativa: por ejemplo, confirmar que existe una fuente de datos GTFS en tiempo real para la ciudad objetivo antes de aceptar el criterio "el sistema debe mostrar el próximo bus"; si no existe, el criterio es inválido aunque esté bien redactado.
- **Detectar huecos de negocio que la IA no puede conocer**: reglas de la empresa, presupuesto de la API de Google Maps, límites legales de recolección de ubicación del usuario (protección de datos), o si "Eco-Puntos" tiene implicaciones fiscales/legales al ser canjeables.
- **Priorizar y recortar alcance**: la IA tiende a generar criterios exhaustivos; el ingeniero decide qué entra en el MVP y qué se pospone.
- **Convertir el criterio en algo verificable por QA**: un Gherkin generado por IA puede sonar bien pero no ser automatizable tal cual (por ejemplo, "más del 30%" necesita definir el baseline exacto de comparación).

En resumen: la IA acelera la primera versión, pero la responsabilidad de que el requerimiento sea correcto, viable y completo sigue siendo enteramente del ingeniero — la IA no tiene contexto de negocio, presupuesto ni restricciones legales.

### 3. Extensión técnica: ¿qué información adicional debería incluir el prompt para pedir "Endpoints de la API" con precisión técnica?

Pedir solo "dame los endpoints" produce una lista genérica de REST CRUD. Para que la respuesta sea técnicamente precisa y usable, el prompt debería incluir:

- **El estilo de API** (REST, GraphQL, gRPC) y la convención de versionado (`/api/v1/...`).
- **El modelo de datos exacto** de entrada/salida (los mismos tipos usados en las historias de usuario: `route`, `co2Emissions`, `ecoPoints`), para que la IA no invente nombres de campos distintos a los ya acordados.
- **Los códigos de estado y forma de los errores esperados** (¿qué pasa sin señal GPS? ¿qué código HTTP y payload de error se espera?), que es justamente el "caso de borde" que la IA detectó en la sección 5.
- **Requisitos de autenticación/autorización** (¿el endpoint requiere JWT de usuario? ¿hay rate limiting?).
- **Restricciones no funcionales**: latencia esperada (una ruta debe calcularse en tiempo real mientras el usuario camina), paginación si aplica, e idempotencia para el endpoint que otorga Eco-Puntos (evitar que un reintento de red duplique el premio).
- **El contrato con servicios externos ya mencionados** (Google Maps API, GTFS) para que la IA diseñe los endpoints internos como una fachada coherente sobre esas integraciones, no como llamadas directas expuestas al cliente.

Sin esa información, la IA puede producir endpoints sintácticamente correctos pero técnicamente incompatibles con la arquitectura real del sistema.

---

## Parte 2 — Microservicio de Cálculo de Huella de Carbono (Carbon Tracker Service)

**Stack:** Node.js + TypeScript + Express, pruebas con Jest + Supertest.
**Resultado de verificación:** `tsc --noEmit` sin errores · `npm test` → **30/30 pruebas pasando**, cobertura **99.06% statements / 96.15% branches / 100% functions**.

### 1. Bitácora de Prompts

A continuación, los prompts principales utilizados durante el desarrollo (como Ingeniero Senior dirigiendo a la IA como pair programmer), organizados por fase y técnica.

---

**Fase 1 · Prompt de contexto (Persona + Few-shot de estilo)**

> "Actúa como un Ingeniero de Software Senior especializado en backend con Node.js y TypeScript, con fuerte enfoque en Clean Code y los principios SOLID. Vamos a construir el `Carbon Tracker Service` para EcoLogistics: un microservicio que calcula emisiones de CO2 a partir de tipo de vehículo (Eléctrico, Diésel, Híbrido), peso de carga en toneladas, distancia en km y un factor de eficiencia. Requisitos no negociables: separación estricta entre lógica de negocio y capa HTTP, inyección de dependencias (no `new` esparcido en el código de negocio), manejo de errores tipado (nunca lanzar `Error` genérico), y cobertura de pruebas ≥90%. No escribas código todavía — primero devuélveme la estructura de carpetas propuesta y la lista de clases/interfaces con su responsabilidad, en una tabla."

*Decisión resultante:* estructura `domain/` (reglas de negocio puras) → `services/` (orquestación) → `controllers/` (traducción HTTP) → `routes/` → `middleware/`, con interfaces (`IEmissionFactorProvider`, `ICarbonCalculator`) para permitir inyección de dependencias (Dependency Inversion Principle).

---

**Fase 1 · Chain-of-Thought — lógica de cálculo antes que código**

> "Antes de escribir una sola línea de código: piensa paso a paso cómo debería ser la fórmula de cálculo de emisiones. Considera: (1) ¿el factor de emisión depende solo del tipo de vehículo o también de la carga? (2) ¿cómo entra el 'factor de eficiencia' en la fórmula sin duplicar la información del tipo de vehículo? (3) ¿qué unidades usamos para que el resultado sea auditable por un no-ingeniero (ej. un director de sostenibilidad)? Explica tu razonamiento y solo al final propone la fórmula matemática."

*Respuesta clave / decisión:* la IA razonó que el factor de emisión "base" es una propiedad de la categoría del vehículo (kg CO2 por tonelada-kilómetro, unidad estándar en logística), mientras que el "factor de eficiencia" debe ser un **multiplicador independiente** que representa cuánto se desvía ese vehículo específico del promedio de su categoría (1 = promedio). Esto evita mezclar dos conceptos en una sola constante y hace que el resultado sea trazable: `emisiones_kg = distanciaKm × pesoToneladas × factorBase(tipoVehículo) × factorEficiencia`. Esa fórmula quedó implementada literalmente en `CarbonCalculatorService.calculate()`.

---

**Fase 2 · Desarrollo de la función principal + Iterative Refinement**

> "Implementa `CarbonCalculatorService` aplicando la fórmula acordada. Recibe el proveedor de factores de emisión por constructor (no lo instancies dentro de la clase)."
>
> — *Refinamiento 1:* "¿Qué pasa si `distanceKm` es 0 o `cargoWeightTons` es 0? ¿Y si son negativos? No los trates igual: separa 'valor trivial válido' (cero) de 'valor inválido' (negativo) y muévelo a una clase `CarbonInputValidator` aparte, no dentro del cálculo."
> — *Refinamiento 2:* "El resultado de una multiplicación de floats en JS puede traer arrastre de precisión (ej. `0.1 * 3` no da exactamente `0.3`). Ajusta el resultado final para que sea seguro para reportes financieros/sostenibilidad."
> — *Refinamiento 3:* "`efficiencyFactor` es opcional en la entrada del usuario, pero el resultado final que devuelve la API nunca debe ser `undefined` — decide un valor por defecto explícito y documenta por qué."

*Decisión resultante:* se creó `CarbonInputValidator` como clase independiente (Single Responsibility) que distingue cero (válido, trayecto trivial) de negativo (error `ValidationError`); el resultado se redondea a 4 decimales con `toFixed`; `efficiencyFactor` por defecto es `1` (eficiencia estándar de la categoría), documentado en el tipo `CarbonCalculationInput`.

---

**Fase 2 · Modularización — separar negocio de controladores**

> "Ahora divide esto en capas: quiero que el controlador Express NO conozca la fórmula de cálculo ni las reglas de validación, solo reciba `req.body`, se lo pase a una capa de aplicación, y traduzca el resultado o el error a HTTP. Muéstrame primero el diagrama de dependencias (quién inyecta a quién) antes del código."

*Respuesta clave:* la IA propuso un *composition root* único (`app.ts`) donde se instancian las implementaciones concretas (`StaticEmissionFactorProvider`, `CarbonCalculatorService`, `CarbonInputValidator`) y se inyectan hacia arriba: `Provider → Calculator → ApplicationService → Controller → Router`. Ningún archivo fuera de `app.ts` hace `new` de una implementación concreta, lo que permite sustituir el proveedor de factores (por ejemplo, por uno respaldado en base de datos) sin tocar el resto del sistema.

---

**Fase 3 · Generación de pruebas unitarias (Few-shot de casos de borde)**

> "Genera la suite de pruebas con Jest para `CarbonCalculatorService`, `CarbonInputValidator` y las rutas HTTP. Cubre explícitamente estos casos de borde, con este formato de ejemplo:
> `it('retorna 0 kgCO2 cuando la distancia es cero', () => { ... })`
> Además cubre: carga negativa, distancia negativa, tipo de vehículo no soportado, `efficiencyFactor` en cero o negativo, entrada `null`/no-objeto, y precisión decimal. No mockees `CarbonCalculatorService` en la prueba de integración de rutas — usa la composición real para detectar errores de wiring."

*Decisión resultante:* 30 pruebas en 6 suites, incluyendo una prueba de integración con `supertest` sobre la app Express real (sin mocks) para verificar que el error de dominio efectivamente se traduce al código HTTP correcto (400 para `ValidationError`, 422 para `UnsupportedVehicleTypeError`).

---

**Fase 3 · Code Review en sesión nueva (seguridad y rendimiento)**

> *(Pegado del código completo en una conversación nueva, sin el historial de diseño previo)*: "Actúa como revisor de código senior. No conoces el contexto de por qué se tomó cada decisión. Revisa este microservicio exclusivamente por seguridad y rendimiento. Sé exigente: señala cualquier cosa que filtraría información sensible en un error 500, cualquier validación de entrada insuficiente, y cualquier operación costosa que se repita innecesariamente."

*Hallazgos de esa revisión y qué se corrigió* — ver sección "Revisión de Código" más abajo, con el detalle de qué se aceptó, qué se corrigió en este entregable y qué queda como mejora futura documentada.

---

### 2. Código Fuente

Estructura del proyecto:

```
carbon-tracker-service/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── app.ts                                    # composition root
│   ├── server.ts                                 # bootstrap del servidor HTTP
│   ├── domain/
│   │   ├── types.ts                               # VehicleType, DTOs de entrada/salida
│   │   ├── errors.ts                              # DomainError, ValidationError, UnsupportedVehicleTypeError
│   │   ├── emission-factors.provider.ts           # IEmissionFactorProvider + StaticEmissionFactorProvider
│   │   ├── carbon-input.validator.ts              # CarbonInputValidator
│   │   └── carbon-calculator.ts                   # ICarbonCalculator + CarbonCalculatorService (fórmula)
│   ├── services/
│   │   └── carbon-tracker.application-service.ts  # orquesta validación + cálculo
│   ├── controllers/
│   │   └── carbon.controller.ts                   # traduce HTTP <-> capa de aplicación
│   ├── routes/
│   │   └── carbon.routes.ts                       # POST /api/v1/carbon-footprint
│   └── middleware/
│       └── error-handler.ts                       # mapeo centralizado de errores a HTTP
└── tests/
    ├── carbon-calculator.test.ts
    ├── carbon-input.validator.test.ts
    ├── emission-factors.provider.test.ts
    ├── carbon-tracker.application-service.test.ts
    ├── carbon.routes.test.ts
    └── error-handler.test.ts
```

#### `src/domain/types.ts`

```typescript
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
```

#### `src/domain/errors.ts`

```typescript
/**
 * Errores de dominio. Se modelan como clases propias (en vez de lanzar
 * `Error` genéricos o devolver `null`) para que la capa de controladores
 * pueda distinguir "entrada inválida" (400) de "tipo no soportado" (422)
 * de un fallo inesperado (500), sin acoplarse a strings mágicos.
 */

export abstract class DomainError extends Error {
  abstract readonly httpStatusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  readonly httpStatusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
  }
}

export class UnsupportedVehicleTypeError extends DomainError {
  readonly httpStatusCode = 422;
  readonly code = 'UNSUPPORTED_VEHICLE_TYPE';

  constructor(vehicleType: string) {
    super(
      `Tipo de vehículo no soportado: "${vehicleType}". Tipos válidos: ELECTRIC, DIESEL, HYBRID.`,
    );
  }
}
```

#### `src/domain/emission-factors.provider.ts`

```typescript
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
```

#### `src/domain/carbon-input.validator.ts`

```typescript
import { CarbonCalculationInput, VehicleType } from './types';
import { UnsupportedVehicleTypeError, ValidationError } from './errors';

/**
 * Valida y normaliza la entrada cruda (por ejemplo, el body de un POST)
 * antes de que llegue a la lógica de cálculo. Separar esto en su propia
 * clase (Single Responsibility) permite testearlo de forma aislada y
 * reutilizarlo desde otros entrypoints (CLI, cola de mensajes) además
 * del controlador HTTP.
 */
export class CarbonInputValidator {
  private static readonly SUPPORTED_TYPES = new Set<string>(Object.values(VehicleType));

  validate(raw: unknown): CarbonCalculationInput {
    if (typeof raw !== 'object' || raw === null) {
      throw new ValidationError('El cuerpo de la solicitud debe ser un objeto JSON.', 'body');
    }

    const input = raw as Record<string, unknown>;

    const vehicleType = this.validateVehicleType(input.vehicleType);
    const cargoWeightTons = this.validateNonNegativeNumber(
      input.cargoWeightTons,
      'cargoWeightTons',
    );
    const distanceKm = this.validateNonNegativeNumber(input.distanceKm, 'distanceKm');
    const efficiencyFactor = this.validateEfficiencyFactor(input.efficiencyFactor);

    return { vehicleType, cargoWeightTons, distanceKm, efficiencyFactor };
  }

  private validateVehicleType(value: unknown): VehicleType {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError('vehicleType es requerido y debe ser un string.', 'vehicleType');
    }
    const normalized = value.trim().toUpperCase();
    if (!CarbonInputValidator.SUPPORTED_TYPES.has(normalized)) {
      throw new UnsupportedVehicleTypeError(value);
    }
    return normalized as VehicleType;
  }

  private validateNonNegativeNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError(`${field} es requerido y debe ser un número finito.`, field);
    }
    if (value < 0) {
      throw new ValidationError(`${field} no puede ser negativo (recibido: ${value}).`, field);
    }
    return value;
  }

  private validateEfficiencyFactor(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError('efficiencyFactor debe ser un número finito.', 'efficiencyFactor');
    }
    if (value <= 0) {
      throw new ValidationError(
        `efficiencyFactor debe ser estrictamente positivo (recibido: ${value}).`,
        'efficiencyFactor',
      );
    }
    return value;
  }
}
```

#### `src/domain/carbon-calculator.ts`

```typescript
import { CarbonCalculationInput, CarbonCalculationResult } from './types';
import { IEmissionFactorProvider } from './emission-factors.provider';

/** Valor por defecto cuando el cliente no envía un factor de eficiencia. */
const DEFAULT_EFFICIENCY_FACTOR = 1;

/**
 * Puerto de la lógica de cálculo. Definir la interfaz permite mockear el
 * cálculo en pruebas de integración de controladores sin depender de la
 * implementación concreta (Dependency Inversion / Interface Segregation).
 */
export interface ICarbonCalculator {
  calculate(input: CarbonCalculationInput): CarbonCalculationResult;
}

/**
 * Servicio de dominio: calcula las emisiones de CO2 de un trayecto.
 *
 * Fórmula:
 *   emisiones_kgCO2 = distanciaKm × pesoToneladas × factorBase(tipoVehículo) × factorEficiencia
 *
 * Esta clase asume que `input` YA fue validado (ver CarbonInputValidator).
 * Mantenerla libre de validación de "forma" de los datos es lo que la hace
 * trivial de testear con Jest: es una función pura sobre sus argumentos y
 * el proveedor de factores inyectado.
 */
export class CarbonCalculatorService implements ICarbonCalculator {
  constructor(private readonly emissionFactorProvider: IEmissionFactorProvider) {}

  calculate(input: CarbonCalculationInput): CarbonCalculationResult {
    const efficiencyFactor = input.efficiencyFactor ?? DEFAULT_EFFICIENCY_FACTOR;
    const baseEmissionFactorKgPerTonKm = this.emissionFactorProvider.getFactor(
      input.vehicleType,
    );

    const rawEmissions =
      input.distanceKm * input.cargoWeightTons * baseEmissionFactorKgPerTonKm * efficiencyFactor;

    return {
      vehicleType: input.vehicleType,
      cargoWeightTons: input.cargoWeightTons,
      distanceKm: input.distanceKm,
      efficiencyFactor,
      baseEmissionFactorKgPerTonKm,
      // Redondeo a 4 decimales: suficiente precisión para reportes sin
      // arrastrar errores de punto flotante en la capa de presentación.
      totalEmissionsKgCO2: Number(rawEmissions.toFixed(4)),
    };
  }
}
```

#### `src/services/carbon-tracker.application-service.ts`

```typescript
import { CarbonInputValidator } from '../domain/carbon-input.validator';
import { ICarbonCalculator } from '../domain/carbon-calculator';
import { CarbonCalculationResult } from '../domain/types';

/**
 * Capa de aplicación: orquesta validación + cálculo. Es el único punto
 * que el controlador HTTP conoce, así que el transporte (Express, una
 * cola de mensajes, un CLI) queda desacoplado del dominio.
 */
export class CarbonTrackerApplicationService {
  constructor(
    private readonly validator: CarbonInputValidator,
    private readonly calculator: ICarbonCalculator,
  ) {}

  calculateFootprint(rawInput: unknown): CarbonCalculationResult {
    const validInput = this.validator.validate(rawInput);
    return this.calculator.calculate(validInput);
  }
}
```

#### `src/controllers/carbon.controller.ts`

```typescript
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
```

#### `src/routes/carbon.routes.ts`

```typescript
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
```

#### `src/middleware/error-handler.ts`

```typescript
import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../domain/errors';

/**
 * Middleware centralizado de errores. Mantener el mapeo error → HTTP en
 * un solo lugar evita que cada controlador reinvente sus propios códigos
 * de estado y asegura una forma de respuesta consistente para el cliente.
 *
 * IMPORTANTE (seguridad): para errores no reconocidos (bugs, fallos de
 * infraestructura) NUNCA se devuelve `error.message` ni el stack al
 * cliente — solo se registra en el log del servidor — para no filtrar
 * detalles internos (rutas de archivo, dependencias, stack traces).
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (error instanceof DomainError) {
    res.status(error.httpStatusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado. Intenta nuevamente más tarde.',
    },
  });
}
```

#### `src/app.ts` (composition root)

```typescript
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
```

#### `src/server.ts`

```typescript
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Carbon Tracker Service escuchando en el puerto ${PORT}`);
});
```

**Ejemplo de uso del endpoint:**

```bash
curl -X POST http://localhost:3000/api/v1/carbon-footprint \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"DIESEL","cargoWeightTons":2.5,"distanceKm":180,"efficiencyFactor":1.1}'
```

```json
{
  "data": {
    "vehicleType": "DIESEL",
    "cargoWeightTons": 2.5,
    "distanceKm": 180,
    "efficiencyFactor": 1.1,
    "baseEmissionFactorKgPerTonKm": 0.162,
    "totalEmissionsKgCO2": 80.19
  }
}
```

---

### 3. Suite de Pruebas

Comando: `npm test` → `jest --coverage`. **Resultado real de ejecución:**

```
Test Suites: 6 passed, 6 total
Tests:       30 passed, 30 total
----------------------------------------|---------|----------|---------|---------
File                                    | % Stmts | % Branch | % Funcs | % Lines
----------------------------------------|---------|----------|---------|---------
All files                               |   99.06 |    96.15 |     100 |   99.05
```

#### `tests/carbon-calculator.test.ts`

```typescript
import { CarbonCalculatorService } from '../src/domain/carbon-calculator';
import { IEmissionFactorProvider } from '../src/domain/emission-factors.provider';
import { VehicleType } from '../src/domain/types';

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
```

#### `tests/emission-factors.provider.test.ts`

```typescript
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
```

#### `tests/carbon-input.validator.test.ts`

```typescript
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

  it('rechaza un body que no es un objeto', () => {
    expect(() => validator.validate(null)).toThrow(ValidationError);
    expect(() => validator.validate('un string')).toThrow(ValidationError);
    expect(() => validator.validate(42)).toThrow(ValidationError);
  });

  it('rechaza un tipo de vehículo no soportado', () => {
    expect(() =>
      validator.validate({ vehicleType: 'GASOLINE', cargoWeightTons: 1, distanceKm: 1 }),
    ).toThrow(UnsupportedVehicleTypeError);
  });

  it('rechaza vehicleType ausente o vacío', () => {
    expect(() => validator.validate({ cargoWeightTons: 1, distanceKm: 1 })).toThrow(
      ValidationError,
    );
    expect(() =>
      validator.validate({ vehicleType: '  ', cargoWeightTons: 1, distanceKm: 1 }),
    ).toThrow(ValidationError);
  });

  it('rechaza cargoWeightTons negativo (carga negativa)', () => {
    expect(() =>
      validator.validate({ vehicleType: VehicleType.DIESEL, cargoWeightTons: -5, distanceKm: 10 }),
    ).toThrow(ValidationError);
  });

  it('rechaza distanceKm negativo', () => {
    expect(() =>
      validator.validate({ vehicleType: VehicleType.DIESEL, cargoWeightTons: 5, distanceKm: -1 }),
    ).toThrow(ValidationError);
  });

  it('acepta distanceKm y cargoWeightTons en cero (no son errores, son trayectos triviales)', () => {
    expect(() =>
      validator.validate({ vehicleType: VehicleType.DIESEL, cargoWeightTons: 0, distanceKm: 0 }),
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
```

#### `tests/carbon-tracker.application-service.test.ts`

```typescript
import { CarbonTrackerApplicationService } from '../src/services/carbon-tracker.application-service';
import { CarbonInputValidator } from '../src/domain/carbon-input.validator';
import { CarbonCalculatorService } from '../src/domain/carbon-calculator';
import { StaticEmissionFactorProvider } from '../src/domain/emission-factors.provider';
import { UnsupportedVehicleTypeError, ValidationError } from '../src/domain/errors';

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
```

#### `tests/carbon.routes.test.ts`

```typescript
import request from 'supertest';
import { createApp } from '../src/app';

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
```

#### `tests/error-handler.test.ts`

```typescript
import { Request, Response } from 'express';
import { errorHandler } from '../src/middleware/error-handler';
import { ValidationError } from '../src/domain/errors';

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('mapea un DomainError a su httpStatusCode y code correspondientes', () => {
    const res = mockResponse();
    const error = new ValidationError('campo inválido', 'distanceKm');
    errorHandler(error, {} as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'campo inválido' },
    });
  });

  it('devuelve 500 genérico (sin filtrar detalles internos) para un error no reconocido', () => {
    const res = mockResponse();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const internalError = new Error('falla de conexión a la base de datos en 10.0.0.5');

    errorHandler(internalError, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(jsonArg.error.message).not.toContain('10.0.0.5');

    consoleSpy.mockRestore();
  });
});
```

---

### Revisión de Código (Fase 3.2 — sesión independiente enfocada en seguridad y rendimiento)

Al pegar el código completo en una sesión nueva y pedir una revisión crítica sin contexto de diseño previo, surgieron estos hallazgos:

| # | Hallazgo | Severidad | Estado en este entregable |
|---|---|---|---|
| 1 | El error 500 no debe filtrar `error.message` ni stack trace al cliente | Alta (seguridad) | **Corregido**: `error-handler.ts` solo expone un mensaje genérico al cliente y registra el detalle real vía `console.error` (server-side). Cubierto por `error-handler.test.ts`. |
| 2 | Sin límite de tamaño en el body JSON, un cliente podría enviar payloads enormes (DoS de memoria) | Media (rendimiento/seguridad) | **Pendiente / mejora futura**: agregar `express.json({ limit: '10kb' })` — el endpoint solo necesita 4 campos numéricos/string cortos, no hay razón para aceptar payloads grandes. |
| 3 | No hay autenticación ni rate limiting en `/api/v1/carbon-footprint` | Media (seguridad) | **Fuera de alcance de este ejercicio**: se documenta como requisito para producción (API Gateway con JWT + rate limiting), ya que el enunciado no pidió una capa de auth. |
| 4 | Los factores de emisión están hardcodeados en el código fuente | Baja (mantenibilidad, no seguridad) | **Aceptado como decisión de diseño para el ejercicio**, pero mitigado con `IEmissionFactorProvider`: mover los factores a config/DB es un cambio de una sola clase, sin tocar el resto del sistema (Open/Closed). |
| 5 | `cargoWeightTons` y `distanceKm` no tienen un límite superior (¿y si alguien envía `1e308`?) | Baja | **Corregido parcialmente**: se rechaza `Infinity`/`NaN` explícitamente; un límite superior de negocio (p. ej. "ningún camión pesa más de 80 toneladas") queda como mejora futura, ya que depende de reglas de flota que no estaban en el enunciado. |
| 6 | El cálculo es síncrono y sin I/O, por lo que no hay riesgo de bloquear el event loop ni necesidad de cache | — (positivo) | Confirmado: no requiere cambios. |
| 7 | Las clases usan inyección de dependencias por constructor consistentemente, sin estado mutable compartido entre requests | — (positivo) | Confirmado: no hay condiciones de carrera entre solicitudes concurrentes. |

---

### 4. Reflexión Crítica

Usar un LLM como pair programmer en este ejercicio aceleró notablemente las partes mecánicas del trabajo: boilerplate de Express, estructura de carpetas por capas, y sobre todo la generación exhaustiva de casos de prueba (el LLM propuso sistemáticamente combinaciones de cero/negativo/no-numérico que un desarrollador bajo presión de tiempo suele saltarse). El beneficio más claro no fue "escribir código más rápido", sino mantener disciplina arquitectónica constante: cada vez que se le pidió al modelo justificar una decisión (por qué separar validación de cálculo, por qué inyectar el proveedor de factores en vez de instanciarlo), la respuesta reforzó principios SOLID de forma consistente en todo el proyecto, algo que es fácil de erosionar en sesiones de codificación largas y humanas.

El riesgo más importante, sin embargo, es específico de este dominio: **los factores de emisión de CO2 son datos regulados, no lógica de programación**. Un LLM puede generar con total confianza una tabla de factores kg CO2/tonelada-km que "suena" razonable pero que no está respaldada por una fuente verificada (EPA, DEFRA, ISO 14083); aceptar esos números sin contrastarlos con una fuente oficial sería el error más peligroso de todo el ejercicio, porque el código compilaría, las pruebas pasarían y el bug sería completamente invisible en un code review de software — es un error de dominio, no de sintaxis. Por eso en este entregable los factores se dejan aislados detrás de una interfaz (`IEmissionFactorProvider`) explícitamente para que un experto en sostenibilidad, no un ingeniero de software, sea quien valide y actualice esos valores. Un segundo riesgo real fue confirmado en la práctica: la primera versión de la suite de pruebas no cubría la rama de error 500 genérico, y el propio reporte de cobertura de Jest (no la IA) fue lo que lo hizo evidente — la lección operativa es que ninguna afirmación de un LLM sobre "cobertura completa" reemplaza correr la herramienta y leer el número real.

