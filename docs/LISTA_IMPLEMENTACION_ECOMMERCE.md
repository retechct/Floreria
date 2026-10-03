# Lista de implementación para la tienda

Fecha: 03/10/2026. Complementa la auditoría de prepublicación. La lista original se conserva como criterio de aceptación; el estado posterior a la implementación es el siguiente.

## Estado posterior a la implementación

| Área | Implementado en el proyecto | Requiere acción externa antes de vender |
| --- | --- | --- |
| Pedido y correo | Confirmación tras pago verificado, detalle de compra, aviso al negocio, estado y reenvío idempotente | Verificar dominio en Resend y definir `RESEND_API_KEY`, `MAIL_FROM` y correos del negocio |
| Boleta/factura | Selección y validación fiscal, factura condicionada por configuración, cola manual de pendientes, serie/número, carga protegida del PDF de SUNAT (máximo 5 MB), enlace HTTPS opcional y botón explícito de envío por correo | Confirmar régimen y habilitación. Emitir realmente en SUNAT SOL; la web no inventa numeración tributaria |
| Reclamos | Correlativo atómico, reintento idempotente, copia completa imprimible, representante de menor, correo, estados, plazo, respuesta, historial y reenvío | Confirmar datos legales y probar buzones reales |
| Operación | Stock opcional con reserva/liberación, bloqueo de sobreventa, anticipación mínima, entregas hasta las 22:00 y corte posterior al día siguiente, rechazo de personalizaciones retiradas, estados de entrega, búsqueda y filtros, registro manual de reembolsos | Definir stock/capacidad y tarifas reales; ejecutar reembolso y nota de crédito en los proveedores correspondientes |
| Cuenta y consulta | Historial para clientes verificados y enlace privado en el correo para compras invitadas, incluido comprobante | Probar entrega de correo y operación desde otro dispositivo en el dominio final |
| Infraestructura | Docker corregido, proxy configurable, health con almacenamiento, verificador de despliegue ampliado | Dominio, PostgreSQL/volumen, secretos, MFA, Culqi test/live, webhook, backup/restauración y monitor externo |

La emisión automática de comprobantes queda deliberadamente condicionada a elegir un emisor y obtener sus credenciales. El flujo manual mediante SUNAT SOL sí está soportado por el panel: el pedido pagado queda pendiente, el encargado filtra boletas o facturas, carga el PDF emitido, registra serie y número, guarda el estado y luego pulsa **Enviar comprobante por correo**. El envío no se dispara al guardar, para evitar entregas accidentales. Las casillas siguientes describen todos los requisitos originales; las que dependen del negocio o de proveedores no pueden completarse solo modificando el repositorio.

## 1. Identificadores que deben mantenerse separados

| Registro | Para qué sirve | Estado actual |
| --- | --- | --- |
| Número de pedido | Identifica la compra, productos y entrega | Ya existe; conservarlo y mostrarlo al cliente y administrador |
| Referencia de pago Culqi | Permite conciliar el cobro | Ya se conserva cuando se recibe un cargo verificable |
| Serie y número de boleta/factura | Identifica el comprobante tributario emitido | Implementado para emisión manual y entrega posterior |
| Número correlativo de reclamación | Identifica una hoja del Libro | Implementado con correlativo anual atómico y copia completa |

El pedido, el cobro, el comprobante y la entrega necesitan estados independientes. Un comprobante pendiente no significa que el cliente deba volver a pagar.

## 2. Boleta o factura: decisión previa

