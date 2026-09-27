# Auditoría y preparación para publicar

Actualización del 27 de septiembre: consultar la [auditoría integral](AUDITORIA_INTEGRAL_2026-09-27.md). Se corrigió el cierre del ejecutor de navegador, se ampliaron las regresiones y la suite final terminó con 40 pruebas de servidor y 30 de navegador aprobadas. Los resultados anteriores de este documento corresponden al día 26.

Revisión local del 26 de septiembre de 2026. Incluye código, pruebas de servidor y pruebas de navegador con datos aislados. No equivale a una prueba de penetración del hosting publicado.

## Correcciones implementadas

- Reclamos: origen obligatorio, límite persistente por dirección, cuerpo limitado y campo trampa contra envíos automatizados.
- Navegador: CSP con scripts propios y nonce, sin eventos JavaScript en atributos; los dominios del proveedor de pagos se permiten únicamente en checkout. Protección contra marcos, detección de tipos y HSTS en producción.
- Acceso compartido: el servidor determina el rol; ambos accesos administrativos exigen MFA cuando está activado. Cerrar sesión revoca el acceso guardado en el servidor.
- Clientes: correo verificado antes de iniciar sesión; enlaces de verificación y recuperación con caducidad, almacenados como hash y de un solo uso. Restablecer contraseña revoca las sesiones anteriores.
- Administrador: doble factor TOTP, secreto cifrado, límites de intentos y diez códigos de recuperación de un uso. Activarlo requiere contraseña y una prueba del autenticador; no se activa automáticamente en una cuenta real.
- Instalación: modo cotización por defecto y ventas bloqueadas sin Culqi configurado. No se necesitan llaves Culqi para publicar el catálogo y recibir consultas.
- Interfaz: atributo `hidden` respetado aunque un formulario tenga estilos de cuadrícula; enlaces de correo funcionan también al abrirse en la misma pestaña.
- Arquitectura: vistas, estilos y lógica separados; módulos por página y componente, CSS compilado y directorio público de despliegue sin archivos privados.
- Diseño: portada con fotografías y tarjetas sin superposición, colores marfil, vino y salvia, adaptación móvil y animaciones que respetan movimiento reducido. Se retiró el diálogo automático que interrumpía la visita.
- SEO técnico: metadatos y enlaces de productos en HTML del servidor, URL canónica, sitemap y páginas privadas excluidas. Los productos inexistentes responden 404 y una caída de catálogo responde 503.

## Activación pendiente en el entorno real

1. Configurar `SITE_URL` con el dominio HTTPS definitivo y `DATABASE_URL` con el almacenamiento persistente. Conservar copias de seguridad.
   Completar también los datos reales del comercio: nombre comercial, razón social, RUC, dirección, correo, correo de reclamos y teléfono. El diagnóstico local los encontró pendientes; no se inventaron datos.
2. Configurar `RESEND_API_KEY` y `MAIL_FROM` con un dominio verificado en Resend; comprobar entrega real de verificación y recuperación. Sin ello, el registro permanece pausado.
3. Ingresar como administrador desde `cuenta.html`, abrir **Modo tienda**, configurar una aplicación autenticadora, confirmar su código y guardar fuera del navegador los códigos de recuperación.
4. Conservar `ADMIN_SESSION_SECRET`: cifra también el secreto MFA. Cambiarlo sin migrar el secreto cifrado impide validar el autenticador. La recuperación pública de contraseña corresponde a clientes; las credenciales administrativas se gestionan en el entorno privado.
5. Ejecutar `npm run deploy:check` con el entorno de producción y, después de publicar, `npm run audit:live -- https://TU-DOMINIO`. Esta última comprobación es de lectura y no envía pedidos ni correos.
6. Comprobar en el hosting sesiones, correo, MFA, reclamaciones, imágenes, cotización y disponibilidad. Registrar el dominio y sitemap en Google Search Console. El SEO técnico no garantiza una posición en Google.

Las variables de correo, dominio y base de datos no estaban configuradas en el entorno local revisado. No se enviaron correos reales ni se activó MFA en la cuenta del propietario. La URL provisional no pudo verificarse con la herramienta web; el estado del despliegue sigue pendiente.

## Verificación reproducible

`npm run check`, `npm test`, `npm run build` y `npm run test:ui`.

Resultado local: 60 archivos JavaScript y recursos comprobados, compilación completada y 35 pruebas de servidor aprobadas. Los 22 casos de navegador se comprobaron; después de corregir selectores y el formulario MFA, los dos casos fallidos se repitieron y aprobaron por separado. El proceso de Playwright quedó esperando durante el cierre de su servidor en Windows y se interrumpió tras los resultados; no se presenta esa ejecución como una suite completa con salida cero.

Las pruebas cubren permisos, manipulación de precios, sesiones, pagos simulados, recuperación, verificación, TOTP, códigos de recuperación y bloqueo de ventas sin proveedor. Las pruebas de correo y pago usan servidores locales ficticios. No prueban entregabilidad real, cargos bancarios ni configuración del proveedor cloud.

Los mensajes de recuperación son genéricos y tienen límites de envío; no se garantiza igualdad exacta de tiempos entre direcciones existentes e inexistentes. El servicio de correo se consulta durante la solicitud. La CSP mantiene estilos inline por compatibilidad con componentes existentes.

Referencias: [recuperación de contraseña, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [MFA, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [TOTP, RFC 6238](https://www.rfc-editor.org/info/rfc6238/), [envíos mediante Resend](https://resend.com/docs/api-reference/emails/send-email).
