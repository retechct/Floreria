# Auditoría de encabezados, composición y coherencia

15 de noviembre de 2026. Estado observado, no lista de mejoras implementadas.

## Alcance y evidencia

Revisión de las 15 rutas públicas del proyecto y del acceso de administración, en 1440 × 900 y 390 × 900. Se inspeccionaron capturas reales y se midieron navbar, cabeceras y títulos. Personalizar redirige al catálogo. Producto se revisó con Ramo Love; no se infiere que todos los productos tengan las mismas imágenes o extensiones de texto. Cuenta sin sesión, carrito y checkout en modo cotización, confirmación sin pedido. No se auditó el panel administrativo autenticado ni una transacción real. Esta revisión se concentra en encabezados, primera pantalla y coherencia de la comunicación; no constituye una certificación completa de accesibilidad o de todos los flujos.

Evidencia: [galería con 32 capturas locales y tres referencias](../tmp/audit-pages/index.html), [mediciones](../tmp/audit-pages/measurements.json). No se encontró desbordamiento horizontal en los tamaños revisados.

Metodología: Refero Design, consultado mediante omgskills; investigación y capturas antes de recomendar cambios. Se mantuvo como referencia de marca el logo aportado y la nueva portada editorial.

## Dictamen

La portada tiene personalidad y la marca se reconoce entre páginas. La concordancia todavía es parcial: la portada es dramática y editorial, mientras los interiores repiten fondos florales aclarados detrás de títulos, filtros y formularios. Esa repetición produce uniformidad, pero no distingue bien la finalidad de cada página.

El principal problema es la distribución del espacio: en el catálogo la cabecera ocupa 847 px en escritorio y 912 px en móvil, aparte del navbar de 125 y 92 px. En producto móvil el nombre comienza a 964 px desde el inicio del documento: la primera pantalla muestra fotografía y controles, pero no la información esencial del arreglo. Más animaciones no resuelven estos problemas.

## Investigación en Perú

Se abrieron y capturaron las páginas oficiales el día de la revisión. Las campañas cambian; las observaciones describen esas capturas, no resultados comerciales demostrados.

