# La Casa de las Flores

Tienda con catalogo compartido, panel privado, tarifas por distrito y checkout Culqi. Requiere Node.js 22 y un servidor con almacenamiento persistente. No funciona como tienda completa en un hosting que solo sirve archivos HTML.

## Desarrollo local

1. Ejecuta `npm ci`.
2. Ejecuta `npm run admin:setup` una sola vez. Genera `.env.admin` con el hash de la contrasena y secreto de sesion, y `.admin-access.txt` con el acceso inicial. No sobrescribe credenciales existentes. Ambos archivos son privados.
3. Completa las variables de `.env.example` en el entorno o en tu archivo privado `.env.local`.
4. Ejecuta `npm start` y abre `http://localhost:3000/admin.html`.

En PowerShell, usa `npm.cmd` si la politica de ejecucion bloquea `npm.ps1`. Las variables del proceso tienen prioridad; luego se cargan las que falten de `.env.admin`, `.env.local` y `.env`. Nunca publiques esos archivos ni `.admin-access.txt`.

Sin PostgreSQL, el desarrollo guarda catalogo, imagenes, pedidos, reclamos y tarifas en `.runtime/`. Sobreviven a reinicios. Los carritos y el identificador privado de consulta de cada pago permanecen en el navegador del comprador.

## Administracion

- Productos: crear, editar, eliminar, publicar, archivar, marcar agotado, destacar, editar precio con centavos, precio anterior, SKU, ocasion, etiqueta, descripcion y especificaciones.
- Fotos: cargar JPG/PNG/WebP de hasta 3 MB, o indicar URL HTTPS; ordenar, quitar y elegir portada. Las cargas se verifican, convierten a WebP y reducen a 1600 px, sin metadatos.
- Productos nuevos publicados: dos o tres imagenes diferentes. Los borradores admiten menos. Los 77 productos originales conservan su foto existente: faltan fotografias reales para completar sus galerias, no se inventaron vistas adicionales.
- Colecciones: las 12 existentes y las nuevas tienen portada, descripcion, estado y seleccion explicita de productos. Tambien se asignan desde el producto.
- Categorias: crear, editar y eliminar. Renombrar actualiza sus productos; no se elimina una categoria en uso.
- Promociones: productos con el mismo precio validado en el servidor.
- Envios por distrito: 43 distritos de la provincia de Lima y 7 del Callao, separados por provincia, con busqueda, filtro de cobertura, precio y activacion individual. No se incluyen las otras provincias del departamento de Lima.
- Pedidos y reclamos: privados para el administrador. No se guardan PAN, CVV, token Culqi ni criptogramas 3DS.
- Datos anteriores: la importacion explicita aparece si el navegador conserva informacion del panel antiguo. Las promociones importadas quedan en borrador.
- Una sola seccion visible por vez; el menu izquierdo se convierte en un menu desplegable lateral en movil.

### Tarifas de entrega

Se conservaron las ocho tarifas existentes. Los otros 42 distritos empiezan con precio pendiente y entregas desactivadas. Configura el precio y activa el distrito para aceptar pedidos alli. Cero significa envio gratuito; un campo vacio significa tarifa sin configurar. Un distrito puede conservar un precio y estar desactivado.

La tienda, el estimador y el checkout consultan las tarifas del servidor. Antes de enviar un cargo se recalculan precio de productos y envio; si cambiaron, se pide al comprador revisar el total. Las ediciones concurrentes se rechazan para evitar sobrescribir cambios de otra ventana.

