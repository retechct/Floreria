const BRAND = {
  name: "La Casa de las Flores",
  phone: "51947370668",
  location: "Lima, Peru",
};

const PRODUCTS = [
  { id: "ramo-pasion", name: "Ramo Pasión", price: 99, category: "Ramos", occasion: "Amor", image: "public/assets/edited/products/ramo-pasion.jpg", badge: "15 rosas", description: "Rosas importadas, follajes finos, topper dorado, forro estilo coreano y tarjeta personalizada." },
  { id: "ramo-aurora", name: "Ramo Aurora", price: 55, category: "Ramos", occasion: "Detalle", image: "public/assets/edited/products/ramo-aurora.jpg", badge: "Suave", description: "Rosas importadas, astromelias, gipsófilas, siempreviva, colita de conejo y tarjeta personalizada." },
  { id: "box-dulce", name: "Box Dulce", price: 120, category: "Boxes", occasion: "Amor", image: "public/assets/edited/products/box-dulce.jpg", badge: "Con espumante", description: "Box reutilizable con rosas, gerberas, flores mix, topper y espumante Riccadonna." },
  { id: "ramos-dulcinea", name: "Ramos Dulcinea", price: 90, category: "Ramos", occasion: "Amor", image: "public/assets/edited/products/ramos-dulcinea.jpg", badge: "Mix", description: "Rosas importadas, gerbera, hortensia, follajes finos y forro estilo coreano." },
  { id: "box-butterfly", name: "Box Butterfly", price: 90, category: "Boxes", occasion: "Cumpleaños", image: "public/assets/edited/products/box-butterfly.jpg", badge: "12 rosas", description: "Box reutilizable con 12 rosas importadas, flores mixtas, follajes finos y tarjeta personalizada." },
  { id: "ramo-for-you", name: "Ramo For You", price: 50, category: "Ramos", occasion: "Detalle", image: "public/assets/edited/products/ramo-for-you.jpg", badge: "Azul", description: "Rosas importadas, hortensia, flores mixtas, follajes finos y forro estilo coreano." },
  { id: "rabbit", name: "Rabbit", price: 75, category: "Regalos", occasion: "Cumpleaños", image: "public/assets/edited/products/rabbit.jpg", badge: "Peluche", description: "Box reutilizable con 3 rosas importadas, follajes finos, peluche conejita y tarjeta personalizada." },
  { id: "box-sweet", name: "Box Sweet", price: 100, category: "Boxes", occasion: "Cumpleaños", image: "public/assets/edited/products/box-sweet.jpg", badge: "Mix", description: "Box reutilizable con rosas importadas, rosa inglesa, gerbera, claveles y flores mixtas." },
  { id: "box-dream", name: "Box Dream", price: 90, category: "Boxes", occasion: "Amor", image: "public/assets/edited/products/box-dream.jpg", badge: "Te amo", description: "Box reutilizable con rosas importadas, follajes finos, topper y tarjeta personalizada." },
  { id: "baby-love", name: "Baby Love", price: 15, category: "Ramos", occasion: "Detalle", image: "public/assets/edited/products/baby-love.jpg", badge: "Mini", description: "Rosa importada con claveles, follajes finos, forro estilo coreano y tarjeta personalizada." },
  { id: "box-mama", name: "Box Mamá", price: 135, category: "Boxes", occasion: "Mamá", image: "public/assets/edited/products/box-mama.jpg", badge: "Pasteles", description: "18 rosas en colores pasteles, siempreviva, follajes finos, topper dorado y tarjeta personalizada." },
  { id: "box-princesa", name: "Box Princesa", price: 85, category: "Boxes", occasion: "Amor", image: "public/assets/edited/products/box-princesa.jpg", badge: "Tocado", description: "12 rosas variadas, verónicas, claveles, siempreviva, sombrera circular, topper y tarjeta." },
  { id: "ramo-yovis", name: "Ramo Yovis", price: 85, category: "Ramos", occasion: "Amor", image: "public/assets/edited/products/ramo-yovis.jpg", badge: "Rojo", description: "12 rosas importadas, forro estilo coreano, lazo de tela y tarjeta personalizada." },
  { id: "box-rousse", name: "Box Rousse", price: 90, category: "Boxes", occasion: "Amor", image: "public/assets/edited/products/box-rousse.jpg", badge: "Ferrero", description: "Box reutilizable con 9 rosas importadas, topper, chocolates Ferrero Rocher y tarjeta." },
  { id: "ramo-love", name: "Ramo Love", price: 120, category: "Ramos", occasion: "Amor", image: "public/assets/edited/products/ramo-love.jpg", badge: "25 rosas", description: "25 rosas importadas, follajes finos, forro estilo coreano y tarjeta personalizada." },
  { id: "ramo-luz", name: "Ramo Luz", price: 180, category: "Ramos", occasion: "De autor", image: "public/assets/edited/products/ramo-luz.jpg", badge: "30 rosas", description: "30 rosas importadas, flores mixtas, follajes finos, forro estilo coreano y tarjeta." },
  { id: "superbox", name: "Superbox", price: 120, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/superbox.jpg", badge: "Box", description: "Box reutilizable con 13 rosas importadas, 2 girasoles, astromelias y topper Te Amo." },
  { id: "box-love", name: "Box Love", price: 95, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/box-love.jpg", badge: "Ferrero", description: "Rosas, girasoles, claveles, follajes finos, chocolates Ferrero y tarjeta personalizada." },
  { id: "tacita-de-amor", name: "Tacita de Amor", price: 40, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/tacita-de-amor.jpg", badge: "Cerámica", description: "Taza de cerámica con 4 rosas importadas, 2 girasoles, follajes finos y tarjeta." },
  { id: "ramo-favorita", name: "Ramo Favorita", price: 70, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-favorita.jpg", badge: "Topper", description: "8 rosas importadas, girasoles, claveles, follajes finos, topper dorado y tarjeta." },
  { id: "box-beatriz", name: "Box Beatriz", price: 80, category: "Girasoles", occasion: "Cumpleaños", image: "public/assets/edited/products/box-beatriz.jpg", badge: "12 girasoles", description: "Box reutilizable con 12 girasoles, siempreviva, silver dollar, follajes finos y tarjeta." },
  { id: "radiante-sol", name: "Radiante Sol", price: 25, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/radiante-sol.jpg", badge: "Mini", description: "Girasol con claveles, siemprevivas, eucalipto bebé, follajes finos y forro coreano." },
  { id: "ramo-amoretti", name: "Ramo Amoretti", price: 40, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/ramo-amoretti.jpg", badge: "3 girasoles", description: "3 girasoles, astromelias, gipsófilas, follajes finos y tarjeta personalizada." },
  { id: "box-ilusion", name: "Box Ilusión", price: 85, category: "Girasoles", occasion: "Cumpleaños", image: "public/assets/edited/products/box-ilusion.jpg", badge: "Peluche", description: "Box reutilizable con 6 girasoles, flores mixtas, topper, globo corazón y peluche." },
  { id: "ramo-unica", name: "Ramo Única", price: 70, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-unica.jpg", badge: "Favorita", description: "4 rosas importadas, girasoles, flores mixtas, eucalipto bebé, verónica y topper." },
  { id: "ramo-romina", name: "Ramo Romina", price: 85, category: "Girasoles", occasion: "Elegante", image: "public/assets/edited/products/ramo-romina.jpg", badge: "Corona", description: "Girasoles y rosas importadas con follajes finos, topper corona, forro coreano y tarjeta." },
  { id: "candyrouse", name: "Candyrouse", price: 99, category: "Girasoles", occasion: "De autor", image: "public/assets/edited/products/candyrouse.jpg", badge: "Hortensia", description: "13 rosas importadas, girasoles, astromelias, hortensias, follajes finos y forro coreano." },
  { id: "ramo-valery", name: "Ramo Valery", price: 65, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-valery.jpg", badge: "Te amo", description: "4 rosas importadas, 3 girasoles, follaje fino, topper dorado y tarjeta personalizada." },
  { id: "ramo-antuanet", name: "Ramo Antuanet", price: 65, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/ramo-antuanet.jpg", badge: "3 girasoles", description: "3 girasoles, rosas importadas, flores mixtas, follajes finos y forro estilo coreano." },
  { id: "ramo-lethicia", name: "Ramo Lethicia", price: 90, category: "Girasoles", occasion: "De autor", image: "public/assets/edited/products/ramo-lethicia.jpg", badge: "Preservadas", description: "6 girasoles, rosas importadas, rosas preservadas, jaspias, follajes finos y tarjeta." },
  { id: "ramo-dakota", name: "Ramo Dakota", price: 75, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-dakota.jpg", badge: "Favorita", description: "Rosas importadas, girasoles, claveles, follajes finos, topper Mi Persona Favorita y tarjeta." },
  { id: "ramo-gilary", name: "Ramo Gilary", price: 85, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-gilary.jpg", badge: "8 rosas", description: "8 rosas importadas, 3 girasoles, flores mixtas, follajes finos y forro coreano." },
  { id: "box-amber", name: "Box Amber", price: 65, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/box-amber.jpg", badge: "Box", description: "Box reutilizable con 4 girasoles, siempreviva, eucalipto bebé, lazo de tela y tarjeta." },
  { id: "amor-radiante", name: "Amor Radiante", price: 90, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/amor-radiante.jpg", badge: "10 girasoles", description: "Box reutilizable con 10 girasoles, follajes finos, topper Te Amo y tarjeta personalizada." },
  { id: "ramo-genesis", name: "Ramo Genesis", price: 35, category: "Girasoles", occasion: "Detalle", image: "public/assets/edited/products/ramo-genesis.jpg", badge: "Gold", description: "2 girasoles gold, gipsófilas, forro estilo coreano y tarjeta personalizada." },
  { id: "box-catalina", name: "Box Catalina", price: 35, category: "Boxes", occasion: "Detalle", image: "public/assets/edited/products/box-catalina.jpg", badge: "Cerámica", description: "Maceta de cerámica con rosas, girasol, claveles, siempreviva, lirio perfumado y follajes." },
  { id: "tuliamor", name: "Tuliamor", price: 90, category: "Tulipanes", occasion: "Amor", image: "public/assets/edited/products/tuliamor.jpg", badge: "Te amo", description: "Tulipanes, astromelias, follajes finos, topper Te Amo, forro estilo coreano y tarjeta." },
  { id: "ramo-pureza", name: "Ramo Pureza", price: 85, category: "Tulipanes", occasion: "Elegante", image: "public/assets/edited/products/ramo-pureza.jpg", badge: "5 tulipanes", description: "5 tulipanes, gerberas, flores mixtas, follajes finos, forro coreano y tarjeta personalizada." },
  { id: "baby-ramo", name: "Baby Ramo", price: 20, category: "Tulipanes", occasion: "Detalle", image: "public/assets/edited/products/baby-ramo.jpg", badge: "Mini", description: "Tulipán natural, clavel, follaje de liriope y ruscus, forro coreano y tarjeta." },
  { id: "orquidia-phalaenopsis", name: "Orquídea Phalaenopsis", price: 120, category: "De autor", occasion: "Elegante", image: "public/assets/edited/products/orquidia-phalaenopsis.jpg", badge: "Orquídea", description: "Vara de orquídea de calidad en maceta de loza, lazo satinado, topper a elegir y tarjeta." },
  { id: "ramo-violet", name: "Ramo Violet", price: 75, category: "Tulipanes", occasion: "Elegante", image: "public/assets/edited/products/ramo-violet.jpg", badge: "5 tulipanes", description: "5 tulipanes, claveles, flores mixtas, follajes finos, forro coreano y tarjeta personalizada." },
  { id: "ramo-alegria", name: "Ramo Alegría", price: 105, category: "Tulipanes", occasion: "Amor", image: "public/assets/edited/products/ramo-alegria.jpg", badge: "6 tulipanes", description: "6 tulipanes, girasoles, claveles, follajes finos, topper Te Amo y tarjeta personalizada." },
  { id: "box-yeilu", name: "Box Yeilu", price: 99, category: "Regalos", occasion: "Amor", image: "public/assets/edited/products/box-yeilu.jpg", badge: "Vino rosé", description: "Box reutilizable con tulipanes, flores mixtas, Ferrero Rocher y vino rosé Queirolo." },
  { id: "ramona", name: "Ramona", price: 95, category: "Tulipanes", occasion: "Cumpleaños", image: "public/assets/edited/products/ramona.jpg", badge: "Peluche", description: "5 tulipanes, claveles, flores mixtas, peluche mediano, forro coreano y tarjeta personalizada." },
  { id: "tulips-love", name: "Tulip's Love", price: 180, category: "Tulipanes", occasion: "De autor", image: "public/assets/edited/products/tulips-love.jpg", badge: "10 tulipanes", description: "Florero de loza con 10 tulipanes, flores mixtas, topper dorado y tarjeta personalizada." },
  { id: "ana-maria", name: "Ana Maria", price: 70, category: "Tulipanes", occasion: "Amor", image: "public/assets/edited/products/ana-maria.jpg", badge: "4 tulipanes", description: "4 tulipanes con claveles, gardenias, eucalipto, jaspias, lazo, topper dorado y tarjeta." },
  { id: "box-tulipan", name: "Box Tulipán", price: 140, category: "Tulipanes", occasion: "De autor", image: "public/assets/edited/products/box-tulipan.jpg", badge: "7 tulipanes", description: "Box reutilizable con 7 tulipanes, flores, follajes finos, topper dorado y tarjeta personalizada." },
  { id: "tatiana", name: "Tatiana", price: 75, category: "Tulipanes", occasion: "Detalle", image: "public/assets/edited/products/tatiana.jpg", badge: "Tejido", description: "8 tulipanes tejidos, forro estilo coreano, lazo de tela y tarjeta personalizada." },
  { id: "ramo-yes", name: "Ramo Yes", price: 90, category: "Tulipanes", occasion: "Elegante", image: "public/assets/edited/products/ramo-yes.jpg", badge: "6 tulipanes", description: "6 tulipanes, claveles, verónica, eucalipto, follajes de gardenias, lazo y tarjeta." },
  { id: "brunebox", name: "Brunebox", price: 160, category: "Tulipanes", occasion: "De autor", image: "public/assets/edited/products/brunebox.jpg", badge: "10 tulipanes", description: "Box reutilizable con 10 tulipanes, claveles, hortensias, siemprevivas y follajes finos." },
  { id: "box-carmela", name: "Box Carmela", price: 120, category: "Boxes", occasion: "Cumpleaños", image: "public/assets/edited/products/box-carmela.jpg", badge: "Preservadas", description: "Box reutilizable con 3 tulipanes naturales, flores mixtas preservadas, topper Love y tarjeta." },
  { id: "ramo-pink", name: "Ramo Pink", price: 150, category: "Tulipanes", occasion: "Graduación", image: "public/assets/edited/products/ramo-pink.jpg", badge: "Graduación", description: "10 tulipanes, claveles, flores mixtas, follajes finos, topper Mi Graduación y tarjeta." },
  { id: "ramo-abigail", name: "Ramo Abigail", price: 150, category: "Tulipanes", occasion: "Amor", image: "public/assets/edited/products/ramo-abigail.jpg", badge: "10 tulipanes", description: "10 tulipanes, follajes finos, topper Te Quiero Mucho, forro coreano y tarjeta." },
  { id: "ramo-vania", name: "Ramo Vania", price: 90, category: "Tulipanes", occasion: "Amor", image: "public/assets/edited/products/ramo-vania.jpg", badge: "Te quiero", description: "6 tulipanes, claveles, siempreviva, silver dollar, gardenias, topper y tarjeta personalizada." },
  { id: "ramo-olga", name: "Ramo Olga", price: 50, category: "Tulipanes", occasion: "Detalle", image: "public/assets/edited/products/ramo-olga.jpg", badge: "2 tulipanes", description: "2 tulipanes con claveles, astromelias, silver dollar, gardenias, forro coreano y tarjeta." },
  { id: "ramo-yesli", name: "Ramo Yesli", price: 160, category: "Tulipanes", occasion: "De autor", image: "public/assets/edited/products/ramo-yesli.jpg", badge: "10 tulipanes", description: "10 tulipanes, claveles, verónicas, gervera, gardenias, forro coreano y tarjeta personalizada." },
  { id: "box-elizabeth", name: "Box Elizabeth", price: 120, category: "Regalos", occasion: "Cumpleaños", image: "public/assets/edited/products/box-elizabeth.jpg", badge: "Peluche", description: "Box cajonera reutilizable con 5 girasoles, colita de conejo, Ferrero, peluche y tarjeta." },
  { id: "ramo-hermelinda", name: "Ramo Hermelinda", price: 90, category: "Girasoles", occasion: "Amor", image: "public/assets/edited/products/ramo-hermelinda.jpg", badge: "Te amo", description: "Rosas importadas, girasoles, claveles, follajes finos, topper Te Amo, forro coreano y tarjeta." },
  { id: "box-minino", name: "Box Minino", price: 140, category: "Boxes", occasion: "Cumpleaños", image: "public/assets/edited/products/box-minino.jpg", badge: "Globo", description: "Rosas, girasoles, claveles, verónica, globo metalizado, box reutilizable, lazos y tarjeta." },
  { id: "rous", name: "Rous", price: 240, category: "De autor", occasion: "Elegante", image: "public/assets/edited/products/rous.jpg", badge: "Loza", description: "Rosas importadas, silver dollar, verónica, follajes finos, topper y maceta de loza envidriada." },
  { id: "amor-infinito", name: "Amor Infinito", price: 75, category: "Preservadas", occasion: "Eterno", image: "public/assets/edited/products/amor-infinito.jpg", badge: "Preservadas", description: "Florero de cerámica con rosas, margaritas preservadas, colita de conejo y siemprevivas." },
  { id: "ramito-eterno", name: "Ramito Eterno", price: 18, category: "Preservadas", occasion: "Detalle", image: "public/assets/edited/products/ramito-eterno.jpg", badge: "Mini", description: "Mini ramo con rosa preservada, gipsófila preservada y lazo de tela." },
  { id: "box-eterno", name: "Box Eterno", price: 90, category: "Preservadas", occasion: "Eterno", image: "public/assets/edited/products/box-eterno.jpg", badge: "Box", description: "Box reutilizable con rosas y girasoles preservados, colitas de conejo, jaspias y follajes finos." },
  { id: "rosas-eternas", name: "Rosas Eternas", price: 65, category: "Preservadas", occasion: "Eterno", image: "public/assets/edited/products/rosas-eternas.jpg", badge: "3 a 5 años", description: "Flores eternas mixtas, rosas lunarias, colitas de conejo, forro coreano y tarjeta personalizada." },
  { id: "box-bella", name: "Box Bella", price: 120, category: "Preservadas", occasion: "Cumpleaños", image: "public/assets/edited/products/box-bella.jpg", badge: "Globo", description: "Box reutilizable con flores preservadas, peluche importado, globo, coronita, lazo y tarjeta." },
  { id: "amor-x100pre", name: "Amor X100pre", price: 120, category: "Preservadas", occasion: "Amor", image: "public/assets/edited/products/amor-x100pre.jpg", badge: "Macetero", description: "Macetero de loza con flores preservadas, pampas grass, tarjeta personalizada y topper." },
  { id: "amanecer", name: "Amanecer", price: 100, category: "Preservadas", occasion: "Cumpleaños", image: "public/assets/edited/products/amanecer.jpg", badge: "Peluche", description: "Box reutilizable con flores preservadas, pampas, eucalipto, peluche importado y tarjeta." },
  { id: "alegria-preservada", name: "Alegría Preservada", price: 100, category: "Preservadas", occasion: "Cumpleaños", image: "public/assets/edited/products/alegria-preservada.jpg", badge: "Peluche", description: "Flores preservadas, lluvias, siempreviva, pampas grass, peluche importado, topper y tarjeta." },
  { id: "amor-verdadero", name: "Amor Verdadero", price: 120, category: "Preservadas", occasion: "Amor", image: "public/assets/edited/products/amor-verdadero.jpg", badge: "Caja corazón", description: "Peluche antialérgico, mini ramo de rosa preservada, Ferrero, topper, java de madera y tarjeta." },
  { id: "box-jenny", name: "Box Jenny", price: 75, category: "Preservadas", occasion: "Cumpleaños", image: "public/assets/edited/products/box-jenny.jpg", badge: "Box", description: "Box reutilizable con flores preservadas, rosas, jaspias, margaritas, siempreviva, topper y tarjeta." },
  { id: "kataleya", name: "Kataleya", price: 110, category: "Preservadas", occasion: "Elegante", image: "public/assets/edited/products/kataleya.jpg", badge: "Loza", description: "Macetero de loza con flores preservadas, margaritas, girasoles, colita de conejo y eucalipto." },
  { id: "belleza-eterna", name: "Belleza Eterna", price: 65, category: "Preservadas", occasion: "Eterno", image: "public/assets/edited/products/belleza-eterna.jpg", badge: "Eterno", description: "Flores preservadas, lluvias preservadas, colitas de conejo, forro coreano y tarjeta personalizada." },
  { id: "linda-flor", name: "Linda Flor", price: 85, category: "Preservadas", occasion: "Elegante", image: "public/assets/edited/products/linda-flor.jpg", badge: "Loza", description: "Macetero de loza con flores preservadas, silver dollar, pampas grass, topper y tarjeta." },
  { id: "box-corazon", name: "Box Corazón", price: 90, category: "Regalos", occasion: "Amor", image: "public/assets/edited/products/box-corazon.jpg", badge: "Vino", description: "Caja corazón de madera con mini ramo preservado, Riccadonna, Ferrero, osito y tarjeta." },
  { id: "java-encanto", name: "Java Encanto", price: 65, category: "Regalos", occasion: "Cumpleaños", image: "public/assets/edited/products/java-encanto.jpg", badge: "Peluche", description: "Java de madera con peluche, mini ramo de rosa preservada, cajita Vizzio, topper y tarjeta." },
  { id: "taza-perfecta", name: "Taza Perfecta", price: 40, category: "Regalos", occasion: "Detalle", image: "public/assets/edited/products/taza-perfecta.jpg", badge: "Taza", description: "Taza de loza con margaritas preservadas, peluche antialérgico, globos, chocolate y tarjeta." },
  { id: "java-corazon", name: "Java Corazón", price: 90, category: "Regalos", occasion: "Amor", image: "public/assets/edited/products/java-corazon.jpg", badge: "Java", description: "Java de madera con peluche antialérgico, mini ramo de rosa preservada, Ferrero y tarjeta." },
];

const CATEGORIES = ["Todos", "Ramos", "Boxes", "Girasoles", "Tulipanes", "Preservadas", "Regalos", "De autor"];
const productMap = new Map(PRODUCTS.map((product) => [product.id, product]));
const FEATURED_ORDER = [
  "ramo-love",
  "brunebox",
  "ramos-dulcinea",
  "box-amber",
  "tulips-love",
  "ramo-pasion",
  "amanecer",
  "box-bella",
  "box-corazon",
  "kataleya",
  "ramo-yes",
  "orquidia-phalaenopsis",
];
const featuredRank = new Map(FEATURED_ORDER.map((id, index) => [id, index]));
const cartKey = "la-casa-cart-v1";
const checkoutOrderKey = "la-casa-last-order-v1";

const DISTRICTS = [
  { name: "San Isidro", fee: 15 },
  { name: "Miraflores", fee: 15 },
  { name: "Surco", fee: 25 },
  { name: "San Borja", fee: 20 },
  { name: "La Molina", fee: 25 },
  { name: "Barranco", fee: 18 },
  { name: "Jesus Maria", fee: 18 },
  { name: "Lince", fee: 18 },
];

const OCCASIONS = [
  { title: "Cumpleaños", query: "Cumpleaños", image: "public/assets/edited/thumbs/ocasion-cumpleanos.jpg" },
  { title: "Amor", query: "Amor", image: "public/assets/edited/thumbs/ocasion-amor.jpg" },
  { title: "Graduación", query: "Graduación", image: "public/assets/edited/thumbs/ocasion-graduacion.jpg" },
  { title: "Detalles", query: "Detalle", image: "public/assets/edited/thumbs/ocasion-detalles.jpg" },
  { title: "De autor", query: "De autor", image: "public/assets/edited/thumbs/ocasion-de-autor.jpg" },
  { title: "Eternas", query: "Eterno", image: "public/assets/edited/thumbs/ocasion-eternas.jpg" },
  { title: "Elegante", query: "Elegante", image: "public/assets/edited/thumbs/ocasion-elegante.jpg" },
  { title: "Regalos", query: "Detalle", image: "public/assets/edited/thumbs/ocasion-regalos.jpg" },
];

const FLOWER_GROUPS = [
  { title: "Tulipanes", href: "catalogo.html?categoria=Tulipanes", image: "public/assets/edited/thumbs/flor-tulipanes.jpg" },
  { title: "Rosas", href: "catalogo.html?categoria=Ramos", image: "public/assets/edited/thumbs/flor-rosas.jpg" },
  { title: "Girasoles", href: "catalogo.html?categoria=Girasoles", image: "public/assets/edited/thumbs/flor-girasoles.jpg" },
  { title: "Boxes", href: "catalogo.html?categoria=Boxes", image: "public/assets/edited/thumbs/flor-boxes.jpg" },
  { title: "Preservadas", href: "catalogo.html?categoria=Preservadas", image: "public/assets/edited/thumbs/flor-preservadas.jpg" },
  { title: "Regalos", href: "catalogo.html?categoria=Regalos", image: "public/assets/edited/thumbs/flor-regalos.jpg" },
  { title: "Orquídeas", href: "producto.html?id=orquidia-phalaenopsis", image: "public/assets/edited/thumbs/flor-orquideas.jpg" },
];

const REVIEWS = [
  {
    name: "Mar L.",
    detail: "Miraflores · Ramo Love",
    icon: "message-circle-heart",
    text: "El checkout fue claro, vimos el total antes de pagar y la dedicatoria llego impecable.",
  },
  {
    name: "Angela V.",
    detail: "San Borja · Box Amber",
    icon: "truck",
    text: "Nos avisaron antes del despacho y el arreglo llego puntual, fresco y muy parecido a la foto.",
  },
  {
    name: "Darwin J.",
    detail: "Surco · Diseno personalizado",
    icon: "shield-check",
    text: "Me dio confianza pagar con tarjeta porque el cobro paso por Openpay y no guardan datos bancarios.",
  },
];

function money(value) {
  return `S/ ${Number(value).toFixed(0)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCartCount();
  renderCartDrawer();
}

function addToCart(id, qty = 1, note = "", custom = null) {
  const cart = getCart();
  const addedProduct = custom || productMap.get(id);
  if (custom) {
    cart.push({ id: custom.id, qty, note, custom });
  } else {
    const found = cart.find((item) => item.id === id && !item.custom && item.note === note);
    if (found) {
      found.qty += qty;
    } else {
      cart.push({ id, qty, note });
    }
  }
  saveCart(cart);
  toast(`${addedProduct?.name || "Arreglo"} agregado a tu seleccion`);
  openCartDrawer();
}

function itemProduct(item) {
  return item.custom || productMap.get(item.id);
}

function cartTotals(cart = getCart()) {
  return cart.reduce((sum, item) => {
    const product = itemProduct(item);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function renderCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = count;
    node.setAttribute("aria-label", `${count} productos en el carrito`);
  });
}

function cartEntries(cart = getCart()) {
  return cart
    .map((item, index) => ({ item, index, product: itemProduct(item) }))
    .filter((entry) => entry.product);
}

function changeCartItem(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
}

function removeCartItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function cartItemMarkup(entry, variant = "drawer") {
  const { item, index, product } = entry;
  const isDrawer = variant === "drawer";
  return `
    <article class="${isDrawer ? "drawer-cart-item" : "cart-item"}">
      <img src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="${isDrawer ? "drawer-cart-copy" : ""}">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.category)} · ${escapeHtml(product.badge)}</p>
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        ${isDrawer ? `
          <div class="drawer-cart-meta">
            <strong class="price">${money(product.price * item.qty)}</strong>
            <div class="qty-controls" aria-label="Cantidad">
              <button type="button" data-cart-qty="${index}" data-delta="-1">−</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-qty="${index}" data-delta="1">+</button>
            </div>
            <button class="icon-button remove-line" type="button" data-cart-remove="${index}" aria-label="Quitar ${escapeHtml(product.name)}">${icon("trash-2")}</button>
          </div>
        ` : ""}
      </div>
      ${!isDrawer ? `
        <div class="product-actions">
          <strong class="price">${money(product.price * item.qty)}</strong>
          <div class="qty-controls" aria-label="Cantidad">
            <button type="button" data-qty="${index}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button type="button" data-qty="${index}" data-delta="1">+</button>
          </div>
          <button class="btn small secondary" type="button" data-remove="${index}">Quitar</button>
        </div>
      ` : ""}
    </article>
  `;
}

function ensureCartDrawer() {
  let shell = document.querySelector("#cart-drawer-shell");
  if (shell) return shell;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="cart-drawer-shell" id="cart-drawer-shell" aria-hidden="true">
      <button class="cart-drawer-backdrop" type="button" data-cart-close aria-label="Cerrar cesta"></button>
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer-head">
          <div>
            <p class="eyebrow">Cesta La Casa</p>
            <h2 id="cart-drawer-title">Tu selección</h2>
          </div>
          <button class="icon-button" type="button" data-cart-close aria-label="Cerrar cesta">${icon("x")}</button>
        </header>
        <div class="cart-drawer-scroll" data-cart-drawer-list></div>
        <footer class="cart-drawer-foot">
          <div data-cart-drawer-summary></div>
          <a class="btn" href="checkout.html">${icon("credit-card")}Finalizar compra</a>
          <a class="btn secondary" href="carrito.html">${icon("shopping-bag")}Ver cesta</a>
          <p class="tiny-note">${icon("shield-check", "note-icon")}Pago seguro con Openpay.</p>
        </footer>
      </aside>
    </div>
  `);
  shell = document.querySelector("#cart-drawer-shell");
  shell.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-cart-qty]");
    const remove = event.target.closest("[data-cart-remove]");
    if (event.target.closest("[data-cart-close]")) closeCartDrawer();
    if (qty) changeCartItem(Number(qty.dataset.cartQty), Number(qty.dataset.delta));
    if (remove) removeCartItem(Number(remove.dataset.cartRemove));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCartDrawer();
  });
  return shell;
}

function renderCartDrawer() {
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell) return;
  const list = shell.querySelector("[data-cart-drawer-list]");
  const summary = shell.querySelector("[data-cart-drawer-summary]");
  const entries = cartEntries();
  if (!entries.length) {
    list.innerHTML = `
      <div class="drawer-empty">
        ${icon("flower-2", "drawer-empty-icon")}
        <h3>Aún no hay flores en tu selección.</h3>
        <p>Elige un arreglo y lo verás aquí sin salir de la página.</p>
        <a class="btn" href="catalogo.html">Explorar arreglos</a>
      </div>
    `;
  } else {
    list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "drawer")).join("");
  }
  const subtotal = cartTotals(entries.map(({ item }) => item));
  summary.innerHTML = `
    <div class="summary-line"><span>${entries.length} tipo${entries.length === 1 ? "" : "s"} de arreglo</span><strong>${money(subtotal)}</strong></div>
    <div class="summary-line"><span>Entrega</span><strong>Según distrito</strong></div>
  `;
  refreshIcons();
}

function openCartDrawer() {
  const shell = ensureCartDrawer();
  renderCartDrawer();
  shell.classList.add("is-open");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-drawer-open");
}

function closeCartDrawer() {
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell) return;
  shell.classList.remove("is-open");
  shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-drawer-open");
}

function toast(message) {
  let node = document.querySelector(".toast");
  if (!node) {
    node = document.createElement("div");
    node.className = "toast";
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
}

function icon(name, className = "icon") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.8 },
    });
  }
}

