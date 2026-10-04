# Monitor de clasificación de residuos

Frontend Angular único para el backend MIRA / JetMax. Panel principal, Monitoreo y Clasificaciones, con dominio, aplicación, infraestructura y presentación. Cada componente mantiene su HTML, CSS y TypeScript separados.

## Ejecutar con la cámara real

Primera terminal PowerShell:

```powershell
cd C:\Users\PC\Desktop\Tesis\Backend-Rony-Pruebas
.\run-live.ps1
```

Segunda terminal:

```powershell
cd C:\Users\PC\Desktop\Tesis\Web-Angular
npm install
npm start
```

Abre **http://127.0.0.1:4200/monitoring**. `npm start` usa la API del puerto 8000. Debe aparecer “Cámara real · brazo virtual”; la vista grande usa MJPEG y el panel JPEG. Los controles del ciclo virtual están en Monitoreo. Para habilitar “Simular un ciclo”, MIRA debe seleccionar plástico con confianza ≥0.80 y 50 frames estables. Pausar no interrumpe la cámara.

En este PC las dependencias ya están instaladas; basta con los comandos de arranque. El [README del backend](../Backend-Rony-Pruebas/README.md) explica configuración, cámara, instalación y modos.

## Modos

- **Cámara real:** backend con `run-live.ps1`; Angular con `npm start`.
- **Video y ciclos simulados en Python:** backend con `run.ps1`; Angular con `npm start`.
- **Demo local sin backend:** Angular con `npm run start:demo`.

Para cambiar el modo de Python, detén el backend anterior con Ctrl+C antes de arrancar el otro. Cada modo tiene su etiqueta visible. Los movimientos y resultados del backend de prueba siguen siendo virtuales cuando la cámara es real.

## Verificación y compilación

```sh
npm run build              # Producción con API
npm run build:demo         # Demo optimizada sin API
npm run start:api          # Alias del arranque con API
npm run test:ci
npm run check:architecture
npm run format:check
```

## API

[Contrato OpenAPI](docs/api-contract.openapi.json). `/api` usa el mismo origen y el proxy de desarrollo apunta a `127.0.0.1:8000`. El cliente valida respuestas y no sustituye una cámara desconectada por datos simulados. La metadata opcional distingue fuente, transporte y ciclo virtual; se conserva el soporte JPEG para servidores que no la implementen.

Autenticación y permisos de producción corresponden al servidor. No guardes secretos en el código ni en archivos versionados.

El panel muestra residuos detectados de las tres categorías aunque no cumplan los requisitos del ciclo. La información observada (`detection`) se separa del objetivo del ciclo (`targetDetection`). “Simular un ciclo” conserva los requisitos de MIRA: plástico ≥0.80, proyección válida y 50 frames estables.