Fuente de nombres y codigos: [mapas distritales del MTC](https://portal.mtc.gob.pe/transportes/caminos/normas_carreteras/mapa-ruta-distrital.html). Alcance territorial: [Lima Metropolitana, PCM](https://www.gob.pe/institucion/pcm/campa%C3%B1as/4355-lima-metropolitana-informacion-territorial).

## Culqi

1. En el CulqiPanel de tu comercio, obtiene las llaves de integracion `pk_test_...` y `sk_test_...`. Configura `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY`. Deben pertenecer al mismo comercio y entorno.
2. Abre el sitio mediante su servidor. El navegador carga Culqi Custom Checkout y Culqi3DS de sus dominios oficiales. La llave secreta nunca se envia al navegador.
3. Prueba aprobacion, rechazo y autenticacion bancaria 3DS con las herramientas y datos de prueba de Culqi. Nunca ingreses tarjetas reales en el modo de pruebas.
4. El checkout habilita tarjetas y la opcion Yape del SDK. Los medios disponibles dependen de la habilitacion de tu comercio. PagoEfectivo, Cuotealo, pagos diferidos y cuotas no estan implementados ni habilitados.
5. Genera un secreto aleatorio para `CULQI_WEBHOOK_SECRET`:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
6. Registra en Culqi la URL privada `https://TU-DOMINIO/api/webhooks/culqi/TU-SECRETO` para el evento `charge.creation.succeeded`. No compartas esa URL; restringe y protege los registros de acceso del hosting.
7. El webhook no confia en el importe ni estado recibidos: consulta el cargo a Culqi con la llave secreta y verifica identificador del pedido, moneda e importe antes de confirmarlo. Los eventos repetidos son seguros.
8. Con el dominio HTTPS configurado y las pruebas completadas, usa las llaves `pk_live_...` y `sk_live_...` del comercio habilitado. No mezcles entornos.

Importes en PEN, enviados a Culqi en centimos enteros. El total permitido por este checkout es de S/ 3.00 a S/ 9,999.00. La tienda no recibe los datos completos de la tarjeta; el formulario hospedado de Culqi genera el token. Los datos de envio del destinatario no se presentan como domicilio del comprador para antifraude.

El mismo intento no se vuelve a cobrar por reenvio. Cuando Culqi solicita 3DS, solo se admite continuar con el token, dispositivo e importe originales. La confirmacion consulta el servidor, no confia en el estado guardado por el navegador.

Si hay una interrupcion y no se conoce el resultado, el pedido queda en verificacion: **no volver a cobrar ni despachar sin comprobarlo**. El comprador puede consultar el estado; el webhook puede completar la confirmacion. Si el proveedor nunca devuelve un cargo verificable, hay que conciliarlo en CulqiPanel y atender al comprador. No se permite cancelar un cargo en proceso desde el navegador. Cancelar solo abandona una autenticacion 3DS pendiente; no es un reembolso.

En Administracion > Pedidos, un pago pendiente permite ingresar el identificador de cargo del CulqiPanel y usar "Verificar cargo". El servidor consulta Culqi y exige que el cargo pertenezca al mismo pedido y coincida en importe y moneda; no se marca pagado solo por escribir un identificador.

El campo `paid` de Culqi representa el deposito al comercio, no la aprobacion del comprador. La confirmacion comprueba la captura y el resultado autorizado. Las devoluciones y contracargos se gestionan en CulqiPanel: no se ejecutan reembolsos desde este administrador.

Referencias oficiales: [Custom Checkout](https://docs.culqi.com/es/documentacion/checkout/checkout-custom), [Culqi3DS](https://docs.culqi.com/es/documentacion/culqi-3ds/v1/uso-libreria/), [API Culqi](https://apidocs.culqi.com/).

## Publicar en Vercel

El proyecto incluye `vercel.json` con recursos estaticos y rutas `/api/*` hacia Node.

1. Conecta una base PostgreSQL y configura `DATABASE_URL` como variable privada. Usa el TLS y la conexion agrupada indicados por el proveedor. No desactives la validacion TLS.
2. Configura `SITE_URL=https://tu-dominio-real.com`, sin rutas. El administrador y checkout deben abrirse en ese mismo origen. Usa un unico dominio canonico y redirige los alternativos; cada preview requiere su propio SITE_URL y llaves de prueba.
3. Configura `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET` con los valores privados de `.env.admin`. Cambiar el hash o secreto invalida sesiones anteriores.
4. Completa todas las variables `BUSINESS_*` con los datos reales del comercio, incluyendo domicilio y correos.
5. Configura Culqi y el webhook como se indica arriba.
6. Publica con Node.js 22. `npm ci` prepara los iconos locales. Los primeros accesos crean `shop_documents` y `shop_images`; el usuario PostgreSQL necesita ese permiso.
7. Agrega el dominio en el panel del hosting y configura en tu proveedor DNS los registros que el hosting indique. Espera a que se active HTTPS.
8. Activa copias de seguridad del proveedor PostgreSQL y comprueba una restauracion.

En Vercel, PostgreSQL es obligatorio: no se usa su disco temporal. Imagenes y registros se guardan en la base. Una base nueva inicia con el catalogo original; los cambios de otro servidor o de `.runtime/` no se trasladan automaticamente. Conserva un respaldo y planifica la migracion de datos antes de cambiar de almacenamiento.

## Publicar en un servidor Node o Docker

Usa `NODE_ENV=production`, HTTPS mediante el proxy del hosting y `SITE_URL` con el dominio publico. Configura PostgreSQL, o `DATA_DIR` con una ruta absoluta a un volumen persistente. El modo disco requiere **un solo proceso Node**, sin replicas ni funciones efimeras.

El `Dockerfile` incluido usa Node 22 y un usuario sin privilegios. Excluye archivos privados. Compila con `docker build -t floreria .` y proporciona las variables desde el administrador de secretos del hosting. Se recomienda PostgreSQL para el contenedor. La aplicacion escucha en `PORT` (3000 por defecto); el proxy publica HTTPS. El estado basico se consulta en `/api/health`.

No sirvas este directorio mediante un servidor estatico general que exponga archivos privados. Inicia `node server.js`. No es un proyecto PHP ni compatible con hosting exclusivamente estatico.

## Verificacion antes de vender

- `npm run check`: sintaxis del servidor, panel, checkout y modulos.
- `npm test`: autenticacion, CSRF, datos privados, fotos, catalogo, persistencia, tarifas, precios, concurrencia de pagos, 3DS, cancelacion, rechazo y webhook verificado con pasarela local simulada.
- `npm run test:ui`: Playwright con Edge, gestion del catalogo, tarifas, checkout y 3DS simulado, visitante independiente y pantallas de 1440/768/390/320 px. Capturas en `test-results/`.
- `npm run deploy:check`: comprueba configuracion sin imprimir secretos. Termina con error si faltan valores de produccion. No reemplaza las pruebas reales del comercio.

Antes de publicar: comprobar login, imagenes, cambio de tarifas en otro navegador, compra Culqi de prueba, respuesta 3DS, rechazo, webhook, registro de reclamo y consulta del pedido. Completar fotografias, tarifas y datos comerciales.

La exportacion JSON del panel es un respaldo del catalogo y referencias, no de las imagenes ni pedidos. El respaldo completo debe incluir toda la base PostgreSQL o todo el volumen DATA_DIR. Contiene datos personales: acceso restringido y politica de retencion apropiada.

No se han ejecutado cobros reales, configurado DNS, contratado hosting ni aprovisionado PostgreSQL externo. Los correos transaccionales, seguimiento logistico y reembolsos desde el panel no forman parte de esta version. Los pedidos y reclamos requieren atencion desde el administrador.

Los textos legales y datos comerciales necesitan revision con la informacion y operacion reales de la tienda antes de publicar. No se han inventado reglas ni obligaciones legales.