function ratingMarkup(label = "4.9") {
  return `
    <span class="rating">
      <span class="stars" aria-hidden="true">
        ${Array.from({ length: 5 }, () => icon("star", "star-icon")).join("")}
      </span>
      <small>${label}</small>
    </span>
  `;
}

function premiumMediaClass(product) {
  return product?.image?.includes("/premium/") || product?.image?.includes("/edited/")
    ? " is-premium"
    : "";
}

function productHasBase(product) {
  const text = `${product?.name || ""} ${product?.category || ""} ${product?.description || ""}`.toLowerCase();
  return /box|caja|florero|base|maceta|orqu[ií]dea|preservada|peluche|gift|coraz[oó]n|canasta/.test(text);
}

function productGalleryViews(product) {
  const baseView = productHasBase(product)
    ? { mode: "base", label: "Base y volumen", short: "Base" }
    : { mode: "angle", label: "Perfil del ramo", short: "Perfil" };
  return [
    { mode: "front", label: "Vista completa", short: "Completa" },
    { mode: "detail", label: "Detalle floral", short: "Detalle" },
    baseView,
  ].map((view) => ({
    ...view,
    image: product.image,
  }));
}

function productCard(product) {
  return `
    <article class="product-card">
      <a class="product-media${premiumMediaClass(product)}" href="producto.html?id=${product.id}" aria-label="Ver ${escapeHtml(product.name)}">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="badge">${escapeHtml(product.badge)}</span>
      </a>
      <div class="product-body">
        <div class="product-meta">
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
          <span class="price">${money(product.price)}</span>
        </div>
        ${ratingMarkup()}
        <p>${escapeHtml(product.description)}</p>
        <div class="product-actions">
          <button class="btn small" data-add="${product.id}" aria-label="Agregar ${escapeHtml(product.name)} al carrito">${icon("shopping-bag")}<span class="btn-label">Agregar</span></button>
          <a class="btn small secondary icon-only" href="producto.html?id=${product.id}" aria-label="Ver ficha de ${escapeHtml(product.name)}">${icon("eye")}</a>
        </div>
      </div>
    </article>
  `;
}

