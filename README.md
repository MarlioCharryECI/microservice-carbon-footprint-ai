# Carbon Tracker Service

Microservicio de cálculo de huella de carbono para EcoLogistics. Calcula las emisiones de CO2 de un trayecto a partir del tipo de vehículo (Eléctrico, Diésel, Híbrido), el peso de la carga (toneladas), la distancia recorrida (km) y un factor de eficiencia opcional.

Ver [`ANSWER.md`](./ANSWER.md) para la bitácora completa de prompts, el razonamiento de diseño (Chain-of-Thought), la revisión de código y la reflexión crítica sobre el uso de un LLM como pair programmer.

## Stack

- Node.js + TypeScript
- Express (capa HTTP)
- Jest + Supertest (pruebas unitarias e integración)

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Ejecutar el servicio

Modo desarrollo (recarga sobre `ts-node`, sin compilar a JS):

```bash
npm run dev
```

Modo producción (compila TypeScript y ejecuta el JS resultante):

```bash
npm run build
npm start
```

Por defecto el servidor escucha en el puerto `3000`. Puede cambiarse con la variable de entorno `PORT`:

```bash
PORT=4000 npm run dev
```

## Probar el servicio

### Health check

```bash
curl http://localhost:3000/health
```

### Calcular huella de carbono

```bash
curl -X POST http://localhost:3000/api/v1/carbon-footprint \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"DIESEL","cargoWeightTons":2.5,"distanceKm":180,"efficiencyFactor":1.1}'
```

Respuesta esperada:

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

`vehicleType` acepta `ELECTRIC`, `DIESEL` o `HYBRID` (no distingue mayúsculas/minúsculas). `efficiencyFactor` es opcional (por defecto `1`). Entradas inválidas responden `400` (`VALIDATION_ERROR`) y tipos de vehículo no soportados responden `422` (`UNSUPPORTED_VEHICLE_TYPE`).

## Ejecutar las pruebas

```bash
npm test
```

Esto corre `jest --coverage` sobre toda la suite (`tests/`) e imprime el reporte de cobertura. El proyecto exige un umbral mínimo de cobertura (`jest.config.js`): 90% statements, 85% branches, 90% functions, 90% lines. Última ejecución verificada: **30/30 pruebas pasando**, 99.06% statements / 96.15% branches / 100% functions.

## Verificar tipos (lint)

```bash
npm run lint
```

Ejecuta `tsc --noEmit` para comprobar que el proyecto compila sin errores de tipos.

## Estructura del proyecto

```
src/
├── app.ts                                    # composition root (inyección de dependencias)
├── server.ts                                 # bootstrap del servidor HTTP
├── domain/                                    # lógica de negocio pura
│   ├── types.ts                               # VehicleType, DTOs de entrada/salida
│   ├── errors.ts                              # ValidationError, UnsupportedVehicleTypeError
│   ├── emission-factors.provider.ts           # factores de emisión por tipo de vehículo
│   ├── carbon-input.validator.ts              # validación de datos de entrada
│   └── carbon-calculator.ts                   # fórmula de cálculo de emisiones
├── services/
│   └── carbon-tracker.application-service.ts  # orquesta validación + cálculo
├── controllers/
│   └── carbon.controller.ts                   # traduce HTTP <-> capa de aplicación
├── routes/
│   └── carbon.routes.ts                       # POST /api/v1/carbon-footprint
└── middleware/
    └── error-handler.ts                       # mapeo centralizado de errores a HTTP

tests/                                         # pruebas unitarias e integración (Jest + Supertest)
```

La lógica de negocio (`domain/`, `services/`) no depende de Express; el controlador HTTP solo traduce peticiones/respuestas. Todas las dependencias concretas se instancian en un único composition root (`app.ts`), lo que permite sustituir, por ejemplo, el proveedor de factores de emisión sin tocar el resto del sistema.
