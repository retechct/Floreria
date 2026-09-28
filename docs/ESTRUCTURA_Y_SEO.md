# Estructura del proyecto

- `views/`: páginas HTML. Las URLs públicas siguen siendo `/index.html`, `/catalogo.html`, etc.
- `assets/scripts/main.js`: arranque compartido y carga de cada página mediante importaciones dinámicas.
- `assets/scripts/core/`: configuración, estado de tienda, consultas HTTP y formato seguro.
- `assets/scripts/features/`: carrito y preparación de datos del checkout.
- `assets/scripts/components/`: navegación, perfil, productos, entrega y componentes compartidos.
- `assets/scripts/pages/`: comportamiento de cada página; se carga cuando se necesita.
- `assets/scripts/integrations/culqi.js`: integración del navegador con Culqi, cargada desde checkout.
- `assets/styles/site.css`: manifiesto que define el orden de los archivos CSS.
- `assets/styles/base/`, `components/`, `pages/`, `responsive/`: fuentes de estilos separadas por responsabilidad.
- `assets/generated/storefront.css`: resultado compilado; no se edita y no se versiona. Se genera con `npm run build`, `npm start`, `npm run check` o `npm run test:ui`.
- `assets/styles/components/header.css`: única fuente de estilos del encabezado y sus puntos de adaptación.
- `assets/styles/components/account.css`: cuenta, recuperación de contraseña, verificación de correo y perfil.
- `assets/styles/base/foundation.css`: tipografía y paleta crema, ciruela y vino; `assets/styles/base/fonts.css` y `assets/fonts/`: Inter y Cormorant Garamond alojadas en el proyecto.
- `assets/styles/admin.css`: panel privado.
- `assets/styles.css`, `assets/admin.css`: entradas de compatibilidad; no añadir reglas aquí.
- `public/assets/`: imágenes públicas; `assets/vendor/`: dependencias preparadas por el build.
- `lib/`: módulos del servidor. `lib/seo.js` sirve las vistas, metadatos, sitemap y robots.
- `config/site.json`: URL pública provisional, reemplazable por `SITE_URL`.
- `data/`: catálogo inicial. `.runtime/`: datos locales, excluidos de Git.
- `scripts/`: preparación, comprobaciones y configuración.
- `tests/`: pruebas de servidor y navegador.
- `docs/`: documentación de mantenimiento y publicación.

## Cambiar el dominio

Actualmente se usa la URL provisional de Vercel indicada en `config/site.json` en producción. Al conectar el dominio definitivo, establecer `SITE_URL=https://tu-dominio` en Vercel y volver a desplegar. Esta variable tiene prioridad sobre el archivo. Debe coincidir con el dominio público utilizado para comprar; también se utiliza para validar el origen de solicitudes.

Las vistas de prueba de Vercel (`VERCEL_ENV=preview`) envían `noindex` y no permiten rastreo. El dominio público debe apuntar a un despliegue de producción. No se debe cambiar esta protección para indexar cada despliegue temporal.

## SEO implementado

Cada página recibe título, descripción, canonical y Open Graph desde el servidor. Las fichas incluyen contenido inicial y datos Product de productos publicados; las ofertas solo aparecen en modo venta. Un producto inexistente devuelve 404 y un fallo de datos devuelve 503 con Retry-After. No se inventan reseñas, valoraciones ni una dirección física.

`/sitemap.xml` incluye páginas públicas y productos publicados. Cuenta, cesta, pago y administración tienen `noindex`. `/robots.txt` referencia el sitemap. La entrada `/personalizar.html`, retirada de la tienda, redirige al catálogo.

La portada y el catálogo incluyen enlaces a productos en el HTML inicial, visibles sin JavaScript. El catálogo completo permite descubrir todos los productos; JavaScript añade filtros y paginación. Las variantes con parámetros del catálogo se excluyen del índice para evitar combinaciones duplicadas. `/index.html` redirige permanentemente a `/`. Si falla el catálogo, se responde 503 en lugar de presentar una página vacía como válida.

Después de publicar: comprobar el dominio, darlo de alta en Google Search Console, enviar `/sitemap.xml` y revisar la indexación. El código no garantiza posiciones en buscadores.

## Mantenimiento y comprobaciones

Ejecutar `npm run check`, `npm test`, `npm run build` y `npm run test:ui`. Si el puerto 3011 está ocupado, definir `UI_TEST_PORT` antes de ejecutar las pruebas. Estas usan datos temporales y pagos simulados.

Editar un componente en su archivo; evitar añadir parches al final de la hoja para contradecir una regla existente. Las reglas responsive pertenecen al componente. Las rutas de imágenes en CSS son absolutas desde `/public/` para no depender de la carpeta de la hoja.

La adaptación compartida heredada se conserva en `styles/responsive/` para mantener el orden de la cascada. Las nuevas reglas específicas deben vivir junto al componente. El manifiesto se compila sin cambiar el orden: el navegador recibe una hoja de tienda, en lugar de descargar cada fuente CSS por separado. Los módulos JavaScript usan `import`/`export`, sin depender del orden de etiquetas `<script>` ni publicar funciones de tienda en `window`. `npm run check` valida rutas importadas y rechaza dependencias circulares.

Para una guía de responsabilidades y ejemplos de mantenimiento, consulta [ARQUITECTURA.md](ARQUITECTURA.md).

Referencias: [SEO con JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [URLs canónicas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
