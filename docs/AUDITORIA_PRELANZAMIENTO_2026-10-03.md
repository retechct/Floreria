# Auditoría de prepublicación — 3 de octubre de 2026

**Dictamen: hay una base funcional de tienda, pero todavía no recomiendo activar cobros reales.** Publicar un catálogo para cotizar es un objetivo distinto y más cercano. Para vender automáticamente faltan correcciones concretas, configuración de producción y validación de la operación comercial.

Esta entrega es una auditoría previa a las correcciones, conforme a lo solicitado. No se modificó el código de la aplicación ni se desplegó. Se conservaron los siete archivos modificados y el archivo nuevo `lib/business-info.js` que ya existían al iniciar. Solo se agregó este informe; las pruebas generan sus propios artefactos temporales y capturas.

## Alcance y evidencia

Se revisaron servidor, rutas públicas y privadas, almacenamiento, catálogo, carrito, checkout, Culqi, cuentas, recuperación, MFA, reclamaciones, administración, SEO, configuración de publicación y scripts de compilación. Se ejecutaron recorridos de navegador y se inspeccionaron capturas de portada y checkout móvil.

| Comprobación realizada | Resultado actual |
| --- | --- |
| `node --test tests/*.test.js` | 42 pruebas aprobadas, 0 fallos |
| `node scripts/test-ui.js` | 33 pruebas aprobadas, 0 fallos, aproximadamente un minuto |
| `node scripts/check-source.js` | 70 archivos JavaScript y recursos verificados |
| Compilación mediante `scripts/build-public.js`, en copia temporal aislada | Correcta; 380 archivos públicos; comprobación básica sin archivos privados; CSS compilado coincide con las fuentes |
| `npm audit --omit=dev --json` | 0 vulnerabilidades conocidas reportadas en dependencias de producción |
| Catálogo inicial | 77 productos, 13 colecciones, 0 rutas de imagen faltantes; 77 productos con una sola foto y sin especificaciones estructuradas |
| `node scripts/check-deployment.js` | Código de salida 1; diez configuraciones pendientes |
| Auditoría de la URL provisional guardada en `config/site.json` | No completada: `fetch failed` desde este entorno. No demuestra que el sitio esté caído para otros visitantes |

Las pruebas de pago y correo usan proveedores locales simulados. Las pruebas de persistencia ejecutadas usan disco temporal, no un PostgreSQL externo. No se comprobaron cargos reales, habilitación del comercio Culqi, DNS, buzones reales, restauraciones cloud, carga concurrente de producción ni un build Docker completo. La auditoría de dependencias no constituye una garantía de seguridad.

## Errores y defectos comprobados

Prioridad alta significa corregir antes de abrir el flujo afectado. Una limitación condicionada al hosting no significa que ya ocurra en producción.

