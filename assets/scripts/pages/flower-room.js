const room = document.querySelector(".flower-room");
const photo = room.querySelector("picture img");
const caption = room.querySelector("figcaption a");
const choices = room.querySelectorAll(".room-picker a");
let request = 0;

for (const choice of choices) {
  choice.addEventListener("click", async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const current = ++request;
    const image = new Image();
    image.src = "/public/assets/premium/products/" + choice.dataset.photo + ".webp";
    try {
      await image.decode();
    } catch {
      if (request === current) location.assign(choice.href);
      return;
    }
    if (request !== current) return;
    for (const item of choices) item.removeAttribute("aria-current");
    choice.setAttribute("aria-current", "true");
    room.dataset.flower = choice.dataset.photo;
    photo.src = image.src;
    photo.alt = "Arreglo de " + choice.dataset.flower.toLowerCase();
    caption.href = choice.href;
    caption.firstElementChild.textContent = "Ver arreglos con " + choice.dataset.flower.toLowerCase();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      photo.animate([{opacity: .45, transform: "scale(1.08)"}, {opacity: 1, transform: "scale(1)"}], {duration: 560, easing: "ease-out"});
    }
  });
}
