from pathlib import Path
for p in Path('views').glob('*.html'):
 s=p.read_text(encoding='utf-8')
 if 'storefront.css?v=20261115-editorial' in s:
  p.write_text(s.replace('storefront.css?v=20261115-editorial','storefront.css?v=20261122-products'),encoding='utf-8')
