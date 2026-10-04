# Monitor de clasificación · Angular y JetMax

Única interfaz para MIRA y JetMax: Panel principal, Monitoreo y Clasificaciones. Arquitectura por dominio, aplicación, infraestructura y presentación; cada componente tiene HTML, CSS y TypeScript separados.

## Ejecutar con movimiento físico

Primera terminal PowerShell:

```powershell
cd C:\Users\PC\Desktop\Tesis\Backend-Rony-Pruebas
.\run-physical.ps1
```

Segunda terminal:

```powershell
cd C:\Users\PC\Desktop\Tesis\Web-Angular
npm start
```

Abre http://127.0.0.1:4200/monitoring. Debe indicar **Cámara real · JetMax físico**. Con el brazo en HOME, pinza vacía, calibración vigente y recorrido despejado, pulsa **Activar automático · pinza vacía**. Espera un plástico ≥0.80 y 50 frames estables; luego aproxima, desciende, agarra, levanta y regresa a HOME sin soltar. El automático se desactiva al terminar: no deposita ni vuelve a agarrar el mismo objeto.

La cámara MJPEG continúa durante los movimientos y el backend publica SSE a 10 Hz. Monitoreo muestra cada paso, XYZ y ángulo de pinza reportados por ROS. Estos valores son el estado del controlador, no mediciones de encoders. Comprueba el agarre en el video. **Cancelar siguientes movimientos** permite terminar el tramo ya enviado; no es una parada de emergencia física. Revisa el brazo y vacía la pinza antes de reiniciar y volver a activar.

Las dependencias ya están instaladas en este PC. El [README del backend](../Backend-Rony-Pruebas/README.md) contiene límites, credenciales y funcionamiento completo. No ejecutes el notebook ni otro controlador al mismo tiempo.

## Otros modos

- `run-live.ps1` en el backend: cámara real y ciclos virtuales.
- `run.ps1` en el backend: video y ciclos simulados.
- `npm run start:demo` en Angular: demo estática local sin backend.

Detén el backend anterior con Ctrl+C antes de cambiar de modo. `npm start` siempre consume la API del puerto 8000.

## Verificación

```sh
npm run build
npm run build:demo
npm run test:ci
npm run check:architecture
npm run format:check
```

## API

[Contrato OpenAPI](docs/api-contract.openapi.json). El proxy `/api` apunta a `127.0.0.1:8000` bajo el mismo origen. El cliente valida todas las respuestas y eventos; reconecta SSE con recuperación HTTP y conserva los datos anteriores como desactualizados durante errores. Los servidores sin SSE siguen usando consultas periódicas.

Los controles físicos envían únicamente `arm` o `cancel`; no contienen credenciales SSH ni coordenadas arbitrarias. No se permiten controles virtuales mientras se usa hardware. La autenticación y permisos de producción corresponden al servidor.

El panel muestra aluminio, cartón y plástico detectados, aunque no sean candidatos para el agarre. `detection` describe la imagen; `targetDetection` congela el objetivo del ciclo. El ciclo físico conserva los requisitos del notebook y no se registra como una clasificación con depósito. `holdingObject` es `null` porque el hardware no confirma presencia: cerrar la pinza no prueba un agarre exitoso.
