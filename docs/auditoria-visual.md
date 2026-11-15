# Auditoría visual y UX

Revisión del 15 de noviembre de 2026. Se utiliza la identidad de La Casa de las Flores Atelier, con rosas azules, turquesa y morado. La referencia aportada por el usuario define la composición de símbolo sobre nombre. Refero Design y sus guías de movimiento, consultadas mediante omgskills, orientan las transiciones. Emil Design Engineering aporta criterios de respuesta, teclado y movimiento reducido.

## Hallazgos y cambios por página

| Página | Hallazgo | Mejora aplicada |
| --- | --- | --- |
| Inicio | La entrada apenas diferenciaba texto y fotografía. | Aparición escalonada y revelado de fotografías durante 850 ms. Marca más presente y cabecera despejada. |
| Catálogo | Las tarjetas aparecían con poca continuidad al filtrar. | Entrada escalonada de resultados y respuesta de imágenes, botones y filtros. Se conserva la paginación existente. |
| Colecciones | Cabecera similar a las páginas funcionales. | Más espacio editorial, fotografía de temporada y entrada de tarjetas al recorrer el contenido. |
| Flores | La guía conservaba tonos cálidos ajenos a la nueva paleta. | Fondo turquesa suave y aparición de guía y tarjetas. |
| Ocasiones | Las secciones carecían de una entrada visual clara. | Fotografía de cabecera con más presencia y tarjetas con movimiento e imágenes ampliadas al pasar el puntero. |
| Producto | Fotografía y opciones compartían una aparición poco diferenciada. | Entradas de fotografía y panel de compra, con respuesta de botones. |
| Contacto | Cabecera y bloques informativos se percibían como una sola superficie. | Entrada de títulos y bloques, conservando WhatsApp como acción principal. |
| Cuenta | El título competía con el contenido de la portada. | Cabecera funcional compacta, aparición de panel y estados de enfoque consistentes. |
| Carrito | El estado vacío requería una presentación más clara. | Entrada del estado vacío y respuesta de controles. |
| Checkout | Los campos necesitan estabilidad durante la compra. | Cabecera compacta y respuesta de controles. Los bloques del formulario quedan fuera de las animaciones de desplazamiento. |
| Confirmación | Debe priorizar el estado del pedido. | Entrada del panel de confirmación. La revisión manual cubre el estado sin pedido. |
| Políticas | Una cabecera grande restaba espacio al texto. | Cabecera compacta y entrada de secciones. |
| Reclamaciones | El formulario necesita prioridad frente al decorado. | Cabecera funcional, controles consistentes y navegación por teclado. |
| Catálogo original | Las láminas son contenedores muy altos. | Se conserva su lectura continua. Se evita ocultarlas esperando un umbral de desplazamiento. |
| Personalizar | La ruta redirige al catálogo. | Se verificó la redirección existente y la presentación del destino. |

## Interacciones compartidas

- Se eliminó Cotizar del encabezado en modo cotización. WhatsApp flotante mantiene el contacto general y cada producto conserva su consulta contextual.
- Menús y perfil aparecen con transiciones de 180–220 ms.
- Secciones y tarjetas entran con desplazamiento de 28 px y secuencias de hasta 195 ms entre elementos.
- Las tarjetas responden al puntero y los botones reaccionan al pulsarlos.
- La navegación entre documentos utiliza View Transitions cuando el navegador lo admite. La navegación normal continúa disponible en los demás navegadores.
- El encabezado y WhatsApp mantienen continuidad durante la transición de página.
- El movimiento se desactiva con la preferencia de movimiento reducido. El contenido sigue visible sin JavaScript o sin IntersectionObserver.

## Verificación

Se recorrieron 15 rutas públicas en escritorio y móvil, incluidos sus estados disponibles. Se comprobaron iconos, desbordamientos, contenido visible y ausencia del botón redundante en el encabezado. Se verificaron movimiento reducido y contenido sin JavaScript.

Pasaron 24 pruebas de interfaz y resiliencia, y 11 pruebas de SEO. Incluyen navegación por teclado, menú móvil, filtros, paginación, producto y fallos de carga. La administración autenticada y una compra real quedan fuera de esta revisión visual.

## Rediseño posterior de la portada

La portada utiliza una fotografía floral de fondo a pantalla completa, generada con ImageGen y guardada en `assets/brand/atelier-hero.webp`. La dirección visual combina rosas blancas y azules, follaje verde, fondo ciruela oscuro y espacio libre a la izquierda para el texto. La navegación se superpone con texto blanco y pasa a fondo sólido al desplazarse. La franja morada superior queda oculta en todas las páginas.

La fotografía sustituye las dos tarjetas de producto de la cabecera. Los productos continúan disponibles en la sección de destacados y en el catálogo. El título tiene mayor escala, los botones usan turquesa y un contorno blanco, y la versión móvil adapta el encuadre y el contraste del fondo.

La captura actual de esta portada está en `tmp/portada-redisenada.png`. La vista previa de movimiento `tmp/recorrido-visual.webm` corresponde a la composición anterior.
