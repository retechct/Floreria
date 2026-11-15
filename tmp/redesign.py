from pathlib import Path
p=Path('assets/scripts/pages/product.js');s=p.read_text(encoding='utf-8');start=s.index('        <div class="product-title-row">');end=s.index('        ${deliveryMarkup}',start);title=s[start:end];s=s[:start]+s[end:];s=s.replace('    <div class="product-detail">','    <div class="product-detail">\n'+title);p.write_text(s,encoding='utf-8')
changes={'catalogo.html':[('Flores por ocasión, estilo y presupuesto','Encuentra tu arreglo')],'colecciones.html':[('Ediciones de temporada y selecciones curatoriales con una estética propia, creadas para descubrir algo especial más allá de una ocasión concreta.','Flores que celebran la temporada. Explora nuestras selecciones y encuentra un detalle especial.')],'contacto.html':[('Concierge floral','Estamos para ayudarte'),('Coordinamos cada detalle contigo','Hablemos de tus flores')],'catalogo-original.html':[('Láminas originales completas','Catálogo para consultar'),('Material del catálogo','Nuestra selección floral'),('Las páginas adjuntas quedan preservadas para revisar composiciones, precios de origen y referencias visuales.','Explora los arreglos de esta edición. Confirma precios y disponibilidad con el atelier antes de pedir.')],'index.html':[('Ramos y detalles para celebrar, agradecer o decir «te quiero». Elige el tuyo y añade una dedicatoria.','Ramos y detalles para celebrar, agradecer o decir «te quiero». Coordinamos tu entrega en Lima y Callao.') ]}
for name,reps in changes.items():
 p=Path('views')/name;s=p.read_text(encoding='utf-8')
 for a,b in reps:s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
p=Path('assets/scripts/pages/checkout.js');s=p.read_text(encoding='utf-8').replace('    const form =', '''    document.querySelector('.page-head h1').textContent = 'Coordinemos tu pedido';
    document.querySelector('.page-head .eyebrow').textContent = 'Atención personalizada';
    document.querySelector('.page-head .lead').textContent = 'Confirmamos el arreglo, la entrega y el importe contigo por WhatsApp.';
    const protection = document.querySelector('.order-summary-panel + .panel');
    if (protection) protection.innerHTML = '<h3>Antes de confirmar</h3><p>Te ayudamos a revisar disponibilidad, dedicatoria, distrito y fecha de entrega.</p><a href="politicas.html">Información sobre pedidos y entregas</a>';
    const form =''').replace('Ventas en pausa','Tu regalo empieza con una conversación').replace('Por ahora estamos recibiendo cotizaciones por WhatsApp mientras dejamos Culqi listo.','Cuéntanos qué arreglo te gusta y para qué ocasión. Te ayudamos a coordinar los detalles.').replace('La tienda esta en modo cotizacion. El pago online esta desactivado.','Coordinamos tu pedido por WhatsApp.').replace('"error");','"info");');p.write_text(s,encoding='utf-8')
for p in Path('views').glob('*.html'):
 s=p.read_text(encoding='utf-8').replace('20261115-editorial','20261115-coherent');p.write_text(s,encoding='utf-8')
