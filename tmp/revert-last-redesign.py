from pathlib import Path
import ast
# Reverse only the edits introduced by the last redesign.
module=ast.parse(Path('tmp/redesign.py').read_text(encoding='utf-8-sig'))
changes=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='changes' for t in n.targets))
for name,reps in changes.items():
 p=Path('views')/name;s=p.read_text(encoding='utf-8')
 for old,new in reps:s=s.replace(new,old)
 p.write_text(s,encoding='utf-8')
p=Path('assets/scripts/pages/product.js');s=p.read_text(encoding='utf-8');start=s.index('        <div class="product-title-row">');end=s.index('\n      <div class="gallery">',start);title=s[start:end].rstrip()+'\n';s=s[:start]+s[end+1:];s=s.replace('      <div class="buy-panel">\n','      <div class="buy-panel">\n'+title);p.write_text(s,encoding='utf-8')
p=Path('assets/scripts/pages/checkout.js');s=p.read_text(encoding='utf-8');start=s.index("    document.querySelector('.page-head h1')");end=s.index('    const form =',start);s=s[:start]+s[end:];s=s.replace('Tu regalo empieza con una conversación','Ventas en pausa').replace('Cuéntanos qué arreglo te gusta y para qué ocasión. Te ayudamos a coordinar los detalles.','Por ahora estamos recibiendo cotizaciones por WhatsApp mientras dejamos Culqi listo.').replace('setCheckoutStatus("Coordinamos tu pedido por WhatsApp.", "info");','setCheckoutStatus("La tienda esta en modo cotizacion. El pago online esta desactivado.", "error");');p.write_text(s,encoding='utf-8')
p=Path('assets/scripts/pages/cart.js');s=p.read_text(encoding='utf-8').replace('Preparemos tu regalo','Estamos atendiendo por cotizacion').replace('<span>Tu pedido</span><strong>A coordinar</strong>','<span>Modo tienda</span><strong>Solo cotizacion</strong>').replace('    checkoutAction?.setAttribute("hidden", "");\n','');p.write_text(s,encoding='utf-8')
p=Path('assets/scripts/pages/collections.js');s=p.read_text(encoding='utf-8');old,new=changes['colecciones.html'][0];p.write_text(s.replace(new,old),encoding='utf-8')
p=Path('views/ocasiones.html');s=p.read_text(encoding='utf-8').replace('        <div class="occasion-directory"', '''        <div class="occasions-directory-heading">
          <div><p class="eyebrow">Elige el motivo</p><h2>¿Qué quieres hacer sentir?</h2></div>
          <p>Explora cada ocasión y entra al catálogo con la selección adecuada ya preparada.</p>
        </div>
        <div class="occasion-directory"''');p.write_text(s,encoding='utf-8')
p=Path('views/catalogo.html');s=p.read_text(encoding='utf-8').replace('Filtrar por ocasión y disponibilidad','Más filtros: ocasión, presupuesto y disponibilidad');p.write_text(s,encoding='utf-8')
for p in Path('views').glob('*.html'):
 s=p.read_text(encoding='utf-8').replace('20261115-coherent','20261115-editorial');p.write_text(s,encoding='utf-8')
p=Path('assets/styles/site.css');s=p.read_text(encoding='utf-8').replace('@import url("./themes/coherence.css");\n','');p.write_text(s,encoding='utf-8')
p=Path('docs/auditoria-encabezados-peru.md');s=p.read_text(encoding='utf-8');s=s.split('Este informe y la galería anterior documentan')[0]+'Este informe y la galería documentan la auditoría solicitada. Las recomendaciones no se han aplicado a la web en esta revisión.\n';p.write_text(s,encoding='utf-8')
print('Último rediseño revertido; portada editorial anterior conservada.')
