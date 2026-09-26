# Plan de publicacion

Este proyecto ya esta preparado para publicar como tienda con panel de administrador, productos, colecciones, tarifas por distrito y checkout con Culqi. Lo que falta para vender de verdad no es codigo local: son cuentas, dominio, base de datos persistente, llaves de Culqi y datos legales del negocio.

## Recomendacion principal

Para empezar con buen equilibrio entre costo y facilidad:

- Dominio: Cloudflare Registrar o Porkbun.
- Hosting: Vercel para la app Node.js.
- Base de datos: Neon PostgreSQL conectada a Vercel.
- Pagos: Culqi en modo test primero, despues llaves live.

Esta combinacion es simple para una tienda pequena o mediana, permite dominio propio con HTTPS y evita depender del disco local del servidor.

## Nombres de dominio sugeridos

Primero intenta con `.com`; si no esta libre, usa `.pe` o `.com.pe`.

- `lacasadelasflores.pe`
- `lacasadelasflores.com.pe`
- `lacasadelasfloresatelier.com`
- `lacasadelasfloresatelier.pe`
- `florerialacasadelasflores.com`
- `florerialacasadelasflores.pe`
- `rosaslacasa.com`
- `floresatelierlima.com`

Mi primera opcion seria `lacasadelasflores.pe` si esta disponible. Si quieres algo mas internacional, `lacasadelasfloresatelier.com`.

## Donde comprar el dominio

Opcion recomendada:

- Cloudflare Registrar: buen DNS, renovaciones sin mucho sobreprecio y SSL/DNS excelente.

Opcion facil:

- Porkbun: suele ser barato, simple y con buena experiencia para comprar dominios.

Opcion conocida:

- Namecheap: facil de usar, aunque conviene revisar el precio de renovacion, no solo el primer ano.

## Hosting recomendado

Opcion recomendada para este proyecto:

- Vercel: despliegue facil, HTTPS automatico, dominio propio, variables de entorno y buen flujo desde Git.

Alternativas:

- Render: buena opcion si prefieres un servidor Node siempre encendido.
- Railway: facil para Node + PostgreSQL, pero revisa costos por uso.
- DigitalOcean App Platform: mas estable para negocio cuando ya tengas ventas constantes.

## Base de datos recomendada

Opcion recomendada:

- Neon PostgreSQL.

Motivos:

- Es PostgreSQL administrado.
- Funciona bien con Vercel.
- Evita perder productos, pedidos, tarifas e imagenes cuando el servidor se reinicia.

Alternativas:

- Supabase PostgreSQL si luego quieres agregar mas funciones tipo storage, auth o dashboard de datos.
- Render PostgreSQL si publicas todo en Render.
- Railway PostgreSQL si decides usar Railway para app y base de datos juntos.

## Variables que se deben configurar en produccion

En el hosting debes crear estas variables:

```env
SITE_URL=https://tudominio.com
DATABASE_URL=postgresql://...

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...

CULQI_PUBLIC_KEY=pk_live_...
CULQI_SECRET_KEY=sk_live_...
CULQI_WEBHOOK_SECRET=...

BUSINESS_COMMERCIAL_NAME=La Casa de las Flores Atelier
BUSINESS_LEGAL_NAME=TU_RAZON_SOCIAL
BUSINESS_RUC=TU_RUC
BUSINESS_ADDRESS=TU_DIRECCION_FISCAL
BUSINESS_EMAIL=ventas@tudominio.com
BUSINESS_CLAIMS_EMAIL=reclamos@tudominio.com
BUSINESS_PHONE=51947370668
```

Antes de usar `pk_live` y `sk_live`, prueba con llaves test de Culqi.

## DNS minimo

Cuando compres el dominio:

1. Agrega el dominio al hosting.
2. Configura los registros DNS que te indique el hosting.
3. Espera que el SSL/HTTPS quede activo.
4. Cambia `SITE_URL` por el dominio final con `https://`.
5. Registra el webhook en Culqi apuntando a:

```text
https://tudominio.com/api/webhooks/culqi/TU_CULQI_WEBHOOK_SECRET
```

## Antes de activar ventas reales

Ejecuta:

```bash
npm run deploy:check
```

Debe salir sin pendientes criticos. Ahora mismo los pendientes esperados son:

- Dominio HTTPS real.
- Llaves Culqi.
- Webhook Culqi.
- PostgreSQL o almacenamiento persistente.
- Datos comerciales reales.
- Tarifas para los distritos que aun no atiendes.
- Fotos extra para productos antiguos si quieres que todos tengan 2 o 3 imagenes.

## Orden recomendado

1. Comprar dominio.
2. Crear cuenta en Vercel.
3. Crear base de datos Neon PostgreSQL.
4. Conectar el proyecto al hosting.
5. Poner variables de entorno.
6. Probar compras con Culqi test.
7. Registrar webhook.
8. Revisar tarifas de todos los distritos.
9. Activar Culqi live.
10. Hacer una compra real pequena de prueba.

