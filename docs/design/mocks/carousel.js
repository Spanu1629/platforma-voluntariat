const cardCarouselMobile = matchMedia('(width < 768px)');

function carouselCardOffset(list, card) {
  return card.offsetLeft - list.firstElementChild.offsetLeft;
}

function activeCarouselCard(list) {
  return Array.from(list.children).reduce((nearest, card) =>
    Math.abs(carouselCardOffset(list, card) - list.scrollLeft)
      < Math.abs(carouselCardOffset(list, nearest) - list.scrollLeft) ? card : nearest);
}

function wrapCarouselList(list) {
  const group = document.createElement('div');
  group.className = 'card-carousel';
  list.classList.add('card-carousel-list');
  list.replaceWith(group);
  group.append(list);
  return group;
}

function addCardCarousel(list, labelId, initialCard) {
  if (list.childElementCount < 2) return;

  const group = wrapCarouselList(list);
  const cards = Array.from(list.children);
  list.id = `${labelId}-cards`;
  list.setAttribute('aria-labelledby', labelId);

  const controls = document.createElement('div');
  controls.className = 'card-carousel-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-labelledby', labelId);
  const position = document.createElement('p');
  position.className = 'card-carousel-position';
  position.setAttribute('role', 'status');
  position.setAttribute('aria-atomic', 'true');

  function navigationButton(label, back = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = back ? 'button card-carousel-back' : 'button';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', list.id);
    button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-arrow-right"/></svg>';
    return button;
  }

  const previous = navigationButton('Cardul anterior', true);
  const next = navigationButton('Cardul următor');
  controls.append(position, previous, next);
  list.before(controls);

  function updatePosition() {
    const index = cards.indexOf(activeCarouselCard(list));
    const label = `${index + 1} din ${cards.length}`;
    if (position.textContent !== label) position.textContent = label;
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === cards.length - 1));
  }

  function showCard(card) {
    if (!card) return;
    list.scrollTo({ left: carouselCardOffset(list, card), behavior: 'instant' });
    updatePosition();
  }

  function move(direction) {
    showCard(cards[cards.indexOf(activeCarouselCard(list)) + direction]);
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  list.addEventListener('keydown', event => {
    if (event.target !== list || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  list.addEventListener('focusin', event => {
    if (event.target === list || !event.target.matches(':focus-visible')) return;
    const card = cards.find(item => item.contains(event.target));
    requestAnimationFrame(() => {
      if (card?.contains(document.activeElement)) showCard(card);
    });
  });

  let scrollTimer;
  list.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updatePosition, 120);
  }, { passive: true });
  list.addEventListener('scrollend', () => {
    clearTimeout(scrollTimer);
    updatePosition();
  });
  function updateViewport(card = cards[0]) {
    if (cardCarouselMobile.matches) {
      list.tabIndex = 0;
      showCard(card);
    } else {
      list.removeAttribute('tabindex');
    }
  }
  list.addEventListener('carouselviewportchange', () => updateViewport());
  updateViewport(initialCard);
}

cardCarouselMobile.addEventListener('change', () => {
  document.querySelectorAll('.card-carousel-list:not([aria-hidden])').forEach(list => {
    list.dispatchEvent(new Event('carouselviewportchange'));
  });
});
