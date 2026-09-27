# Auditoría integral de la florería — 27 de septiembre de 2026

Se revisaron código, navegación, catálogo, compra/cotización, cuentas, SEO, accesibilidad, adaptación de pantallas, recursos y preparación para desplegar. Las pruebas usan datos aislados: no se enviaron mensajes a clientes, correos reales ni cargos bancarios.

## Diseño conservado

Se mantienen la portada, fotografías, tipografías, colores, tarjetas, menú móvil y barra flotante. Las capturas del área inicial de la portada, a **390 × 900 y 1440 × 900**, son idénticas píxel a píxel antes y después. Esto comprueba esa región y esos tamaños; no implica que cada pantalla sea visualmente idéntica, pues el catálogo incorpora controles nuevos.

Las referencias locales están en `.runtime/audit-visual/`. Se pueden reproducir con `node scripts/audit-visual.js before` y `after`, con un servidor de pruebas en `UI_TEST_PORT` (3050 por defecto). Se revisaron también capturas de catálogo, contacto y navegación, y los recorridos responsive de las pruebas.

## Comparación con florerías reales

Se consultaron las páginas públicas oficiales, no solo imágenes de plantillas. La comparación es de contenido y organización; no se hicieron compras ni se verificó la operación de esos negocios.

| Referencia | Patrón observado | Aplicación en esta tienda |
| --- | --- | --- |
| [Rosabel, Lima](https://www.rosabel.com/) | Organiza por ocasión, tipo de flor y formato; presenta precios y disponibilidad. | Mantener categorías y ocasiones, mostrar con claridad filtros activos y disponibilidad. |
| [Rosas Don Eloy](https://rosasdoneloy.com/) | Separa productos, motivos para regalar, eventos y ayuda; facilita contacto por WhatsApp. | Conservar una navegación principal breve, agrupar información en el menú y dirigir arreglos a medida a contacto. |
| [Bloom & Wild](https://www.bloomandwild.com/send-flowers/tagonly/letterbox) | Ofrece filtros de presupuesto y explica entrega, contenido del regalo y cuidados. | Incorporar presupuesto y mejorar el lenguaje de entrega. No trasladar promesas de entrega o garantías de otro negocio. |

No se copiaron fotografías, reseñas, textos comerciales ni una identidad ajena. Las promesas sobre plazos, sustituciones y disponibilidad deben corresponder a la operación real de esta florería.

## Hallazgos corregidos

| Prioridad | Problema comprobado | Corrección y evidencia |
| --- | --- | --- |
| Alta | Un login podía terminar de verificar la contraseña antigua después de un restablecimiento y crear una nueva sesión. | Revalidación de credenciales dentro de la actualización atómica del almacenamiento. Regresión en `tests/auth-race.test.js`. |
| Media | Un fallo del almacenamiento de reclamaciones devolvía el mensaje interno al visitante. | Respuesta 500 genérica; las validaciones conservan mensajes útiles. Regresión en `tests/claims-errors.test.js`. |
| Media | La dedicatoria, fecha, horario y distrito escritos en una ficha no se incluían al cotizar. | El enlace de WhatsApp se actualiza con las preferencias; prueba inspecciona el enlace sin enviar el mensaje. |
| Media | Buscar una parte del nombre de un distrito podía devolver la tarifa de otro. | Coincidencia exacta normalizada; se solicita el nombre completo cuando no existe coincidencia. |
| Media | La ficha prometía «Hoy disponible» sin comprobar capacidad de entrega. | Fecha y horario como preferencias sujetas a confirmación; se impide añadir una fecha pasada. |
| Media | El carrito declaraba ser modal, pero el teclado podía llegar al fondo y a controles cerrados. | Foco inicial, retención, restauración y fondo inerte; controles de cantidad con nombres accesibles. |
| Media | Era posible enfocar el enlace de checkout vacío/inactivo. | El enlace se oculta o se retira su destino según el estado. |
| Media | «Imprimir constancia» usaba un evento inline bloqueado por la CSP. | Manejador JavaScript registrado mediante evento; probado con la política de scripts activa. |
| Media | El menú ofrecía un personalizador retirado que redirigía al catálogo. | «Arreglos a medida y contacto» conduce a la página de atención. La ruta antigua mantiene su redirección; no se reactivó un flujo de venta sin soporte. |
| Baja | La búsqueda distinguía tildes y perdía selección al recargar. | Normalización de búsqueda y filtros/orden/página conservados en la URL. |
| Baja | No era visible qué restricciones de ocasión, colección o promoción estaban aplicadas. | Resumen de filtros y acción para limpiarlos, incluidos los recibidos por URL. |
| Baja | El HTML inicial podía ocultar precios que debían mostrarse durante cotización; el teléfono estructurado no seguía la configuración. | SSR y JSON-LD coherentes con esos valores. Nuevos filtros también se respetan en el HTML sin JavaScript. |
| Baja | Las pruebas terminaban sus casos pero no cerraban el servidor en Windows. | El ejecutor administra su servidor aislado y conserva el código de salida real. |

Se agregaron filtros desplegables de ocasión, presupuesto y productos disponibles utilizando el estilo existente. El presupuesto no se muestra si la tienda oculta precios. El HTML sin JavaScript conserva todos los resultados filtrados para navegación; la paginación de 12 productos se aplica con JavaScript.

## Verificación

- `npm test`: **40 pruebas aprobadas**, incluidas seguridad, sesiones, precios, pagos simulados y SEO.
- `npm run check`: **67 archivos JavaScript y recursos verificados**.
- `npm run build`: compilación y preparación de archivos públicos correctas.
- `npm audit --omit=dev --json`: **0 vulnerabilidades conocidas reportadas** en dependencias de producción en la fecha de la revisión. No es una garantía de ausencia de vulnerabilidades.
- Catálogo inicial: **77 productos y 77 imágenes locales comprobadas; ninguna ruta de imagen faltante**.
- Pruebas responsive: rutas públicas en 320, 390, 760 y 820 px, además de encabezado/escritorio y ambas paletas. `/personalizar.html` se comprueba como ruta antigua redirigida, no como una página de compra activa.
- `npm run test:ui`: **30/30 pruebas aprobadas en 1,6 minutos**, cierre automático del servidor y código de salida 0. Incluye login, verificación, recuperación, MFA, administración, filtros, reclamaciones, cotización, carrito, adaptación móvil y pago/3DS simulado.

Los pesos locales sin compresión son 86 133 bytes de CSS compilado, 442 433 bytes de Lucide y 5 979 bytes del arranque principal. No son métricas de carga real: faltan mediciones de red, Core Web Vitals y caché en el hosting publicado. Reducir el paquete de iconos puede ser una optimización posterior; no se cambió la biblioteca durante esta revisión.

## Pendientes reales antes de publicar

`npm run deploy:check` sigue detectando diez configuraciones pendientes en el entorno local: dominio HTTPS, almacenamiento persistente, siete variables de identificación/contacto comercial y activación de MFA. También falta configurar correo transaccional para registro y recuperación. La ausencia local de variables no permite afirmar qué está configurado en el hosting.

Sin Culqi se mantiene el modo cotización. Los 42 distritos sin tarifa no aceptan pedidos. Los 77 productos iniciales tienen menos de dos fotos: faltan fotografías propias adicionales y una revisión comercial de sus fichas. No se inventaron galerías, testimonios ni reseñas.

Quedan por comprobar en el entorno publicado: entrega real de correos, MFA del propietario, dominio/canónicas, conexión cloud, copias de seguridad, rendimiento, disponibilidad y —solo si se activa la venta— Culqi y webhook reales. La auditoría local no sustituye esas pruebas.

Como límite conocido, la recuperación de contraseña tiene respuesta genérica y límites de envío, pero consulta el proveedor de correo durante la petición: los tiempos podrían diferir entre cuentas existentes e inexistentes. La CSP mantiene estilos inline por compatibilidad; sí restringe los scripts. Ver también [auditoría de seguridad y activación](AUDITORIA_SEGURIDAD.md).

La siguiente inversión útil en contenido es completar fotografías propias, especificaciones verificadas y datos de atención. Las reseñas solo deben incorporarse cuando provengan de clientes reales. Para medir SEO después de publicar, verificar el dominio y sitemap en Search Console; no se promete una posición en Google.