function renderProductGrid(container, products) {
  if (!container) return;
  container.innerHTML = products.map(productCard).join("");
  requestAnimationFrame(() => {
    refreshIcons();
    initRevealEffects(container);
  });
}

function bindProductActions(scope = document) {
  scope.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    const detail = event.target.closest("[data-detail]");
    if (add) {
      playAddFeedback(add);
      addToCart(add.dataset.add);
    }
    if (detail) {
      openProduct(detail.dataset.detail);
    }
  });
}

function openProduct(id) {
  const product = productMap.get(id);
  if (!product) return;
  let dialog = document.querySelector("#product-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "product-dialog";
    dialog.className = "product-dialog";
    document.body.appendChild(dialog);
  }
  dialog.innerHTML = `
    <button class="dialog-close" aria-label="Cerrar" data-close-dialog>×</button>
    <div class="dialog-grid">
      <img src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="dialog-copy">
        <span class="badge">${escapeHtml(product.category)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <strong class="price">${money(product.price)}</strong>
        <p>${escapeHtml(product.description)}</p>
        <p>Incluye tarjeta personalizada. La entrega se elige antes de pagar.</p>
        <div class="button-row">
          <button class="btn" data-add="${product.id}">Agregar al carrito</button>
          <button class="btn secondary" data-close-dialog>Seguir mirando</button>
        </div>
      </div>
    </div>
  `;
  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function renderHome() {
  const hero = document.querySelector("#hero-picks");
  const heroProducts = ["ramo-love", "box-amber"].map((id) => productMap.get(id));
  if (hero) {
    hero.innerHTML = heroProducts.map((product, index) => `
      <a class="hero-card ${index === 0 ? "main" : index === 1 ? "side" : "accent"}${premiumMediaClass(product)}" href="producto.html?id=${product.id}" aria-label="${escapeHtml(product.name)}">
        <img src="${product.image}" alt="${escapeHtml(product.name)}">
        <div class="hero-caption">
          <strong>${escapeHtml(product.name)}</strong>
          <span class="price">${money(product.price)}</span>
        </div>
      </a>
    `).join("");
  }

  const occasions = document.querySelector("#occasion-grid");
  if (occasions) {
    occasions.innerHTML = OCCASIONS.map((item) => `
      <a class="occasion-card" href="catalogo.html?ocasion=${encodeURIComponent(item.query)}">
        <img src="${item.image}" alt="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  renderProductGrid(document.querySelector("#featured-grid"), [
    "ramo-love", "brunebox", "ramos-dulcinea", "box-amber", "tulips-love", "box-bella", "kataleya", "box-corazon",
  ].map((id) => productMap.get(id)));

  const flowers = document.querySelector("#flower-grid");
  if (flowers) {
    flowers.innerHTML = FLOWER_GROUPS.map((item) => `
      <a class="flower-card" href="${item.href}">
        <img src="${item.image}" alt="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  const reviews = document.querySelector("#review-grid");
  if (reviews) {
    reviews.innerHTML = `
      <article class="trust-score-card">
        <span class="badge">Confianza La Casa</span>
        <div>
          <strong class="trust-score">4.9</strong>
          ${ratingMarkup("60 reseñas verificadas")}
        </div>
        <p>Pago tokenizado con Openpay, entrega programada por distrito y Libro de Reclamaciones visible para seguimiento.</p>
        <div class="trust-stats">
          <span><b>+1,000</b><small>entregas coordinadas</small></span>
          <span><b>0</b><small>datos de tarjeta guardados</small></span>
          <span><b>15 dias</b><small>plazo legal de respuesta</small></span>
        </div>
        <a class="btn secondary small" href="reclamaciones.html">${icon("book-open-check")}Libro de Reclamaciones</a>
      </article>
      ${REVIEWS.map((review) => `
        <article class="review-card">
          <div class="review-card-head">
            ${ratingMarkup("5.0")}
            <span class="review-icon">${icon(review.icon)}</span>
          </div>
          <p>${escapeHtml(review.text)}</p>
          <div class="review-author">
            <strong>${escapeHtml(review.name)}</strong>
            <small>${escapeHtml(review.detail)}</small>
          </div>
        </article>
      `).join("")}
    `;
  }

  bindShippingEstimator(document);
}

function bindShippingEstimator(scope = document) {
  const input = scope.querySelector("#home-district, #product-district");
  const result = scope.querySelector("[data-shipping-result]");
  const pills = scope.querySelector("[data-district-pills]");
  if (!result && !pills) return;

  function show(value) {
    const term = String(value || "").trim().toLowerCase();
    const found = DISTRICTS.find((district) => district.name.toLowerCase().includes(term));
    if (!term) {
      result.textContent = "Tarifa referencial. La ruta final se confirma en checkout.";
    } else if (found) {
      result.textContent = `${found.name}: ruta referencial ${money(found.fee)}. El checkout confirma horario y cobertura.`;
    } else {
      result.textContent = "Aun no figura en ruta rapida. Continua y lo revisamos antes del pago.";
    }
  }

  if (pills) {
    pills.innerHTML = DISTRICTS.slice(0, 4).map((district) => `
      <button type="button" data-district="${district.name}">${district.name}<br>${money(district.fee)}</button>
    `).join("");
    pills.addEventListener("click", (event) => {
      const button = event.target.closest("[data-district]");
      if (!button) return;
      if (input) input.value = button.dataset.district;
      show(button.dataset.district);
    });
  }
  input?.addEventListener("input", () => show(input.value));
  show(input?.value || "");
}

function enhanceStaticIcons() {
  const iconByText = [
    ["Catálogo", "grid-3x3"],
    ["Ocasiones", "gift"],
    ["Flores", "flower-2"],
    ["Colecciones", "layers-3"],
    ["Personalizar", "wand-sparkles"],
    ["Contacto", "message-circle"],
  ];
  document.querySelectorAll(".nav-link:not(.cart-link), .menu-button").forEach((item) => {
    if (item.querySelector("[data-lucide]")) return;
    const text = item.textContent.trim();
    const match = iconByText.find(([label]) => text.includes(label));
    if (match) item.insertAdjacentHTML("afterbegin", icon(match[1]));
  });
  document.querySelectorAll(".cart-link").forEach((link) => {
    if (!link.querySelector("[data-lucide='shopping-bag']")) {
      link.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".topbar-inner span").forEach((item, index) => {
    if (item.querySelector("[data-lucide]")) return;
    const names = ["truck", "camera", "gift"];
    item.insertAdjacentHTML("afterbegin", icon(names[index] || "sparkles", "topbar-icon"));
  });
  document.querySelectorAll(".btn[href='catalogo.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".btn.secondary[href*='producto.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("sparkles"));
    }
  });
}

function initSliders() {
  document.querySelectorAll("[data-slider]").forEach((slider) => {
    const track = slider.querySelector(".product-slider");
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    const dots = slider.querySelector("[data-slider-dots]");
    if (!track || !prev || !next || !dots) return;

    function metrics() {
      const card = track.querySelector(".product-card");
      if (!card) return { step: 0, pages: 1, current: 0 };
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
      const step = card.getBoundingClientRect().width + gap;
      const visible = Math.max(1, Math.floor((track.clientWidth + gap) / step));
      const pages = Math.max(1, track.children.length - visible + 1);
      const current = Math.min(pages - 1, Math.round(track.scrollLeft / step));
      return { step, pages, current };
    }

    function paintDots() {
      const { pages, current } = metrics();
      dots.innerHTML = Array.from({ length: pages }, (_, index) => `
        <button type="button" class="${index === current ? "is-active" : ""}" data-slider-dot="${index}" aria-label="Ver grupo ${index + 1}"></button>
      `).join("");
      prev.disabled = current === 0;
      next.disabled = current >= pages - 1;
      refreshIcons();
    }

    prev.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: -step, behavior: "smooth" });
    });

    next.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: step, behavior: "smooth" });
    });

    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-slider-dot]");
      if (!dot) return;
      const { step } = metrics();
      track.scrollTo({ left: Number(dot.dataset.sliderDot) * step, behavior: "smooth" });
    });

    track.addEventListener("scroll", () => requestAnimationFrame(paintDots), { passive: true });
    window.addEventListener("resize", paintDots);
    requestAnimationFrame(paintDots);
  });
}

