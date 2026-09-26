# Estructura del proyecto

- `views/`: páginas HTML. Las URLs públicas siguen siendo `/index.html`, `/catalogo.html`, etc.
- `assets/scripts/`: comportamiento de tienda, cuenta, panel y checkout.
- `assets/scripts/components/`: navegación compartida y acceso de clientes, separados del catálogo.
- `assets/styles/site.css`: bases, componentes de compra y estilos responsive de las páginas.
- `assets/styles/components/header.css`: única fuente de estilos del encabezado y sus puntos de adaptación.
- `assets/styles/components/account.css`: cuenta, perfil y popup de bienvenida.
- `assets/styles/themes/multicolor.css`: variante de color, sin duplicar estructura.
- `assets/styles/admin.css`: panel privado.
- `assets/styles.css`, `assets/admin.css`, `assets/multicolor.css`: entradas de compatibilidad; no añadir reglas aquí.
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

Después de publicar: comprobar el dominio, darlo de alta en Google Search Console, enviar `/sitemap.xml` y revisar la indexación. El código no garantiza posiciones en buscadores.

## Mantenimiento y comprobaciones

Ejecutar `npm run check`, `npm test`, `npm run build` y `npm run test:ui`. Si el puerto 3011 está ocupado, definir `UI_TEST_PORT` antes de ejecutar las pruebas. Estas usan datos temporales y pagos simulados.

Editar un componente en su archivo; evitar añadir parches al final de la hoja para contradecir una regla existente. Las reglas responsive pertenecen al componente. Las rutas de imágenes en CSS son absolutas desde `/public/` para no depender de la carpeta de la hoja.

Referencias: [SEO con JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [URLs canónicas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