| ID / prioridad | Hallazgo y evidencia | Impacto | Corrección propuesta y aceptación |
| --- | --- | --- | --- |
| B01 — Alta | `assets/scripts/pages/confirmation.js:10`: una falla de red al consultar `/api/checkout/status` termina en «No encontramos un pedido reciente» y «Puedes volver al catálogo y crear una nueva compra». Reproducido abortando únicamente esa petición en navegador con una referencia de pago guardada. | Confunde una consulta fallida con ausencia de compra; puede inducir al cliente a comprar otra vez. | Separar ausencia de referencia, error temporal y estado confirmado. Ante incertidumbre ofrecer reintento y contacto, conservar referencia y evitar invitar a repetir la compra. Probar caída de red, 500 y recuperación. |
| B02 — Alta | `server.js:189`: se valida el día, pero no si la franja del mismo día ya terminó. A las 17:00 de Lima simuladas, una cotización para hoy de 09:00–12:00 responde 200 y total S/114. | Se puede iniciar un cobro con una entrega imposible. No hay anticipación mínima ni cupos por franja. | Validación de horarios en servidor y navegador con zona America/Lima; definir anticipación y horario de corte con el negocio. Una alternativa inicial es impedir entregas del mismo día en compra automática. |
| B03 — Alta | `server.js:94` y `server.js:128`: sigue admitiendo `line.custom` con un identificador inexistente y una fórmula antigua de personalización, aunque `/personalizar.html` fue retirado. Cotización de un arreglo inventado con base ramo y un tallo: 200, subtotal S/52, total S/67. | Se pueden tramitar diseños que no están publicados ni aprobados comercialmente. La misma normalización se usa antes del cobro. No se realizó un cargo en esta reproducción. | Rechazar productos personalizados en el checkout automático o exigir una cotización aprobada por servidor, con precio y vigencia. Probar rechazo de IDs inventados y conservación de compra normal. |
| B04 — Alta | `assets/scripts/components/business.js:43,99`: al registrar un reclamo se limpia el formulario. La constancia solo conserva código y plazo; no incluye el contenido enviado. Reproducido: campo de detalle vacío y texto del reclamo ausente en el documento tras el éxito. | «Imprimir constancia» imprime una página que ya no contiene la hoja completa; tampoco hay envío de copia por correo. | Generar una copia íntegra e inmutable con identificación, contenido, código y fecha; permitir imprimirla o enviarla. Verificar el contenido del comprobante, no solo que se invoque `window.print()`. |
| B05 — Bloqueante si se usa Docker | `Dockerfile:6`: `npm ci` ejecuta `postinstall` antes de copiar `views/` y `assets/scripts/`. `scripts/build-icons.js:13` intenta leerlos. Reproducido en una carpeta temporal con exactamente los archivos disponibles en esa etapa: salida 1, `ENOENT ... /views`. | Falla el despliegue que utilice este Dockerfile. La compilación normal del repositorio completo sí pasa. | Copiar las fuentes necesarias antes de ejecutar la preparación de recursos, o posponer esa preparación hasta después de copiarlas. Validar con un build Docker desde cero. |
| B06 — Alta si se aloja detrás de un proxy distinto de Vercel | `lib/security.js:5`, `lib/checkout.js:20`, y límites de admin/clientes: fuera de Vercel se identifica al visitante mediante `socket.remoteAddress`. Reproducido con dos IP de cliente y la misma IP de proxy: ambos comparten la clave del limitador. | Clientes diferentes pueden consumir el mismo límite de login, pagos o reclamos. Relevante al cambiar a Render, Railway o un proxy propio; debe comprobarse su topología real. | Centralizar obtención de IP y confiar exclusivamente en proxies/cabeceras garantizados por el hosting. No confiar indiscriminadamente en cualquier `X-Forwarded-For`. Probar clientes independientes y cabeceras falsificadas. |
| B07 — Media | `server.js:376` y `lib/store.js:19`: `/api/health` solo llama a una inicialización memorizada. Después de corromper únicamente el catálogo de un entorno temporal, health responde 200 y catálogo 500. | Un monitor puede declarar saludable una tienda incapaz de servir el catálogo. El endpoint tampoco repite una consulta SQL después de inicializar. | Separar vitalidad del proceso y disponibilidad operativa; agregar comprobación de almacenamiento con timeout y prueba de caída/recuperación. |
| B08 — Media | `server.js:238`: reclamaciones acepta correo `not-an-email`, teléfono `abc` y tipo de documento arbitrario, enviándolos directamente a la API. Respuesta 200 y registro persistido en entorno temporal. | Datos de contacto inválidos pueden impedir responder; la validación HTML no protege el servidor. | Validar correo, formatos y tipos admitidos en servidor, con mensajes útiles y sin excluir documentos legítimos. Añadir pruebas directas a la API. |

Los ocho hallazgos anteriores no están contradichos por las pruebas verdes: los casos adicionales examinan situaciones que la suite actual no cubre.

## Configuración que falta en este entorno

No se imprimieron ni copiaron secretos. Las siguientes ausencias corresponden al equipo local; no permiten inferir qué existe en las cuentas del hosting.