let revealObserver;

function playAddFeedback(button) {
  if (!button) return;
  button.classList.add("is-added");
  window.clearTimeout(button.addFeedbackTimer);
  button.addFeedbackTimer = window.setTimeout(() => button.classList.remove("is-added"), 900);
}

function initHeaderEffects() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initHeroSpotlight() {
  const hero = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || reduceMotion) return;

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--spot-x", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
    hero.style.setProperty("--spot-y", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
  }, { passive: true });
}

function initRevealEffects(scope = document) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selector = [
    ".hero-copy",
    ".hero-showcase",
    ".section-title",
    ".service-item",
    ".occasion-card",
    ".flower-card",
    ".product-card",
    ".delivery-card",
    ".review-card",
    ".panel",
    ".collection-block",
    ".catalog-page",
    ".cart-item",
    ".checkout-card",
    ".confirmation-card",
  ].join(", ");
  const nodes = [...scope.querySelectorAll(selector)]
    .filter((node) => !node.classList.contains("reveal-ready") && !node.closest(".cart-drawer"));

  if (!nodes.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("reveal", "reveal-ready", "is-visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12,
    });
  }

  nodes.forEach((node) => {
    node.classList.add("reveal", "reveal-ready");
    revealObserver.observe(node);
  });
}

function renderCatalog() {
  const filterRow = document.querySelector("#filter-row");
  const grid = document.querySelector("#product-grid");
  const search = document.querySelector("#catalog-search");
  const sort = document.querySelector("#catalog-sort");
  const result = document.querySelector("#result-line");
  if (!grid) return;

  const urlCategory = new URLSearchParams(window.location.search).get("categoria");
  const urlOccasion = new URLSearchParams(window.location.search).get("ocasion");
  let activeCategory = CATEGORIES.includes(urlCategory) ? urlCategory : "Todos";

  function paintFilters() {
    filterRow.innerHTML = CATEGORIES.map((category) => `
      <button class="filter-chip ${category === activeCategory ? "is-active" : ""}" data-category="${category}">${category}</button>
    `).join("");
  }

  function apply() {
    const term = (search?.value || "").trim().toLowerCase();
    let list = PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
      const matchesOccasion = !urlOccasion || product.occasion === urlOccasion;
      const haystack = `${product.name} ${product.category} ${product.occasion} ${product.description}`.toLowerCase();
      return matchesCategory && matchesOccasion && (!term || haystack.includes(term));
    });
    if (!sort || sort.value === "featured") {
      list = [...list].sort((a, b) => (featuredRank.get(a.id) ?? 999) - (featuredRank.get(b.id) ?? 999));
    }
    if (sort?.value === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort?.value === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort?.value === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    result.textContent = `${list.length} arreglos disponibles${urlOccasion ? ` para ${urlOccasion}` : ""}`;
    renderProductGrid(grid, list);
  }

  paintFilters();
  apply();
  filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    paintFilters();
    apply();
  });
  search?.addEventListener("input", apply);
  sort?.addEventListener("change", apply);
}

