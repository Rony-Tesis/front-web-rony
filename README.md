# Monitor de clasificación · Angular y JetMax

Única interfaz para MIRA y JetMax: Panel principal, Monitoreo y Clasificaciones. Arquitectura por dominio, aplicación, infraestructura y presentación; cada componente tiene HTML, CSS y TypeScript separados.

## Ejecutar con movimiento físico

Primera terminal PowerShell:

```powershell
cd C:\Users\PC\Desktop\Tesis\Back-Rony\back-rony
.\run.ps1 -Mode Physical
```

Segunda terminal:

```powershell
cd C:\Users\PC\Desktop\Tesis\Web-Angular
npm start
```

Abre http://127.0.0.1:4200/monitoring. Debe indicar **Cámara real · JetMax físico**. Con el brazo en HOME, pinza vacía, calibración vigente y recorrido despejado, pulsa **Activar funcionamiento**. Espera un plástico ≥0.80 y 50 frames estables; luego aproxima, desciende, agarra, levanta y regresa a HOME sin soltar. El automático se desactiva al terminar: no deposita ni vuelve a agarrar el mismo objeto.

La cámara MJPEG continúa durante los movimientos y el backend publica SSE a 10 Hz. Monitoreo muestra cada paso, XYZ y ángulo de pinza reportados por ROS. Estos valores son el estado del controlador, no mediciones de encoders. Comprueba el agarre en el video. **Cancelar siguientes movimientos** permite terminar el tramo ya enviado; no es una parada de emergencia física. Para otra prueba pulsa **Resetear · HOME y abrir pinza** con el recorrido despejado y una superficie preparada para recibir el objeto. El reset vuelve a HOME, abre a 0° y limpia el ciclo; luego pulsa **Activar funcionamiento**. No necesitas reiniciar el backend. Durante un movimiento primero cancela y espera que termine el tramo.

Las dependencias ya están instaladas en este PC. El [README del backend](../Back-Rony/back-rony/README.md) contiene límites, credenciales y funcionamiento completo. No ejecutes el notebook ni otro controlador al mismo tiempo.

## Fuente de datos

`npm start` y `ng serve` consumen la API Spring del puerto 8000 a través del proxy. Si la API o el hardware no están disponibles, se muestra el estado de desconexión; no se cambia al mock local. Spring arranca en modo físico por defecto y no guarda ciclos virtuales en MySQL. Los agarres físicos se registran aparte de las clasificaciones con depósito confirmado.

## Verificación

```sh
npm run build
npm run test:ci
npm run check:architecture
npm run format:check
```

## API

[Contrato OpenAPI](docs/api-contract.openapi.json). El proxy `/api` apunta a `127.0.0.1:8000` bajo el mismo origen. El cliente valida todas las respuestas y eventos; reconecta SSE con recuperación HTTP y conserva los datos anteriores como desactualizados durante errores. Los servidores sin SSE siguen usando consultas periódicas.

Los controles físicos envían únicamente `arm`, `cancel` o `reset`; no contienen credenciales SSH ni coordenadas arbitrarias. No se permiten controles virtuales mientras se usa hardware. La autenticación y permisos de producción corresponden al servidor.

El panel muestra aluminio, cartón y plástico detectados, aunque no sean candidatos para el agarre. `detection` describe la imagen; `targetDetection` congela el objetivo del ciclo. El ciclo físico conserva los requisitos del notebook y no se registra como una clasificación con depósito. `holdingObject` es `null` porque el hardware no confirma presencia: cerrar la pinza no prueba un agarre exitoso.