| Pendiente | Estado observado | Necesario para salir |
| --- | --- | --- |
| Dominio canónico y HTTPS | `SITE_URL` ausente; `config/site.json` conserva una URL provisional de despliegue | Elegir dominio, configurar DNS y HTTPS, establecer `SITE_URL`, comprobar redirecciones y sitemap |
| Persistencia de producción | `DATABASE_URL` y `DATA_DIR` ausentes; se usa `.runtime/` local | PostgreSQL con TLS y respaldo; si se eligiera disco, volumen persistente y un único proceso. Migrar datos existentes expresamente |
| Culqi | Llaves pública/secreta y secreto de webhook ausentes; modo cotización | Cuenta comercial habilitada, pruebas con Culqi real en entorno test, webhook verificado, llaves live y prueba controlada de operación |
| Datos del comercio | El verificador marca las siete variables `BUSINESS_*` ausentes | Confirmar identidad, RUC, domicilio y canales de atención reales. El código contiene valores de respaldo para algunos campos; su presencia no verifica que sean correctos |
| Doble factor | MFA administrativo desactivado | Activarlo con el autenticador del propietario y guardar códigos de recuperación |
| Correo de cuentas | `RESEND_API_KEY` y `MAIL_FROM` ausentes | Dominio/remitente verificado y pruebas de entrega. Sin ello el registro está pausado y no funciona la recuperación por correo |
| Cobertura | 8 distritos con tarifa inicial; 42 sin tarifa, deshabilitados | Confirmar las ocho tarifas y ampliar solo a distritos que realmente se atiendan. No es necesario habilitar los 50 para lanzar |
| Respaldo y restauración | No comprobados en proveedor externo | Backup de toda la base, incluidas imágenes y pedidos; prueba de restauración y responsable de recuperación |

El número «10 pendientes» del verificador incluye dominio, persistencia, siete variables comerciales y MFA. **No incluye todo lo necesario para vender:** en modo cotización omite la exigencia de Culqi live, y el correo aparece como aviso. También hay comprobaciones meramente sintácticas: no verifica por sí solo la habilitación real de Culqi, el registro del webhook, la exactitud del RUC o la existencia de un volumen persistente.

## Qué ya aporta la aplicación y qué falta como ecommerce operativo

| Área | Implementado | Pendiente o decisión de operación |
| --- | --- | --- |
| Catálogo | Productos, imágenes, categorías, colecciones, promociones, borradores, disponibilidad manual, filtros y paginación | Confirmar precios, contenido de cada arreglo, dimensiones/tallos/cuidados y fotografías propias. Una sola foto no bloquea técnicamente las ventas |
| Carrito y precios | Cantidades, dedicatorias, precios y envío recalculados en servidor; rechazo de total desactualizado | Resolver B02/B03; control de existencias y cupos si se ofrecen compras sin confirmación humana |
| Inventario | Indicador disponible/agotado | No hay unidades de stock, reservas ni descuento atómico al vender. Dos pedidos pueden comprar el mismo último arreglo. Para productos hechos a pedido se necesita capacidad diaria equivalente |
| Pago | Tokenización, cargo, 3DS, protección contra reenvío del mismo intento, consulta, webhook verificado y conciliación por administrador | Validación con la cuenta real; probar aprobación, rechazo, autenticación, interrupción y evento repetido. Los mocks no prueban compatibilidad bancaria real |
| Pedidos | Registro privado y consulta administrativa; estado de pago | Faltan estados de preparación, despacho y entrega, responsable, historial de cambios y búsqueda/paginación. Definir un registro operativo manual o implementarlos |
| Avisos de venta | Pantalla de confirmación | No hay correo de pedido para comprador ni alerta automática de venta al negocio. `lib/mailer.js` solo envía verificación y recuperación de cuentas. Configurar Resend no crea estas notificaciones |
| Cuenta de cliente | Registro, verificación de correo, acceso, recuperación y cierre de sesión | No hay historial de pedidos ni direcciones guardadas. Los pedidos no se vinculan a un ID de cliente; la cookie está limitada a `/api/auth`. Consultas del último pago dependen del navegador |
| Postventa | Consulta manual por WhatsApp; conciliación Culqi | Reembolsos y contracargos se gestionan fuera del panel. Falta reflejar esos estados en la tienda y mantener registro de atención. No hace falta automatizar el reembolso para comenzar, pero sí tener un procedimiento |
| Comprobantes | Texto que deriva la solicitud a atención al cliente | No hay emisión tributaria ni selección/datos de facturación en checkout. Establecer emisión y entrega desde SOL u otro sistema aplicable; integración automática puede ser posterior |
| Reclamos | Formulario, persistencia privada, código y exportación | B04/B08, numeración correlativa, datos de representante cuando correspondan, acciones/respuesta del proveedor y control de plazo. Hoy el código es fecha más sufijo aleatorio, no correlativo |
| Seguridad | Hash scrypt, cookies HttpOnly, CSRF/origen, límites, sesiones revocables, MFA implementado, CSP, restricciones de archivos y transformación de imágenes | Activar configuración real, corregir identificación tras proxy si aplica y definir retención de datos. No se encontró evidencia de PAN/CVV almacenados en los flujos revisados |
| SEO y móvil | HTML renderizado en servidor, canónicas, sitemap, productos indexables, pruebas de navegación y tamaños móviles | Dominio definitivo, mediciones reales de rendimiento y seguimiento de indexación. No se midieron Core Web Vitals de producción |
| Operación | Scripts de comprobación y dos alternativas de persistencia | Monitoreo con alertas, logs útiles sin datos sensibles, plan de recuperación y procedimiento de despliegue/rollback |