function renderProductPage() {
  const root = document.querySelector("#product-detail");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const product = productMap.get(params.get("id")) || productMap.get("box-bella") || PRODUCTS[0];
  const related = PRODUCTS
    .filter((item) => item.category === product.category && item.id !== product.id)
    .sort((a, b) => Number(!premiumMediaClass(a)) - Number(!premiumMediaClass(b)))
    .slice(0, 4);
  const galleryViews = productGalleryViews(product);
  document.title = `${product.name} | La Casa de las Flores`;

  root.innerHTML = `
    <div class="product-detail">
      <div class="gallery">
        <div class="thumbs" aria-label="Vistas de ${escapeHtml(product.name)}">
          ${galleryViews.map((view, index) => `
            <button class="thumb ${index === 0 ? "is-active" : ""}" type="button" data-gallery-mode="${view.mode}" data-gallery-src="${view.image}" data-gallery-label="${escapeHtml(view.label)}" aria-label="${escapeHtml(view.label)} de ${escapeHtml(product.name)}">
              <span class="thumb-frame"><img class="gallery-crop-${view.mode}" src="${view.image}" alt="${escapeHtml(view.label)} de ${escapeHtml(product.name)}"></span>
              <span class="thumb-label">${escapeHtml(view.short)}</span>
            </button>
          `).join("")}
        </div>
        <div class="main-photo${premiumMediaClass(product)} gallery-view-front" data-main-photo>
          <img src="${product.image}" alt="${escapeHtml(product.name)}" data-main-gallery-img>
          <span class="view-chip" data-gallery-caption>Vista completa</span>
        </div>
      </div>
      <div class="buy-panel">
        <div class="product-title-row">
          <span class="badge">${escapeHtml(product.category)}</span>
          <h1>${escapeHtml(product.name)}</h1>
          ${ratingMarkup("4.9 · 60 reseñas · +1,000 entregas")}
          <strong class="buy-price">${money(product.price)}</strong>
        </div>
        <div class="panel delivery-studio">
          <div class="route-heading">
            <span class="route-mark">${icon("map-pin")}</span>
            <div>
              <p class="eyebrow">Ruta La Casa</p>
              <h3>Agenda la entrega antes de pagar</h3>
            </div>
          </div>
          <p>Elige distrito y deja que el checkout ordene fecha, dedicatoria y pago seguro con Openpay.</p>
          <div class="route-steps" aria-label="Proceso de entrega">
            <span>Zona</span>
            <span>Horario</span>
            <span>Confirmacion</span>
          </div>
          <input class="field" id="product-district" type="search" placeholder="Escribe tu distrito">
          <div class="district-pills" data-district-pills></div>
          <p class="tiny-note" data-shipping-result>Tarifa referencial. La ruta final se confirma en checkout.</p>
        </div>
        <div class="panel">
          <p class="eyebrow">El toque final</p>
          <h3>Personaliza tu regalo</h3>
          <div class="form-grid">
            <div class="form-line full">
              <label for="gift-note">Dedicatoria</label>
              <textarea class="textarea" id="gift-note" maxlength="250" placeholder="Escribe unas lineas y firma para que sepan de quien es"></textarea>
              <span class="counter"><span id="gift-count">0</span>/250</span>
            </div>
            <div class="form-line">
              <label for="delivery-date">Fecha de entrega</label>
              <input class="field" id="delivery-date" type="date">
            </div>
            <div class="form-line">
              <label for="delivery-slot">Horario</label>
              <select class="field" id="delivery-slot">
                <option>Hoy disponible</option>
                <option>Manana por la manana</option>
                <option>Manana por la tarde</option>
                <option>Coordinar horario</option>
              </select>
            </div>
            <div class="form-line full">
              <label>Extras</label>
              <div class="check-list">
                <label class="check-option"><input type="checkbox" value="Topper dorado"> Topper dorado</label>
                <label class="check-option"><input type="checkbox" value="Chocolates Ferrero"> Chocolates Ferrero</label>
                <label class="check-option"><input type="checkbox" value="Peluche"> Peluche</label>
                <label class="check-option"><input type="checkbox" value="Globo metalizado"> Globo metalizado</label>
              </div>
            </div>
          </div>
        </div>
        <div class="sticky-add">
          <button class="btn" id="add-product-detail" type="button">${icon("shopping-bag")}Añadir al carrito · ${money(product.price)}</button>
          <p class="tiny-note">${icon("shield-check", "note-icon")}Entrega programada · pago seguro con Openpay</p>
        </div>
        <div class="accordion">
          <details open>
            <summary>Descripción del producto</summary>
            <p>${escapeHtml(product.description)}</p>
            <ul>
              <li>Incluye tarjeta personalizada.</li>
              <li>Foto editada para presentación de ecommerce.</li>
              <li>El envío no está incluido en el precio.</li>
            </ul>
          </details>
          <details>
            <summary>Disponibilidad y sustituciones</summary>
            <p>Si alguna flor no está disponible, el atelier propone una sustitución equivalente en color, volumen e intención.</p>
          </details>
          <details>
            <summary>Reseñas</summary>
            <p class="review-line">${ratingMarkup("Atención rápida, presentación cuidada y checkout claro.")}</p>
          </details>
        </div>
      </div>
    </div>
  `;

  const today = new Date().toISOString().slice(0, 10);
  const dateInput = root.querySelector("#delivery-date");
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
  const note = root.querySelector("#gift-note");
  const counter = root.querySelector("#gift-count");
  note?.addEventListener("input", () => {
    counter.textContent = note.value.length;
  });
  bindProductGallery(root);
  bindShippingEstimator(root);
  const detailAddButton = root.querySelector("#add-product-detail");
  detailAddButton?.addEventListener("click", () => {
    const extras = [...root.querySelectorAll(".check-option input:checked")].map((item) => item.value);
    const district = root.querySelector("#product-district")?.value || "";
    const deliveryDate = root.querySelector("#delivery-date")?.value || "";
    const slot = root.querySelector("#delivery-slot")?.value || "";
    const lines = [
      note?.value ? `Dedicatoria: ${note.value}` : "",
      deliveryDate ? `Fecha: ${deliveryDate}` : "",
      slot ? `Horario: ${slot}` : "",
      district ? `Distrito: ${district}` : "",
      extras.length ? `Extras: ${extras.join(", ")}` : "",
    ].filter(Boolean);
    playAddFeedback(detailAddButton);
    addToCart(product.id, 1, lines.join(" | "));
  });

  renderProductGrid(document.querySelector("#related-grid"), related);
  refreshIcons();
}

