# Arquitectura de PLUM

La aplicación conserva un servidor Node con módulos de negocio y páginas HTML renderizadas con SEO desde el servidor. El navegador usa módulos JavaScript nativos. HTML, CSS, interacción y reglas privadas tienen fuentes distintas.

```text
views/                         Estructura HTML de las páginas
assets/
  styles/
    site.css                   Manifiesto y orden de la cascada
    base/                      Base visual, tipografía y variables
    components/                Elementos reutilizables
    pages/                     Estilos de cada sección
    responsive/                Adaptaciones compartidas existentes
    themes/                    Variante visual
    admin.css                  Estilos exclusivos del panel
  scripts/
    main.js                    Arranque y selección de página
    core/                      Estado, HTTP y formato
    features/                  Carrito y datos de checkout
    components/                Interacción reutilizable
    pages/                     Controladores de página
    integrations/culqi.js       Adaptador de pagos del navegador
    account.js                 Formulario de acceso compartido
    admin.js                   Aplicación del panel
  generated/storefront.css     Hoja generada; no editar
lib/
  admin.js                     Permisos y operaciones administrativas
  customer-auth.js             Registro, login y sesiones
  catalog.js                   Validación y publicación del catálogo
  checkout.js                  Ciclo de pagos e idempotencia
  culqi.js                     Comunicación privada con la pasarela
  shipping.js                  Tarifas y cobertura
  settings.js                  Configuración de ventas
  store.js                     Persistencia local o PostgreSQL
  seo.js                       HTML inicial, metadatos, robots y sitemap
server.js                      Entrada HTTP, rutas y cabeceras
scripts/                       Compilación y comprobaciones
tests/                         Pruebas de servidor y navegador
```

## Flujo de una visita

1. Node entrega la vista con metadatos y contenido inicial rastreable.
2. El navegador carga `assets/generated/storefront.css` y `main.js` como módulo.
3. El arranque prepara navegación y servicios compartidos, consulta el catálogo y carga el controlador de la página actual con `import()`.
4. El controlador utiliza componentes y funciones de negocio del navegador. El adaptador de Culqi solo se importa al abrir un checkout habilitado.
5. El servidor vuelve a validar permisos, precios, envío y estados antes de guardar datos o cobrar. El navegador nunca decide el rol ni el importe final.

## Dónde cambiar cada cosa

| Cambio | Fuentes principales |
| --- | --- |
| Contenido y estructura de portada | `views/index.html`, `scripts/pages/home.js` |
| Diseño de portada | `styles/pages/home.css` y adaptación compartida en `styles/responsive/` |
| Catálogo y filtros | `views/catalogo.html`, `scripts/pages/catalog.js`, `styles/pages/catalog.css` |
| Tarjetas de productos | `scripts/components/products.js`, `styles/components/catalog-cards.css` |
| Carrito | `scripts/features/cart.js`, `scripts/pages/cart.js`, `styles/components/cart.css` |
| Cuenta y login | `views/cuenta.html`, `scripts/account.js`, `styles/components/account.css`, `lib/customer-auth.js` |
| Checkout | `views/checkout.html`, `scripts/pages/checkout.js`, `scripts/features/checkout.js`, `styles/pages/checkout.css` |
| Pagos y seguridad | `lib/checkout.js`, `lib/culqi.js`, `lib/admin.js`, `lib/customer-auth.js` |

Las rutas `scripts/` y `styles/` de la tabla son relativas a `assets/`.

## Desarrollo y comprobación

```sh
npm ci
npm start
```

`npm start` compila el CSS antes de iniciar Node. Después de editar estilos, ejecuta `npm run build` y recarga el navegador. El archivo compilado incluye comentarios con la ruta de cada fuente para localizar reglas en las herramientas del navegador.

```sh
npm run build
npm run check
npm test
npm run test:ui
```

`check` verifica sintaxis, recursos, importaciones locales y ausencia de ciclos entre módulos. Las pruebas de navegador cubren pantallas móviles, acceso por roles, errores de red, catálogo, carrito y pagos simulados con 3DS.

## Criterios de mantenimiento

- No añadir estilos ni manejadores de eventos dentro de las vistas HTML.
- Mantener las funciones puras en `core/`; los módulos de página coordinan componentes y eventos.
- Importar explícitamente cada dependencia. No compartir funciones mediante `window` salvo los SDK externos que lo requieren.
- Añadir las fuentes CSS al manifiesto en el orden apropiado. Nunca editar el resultado en `generated/`.
- Conservar datos privados, claves, precios definitivos y permisos en el servidor.
- Mantener `admin.css` independiente: la tienda no carga estilos del panel antiguo.
- Evitar dependencias circulares; compartir utilidades en un módulo inferior cuando dos módulos las necesitan.

La compilación no requiere dependencias nuevas. `npm run build` genera `dist/` copiando exclusivamente `assets/` y `public/`; no copia código privado, credenciales ni datos de clientes. Vercel publica esa salida con `@vercel/static-build` y mantiene Node para las vistas y API. Docker incluye las fuentes CSS necesarias antes de instalar y preparar los recursos. Los archivos generados se excluyen de Git y del contexto Docker para evitar publicar una compilación local desactualizada. Configuración de referencia: [compilaciones de Vercel](https://vercel.com/docs/builds/configure-a-build). La publicación remota requiere su propia verificación; no se realizó un despliegue con esta reorganización.
