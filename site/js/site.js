// SAONA — interactions légères du site institutionnel (aucune dépendance)
(function () {
  // Menu mobile
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('ouvert');
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('ouvert'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Apparition au défilement
  var els = document.querySelectorAll('.apparait');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('vu'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('vu'); });
  }

  // Année du pied de page
  var an = document.getElementById('annee');
  if (an) an.textContent = new Date().getFullYear();

  // Formulaire de contact
  // Le site est statique : renseigner l'adresse d'envoi dans l'attribut data-destinataire
  // (envoi par la messagerie du visiteur) ou remplacer par un service de formulaire / un back-end.
  var form = document.getElementById('form-contact');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var retour = document.getElementById('retour');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var dest = form.getAttribute('data-destinataire');
      var d = new FormData(form);
      var corps = [
        'Nom : ' + d.get('nom'),
        'Entreprise : ' + d.get('entreprise'),
        'E-mail : ' + d.get('email'),
        'Téléphone : ' + (d.get('telephone') || '-'),
        'Levier : ' + d.get('levier'),
        '',
        d.get('message')
      ].join('\n');
      if (dest) {
        window.location.href = 'mailto:' + dest +
          '?subject=' + encodeURIComponent('Demande de contact — ' + d.get('entreprise')) +
          '&body=' + encodeURIComponent(corps);
        retour.textContent = 'Merci ! Votre messagerie va s’ouvrir pour finaliser l’envoi.';
      } else {
        retour.textContent = 'Le formulaire n’est pas encore relié à une adresse d’envoi.';
      }
      retour.classList.add('visible');
    });
  }
})();