function bindProductGallery(root) {
  const main = root.querySelector("[data-main-photo]");
  const image = root.querySelector("[data-main-gallery-img]");
  const caption = root.querySelector("[data-gallery-caption]");
  const thumbs = [...root.querySelectorAll("[data-gallery-mode]")];
  if (!main || !image || !thumbs.length) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const mode = thumb.dataset.galleryMode || "front";
      const src = thumb.dataset.gallerySrc || image.src;
      image.src = src;
      image.alt = thumb.getAttribute("aria-label") || image.alt;
      main.classList.remove("gallery-view-front", "gallery-view-detail", "gallery-view-base", "gallery-view-angle");
      main.classList.add(`gallery-view-${mode}`);
      thumbs.forEach((item) => item.classList.toggle("is-active", item === thumb));
      if (caption) caption.textContent = thumb.dataset.galleryLabel || "Vista del producto";
    });
  });
}

function renderCollectionsPage() {
  const root = document.querySelector("#collections-page");
  if (!root) return;
  const collections = [
    {
      title: "Rosas con gesto grande",
      text: "Ramos con presencia, envolturas coreanas, toppers dorados y una lectura más romántica.",
      ids: ["ramo-love", "ramos-dulcinea", "box-bella", "brunebox"],
    },
    {
      title: "Sol y celebración",
      text: "Girasoles para cumpleaños, agradecimientos y días que piden color sin perder elegancia.",
      ids: ["box-amber", "ramo-love", "ramos-dulcinea", "box-bella"],
    },
    {
      title: "Tulipanes de atelier",
      text: "Piezas más editoriales, con paletas suaves, volumen controlado y flores de temporada.",
      ids: ["brunebox", "tulips-love", "ramos-dulcinea", "box-bella"],
    },
    {
      title: "Flores que quedan",
      text: "Preservadas, javas, tazas y boxes para regalos de larga duración.",
      ids: ["box-bella", "box-amber", "ramo-love", "tulips-love"],
    },
  ];
  root.innerHTML = collections.map((collection) => `
    <section class="collection-block">
      <div class="collection-copy">
        <p class="eyebrow">Colección</p>
        <h2>${escapeHtml(collection.title)}</h2>
        <p>${escapeHtml(collection.text)}</p>
        <a class="btn secondary" href="catalogo.html">Ver catálogo</a>
      </div>
      <div class="collection-products">
        ${collection.ids.map((id) => productCard(productMap.get(id))).join("")}
      </div>
    </section>
  `).join("");
}

function renderOriginalCatalog() {
  const root = document.querySelector("#original-grid");
  if (!root) return;
  const pages = Array.from({ length: 22 }, (_, index) => index + 1);
  root.innerHTML = pages.map((page) => {
    const src = `public/assets/edited/catalog/arrangement-${String(page).padStart(2, "0")}.jpg`;
    const label = page === 1 ? "Portada" : page === 22 ? "Medios de pago" : `Página ${page}`;
    return `
      <a class="catalog-page" href="${src}" target="_blank" rel="noreferrer">
        <img src="${src}" alt="${escapeHtml(label)} del catálogo">
        <span>${escapeHtml(label)} <b>Abrir</b></span>
      </a>
    `;
  }).join("");
}

