    (function () {
      'use strict';

      /* Textos usados pelo script: vêm de data-t-* em <html>, traduzidos em cada idioma */
      var T = {
        menuAbrir: document.documentElement.getAttribute('data-t-menu-abrir'),
        menuFechar: document.documentElement.getAttribute('data-t-menu-fechar'),
        pausar: document.documentElement.getAttribute('data-t-pausar'),
        retomar: document.documentElement.getAttribute('data-t-retomar'),
        copiado: document.documentElement.getAttribute('data-t-copiado')
      };

      document.documentElement.classList.add('js');

      /* ---------- Header: sombra sutil + barra de progresso ---------- */
      var header = document.querySelector('.site-header');
      var progress = document.querySelector('.scroll-progress');
      var ticking = false;

      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          header.classList.toggle('is-scrolled', window.scrollY > 4);
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
          progress.style.transform = 'scaleX(' + ratio + ')';
          ticking = false;
        });
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      /* ---------- Menu mobile ---------- */
      var toggle = document.querySelector('.nav-toggle');
      var nav = document.getElementById('menu-principal');

      function setMenu(open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? T.menuFechar : T.menuAbrir);
        nav.classList.toggle('is-open', open);
      }

      toggle.addEventListener('click', function () {
        setMenu(toggle.getAttribute('aria-expanded') !== 'true');
      });

      nav.addEventListener('click', function (event) {
        if (event.target.closest('a')) setMenu(false);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setMenu(false);
          toggle.focus();
        }
      });

      /* ---------- Item ativo do menu conforme a rolagem ----------
         Observa TODAS as seções (inclusive #frentes, sem item no menu)
         para limpar o aria-current ao atravessá-las - senão o último link
         ativado ficaria marcado sobre a seção errada. */
      var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
      var linkById = {};
      navLinks.forEach(function (link) {
        linkById[link.getAttribute('href').slice(1)] = link;
      });
      var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));

      if ('IntersectionObserver' in window && sections.length) {
        var sectionObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            navLinks.forEach(function (link) { link.removeAttribute('aria-current'); });
            var activeLink = linkById[entry.target.id];
            if (activeLink) activeLink.setAttribute('aria-current', 'true');
          });
        }, { rootMargin: '-40% 0px -55% 0px' });

        sections.forEach(function (section) { sectionObserver.observe(section); });
      }

      /* ---------- Animações sutis de entrada ---------- */
      var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      var reduceMotion = reduceQuery.matches;
      var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

      if (!reduceMotion && 'IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        revealItems.forEach(function (item) { revealObserver.observe(item); });
      } else {
        revealItems.forEach(function (item) { item.classList.add('is-visible'); });
      }

      /* ---------- Carrossel das frentes de trabalho no hero ---------- */
      var hvCarousel = document.querySelector('.hv-carousel');

      if (hvCarousel) {
        var hvTrack = hvCarousel.querySelector('.hv-track');
        var hvSlides = Array.prototype.slice.call(hvCarousel.querySelectorAll('.hv-slide'));
        var hvDotBtns = Array.prototype.slice.call(hvCarousel.querySelectorAll('.hv-dot-btn'));
        var hvPrev = hvCarousel.querySelector('.hv-prev');
        var hvNext = hvCarousel.querySelector('.hv-next');
        var hvPauseBtn = hvCarousel.querySelector('.hv-pause');
        var hvIndex = 0;
        var hvTimer = null;
        var hvManualPause = false;

        function hvGo(i) {
          hvIndex = (i + hvSlides.length) % hvSlides.length;
          hvTrack.style.transform = 'translateX(-' + (hvIndex * 100) + '%)';
          hvSlides.forEach(function (slide, n) {
            slide.classList.toggle('is-active', n === hvIndex);
            slide.setAttribute('aria-hidden', String(n !== hvIndex));
          });
          hvDotBtns.forEach(function (dot, n) {
            dot.classList.toggle('is-active', n === hvIndex);
            if (n === hvIndex) {
              dot.setAttribute('aria-current', 'true');
            } else {
              dot.removeAttribute('aria-current');
            }
          });
        }

        var hvViewport = hvCarousel.querySelector('.hv-viewport');
        var hvHovered = false;
        var hvFocusIn = false;

        // Com rotação parada, trocas de slide são anunciadas (WCAG 4.1.3)
        function hvSyncLive() {
          hvViewport.setAttribute('aria-live', hvTimer ? 'off' : 'polite');
        }

        function hvStop() {
          if (hvTimer) {
            clearInterval(hvTimer);
            hvTimer = null;
          }
          hvSyncLive();
        }

        // Só gira sem pausa manual, sem reduced motion e sem ponteiro/foco
        // sobre o carrossel (padrão ARIA de carrossel)
        function hvPlay() {
          if (hvManualPause || reduceMotion || hvHovered || hvFocusIn || hvTimer) return;
          hvTimer = setInterval(function () { hvGo(hvIndex + 1); }, 6000);
          hvSyncLive();
        }

        function hvRestart() {
          hvStop();
          hvPlay();
        }

        hvPrev.addEventListener('click', function () { hvGo(hvIndex - 1); hvRestart(); });
        hvNext.addEventListener('click', function () { hvGo(hvIndex + 1); hvRestart(); });
        hvDotBtns.forEach(function (dot, n) {
          dot.addEventListener('click', function () { hvGo(n); hvRestart(); });
        });

        // WCAG 2.2.2: a pausa manual congela rotação E animações contínuas
        // (classe .is-paused no CSS); rótulo alterna sem aria-pressed
        hvPauseBtn.addEventListener('click', function () {
          hvManualPause = !hvManualPause;
          hvPauseBtn.classList.toggle('is-paused', hvManualPause);
          hvCarousel.classList.toggle('is-paused', hvManualPause);
          hvPauseBtn.setAttribute('aria-label', hvManualPause ? T.retomar : T.pausar);
          if (hvManualPause) hvStop(); else hvPlay();
        });

        hvCarousel.addEventListener('mouseenter', function () { hvHovered = true; hvStop(); });
        hvCarousel.addEventListener('mouseleave', function () { hvHovered = false; hvPlay(); });
        hvCarousel.addEventListener('focusin', function () { hvFocusIn = true; hvStop(); });
        hvCarousel.addEventListener('focusout', function (event) {
          // relatedTarget null pode ser a janela perdendo o foco - nesse
          // caso o foco lógico continua no carrossel
          if (event.relatedTarget ? !hvCarousel.contains(event.relatedTarget) : document.hasFocus()) {
            hvFocusIn = false;
            hvPlay();
          }
        });

        hvCarousel.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          hvGo(event.key === 'ArrowLeft' ? hvIndex - 1 : hvIndex + 1);
          hvRestart();
          // foco acompanha o dot ativo (padrão roving)
          if (document.activeElement && document.activeElement.classList.contains('hv-dot-btn')) {
            hvDotBtns[hvIndex].focus();
          }
        });

        document.addEventListener('visibilitychange', function () {
          if (document.hidden) hvStop(); else hvPlay();
        });

        // Reage à ativação de "reduzir movimento" com a página aberta
        if (reduceQuery.addEventListener) {
          reduceQuery.addEventListener('change', function (event) {
            reduceMotion = event.matches;
            if (reduceMotion) hvStop(); else hvPlay();
          });
        }

        hvGo(0);
        hvPlay();
      }

      /* ---------- Estudantes: carrossel horizontal (auto-passar + setas) ----------
         Rolagem nativa (scrollLeft): o auto-passar é contínuo e sem emenda
         (3 conjuntos de cards clonados) e as setas avançam/voltam um estudante. */
      var stCarousel = document.querySelector('.students-carousel');

      if (stCarousel) {
        var stViewport = stCarousel.querySelector('.students-viewport');
        var stTrack = stCarousel.querySelector('.students-track');
        var stPrev = stCarousel.querySelector('.students-prev');
        var stNext = stCarousel.querySelector('.students-next');
        var stOriginais = Array.prototype.slice.call(stTrack.children);

        // 2 clones (total 3 conjuntos): folga p/ rolar em qualquer direção sem emenda
        for (var stC = 0; stC < 2; stC++) {
          stOriginais.forEach(function (card) {
            var clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            Array.prototype.slice.call(clone.querySelectorAll('a')).forEach(function (a) {
              a.setAttribute('tabindex', '-1');
            });
            stTrack.appendChild(clone);
          });
        }

        var stStepPx = 214;                 // avanço por card (fallback; remedido abaixo)
        function stOneSet() { return stTrack.scrollWidth / 3; }
        function stMeasureStep() {
          if (stOriginais[1]) {
            var d = stOriginais[1].getBoundingClientRect().left - stOriginais[0].getBoundingClientRect().left;
            if (d > 1) stStepPx = d;
          }
        }
        stMeasureStep();
        window.addEventListener('load', stMeasureStep);
        window.addEventListener('resize', stMeasureStep);

        var stPaused = false, stHover = false, stFocus = false, stAnimating = false, stTween = null;

        // mantém o scroll no 1º conjunto [0, oneSet): ao passar, subtrai um conjunto
        // (invisível, pois os conjuntos são idênticos)
        function stNormalize() {
          if (stAnimating) return;
          var one = stOneSet();
          if (stViewport.scrollLeft >= one) stViewport.scrollLeft -= one;
          else if (stViewport.scrollLeft < 0) stViewport.scrollLeft += one;
        }

        function stStep(dir) {
          var one = stOneSet();
          // indo p/ trás perto do início: pula um conjunto à frente p/ ter espaço
          if (dir < 0 && stViewport.scrollLeft < stStepPx) stViewport.scrollLeft += one;
          var start = stViewport.scrollLeft;
          var target = start + dir * stStepPx;
          if (reduceMotion) { stViewport.scrollLeft = target; stNormalize(); return; }
          // tween próprio via setInterval (não depende do scroll suave nativo)
          stAnimating = true;
          clearInterval(stTween);
          var frames = 22, i = 0;
          stTween = setInterval(function () {
            i++;
            var p = i / frames; if (p > 1) p = 1;
            var e = 1 - Math.pow(1 - p, 3);                 // easeOutCubic
            stViewport.scrollLeft = start + (target - start) * e;
            if (p >= 1) { clearInterval(stTween); stAnimating = false; stNormalize(); }
          }, 16);
        }

        stPrev.addEventListener('click', function () { stStep(-1); });
        stNext.addEventListener('click', function () { stStep(1); });

        // setas do teclado quando o foco está no carrossel
        stCarousel.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowLeft') { e.preventDefault(); stStep(-1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); stStep(1); }
        });

        if (!reduceMotion) {
          // auto-passar contínuo (setInterval; congela em hover/foco/pausa/aba oculta)
          setInterval(function () {
            if (stPaused || stHover || stFocus || stAnimating || document.hidden) return;
            stViewport.scrollLeft += 1;
            stNormalize();
          }, 16);

          stCarousel.addEventListener('mouseenter', function () { stHover = true; });
          stCarousel.addEventListener('mouseleave', function () { stHover = false; });
          stCarousel.addEventListener('focusin', function () { stFocus = true; });
          stCarousel.addEventListener('focusout', function (e) {
            if (!stCarousel.contains(e.relatedTarget)) stFocus = false;
          });
        }
      }

      /* ---------- Contato: copiar endereço de e-mail ---------- */
      var copyBtn = document.getElementById('copiar-email');
      var copied = document.getElementById('email-copiado');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var email = copyBtn.getAttribute('data-email');
          var done = function () {
            copied.textContent = T.copiado;
            setTimeout(function () { copied.textContent = ''; }, 2500);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(done, function () { copied.textContent = email; });
          } else {
            copied.textContent = email;
          }
        });
      }

      /* ---------- Seletor de idioma: mantém a seção que está sendo lida ---------- */
      Array.prototype.slice.call(document.querySelectorAll('.lang-switch a')).forEach(function (link) {
        link.addEventListener('click', function () {
          var middle = window.innerHeight / 2;
          var current = Array.prototype.slice.call(document.querySelectorAll('main section[id]')).filter(function (section) {
            var box = section.getBoundingClientRect();
            return box.top <= middle && box.bottom >= middle;
          })[0];
          var base = link.getAttribute('href').split('#')[0];
          link.setAttribute('href', current ? base + '#' + current.id : base);
        });
      });
    })();
