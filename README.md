# Monitor Rony · Angular y JetMax

Interfaz para cámara, detección, trayectoria continua, tres destinos provisionales e historial. La referencia física es el notebook actual del repositorio `rony-yolo-isaac`.

La arquitectura final ejecuta YOLO, selección, planificación y ROS dentro del JetMax; Angular/Spring/MySQL se despliegan en un servidor HTTPS. El brazo inicia el intercambio con esa API. El navegador usa el mismo origen `/api` y no requiere SSH ni conexión directa al brazo. El PC queda para desarrollo y mantenimiento. La inferencia nativa y su integración con ROS se comprobaron sin movimientos; falta activar el servicio permanente y publicar el servidor/dominio. El [README del backend](../back-temp-rony/README.md) documenta instalación y despliegue.

## Publicar el front en Netlify

El archivo `netlify.toml` configura la compilación con Node 24, `npm run build` y publicación en `dist/Web-Angular/browser` (respetar mayúsculas). La rama es `main`, la carpeta base queda vacía y no se necesitan Functions. La regla SPA permite abrir o recargar `/dashboard`, `/monitoring` y `/classifications` directamente.

El front publicado es `https://rony-brazo.netlify.app` y su API está en `https://rony-api.onrender.com`. Netlify envía `/api/*` hacia `/api/*` de Render antes de aplicar la regla SPA. El navegador conserva el mismo origen para peticiones, cámara y cookie de sesión. La dirección del backend es pública; las claves permanecen en la configuración privada de Render y del brazo. No añadir claves del brazo, de la web ni de la base de datos a las variables del front o al código Angular.

## Probar la aplicación integrada

Desde `../back-temp-rony`:

```powershell
./prepare.ps1
./run.ps1 -Mode Simulation
```

Abre `http://127.0.0.1:8000/monitoring`. La clave web está en `../rony-yolo-isaac/config.local.json`, campo `web_access_token`. Se establece una cookie HttpOnly; la clave no se guarda en almacenamiento del navegador. Tras iniciar sesión, el monitoreo se reconecta inmediatamente.

La web está incluida en el JAR de Spring y `/api` comparte el mismo origen. No se necesita un servidor Angular de desarrollo para probar. Para modificar la interfaz en desarrollo, `npm start` conserva el proxy hacia `127.0.0.1:8000`.

## Banco anterior con el brazo conectado

Instala una vez `../back-temp-rony/robot_agent/dist/rony-agent.tar.gz` en el JetMax siguiendo el README del backend. El servicio del brazo arranca con el equipo y recibe trayectorias por HTTP privado autenticado; no necesita SSH durante las recogidas.

```powershell
# Desde back-temp-rony
./check-ready.ps1 -Robot -RobotHost 192.168.1.50
./run.ps1 -Mode Physical -RobotHost 192.168.1.50
```

Los arranques no mueven el brazo. **Iniciar clasificación continua** prepara HOME y pinza vacía, espera confianza ≥0.80 y 8 frames nuevos, recoge con cierre a 80°, eleva verticalmente hasta Z=212.8, vuelve a HOME y después gira para descargar manteniendo esa altura. Aluminio usa 190°, cartón 210° y plástico 230° de la base. Tras descargar vuelve en alto a HOME y analiza de nuevo; si no hay residuos sigue esperando hasta cancelar. Son ubicaciones provisionales, no tachos medidos. La calibración original se lee del brazo y no se escribe.

**Cancelar siguientes movimientos** termina el tramo publicado y bloquea los siguientes; no es una parada de emergencia eléctrica. **Resetear** vuelve a HOME y abre la pinza. El controlador reporta consignas, no encoders. Las trayectorias terminadas aparecen como **Verificar depósito**; no se cuentan como éxitos sin comprobación. `holdingObject` y `depositConfirmed` permanecen null.

Al final del panel que se muestra con el ojo, **Cerrar pinza · 90°** cierra durante 1 s y **Posición de guardado** lleva a `(-42.6878, -27.0905, 225.0)` durante 3 s. Se habilitan con el automático detenido; guardar requiere HOME. Después, **Resetear** vuelve a HOME y abre la pinza antes de iniciar la clasificación. Requieren actualizar nuestro agente del banco con `../back-temp-rony/update-agent.ps1`; también están incluidos en el runtime autónomo. No cambian la calibración ni el cierre automático de 80°, y no generan registros de clasificación.

## Contrato y verificación

[Contrato OpenAPI](docs/api-contract.openapi.json). El cliente valida respuestas, conserva datos desactualizados durante fallos y utiliza SSE con recuperación HTTP. Las acciones físicas son `arm`, `cancel`, `reset`, `close-gripper` y `park`; la web no maneja credenciales del agente ni coordenadas de movimiento.

```powershell
npm run build
npm run test:ci
npm run check:architecture
npm run format:check
```

El backend tiene pruebas de comunicación con el agente Python falso, sin mover hardware. El README de `../back-temp-rony` describe distribución, Wi-Fi LAN, instalación, persistencia, configuración y condiciones pendientes de la prueba física.