function renderCustomBuilder() {
  const form = document.querySelector("#custom-form");
  const total = document.querySelector("#custom-total");
  const list = document.querySelector("#custom-summary");
  const previewImg = document.querySelector("#custom-preview-img");
  const previewTitle = document.querySelector("#custom-preview-title");
  const previewPalette = document.querySelector("#custom-preview-palette");
  if (!form || !total || !list) return;

  const basePrices = {
    ramo: 45,
    box: 60,
    preservado: 55,
    premium: 95,
  };
  const additionPrices = {
    topper: 12,
    ferrero: 18,
    peluche: 25,
    globo: 20,
    vino: 35,
  };
  const baseLabels = {
    ramo: "Ramo coreano",
    box: "Box reutilizable",
    preservado: "Diseño preservado",
    premium: "De autor en loza",
  };
  const baseImages = {
    ramo: "public/assets/edited/products/ramo-love.jpg",
    box: "public/assets/edited/products/box-amber.jpg",
    preservado: "public/assets/edited/products/box-bella.jpg",
    premium: "public/assets/edited/products/orquidia-phalaenopsis.jpg",
  };

  function estimate() {
    const data = new FormData(form);
    const base = data.get("base");
    const stems = Math.max(1, Number(data.get("stems") || 1));
    const color = data.get("color");
    const message = data.get("message");
    const additions = data.getAll("addition");
    const price = (basePrices[base] || 45) + stems * 7 + additions.reduce((sum, item) => sum + additionPrices[item], 0);
    total.textContent = money(price);
    if (previewImg) previewImg.src = baseImages[base] || baseImages.ramo;
    if (previewTitle) previewTitle.textContent = baseLabels[base] || "Diseño personalizado";
    if (previewPalette) previewPalette.textContent = `Paleta ${color}`;
    list.innerHTML = [
      `${stems} flores principales`,
      `Base ${baseLabels[base] || base}`,
      `Paleta ${color}`,
      message ? `Tarjeta: "${escapeHtml(message)}"` : "Tarjeta personalizada",
      additions.length ? `Extras: ${additions.join(", ")}` : "Sin extras añadidos",
    ].map((item) => `<li>${item}</li>`).join("");
    return { base, stems, color, message, additions, price };
  }

  form.addEventListener("input", estimate);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = estimate();
    const custom = {
      id: `personalizado-${Date.now()}`,
      name: "Diseño personalizado",
      price: data.price,
      image: baseImages[data.base] || baseImages.ramo,
      category: "Personalizado",
      description: `${data.stems} flores principales, base ${baseLabels[data.base] || data.base}, paleta ${data.color}. ${data.message ? `Tarjeta: ${data.message}.` : "Tarjeta personalizada."}`,
      builder: {
        base: data.base,
        stems: data.stems,
        color: data.color,
        message: data.message,
        additions: data.additions,
      },
    };
    addToCart(custom.id, 1, data.additions.join(", "), custom);
  });
  estimate();
}

function renderCartPage() {
  const list = document.querySelector("#cart-items");
  const summary = document.querySelector("#cart-summary");
  const clear = document.querySelector("#clear-cart");
  const checkoutAction = document.querySelector("#checkout-action");
  if (!list || !summary) return;

  function paint() {
    const entries = cartEntries();
    if (!entries.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h2>Tu selección está lista para flores.</h2>
          <p>Explora el catálogo y guarda tus arreglos favoritos.</p>
          <a class="btn" href="catalogo.html">Ir al catálogo</a>
        </div>
      `;
    } else {
      list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "page")).join("");
    }
    const subtotal = cartTotals(entries.map(({ item }) => item));
    summary.innerHTML = `
      <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Entrega</span><strong>Se calcula en checkout</strong></div>
      <div class="summary-line"><span>Pago</span><strong>Openpay</strong></div>
      <div class="summary-line total"><span>Total parcial</span><strong>${money(subtotal)}</strong></div>
    `;
    if (checkoutAction) {
      checkoutAction.classList.toggle("is-disabled", !entries.length);
      checkoutAction.setAttribute("aria-disabled", String(!entries.length));
    }
    renderCartCount();
  }

  list.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    if (qty) {
      changeCartItem(Number(qty.dataset.qty), Number(qty.dataset.delta));
      paint();
    }
    if (remove) {
      removeCartItem(Number(remove.dataset.remove));
      paint();
    }
  });

  clear?.addEventListener("click", () => {
    saveCart([]);
    paint();
  });

  checkoutAction?.addEventListener("click", (event) => {
    if (!cartEntries().length) {
      event.preventDefault();
      toast("Agrega un arreglo antes de pagar");
    }
  });

  paint();
}

function deliveryFeeForDistrict(district) {
  return DISTRICTS.find((item) => item.name === district)?.fee || 0;
}

function checkoutCartPayload() {
  return getCart().map((item) => ({
    id: item.id,
    qty: item.qty,
    note: item.note || "",
    custom: item.custom ? {
      id: item.custom.id,
      name: item.custom.name,
      description: item.custom.description,
      builder: item.custom.builder,
    } : null,
  }));
}

function setCheckoutStatus(message, tone = "") {
  const node = document.querySelector("#checkout-status");
  if (!node) return;
  node.textContent = message;
  node.className = `checkout-status ${tone}`.trim();
}

async function loadOpenpayConfig() {
  try {
    const response = await fetch("/api/openpay-config", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer la configuración de Openpay.");
    return response.json();
  } catch {
    return {
      ok: false,
      configured: false,
      message: "Abre la tienda desde el servidor local para usar checkout real.",
    };
  }
}

function checkoutOrderPayload(form, tokenId) {
  const data = new FormData(form);
  return {
    cart: checkoutCartPayload(),
    customer: {
      first_name: data.get("first_name"),
      last_name: data.get("last_name"),
      email: data.get("email"),
      phone: data.get("phone"),
    },
    delivery: {
      recipient: data.get("recipient"),
      recipient_phone: data.get("recipient_phone"),
      date: data.get("delivery_date"),
      slot: data.get("delivery_slot"),
      district: data.get("delivery_district"),
      address: data.get("delivery_address"),
      reference: data.get("delivery_reference"),
      dedication: data.get("dedication"),
    },
    payment: {
      token_id: tokenId,
      device_session_id: data.get("device_session_id"),
    },
    legal: {
      accepted_terms: data.get("legal_acceptance") === "on",
    },
  };
}

async function chargeOpenpayOrder(form, tokenId) {
  const response = await fetch("/api/checkout/openpay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutOrderPayload(form, tokenId)),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "No se pudo procesar el pago.");
  }
  localStorage.setItem(checkoutOrderKey, JSON.stringify(payload.order));
  saveCart([]);
  window.location.href = `confirmacion.html?order=${encodeURIComponent(payload.order.id)}`;
}

function renderCheckoutPage() {
  const form = document.querySelector("#openpay-checkout-form");
  const summary = document.querySelector("#checkout-summary");
  const district = document.querySelector("#delivery-district");
  const payButton = document.querySelector("#pay-order");
  const date = document.querySelector("#delivery-date");
  if (!form || !summary || !district || !payButton) return;
  let openpayReady = false;
  let isProcessing = false;

  district.innerHTML = [
    `<option value="">Seleccionar distrito</option>`,
    ...DISTRICTS.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} · ${money(item.fee)}</option>`),
  ].join("");

  if (date && !date.value) {
    date.min = new Date().toISOString().split("T")[0];
  }

  function paintSummary() {
    const entries = cartEntries();
    const subtotal = cartTotals(entries.map(({ item }) => item));
    const deliveryFee = deliveryFeeForDistrict(district.value);
    const total = subtotal + deliveryFee;

    if (!entries.length) {
      summary.innerHTML = `
        <div class="empty-state compact">
          <h2>Tu cesta está vacía</h2>
          <p>Agrega arreglos antes de pagar.</p>
          <a class="btn" href="catalogo.html">Ir al catálogo</a>
        </div>
      `;
      payButton.disabled = true;
      payButton.textContent = "Agrega flores para pagar";
      return;
    }

    summary.innerHTML = `
      <div class="checkout-items">
        ${entries.map(({ item, product }) => `
          <div class="checkout-mini-item">
            <img src="${product.image}" alt="${escapeHtml(product.name)}">
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <span>${item.qty} × ${money(product.price)}</span>
            </div>
            <b>${money(product.price * item.qty)}</b>
          </div>
        `).join("")}
      </div>
      <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Entrega</span><strong>${deliveryFee ? money(deliveryFee) : "Seleccionar"}</strong></div>
      <div class="summary-line total"><span>Total</span><strong>${money(total)}</strong></div>
    `;

    payButton.disabled = !deliveryFee || !openpayReady || isProcessing;
    if (isProcessing) return;
    if (!deliveryFee) {
      payButton.textContent = "Selecciona distrito";
    } else if (!openpayReady) {
      payButton.textContent = "Configura Openpay";
    } else {
      payButton.textContent = `Pagar ${money(total)}`;
    }
  }

  district.addEventListener("change", paintSummary);
  paintSummary();

  loadOpenpayConfig().then((config) => {
    if (!config.ok) {
      setCheckoutStatus(config.message, "error");
      payButton.disabled = true;
      return;
    }
    if (!config.merchant_id || !config.public_key) {
      setCheckoutStatus("Faltan llaves de Openpay en el servidor.", "error");
      payButton.disabled = true;
      return;
    }
    if (!window.OpenPay) {
      setCheckoutStatus("No se pudo cargar Openpay.js. Revisa conexión o dominio permitido.", "error");
      payButton.disabled = true;
      return;
    }

    window.OpenPay.setId(config.merchant_id);
    window.OpenPay.setApiKey(config.public_key);
    window.OpenPay.setSandboxMode(Boolean(config.sandbox));
    if (window.OpenPay.deviceData?.setup) {
      window.OpenPay.deviceData.setup("openpay-checkout-form", "device_session_id");
    }
    if (!config.configured) {
      setCheckoutStatus("Openpay está en modo incompleto: falta la llave privada en el servidor.", "error");
      payButton.disabled = true;
      return;
    }
    openpayReady = true;
    setCheckoutStatus(`Openpay listo en modo ${config.sandbox ? "sandbox" : "producción"}.`, "success");
    paintSummary();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!cartEntries().length) {
      toast("Agrega un arreglo antes de pagar");
      return;
    }
    if (!form.reportValidity()) return;
    if (!window.OpenPay) {
      setCheckoutStatus("Openpay.js no está disponible.", "error");
      return;
    }
    if (!openpayReady) {
      setCheckoutStatus("Completa la configuración de Openpay antes de cobrar.", "error");
      return;
    }

    isProcessing = true;
    payButton.disabled = true;
    payButton.textContent = "Tokenizando tarjeta...";
    setCheckoutStatus("Validando tarjeta con Openpay...", "");

    window.OpenPay.token.extractFormAndCreate("openpay-checkout-form", (response) => {
      const tokenId = response?.data?.id;
      document.querySelector("#token_id").value = tokenId || "";
      if (!tokenId) {
        setCheckoutStatus("Openpay no devolvió token de tarjeta.", "error");
        isProcessing = false;
        paintSummary();
        return;
      }
      payButton.textContent = "Procesando pago...";
      setCheckoutStatus("Creando cargo seguro en Openpay...", "");
      chargeOpenpayOrder(form, tokenId).catch((error) => {
        setCheckoutStatus(error.message, "error");
        isProcessing = false;
        paintSummary();
      });
    }, (response) => {
      const description = response?.data?.description || response?.message || "Openpay rechazó los datos de tarjeta.";
      setCheckoutStatus(description, "error");
      isProcessing = false;
      paintSummary();
    });
  });
}

