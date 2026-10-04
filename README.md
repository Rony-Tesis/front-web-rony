# Monitor de clasificación de residuos

Aplicación Angular con Panel principal, Monitoreo y Clasificaciones. Arquitectura DDD: dominio, aplicación, infraestructura y presentación. Cada componente tiene HTML, CSS y TypeScript separados.

## Ejecutar

```sh
npm install
npm start
```

Abre `http://localhost:4200`. El desarrollo usa simulación; la pausa controla únicamente esa simulación.

## Comandos

```sh
npm run build:demo          # Demo optimizada con simulación
npm run build               # Producción con API
npm run start:api           # API local mediante proxy a 127.0.0.1:8000
npm run test:ci
npm run check:architecture
npm run format:check
```

## API

[Contrato OpenAPI](docs/api-contract.openapi.json), con respuesta de ejemplo incluida. El backend debe implementarlo o adaptar el mapper a su contrato real. La ruta es `/api/v1/monitor/snapshot`, bajo el mismo origen. Ajusta `proxy.conf.json` para desarrollo.

Para probarlo con MIRA / JetMax, ejecuta `..\Backend-Rony-Pruebas\run.ps1` en otra terminal y después `npm run start:api`. Abre `/monitoring`: la vista grande consume el video MJPEG compartido y el panel consume JPEG. La metadata opcional `sourceMode`, `motionMode` y `cameraTransport` distingue cámara real/simulada y resultados virtuales. Sin metadata se conserva la integración JPEG existente. Los controles virtuales están en `http://127.0.0.1:8000`; el modo de cámara real se configura en el README del backend.

El cliente valida las respuestas y muestra errores sin sustituir la API por datos simulados. La autenticación, los permisos y las cabeceras de seguridad corresponden al servidor. No guardes secretos en el código ni en los archivos de entorno versionados.