- [ ] Confirmar RUC, nombre o razón social, domicilio fiscal, régimen tributario y habilitación de emisión del negocio.
- [ ] Mostrar factura solo si el negocio puede emitirla. No se ha verificado el régimen del titular. El Nuevo RUS no permite emitir facturas; tener un RUC por sí solo no permite ofrecer ambos comprobantes. [SUNAT: Nuevo RUS](https://orientacion.sunat.gob.pe/nuevo-regimen-unico-simplificado-nuevo-rus).
- [ ] Elegir emisión inicial mediante SUNAT SOL o integración con un sistema/proveedor de facturación compatible. No hace falta contratar una API para empezar si se establece una emisión manual aplicable y atendida dentro de los plazos correspondientes.
- [ ] Definir con quien lleva la contabilidad el tratamiento tributario de productos y envío, los datos exigibles y el momento de emisión. Los importes del comprobante deben coincidir con lo cobrado; no agregar impuestos inesperados después del pago.

## 3. Datos en el checkout

- [ ] Agregar la selección de comprobante disponible para el negocio antes de pagar.
- [ ] Boleta: datos del comprador y correo; solicitar tipo/número de documento cuando corresponda. Para boleta electrónica SUNAT indica identificación cuando el comprador la requiere o el total supera S/700, con la salvedad indicada para ciertos no domiciliados. [SUNAT: boleta electrónica](https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta).
- [ ] Factura para ventas nacionales habituales: recoger RUC del comprador, nombre/razón social, domicilio fiscal y correo; comprobar los campos exigidos por el emisor elegido.
- [ ] Validar los datos en el servidor y permitir revisarlos antes de confirmar el pago.
- [ ] Guardar una copia de los datos de facturación en el pedido, aunque después se modifique el perfil del cliente.
- [ ] Mantener separados comprador/facturación y destinatario/dirección de entrega. En una florería es frecuente que quien paga regale a otra persona.
- [ ] Indicar y registrar la aceptación de entrega electrónica del comprobante donde corresponda.

## 4. Emisión y entrega del comprobante

Para la compra anticipada normal de esta tienda, el flujo propuesto es: datos revisados → pedido y pago confirmado → emisión del comprobante aplicable → envío/consulta. El momento tributario concreto debe quedar alineado con la operación del negocio.

| Ruta | Cómo funcionaría | Qué falta desarrollar |
| --- | --- | --- |
| Emisión manual inicial | El encargado emite en SOL, carga el PDF en el pedido, registra serie/número y lo envía con el botón del panel | Implementado; falta configurar y probar el buzón real de correo en producción |
| Emisión automática | El servidor solicita la emisión al proveedor; recibe archivos y estado; entrega el documento al cliente | Adaptador API, credenciales privadas, numeración a cargo del emisor, cola/reintentos seguros, consulta de estado, archivos y errores |

- [ ] Conservar serie/número oficiales devueltos por el sistema emisor; no inventarlos al generar un PDF.
- [ ] Para integración automática, conservar PDF de representación, XML y respuesta/constancia de recepción según el sistema utilizado, con estados de aceptación o rechazo correctos.
- [ ] Evitar dos comprobantes por un mismo evento repetido de pago o reintento de integración.
- [ ] Si la emisión falla, mantener el pedido como pagado y el comprobante como pendiente/con incidencia; avisar al administrador y conciliar antes de reintentar una solicitud cuyo resultado sea incierto.
- [ ] Permitir descargar el comprobante mediante acceso privado o enlace seguro. No exponerlo por un número de pedido predecible.
- [ ] Mostrar en el panel cuáles faltan emitir o entregar y cuándo se enviaron.
- [ ] Gestionar devoluciones y correcciones con el documento tributario que corresponda; un reembolso Culqi y una nota de crédito son procesos relacionados pero separados. [SUNAT: nota de crédito electrónica](https://www.gob.pe/17414-emitir-nota-de-cr-dito-electr-nica).

Un correo con el detalle del pedido o un PDF diseñado por la web no se convierte por sí mismo en boleta/factura electrónica. SUNAT ofrece emisión de boletas desde SOL con numeración generada por su sistema. [SUNAT: emisión de boleta](https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta).

## 5. Correos de compra

- [ ] Configurar dominio/remitente y entrega real del servicio de correo.
- [ ] Enviar confirmación al comprador únicamente después de verificar el pago en servidor: número de pedido, productos, cantidades, precios, envío, total, destinatario, dirección, fecha/franja solicitada y contacto.
- [ ] Diferenciar «pago confirmado» de «entrega confirmada» si todavía hay coordinación pendiente.
- [ ] Enviar notificación de nueva venta al encargado.
- [ ] Adjuntar o enlazar la boleta/factura si ya está emitida; de lo contrario, informar su estado y entregarla posteriormente dentro del proceso aplicable.
- [ ] Registrar estado de envío y permitir reintentar sin duplicar cobros ni documentos. Los eventos webhook repetidos no deben multiplicar los correos.
- [ ] Mantener registro de fallos y alertar al encargado. Un fallo de correo no debe borrar ni revertir el pedido.
- [ ] No enviar importes o comprobantes al destinatario de un regalo por defecto: el receptor del correo comercial es el comprador.

Actualmente solo hay correos implementados para verificación de cuenta y recuperación de contraseña, y el proveedor no está configurado localmente.

## 6. Libro de Reclamaciones

- [ ] Generar número correlativo único mediante una operación atómica; evitar duplicados ante reenvíos.
- [ ] Registrar fecha/hora y presentar la fecha local de Perú.
- [ ] Validar datos del consumidor, documento y contacto en servidor; incluir representante cuando corresponda y revisar el formato oficial.
- [ ] Guardar íntegramente la hoja y relacionarla con el pedido si el cliente proporciona su referencia. No exigir una compra ni una cuenta para poder registrar una queja.
- [ ] Mostrar una copia completa después del envío y permitir imprimirla; no limpiar el contenido que debe figurar en la copia.
- [ ] Enviar copia al correo indicado y avisar al encargado una vez guardado el registro.
- [ ] Incorporar seguimiento: recibido, en atención, respondido; fecha límite, respuesta y evidencia de atención.
- [ ] Guardar incidencias de correo sin perder la reclamación, y permitir reenvío.

Ya existe el registro privado, pero falta completar este flujo. El defecto de impresión está reproducido en la auditoría. Referencia de formato y atención: [Indecopi: Libro de Reclamaciones](https://consumidor.gob.pe/libro-de-reclamaciones/).

## 7. Pedidos, existencias y entregas

- [ ] Corregir aceptación de horarios vencidos y establecer anticipación mínima/franjas disponibles.
- [ ] Cerrar el checkout de personalizaciones retiradas o exigir cotización aprobada por servidor.
- [ ] Definir stock por producto o cupos diarios para arreglos hechos a pedido, con reserva y liberación según estado de pago.
- [ ] Confirmar distritos y tarifas que realmente atiende el negocio.
- [ ] Separar estados de pago de preparación, despacho, entrega y cancelación; registrar quién hizo cada cambio.
- [ ] Permitir buscar pedidos y filtrar por fecha, estado y comprobante pendiente.
- [ ] Definir operación de devoluciones y conciliación de cargos pendientes.

## 8. Cuenta y consulta de pedidos

- [ ] Corregir la pantalla que, ante una falla de red, invita a comprar nuevamente.
- [ ] Permitir consultar estado mediante cuenta o enlace privado, incluyendo compra invitada.
- [ ] Incorporar historial y descarga de comprobantes cuando se vinculen pedidos a clientes.
- [ ] Autorizar acceso en servidor; no asociar pedidos a una persona solo porque escribió un correo sin verificar.
- [ ] Probar comportamiento al borrar almacenamiento del navegador o abrir desde otro dispositivo.

## 9. Publicación y protección de datos

- [ ] Dominio, HTTPS, `SITE_URL`, redirecciones y sitemap correctos.
- [ ] Base persistente, migración de datos y copia de seguridad restaurada en una prueba.
- [ ] Claves Culqi y webhook; pruebas reales del proveedor en test antes de habilitar live.
- [ ] MFA del propietario y credenciales privadas fuera del código.
- [ ] Corrección de Docker y de IP detrás del proxy si corresponde al hosting elegido.
- [ ] Indicador de disponibilidad que detecte fallos de almacenamiento/catálogo, con alertas.
- [ ] Datos legales y de atención confirmados; políticas acordes al negocio y acceso restringido a información de clientes.
- [ ] Desplegar todos los archivos necesarios, incluido `lib/business-info.js`, actualmente sin registrar en Git.

## 10. Pruebas de aceptación antes de abrir ventas

| Caso | Resultado esperado |
| --- | --- |
| Compra invitada o con cuenta | Pedido guardado con total y datos correctos; recuperación/consulta segura |
| Pago aprobado | Un pedido, un cobro confirmado y una sola confirmación comercial |
| Pago rechazado o incierto | Mensaje preciso; no emitir confirmación de pago ni invitar a duplicar un cobro incierto |
| Webhook repetido | Sin pedidos, comprobantes ni avisos duplicados |
| Boleta | Datos exigibles, emisión real, importes correctos y entrega/consulta |
| Factura si está habilitada | Datos fiscales validados, emisión real y entrega/consulta |
| Facturación caída o respuesta perdida | Pedido sigue pagado; incidencia visible y conciliación/reintento seguro |
| Correo fallido | Compra/reclamo persiste; encargado puede detectar y reenviar |
| Reclamo | Número único, hoja íntegra imprimible, correo y registro de atención |
| Entrega vencida/sin cobertura/sin capacidad | Rechazo antes de cobrar |
| Devolución | Registro financiero y documento tributario correspondiente, sin borrar historial |
| Redespliegue/restauración | Pedidos, imágenes, clientes y reclamos se conservan |

## Orden recomendado

Primero resolver errores de la auditoría y confirmar régimen/método de emisión. Después completar checkout fiscal, confirmaciones de compra, Libro y operación de pedidos. Preparar infraestructura y pruebas externas en paralelo a las tareas que no dependan de cuentas o habilitaciones.

Para un arranque con pocas ventas puede elegirse emisión manual atendida, con seguimiento de comprobantes pendientes. La integración tributaria automática puede ser una segunda etapa. Historial de clientes y automatización logística pueden seguir después si existe un canal seguro de consulta y una operación manual definida. No hace falta agregar cupones, puntos o reseñas para abrir.