async function loadBusinessInfo() {
  try {
    const response = await fetch("/api/business-info", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer la informacion del comercio.");
    const payload = await response.json();
    return payload.business || {};
  } catch {
    return {
      commercialName: BRAND.name,
      legalName: "",
      ruc: "",
      fiscalAddress: "",
      phone: BRAND.phone,
      email: "",
      claimsEmail: "",
    };
  }
}

function renderBusinessInfo(info) {
  const missing = !info.legalName || !info.ruc || !info.fiscalAddress;
  return `
    <div class="provider-card">
      <div>
        <p class="eyebrow">Identificacion del proveedor</p>
        <h3>${escapeHtml(info.commercialName || BRAND.name)}</h3>
      </div>
      <dl class="provider-list">
        <div><dt>Razon social</dt><dd>${escapeHtml(info.legalName || "Pendiente de configurar")}</dd></div>
        <div><dt>RUC</dt><dd>${escapeHtml(info.ruc || "Pendiente de configurar")}</dd></div>
        <div><dt>Domicilio fiscal</dt><dd>${escapeHtml(info.fiscalAddress || "Pendiente de configurar")}</dd></div>
        <div><dt>Atencion</dt><dd>${escapeHtml(info.claimsEmail || info.email || `WhatsApp ${info.phone || BRAND.phone}`)}</dd></div>
      </dl>
      ${missing ? `<p class="config-warning">${icon("triangle-alert", "note-icon")}Completa BUSINESS_LEGAL_NAME, BUSINESS_RUC y BUSINESS_ADDRESS en .env antes de publicar.</p>` : ""}
    </div>
  `;
}

function renderClaimResult(result) {
  return `
    <div class="claim-result success">
      ${icon("badge-check", "confirmation-icon")}
      <div>
        <p class="eyebrow">Hoja registrada</p>
        <h3>Codigo ${escapeHtml(result.code)}</h3>
        <p>Conserva este codigo para seguimiento. El plazo de respuesta es de ${escapeHtml(result.response_deadline || "15 dias habiles")}.</p>
        <button class="btn secondary small" type="button" onclick="window.print()">Imprimir constancia</button>
      </div>
    </div>
  `;
}

function renderClaimsPage() {
  const provider = document.querySelector("#claims-provider");
  const form = document.querySelector("#claims-form");
  const status = document.querySelector("#claims-status");
  const date = document.querySelector("#claim-date");
  if (!form || !status) return;

  if (date && !date.value) {
    date.value = new Date().toISOString().slice(0, 10);
  }

  loadBusinessInfo().then((info) => {
    if (provider) {
      provider.innerHTML = renderBusinessInfo(info);
      refreshIcons();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.accepted_privacy = data.get("accepted_privacy") === "on";

    submit.disabled = true;
    status.className = "checkout-status";
    status.textContent = "Registrando hoja de reclamacion...";

    try {
      const response = await fetch("/api/reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "No se pudo registrar la hoja de reclamacion.");
      }
      status.className = "checkout-status success";
      status.innerHTML = renderClaimResult(result);
      form.reset();
      if (date) date.value = new Date().toISOString().slice(0, 10);
      refreshIcons();
    } catch (error) {
      status.className = "checkout-status error";
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

function renderBusinessBlocks() {
  const blocks = [...document.querySelectorAll("[data-business-info]")];
  if (!blocks.length) return;
  loadBusinessInfo().then((info) => {
    blocks.forEach((block) => {
      block.innerHTML = renderBusinessInfo(info);
    });
    refreshIcons();
  });
}

function ensureLegalFooterLinks() {
  const footer = document.querySelector(".site-footer .section");
  if (!footer || footer.querySelector(".footer-links")) return;
  footer.insertAdjacentHTML("beforeend", `
    <nav class="footer-links" aria-label="Legal">
      <a href="politicas.html">Politicas</a>
      <a href="reclamaciones.html">Libro de Reclamaciones</a>
    </nav>
  `);
}

function renderConfirmationPage() {
  const panel = document.querySelector("#confirmation-panel");
  if (!panel) return;
  let order = null;
  try {
    order = JSON.parse(localStorage.getItem(checkoutOrderKey));
  } catch {
    order = null;
  }

  if (!order) {
    panel.innerHTML = `
      <div class="confirmation-card">
        ${icon("flower-2", "confirmation-icon")}
        <p class="eyebrow">La Casa de las Flores</p>
        <h1>No encontramos un pedido reciente</h1>
        <p class="lead">Puedes volver al catálogo y crear una nueva compra.</p>
        <a class="btn" href="catalogo.html">Ir al catálogo</a>
      </div>
    `;
    refreshIcons();
    return;
  }

  panel.innerHTML = `
    <div class="confirmation-card">
      ${icon("badge-check", "confirmation-icon")}
      <p class="eyebrow">Pedido confirmado</p>
      <h1>Gracias por tu compra</h1>
      <p class="lead">Orden ${escapeHtml(order.id)} · Total ${money(order.total)}</p>
      <div class="confirmation-details">
        <div><span>Estado</span><strong>${escapeHtml(order.status || "Procesado")}</strong></div>
        <div><span>Openpay</span><strong>${escapeHtml(order.openpay_id || "Confirmado")}</strong></div>
        <div><span>Entrega</span><strong>${escapeHtml(order.delivery?.district || "")}</strong></div>
        <div><span>Fecha</span><strong>${escapeHtml(order.delivery?.date || "")}</strong></div>
      </div>
      <a class="btn" href="catalogo.html">Seguir comprando</a>
    </div>
  `;
  refreshIcons();
}

function setActiveNav() {
  const file = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === file || (file === "" && href === "index.html"));
  });
}

function bindCartTriggers() {
  document.querySelectorAll(".cart-link, [data-cart-open]").forEach((trigger) => {
    trigger.setAttribute("aria-label", "Abrir cesta");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openCartDrawer();
    });
  });
}

function ensureMobileTabbar() {
  const shell = document.querySelector(".nav-shell");
  if (shell && !shell.querySelector(".mobile-head-actions")) {
    shell.insertAdjacentHTML("beforeend", `
      <div class="mobile-head-actions" aria-label="Acciones rápidas">
        <a href="catalogo.html" aria-label="Abrir catálogo">${icon("grid-3x3")}</a>
        <a href="catalogo.html#catalog-search" aria-label="Buscar flores">${icon("search")}</a>
        <button class="cart-link" type="button" aria-label="Abrir bolsa">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>
      </div>
    `);
  }

  if (document.querySelector(".mobile-tabbar")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <nav class="mobile-tabbar" aria-label="Navegación móvil">
      <a href="index.html" data-mobile-tab="index.html">${icon("home")}Inicio</a>
      <a href="catalogo.html" data-mobile-tab="catalogo.html">${icon("flower-2")}Catálogo</a>
      <a href="colecciones.html" data-mobile-tab="colecciones.html">${icon("layers-3")}Colecciones</a>
      <a href="personalizar.html" data-mobile-tab="personalizar.html">${icon("wand-sparkles")}Atelier</a>
    </nav>
    <button class="mobile-cart-fab cart-link" type="button" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>
  `);

  const file = window.location.pathname.split("/").pop() || "index.html";
  const catalogFiles = new Set(["catalogo.html", "producto.html", "catalogo-original.html"]);
  document.querySelectorAll("[data-mobile-tab]").forEach((link) => {
    const tab = link.dataset.mobileTab;
    const active = tab === file || (tab === "catalogo.html" && catalogFiles.has(file));
    link.classList.toggle("is-active", active);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  ensureMobileTabbar();
  ensureLegalFooterLinks();
  renderBusinessBlocks();
  initHeaderEffects();
  renderCartCount();
  bindProductActions();
  bindCartTriggers();
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "catalog") renderCatalog();
  if (page === "product") renderProductPage();
  if (page === "collections") renderCollectionsPage();
  if (page === "original") renderOriginalCatalog();
  if (page === "custom") renderCustomBuilder();
  if (page === "cart") renderCartPage();
  if (page === "checkout") renderCheckoutPage();
  if (page === "claims") renderClaimsPage();
  if (page === "confirmation") renderConfirmationPage();
  if (page === "contact") bindShippingEstimator(document);
  enhanceStaticIcons();
  initSliders();
  initHeroSpotlight();
  initRevealEffects();
  refreshIcons();
});