No son requisitos para el primer día: cupones, puntos, reseñas, aplicación móvil, programa de fidelidad o automatización completa del reparto. Tampoco es necesario reescribir la tienda en otro framework para ponerla en marcha.

## Comprobaciones comerciales y normativas en Perú

La revisión técnica no certifica cumplimiento legal ni valida la situación tributaria del titular. Sí permite identificar carencias concretas que deben resolverse con la operación real.

El formato virtual de reclamaciones debe permitir una copia imprimible o por correo. La orientación de Indecopi también contempla identificación, representante de menores, detalle, pedido y acciones del proveedor; la respuesta debe gestionarse dentro del plazo informado. B04 afecta directamente la utilidad de esa copia. Revisar además numeración correlativa y formato oficial. Fuentes: [Libro de Reclamaciones de Indecopi](https://consumidor.gob.pe/libro-de-reclamaciones/) y [preguntas y respuestas oficiales](https://consumidor.gob.pe/wp-content/uploads/2020/07/Preguntas_Respuestas_LR_12.11.2025.pdf).

La confirmación de Culqi no sustituye una boleta o factura. Se debe definir cómo se emitirán y entregarán los comprobantes conforme al régimen aplicable. SUNAT ofrece emisión de boleta mediante SOL; esto permite evaluar una operación inicial sin desarrollar una integración tributaria propia. Fuentes: [comprobantes a emitir](https://orientacion.sunat.gob.pe/7030-06-comprobantes-de-pago-a-emitir) y [boleta electrónica](https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta).

Confirmar política de privacidad, canales para derechos ARCO, conservación y acceso a datos de clientes/destinatarios y la situación del banco de datos correspondiente. No se verificó un registro externo ni contratos con proveedores. Referencia: [Autoridad Nacional de Protección de Datos Personales](https://www.gob.pe/es/anpd).

## Hosting recomendado para este código

Precios públicos consultados el 03/10/2026, en USD. No incluyen necesariamente dominio, impuestos, correo, consumo adicional o comisiones de pago. Son referencias de contratación, no una cotización cerrada.

| Alternativa | Coste de referencia | Valoración específica |
| --- | --- | --- |
| **Vercel Pro + PostgreSQL externo, por ejemplo Neon** | Vercel desde US$20/mes más base de datos y excedentes | Mi primera opción para reducir cambios de infraestructura en este proyecto: ya tiene rutas Vercel y tratamiento específico de su IP de cliente. Exige probar persistencia PostgreSQL y despliegue real. Elegir un plan de base de datos con recuperación configurada |
| **Render de pago + Render PostgreSQL de pago** | Cómputo desde US$7 + US$6/mes, más almacenamiento/excedentes aplicables | Alternativa para concentrar servidor y base en un proveedor. Resolver B06; si se despliega con Docker, también B05. Validar memoria y carga antes de asumir que el tamaño mínimo será suficiente |
| Railway Pro + PostgreSQL | Mínimo US$20 de consumo mensual, con excedentes según uso | Adecuado para Node y base de datos, pero requiere las mismas verificaciones de proxy y Docker si se usa ese método. El coste depende de recursos; no asumir una tienda completa a precio fijo de US$5 |

La recomendación se basa en la arquitectura auditada, no en una medición comparativa de estos proveedores. Si el presupuesto manda, Render merece evaluación; para aprovechar la configuración existente, elegiría Vercel Pro. Vercel Hobby está limitado a uso personal no comercial. Render desaconseja sus instancias gratuitas para producción; su PostgreSQL gratuito expira a los 30 días. No elegir un hosting que solo sirva HTML o PHP para esta aplicación Node.

Fuentes: [Vercel precios](https://vercel.com/pricing), [limitación Hobby](https://vercel.com/docs/plans/hobby), [cabeceras Vercel](https://vercel.com/docs/headers/request-headers), [Neon: facturación por recursos y restauración](https://neon.com/blog/new-usage-based-pricing), [Render precios](https://render.com/pricing), [Render gratuito](https://render.com/docs/free), [Railway precios](https://railway.com/pricing). No se da una cifra mensual exacta para Neon: debe calcularse con su oferta y consumo efectivos al contratar.

## Orden de trabajo para una salida real

1. Corregir B01–B04 y B08; B05/B06 según hosting elegido. Mejorar el chequeo operativo B07. Agregar regresiones que comprueben los fallos encontrados.
2. Confirmar datos comerciales, productos vendibles, tarifas, anticipación y capacidad de entrega; definir comprobantes, atención de reclamos y devoluciones.
3. Preparar dominio, entorno de producción, base persistente, migración y respaldo restaurable. Incluir `lib/business-info.js` en el paquete de despliegue: actualmente no está registrado en Git y el servidor lo requiere.
4. Activar MFA del propietario. Configurar correo de cuentas y, por separado, implementar notificaciones de pedidos o un procedimiento de revisión del panel con responsable y frecuencia explícitos.
5. Probar sobre HTTPS con Culqi en test: pago aprobado, rechazado, 3DS, timeout, reenvío, webhook y conciliación. Probar registro/recuperación, compra invitada, reclamo y persistencia tras redespliegue. Verificar copia de la hoja de reclamo.
6. Habilitar cobros live solo cuando las comprobaciones anteriores estén completas y el negocio pueda atender las ventas. Verificar la primera operación de forma controlada y su comprobante.

**Para publicar hoy:** un catálogo con cotización por WhatsApp es viable después de completar dominio, persistencia, datos comerciales y reclamos, y comprobarlo en el hosting. **Para cobrar hoy:** no basta con subir archivos o poner llaves Culqi; los bloqueos anteriores aún no están resueltos. La auditoría no permite prometer que la habilitación bancaria, DNS o remitente de correo terminen hoy.

## Evidencia resumida de las pruebas adicionales

```text
Reloj de prueba: 2026-10-03 17:00 America/Lima
Entrega solicitada: 2026-10-03 09:00–12:00
POST /api/checkout/quote -> 200, total 114

Producto personalizado no publicado, base ramo, un tallo
POST /api/checkout/quote -> 200, subtotal 52, envío 15, total 67

Reclamo con correo/teléfono/tipo de documento inválidos
POST /api/reclamaciones -> 200, registro creado solo en almacenamiento temporal

Constancia después de registrar un reclamo válido
detailField: ""; receiptIncludesClaim: false; bodyIncludesClaim: false

Consulta de confirmación con petición abortada
"No encontramos un pedido reciente"
"Puedes volver al catálogo y crear una nueva compra."

Clientes distintos detrás del mismo proxy no Vercel
requestAddress(clienteA) === requestAddress(clienteB) -> true

Catálogo temporal corrupto tras inicializar
GET /api/health -> 200; GET /api/catalog -> 500

Simulación de archivos presentes en etapa npm ci del Dockerfile
node scripts/prepare-assets.js -> exit 1, ENOENT scandir .../views
```

Todas estas reproducciones utilizaron datos artificiales y entornos locales aislados; no enviaron correos, WhatsApp ni cargos reales. Las capturas de la suite están en `test-results/`, que Git ignora.