| Referencia | Observación | Aplicación al atelier |
| --- | --- | --- |
| [Rosatel](https://www.rosatel.pe/) | Marca roja sobre blanco, logo centrado, búsqueda y destino visibles; campañas y ocasiones tienen niveles distintos. | Incorporar acceso claro a búsqueda y cobertura. Mantener la separación entre navegación, mensaje de campaña y selección de productos. Su densidad promocional no es la dirección estética del atelier. |
| [Kukyflor](https://www.kukyflor.com/es/) | Logo verde con acento violeta, superficies blancas, buscador y teléfono; banner de noviembre y mensaje de entrega, seguido pronto por productos. | Adoptar claridad de servicio y rapidez para llegar al producto. La navegación extensa requiere una escala de catálogo que no conviene reproducir automáticamente. |
| [Lima Floral & Co.](https://limafloralco.com/) | Logo tipográfico centrado, fondo neutro cálido, iconos lineales, fotografía de arreglos y mensaje de entrega en el banner; campaña de peonías debajo. | Es la referencia más cercana para la sobriedad editorial, fotografía protagonista y separación entre marca y campaña. Su encabezado de varias filas ocupa mucho espacio: no conviene trasladarlo entero. |

La conclusión compartida es comercial: reconocer la tienda, encontrar flores y entender cómo recibirlas. No corresponde copiar promesas de entrega inmediata ni horarios sin datos confirmados del negocio.

## Revisión individual

| Página | Diagnóstico observado | Recomendación razonada | Prioridad |
| --- | --- | --- | --- |
| Inicio | Buena relación entre fondo ciruela, flores azules y título blanco. En móvil hay bastante aire sobre el mensaje; el botón secundario ocupa una segunda fila. WhatsApp flotante y Cotizar inferior duplican el contacto general. | Conservar fotografía y navbar transparente. Adelantar ligeramente el contenido móvil, comunicar coordinación de entrega y usar una sola acción persistente de contacto en móvil. El título emocional debe acompañarse de una explicación concreta del servicio. | Alta |
| Catálogo | Título largo, ocasiones, buscador, tipos de producto y filtros acumulan una cabecera de 847/912 px. La foto aclarada pasa detrás de los controles. «Presupuesto» aparece en el título aunque esta vista no muestra precios. | Título «Encuentra tu arreglo», una línea explicativa, búsqueda y filtros compactos. Fondo limpio bajo herramientas. Llevar la primera fila de productos a la primera pantalla o a su borde. Reservar presupuesto para cuando el usuario pueda realmente decidir con esa información. | Crítica |
| Colecciones | Cabecera de 644/612 px; nombres con fechas se parten en muchas líneas. Primavera aparece primero en noviembre. «Selecciones curatoriales» añade abstracción. | Introducir una colección vigente, con foto definida y descripción corta. Abreviar filtros y poner fechas en el detalle. Ordenar por campaña vigente solo cuando disponibilidad y campaña estén confirmadas. | Alta |
| Flores | Título claro; ocho variedades ofrecen una ruta útil. Cabecera de 513/541 px. La foto de un ramo detrás del selector compite con las pequeñas imágenes de variedades. | Mantener «Flores por variedad». Selector sobre blanco, texto más breve y productos inmediatamente debajo; evitar una segunda imagen decorativa superpuesta. | Alta |
| Ocasiones | Mensaje alineado con regalar; cabecera de 404/355 px. Debajo vuelve a presentarse otra introducción antes de las tarjetas. | Conservar el enfoque emocional. Unir ambas introducciones para llegar antes a cumpleaños, amor, agradecimiento, etc. Fotografía lateral con contorno definido en escritorio y encuadre propio en móvil. | Media |
| Producto | Composición escritorio clara: foto a la izquierda, nombre y consulta a la derecha. En móvil una miniatura única ocupa una fila antes de la foto; el nombre cae a y=964 px. | Si hay una sola foto, eliminar la miniatura redundante. Mostrar nombre e información esencial antes de la galería en móvil. Mantener consulta contextual con nombre del producto; distinguirla del contacto general. | Crítica |
| Contacto | «Coordinamos cada detalle contigo» expresa atención. «Concierge floral» es menos directo. Cabecera de 406/450 px; ubicación es solo referencial y falta horario visible en el bloque de contacto. | «Hablemos de tus flores», WhatsApp, cobertura y horario confirmado juntos. Mantener datos concretos antes del contenido secundario. No inventar dirección ni tiempo de respuesta. | Alta |
| Cuenta | Título comprensible y aviso útil de que consultar no requiere registro. Foto decorativa y cabecera separada consumen espacio antes del formulario. | Encabezado breve y neutro; conservar la aclaración de registro opcional junto al acceso. Dar prioridad a iniciar sesión y recuperar contraseña. | Media |
| Carrito | El texto ya explica cotización, pero conviven «Tu pedido floral», resumen y un checkout deshabilitado. | En modo cotización, presentar una selección para consultar y explicar el siguiente paso. En modo venta, carrito y compra normales. La jerarquía debe responder al modo real. | Alta |
| Checkout | «Finaliza tu compra» y «flujo seguro» preceden a «Ventas en pausa». Se muestra la preparación de Culqi al cliente. | Encabezado y contenido condicionados al modo tienda: «Coordina tu pedido» en cotización. Retirar detalles técnicos del proveedor de pagos y mensajes de pago que no aplican. | Crítica |
| Confirmación | Sin pedido muestra una recuperación comprensible. El título de 72 px en escritorio pesa más que muchos encabezados comerciales. | Título funcional de 36–44 px y explicación breve. Conservar salida al catálogo. Revisar aparte el estado real de pedido confirmado antes de declararlo validado. | Media |
| Políticas | Índice útil, pero título de 56 px y cabecera móvil de 419 px retrasan el texto. Datos de proveedor incluyen «Por confirmar». | Título de 36–40 px escritorio/28–32 móvil, índice compacto y lectura de 65–75 caracteres por línea. Completar datos con información del negocio. No se evaluó aquí cumplimiento jurídico. | Alta |
| Reclamaciones | Formulario bien separado por pasos. Foto floral decorativa no aporta a la tarea; información del proveedor aparece antes del formulario en móvil. | Encabezado neutro y breve; identidad del proveedor compacta y primer campo más cerca del inicio. Mantener etiquetas, seguimiento y estados claros. | Media |
| Catálogo original | «Láminas originales completas» y «material del catálogo» suenan a archivo interno. Láminas con identidad y precios propios pueden discrepar de la tienda actual. | Llamarlo «Catálogo para consultar», identificar edición/fecha y condiciones de vigencia. Mejorar ampliación/lectura; decidir su lugar como recurso secundario. | Alta |
| Personalizar | Redirige directamente al catálogo; no hay una experiencia de personalización independiente. | No prometer un diseñador de arreglos. Si se ofrece personalización por atención, enlazar a una consulta contextual claramente descrita. | Media |
| Administración | Acceso sencillo, limpio y con marca; título de 28/24 px. | Mantener su carácter funcional. La simplicidad ayuda en esta pantalla. Interior autenticado no revisado. | Baja |

## Sistema visual recomendado

La combinación de turquesa, violeta y flores azules es válida. Conviene controlar cuánto ocupa cada color y para qué se utiliza.

- Superficie principal: blanco suave `#FAFFFE`; turquesa claro `#E8F7F5` en zonas de apoyo, evitando teñir toda la tienda.
- Texto: verde oscuro `#123E35`; títulos editoriales ciruela `#351240`.
- Violeta `#A000B5`: acción principal y selección activa sobre superficies claras. Reducir su presencia en etiquetas pequeñas, ornamentos y numerosos bordes simultáneos.
- Turquesa `#C5F1ED`: acción sobre fondo oscuro, con texto verde oscuro. Mantener significado de acción primaria aunque cambie el contraste por superficie.
- Verde WhatsApp: reservado al contacto con ese servicio. Los botones verdes genéricos de revisar pedido/ingresar crean hoy otra familia visual y deberían integrarse al sistema.
- Fondo oscuro y fotografía envolvente: portada y campañas especiales. Cuenta, políticas y formularios funcionan mejor con superficies limpias.

Los valores son una dirección propuesta; la implementación debe verificar contraste de cada combinación y estado, especialmente donde exista una fotografía de fondo. No basta con medir un color de CSS sobre una imagen variable.

### Tipografía y espacios

La pareja serif en títulos y sans serif en controles es apropiada. El problema principal es que casi todas las páginas interiores usan el mismo título de 56 px aunque su función sea distinta.

| Rol | Escritorio propuesto | Móvil propuesto |
| --- | --- | --- |
| Portada emocional | 80–96 px | 44–50 px |
| Colecciones y ocasiones | 48–56 px | 34–38 px |
| Catálogo y producto | 40–48 px | 30–36 px |
| Cuenta, compra y páginas informativas | 32–40 px | 28–32 px |
| Texto de lectura | 16–18 px, interlineado 1.5–1.7 | 16 px |
| Navegación y controles | 14–16 px | 14–16 px |
| Información secundaria | 12–14 px | 12–14 px |

Navbar actual: 125 px escritorio y 92 px móvil. Probar 96–108 px en interiores conservando la legibilidad de la marca; la portada puede mantener más presencia. Usar una escala de espaciado de 8/16/24/32/48/64 px. En catálogo, reducir la acumulación de separaciones y niveles antes de reducir indiscriminadamente el tamaño del texto.

## Qué debe comunicar el encabezado

Navegación compartida: marca, Catálogo, Ocasiones, Flores, Colecciones, Contacto y acceso a búsqueda. Cuenta debe tener menor protagonismo mientras la compra principal se coordine por WhatsApp. Mantener la franja superior oculta, como se pidió.

Cada cabecera de página necesita título específico, una explicación breve y la siguiente acción cuando sea necesaria. Inicio debe presentar el atelier y su servicio; catálogo debe ayudar a elegir; producto debe identificar el arreglo; contacto debe facilitar conversar; checkout debe reflejar el estado real de compra. No todas necesitan foto, eslogan o botón.

## Orden de trabajo y criterios de aceptación

1. Corregir coherencia de cotización/compra y duplicación de contacto móvil. Ninguna pantalla debe invitar a pagar cuando el modo no lo permite.
2. Compactar catálogo y arreglar orden del producto móvil. Comprobar a 390 × 844 que el usuario identifica producto y siguiente paso sin atravesar grandes bloques ornamentales; en catálogo, primer resultado visible cerca de la primera pantalla.
3. Unificar roles de color, tipografía y navbar. Conservar fotografía y personalidad de la portada; simplificar superficies funcionales.
4. Diferenciar colecciones y ocasiones por contenido, con fotografía bien encuadrada y campaña vigente verificada.
5. Revisar lectura, foco, contraste, navegación móvil y movimiento reducido después de implementar. Las transiciones deben acompañar cambios de estado; no compensar una jerarquía confusa.

Este informe y la galería documentan la auditoría solicitada. Las recomendaciones no se han aplicado a la web en esta revisión.
