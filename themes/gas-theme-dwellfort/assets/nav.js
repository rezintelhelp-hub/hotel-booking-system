// Mobile nav toggle for gas-theme-dwellfort. Small — no dependencies.
(function () {
    var burger = document.querySelector('.df-burger');
    var nav = document.querySelector('.df-nav');
    if (!burger || !nav) return;
    burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
})();
