// script.js = small interactive behavior. Right now it only runs the mobile menu.

// Find the menu button and the menu links on the page
const button = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');

// When the button is tapped, show/hide the menu
button.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');      // adds or removes the "open" class
  button.setAttribute('aria-expanded', isOpen);     // tells screen readers if the menu is open
});

// When a menu link is tapped, close the menu again
nav.addEventListener('click', () => {
  nav.classList.remove('open');
  button.setAttribute('aria-expanded', false);
});
