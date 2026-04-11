let isActive = true;

// Guardar as referências originais para poder desfazer as mudanças
let emailElementsHidden = [];
let movedMineradores = [];

// Carrega o status atual vindo do storage da extensão
chrome.storage.sync.get(['isActive'], (result) => {
  isActive = result.isActive !== false; // O padrão é true se não estiver definido
  if (isActive) {
    applyCorrections();
  }
});

// Fica escutando as mudanças que ocorrem lá no popup de ligar/desligar
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.isActive) {
    isActive = changes.isActive.newValue;
    if (isActive) {
      applyCorrections();
    } else {
      undoCorrections();
    }
  }
});

function applyCorrections() {
  if (!isActive) return;

  // Injeta os estilos de animação do brilho se ainda não existirem no documento
  if (!document.getElementById('evo-brilho-style')) {
    const style = document.createElement('style');
    style.id = 'evo-brilho-style';
    style.textContent = `
      @keyframes evoShine {
        0% { left: -100%; opacity: 0; }
        10% { left: -100%; opacity: 0.8; } /* Inicia mais lento */
        40% { left: 100%; opacity: 0.8; }  /* Lentamente se arrasta até o outro lado */
        100% { left: 100%; opacity: 0; }
      }
      .evo-minerador-brilho {
        position: relative;
        overflow: visible !important; /* Permite que o glitter respire para fora da borda */
        background: linear-gradient(135deg, rgba(30, 30, 30, 0.6) 0%, rgba(10, 10, 10, 0.8) 100%);
        backdrop-filter: blur(2px);
        box-shadow: 0 0 12px rgba(255, 191, 0, 0.4), inset 0 0 2px rgba(255, 255, 255, 0.1);
        border: 0.5px solid rgba(255, 191, 0, 0.6) !important;
        cursor: default;
      }
      /* Clipper interno para prender o Shine sem prender o Glitter */
      .evo-shine-clipper {
        position: absolute;
        inset: 0;
        overflow: hidden;
        border-radius: inherit;
        z-index: 1;
        pointer-events: none;
      }
      .evo-shine-clipper::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 35%;
        height: 100%;
        background: linear-gradient(to right, transparent, rgba(255, 191, 0, 0.4), transparent);
        transform: skewX(-25deg);
        animation: evoShine 4s infinite ease-in-out;
      }

      @keyframes evoSparkle {
        0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.2) rotate(45deg); }
      }
      .evo-glitter-star {
        position: absolute;
        width: 6px;
        height: 6px;
        background: white;
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        pointer-events: none;
        box-shadow: 0 0 4px #fff, 0 0 8px #FFD700;
        z-index: 10;
        animation: evoSparkle 2s infinite ease-in-out;
      }

      /* Avatar Premium Round & Liquid Gold Border Animation (Matched Colors) */
      @property --evo-avatar-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }
      @keyframes evoAvatarRotate {
        from { --evo-avatar-angle: 0deg; }
        to { --evo-avatar-angle: 360deg; }
      }
      @keyframes evoAvatarPulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      .evo-gold-avatar {
        border-radius: 50% !important;
        position: relative;
        padding: 3px !important; 
        background: rgba(10, 10, 10, 0.5) !important; 
        box-shadow: none !important;
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Efeito Principal: Ouro Minerador Giratório (Richer Gradient) */
      .evo-gold-avatar::before {
        content: '';
        position: absolute;
        inset: 0;
        padding: 3px;
        border-radius: 50%;
        background: conic-gradient(
          from var(--evo-avatar-angle), 
          transparent 0deg, 
          rgb(255, 191, 0) 45deg, 
          rgba(255, 255, 255, 1) 90deg, 
          rgb(255, 191, 0) 135deg, 
          transparent 180deg, 
          rgb(255, 191, 0) 225deg, 
          rgba(255, 255, 255, 1) 270deg, 
          rgb(255, 191, 0) 315deg, 
          transparent 360deg
        );
        -webkit-mask: 
           linear-gradient(#fff 0 0) content-box, 
           linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: evoAvatarRotate 12s linear infinite;
        pointer-events: none;
        filter: blur(0.3px);
      }
      /* Efeito Secundário: Shimmer (Sincronizado com o selo) */
      .evo-gold-avatar::after {
        content: '';
        position: absolute;
        inset: 0;
        padding: 3px;
        border-radius: 50%;
        background: conic-gradient(
          from calc(var(--evo-avatar-angle) * 3), 
          transparent 0deg, 
          rgba(255, 255, 255, 0.9) 10deg, 
          transparent 20deg,
          rgba(255, 191, 0, 0.9) 30deg,
          transparent 40deg
        );
        -webkit-mask: 
           linear-gradient(#fff 0 0) content-box, 
           linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: evoAvatarRotate 5s linear infinite reverse, evoAvatarPulse 2.5s infinite ease-in-out;
        pointer-events: none;
        z-index: 2;
      }
      .evo-gold-avatar:hover {
        transform: scale(1.05);
      }
      .evo-gold-avatar img {
        border-radius: 50% !important;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: relative;
        z-index: 1;
      }
      
      /* Efeitos GOLD */
      @keyframes evoGoldParticles {
        0% { transform: translate(0, 0) scale(1); opacity: 0; }
        50% { opacity: 0.8; }
        100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
      }
      .evo-gold-particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgb(255, 191, 0);
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
        animation: evoGoldParticles 2s infinite ease-out;
      }
      .evo-gold-circle-clipper {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 50%;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .evo-gold-circle-clipper::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -150%;
        width: 100%;
        height: 200%;
        background: linear-gradient(
          to right, 
          transparent, 
          rgba(255, 223, 0, 0.4), 
          rgba(255, 255, 255, 0.6), 
          rgba(255, 223, 0, 0.4), 
          transparent
        );
        transform: rotate(30deg);
        animation: evoGoldShine 3s infinite;
        z-index: 20;
        pointer-events: none;
      }
      @keyframes evoGoldShine {
        0% { left: -150%; }
        100% { left: 150%; }
      }

      /* Esconde setinhas de aumentar e diminuir número padrão do input nos navegadores */
      .evo-editable-number::-webkit-outer-spin-button,
      .evo-editable-number::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .evo-editable-number {
        -moz-appearance: textfield;
      }

      /* Animação de Pulsação (Scale Pulse) Constante */
      @keyframes evoBadgePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      .evo-badge-shake {
        animation: evoBadgePulse 2s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  // 1. Esconder os e-mails (melhor que remover para podermos reexibir)
  const paragraphs = document.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (p.textContent.trim() === 'philipe.saantos@gmail.com' && p.classList.contains('text-[11px]')) {
      if (p.style.display !== 'none') {
        p.style.display = 'none';
        if (!emailElementsHidden.includes(p)) {
          emailElementsHidden.push(p);
        }
      }
    }
  });

  // 2. Encontrar a div "Minerador"
  let mineradorElements = [];
  const divs = document.querySelectorAll('div');
  divs.forEach(div => {
    if (div.textContent.trim() === 'Minerador' && div.classList.contains('text-[8px]')) {
      mineradorElements.push(div);
    }
  });

  // Função auxiliar para transformar um selo comum em Minerador Premium
  const applyPremiumMineradorStyle = (element, isCompact = true) => {
    if (element.dataset.evoPremiumMod === "true" && element.dataset.evoCompact === String(isCompact)) return;
    element.dataset.evoPremiumMod = "true";
    element.dataset.evoCompact = String(isCompact);

    // Configurações base de layout
    element.style.width = 'fit-content';
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.gap = isCompact ? '4px' : '6px';
    element.style.padding = isCompact ? '0.1rem 0.5rem' : '0.35rem 0.8rem';
    element.style.fontSize = isCompact ? '7.5px' : '10px';
    element.style.lineHeight = '1';
    element.style.fontWeight = '900';
    element.style.textTransform = 'uppercase';
    element.style.letterSpacing = '0.1em';

    // Salva cores/classes originais para desfazer
    if (!element.dataset.evoOldColor) {
      element.dataset.evoOldColor = element.style.color || window.getComputedStyle(element).color;
      element.dataset.evoOldBorderColor = element.style.borderColor || window.getComputedStyle(element).borderColor;
      element.dataset.evoOldClasses = element.className;
    }

    // Remove classes conflitantes se for um span (comum no perfil)
    element.classList.remove('rounded-full', 'bg-blue-500/10', 'text-blue-400', 'px-3', 'py-1.5', 'text-xs');
    
    // Aplica classes de efeito
    element.classList.add('evo-minerador-brilho', 'rounded', 'border');
    element.style.color = 'rgb(255, 191, 0)';
    element.style.borderColor = 'rgb(255, 191, 0)';

    // Remove o SVG original se existir
    const originalSvg = element.querySelector('svg');
    if (originalSvg) originalSvg.style.display = 'none';

    // Injeta Shine Clipper
    if (!element.querySelector('.evo-shine-clipper')) {
      const clipper = document.createElement('div');
      clipper.className = 'evo-shine-clipper';
      element.appendChild(clipper);
    }

    // Adiciona o Ícone Gold
    let icon = element.querySelector('img.evo-gold-badge-icon');
    if (!icon) {
      icon = document.createElement('img');
      icon.src = 'https://i.imgur.com/UFgpPC1.png';
      icon.className = 'evo-gold-badge-icon';
      icon.style.objectFit = 'contain';
      icon.style.zIndex = '15';
      icon.style.position = 'relative';
      element.prepend(icon);
    }
    icon.style.width = isCompact ? '10px' : '12px';
    icon.style.height = isCompact ? '10px' : '12px';

    // Injeta Glitter (Estrelas)
    if (element.querySelectorAll('.evo-glitter-star').length === 0) {
      const positions = isCompact ? [
        { t: '-3px', l: '10%' }, { t: '3px', l: '40%' }, { t: '-1px', l: '80%' }, { b: '-3px', r: '20%' }
      ] : [
        { t: '-4px', l: '10%' }, { t: '5px', l: '40%' }, { t: '-2px', l: '80%' }, { b: '-4px', r: '20%' }, { t: '2px', r: '45%' }
      ];
      
      positions.forEach((pos, i) => {
        const star = document.createElement('div');
        star.className = 'evo-glitter-star';
        if (pos.t) star.style.top = pos.t;
        if (pos.b) star.style.bottom = pos.b;
        if (pos.l) star.style.left = pos.l;
        if (pos.r) star.style.right = pos.r;
        star.style.animationDelay = `${i * 0.5}s`;
        element.appendChild(star);
      });
    }
  };

  // 3. Posicionar o "Minerador" abaixo do "SUB ツ", ocupando o lugar do e-mail
  let targetEmail = emailElementsHidden[0]; 
  if (targetEmail && mineradorElements.length > 0) {
    let mineradorElement = mineradorElements[0];

    if (targetEmail.previousSibling !== mineradorElement) {
      let alreadyMoved = movedMineradores.find(m => m.el === mineradorElement);
      if (!alreadyMoved) {
        movedMineradores.push({
          el: mineradorElement,
          parent: mineradorElement.parentNode,
          sibling: mineradorElement.nextSibling
        });
      }

      targetEmail.parentNode.insertBefore(mineradorElement, targetEmail);
      applyPremiumMineradorStyle(mineradorElement, true); // Modo Compacto na Sidebar
    }
  }

  // 3.0. Estilizar Selo Minerador e Avatar na Página de Perfil (/profile)
  if (window.location.pathname.includes('/profile')) {
    // Selo Minerador
    const profileBadges = document.querySelectorAll('span.inline-flex');
    profileBadges.forEach(badge => {
      if (badge.textContent.includes('Minerador')) {
        applyPremiumMineradorStyle(badge, false); 
      }
    });

    // Avatar Principal (Arredondar e Ouro Líquido)
    const profileMainAvatarContainer = document.querySelector('div.w-24.h-24.md\\:w-28.md\\:h-28.rounded-2xl');
    if (profileMainAvatarContainer && !profileMainAvatarContainer.dataset.evoAvatarMod) {
      profileMainAvatarContainer.classList.remove('rounded-2xl', 'bg-gradient-to-br', 'from-blue-400', 'to-blue-600');
      profileMainAvatarContainer.classList.add('evo-gold-avatar', 'rounded-full');
      profileMainAvatarContainer.style.background = 'rgba(20, 20, 20, 0.8)';
      profileMainAvatarContainer.dataset.evoAvatarMod = "true";

      // Adiciona ring premium (como no sidebar)
      profileMainAvatarContainer.classList.add('ring-2', 'ring-white/30', 'ring-offset-2', 'ring-offset-[#1f2937]');
    }

    // Fundo Premium para o Card do Perfil (Novo)
    const profileCard = profileMainAvatarContainer ? profileMainAvatarContainer.closest('div.bg-\\[\\#1f2937\\]') : null;
    if (profileCard && profileCard.dataset.evoCardBgMod !== "true") {
      profileCard.dataset.evoCardBgMod = "true";
      profileCard.style.position = 'relative';
      profileCard.style.overflow = 'hidden';

      // Eleva os filhos para ficarem à frente do fundo
      Array.from(profileCard.children).forEach(child => {
        child.style.position = 'relative';
        child.style.zIndex = '10';
      });

      const cardBg = document.createElement('img');
      cardBg.src = 'https://i.imgur.com/k6n0C2h.png';
      cardBg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-profile-card-bg';
      cardBg.style.opacity = '0.8';
      cardBg.style.zIndex = '0';
      profileCard.insertBefore(cardBg, profileCard.firstChild);
    }
  }

  // 3.1. Estilizar o Avatar do Perfil e Fundo do Cabeçalho
  const avatar = document.querySelector('.sidebar-profile-avatar');
  if (avatar) {
    // Estetizar avatar
    if (!avatar.classList.contains('evo-gold-avatar')) {
      avatar.classList.add('evo-gold-avatar');
      avatar.dataset.evoAvatarMod = "true";
    }

    // Injetar BACKGROUND no cabeçalho (pai do avatar)
    const headerContainer = avatar.closest('.px-4.py-3.border-b.border-white\\/10');
    if (headerContainer && headerContainer.dataset.evoHeaderMod !== "true") {
      headerContainer.dataset.evoHeaderMod = "true";
      headerContainer.style.position = 'relative';
      headerContainer.style.overflow = 'hidden';

      // Eleva os filhos existentes
      Array.from(headerContainer.children).forEach(child => {
        child.style.position = 'relative';
        child.style.zIndex = '10';
      });

      const bgImg = document.createElement('img');
      bgImg.src = 'https://i.imgur.com/k6n0C2h.png';
      bgImg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-profile-header-bg';
      bgImg.style.opacity = '0.8';
      bgImg.style.zIndex = '0';
      headerContainer.insertBefore(bgImg, headerContainer.firstChild);
    }

    // Injetar BACKGROUND no container do LOGO (Busca exaustiva)
    document.querySelectorAll('div.border-b').forEach(container => {
      if (container.dataset.evoLogoBgMod === "true") return;

      const logoImg = container.querySelector('img[alt*="Logo"], img[src*="logo"], img[src*="evo-logo"]');
      if (logoImg) {
        container.dataset.evoLogoBgMod = "true";
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        Array.from(container.children).forEach(child => {
          child.style.position = 'relative';
          child.style.zIndex = '10';
        });

        const bgLogoImg = document.createElement('img');
        bgLogoImg.src = 'https://i.imgur.com/l7UcInb.png';
        bgLogoImg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-logo-header-bg';
        bgLogoImg.style.opacity = '0.8';
        bgLogoImg.style.zIndex = '0';
        container.insertBefore(bgLogoImg, container.firstChild);
      }
    });
  }

  // 4. Transformar exibição do Slider num campo editável
  const bgBlueSpans = document.querySelectorAll('span');
  bgBlueSpans.forEach(span => {
    // Verifica se é o span do número (pelas classes e cor)
    if (span.classList.contains('text-lg') && span.classList.contains('px-3') &&
      (span.style.background.includes('59, 130, 246') || span.style.backgroundColor.includes('59, 130, 246'))) {

      if (span.getAttribute('data-evo-editable') === 'true') return;
      span.setAttribute('data-evo-editable', 'true');

      const innerSpan = span.querySelector('span'); // Pega o <span>1000</span> interno do framework React
      let initialValue = '1000';
      if (innerSpan) {
        initialValue = innerSpan.textContent.trim();
        innerSpan.style.display = 'none'; // Esconde o texto estático gerado pelo React
      } else {
        initialValue = span.textContent.trim();
        span.textContent = ''; // Limpa o text node para não bugar caso o React falhe em injetar innerSpan
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '10';
      input.max = '1000';
      input.value = initialValue;

      // Estilos CSS transparentes para ficar com a exata aparência do texto numérico original
      input.style.background = 'transparent';
      input.style.border = 'none';
      input.style.outline = 'none';
      input.style.color = 'inherit';
      input.style.width = '60px'; // Largura suficiente para 4 dígitos
      input.style.textAlign = 'center';
      input.style.font = 'inherit';
      input.style.margin = '0';
      input.style.padding = '0';
      input.className = 'evo-editable-number';

      span.appendChild(input);

      // Helper para simular o clique geométrico no Radix UI Slider
      const forceUpdateSlider = (val) => {
        const slider = document.querySelector('span[dir="ltr"][data-orientation="horizontal"]');
        if (slider) {
          const track = slider.querySelector('span.grow');
          const thumb = slider.querySelector('[role="slider"]');
          if (track && thumb) {
            const minAttr = parseInt(thumb.getAttribute('aria-valuemin') || '10', 10);
            const maxAttr = parseInt(thumb.getAttribute('aria-valuemax') || '1000', 10);
            const rect = track.getBoundingClientRect();

            let percentage = (val - minAttr) / (maxAttr - minAttr);
            if (percentage < 0) percentage = 0;
            if (percentage > 1) percentage = 1;

            const clickX = rect.left + (rect.width * percentage);
            const clickY = rect.top + (rect.height / 2);

            // Opções robustas para imitar o mouse humano no React
            const pointerOpts = {
              bubbles: true, cancelable: true, view: window,
              clientX: clickX, clientY: clickY,
              pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true
            };

            track.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
            track.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
          }
        }
      };

      // Dispara em TEMPO REAL conforme o usuário digita cada número
      input.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        // Só tenta mover se já for um valor válido, assim não trava se ele apagar pra digitar
        if (!isNaN(val) && val >= 10 && val <= 1000) {
          forceUpdateSlider(val);
        }
      });

      // Corrige valores absurdos ou inválidos quando ele der "Enter" ou clicar fora
      input.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 10;
        if (val < 10) val = 10;
        if (val > 1000) val = 1000;
        e.target.value = val;
        forceUpdateSlider(val);
      });

      // Manter o Input perfeitamente sincronizado com a tela React caso o usuário arrastar a barrinha original do nada
      if (innerSpan) {
        const textObserver = new MutationObserver(() => {
          if (document.activeElement !== input) {
            input.value = innerSpan.textContent.trim();
          }
        });
        textObserver.observe(innerSpan, { childList: true, characterData: true, subtree: true });
      }
    }
  });

  // 5. Injecao UTM nos links de afiliados da Hoobuy
  const helperHoobuyMutator = (href) => {
    try {
      const url = new URL(href);
      if (url.hostname.includes('hoobuy.com') && url.pathname.includes('/product/')) {
        if (url.searchParams.has('inviteCode') && !url.searchParams.has('utm_source')) {
          const parts = url.pathname.split('/').filter(p => !!p);
          const productId = parts[parts.length - 1];
          if (productId) {
            // Usa máscara de string pesada pra não depender do construtor de URL trocar a ordem dos prâmetros
            return `${url.origin}${url.pathname}?utm_source=website&utm_medium=share&utm_campaign=product_details&utm_content=${productId}&inviteCode=6EDjePGR`;
          }
        }
      }
    } catch (e) { }
    return href;
  };

  // Varredura estática de rotina
  document.querySelectorAll('a').forEach(link => {
    const rawHref = link.getAttribute('href') || link.href;
    if (rawHref && rawHref.includes('hoobuy.com/product/')) {
      const fixed = helperHoobuyMutator(link.href);
      if (fixed !== link.href) {
        if (!link.getAttribute('data-evo-original-href')) {
          link.setAttribute('data-evo-original-href', link.href);
        }
        link.href = fixed;
      }
    }
  });

  // Interceptador Dinâmico de Cliques (Quebra o encapsulamento React/NextJS)
  if (!window.evoHoobuyInterceptorAtivo) {
    window.evoHoobuyInterceptorAtivo = true;
    document.addEventListener('mousedown', (e) => {
      if (!isActive) return;
      const link = e.target.closest('a');
      if (link && link.href && link.href.includes('hoobuy.com/product/')) {
        const fixed = helperHoobuyMutator(link.href);
        if (fixed !== link.href) {
          if (!link.getAttribute('data-evo-original-href')) {
            link.setAttribute('data-evo-original-href', link.href);
          }
          link.href = fixed;
        }
      }
    }, true);
  }

  // Interceptador PROFUNDO (Page-Level injection para pegar chamadas ocultas do tipo window.open via React/Vue)
  if (!document.getElementById('evo-hoobuy-window-patch')) {
    const script = document.createElement('script');
    script.id = 'evo-hoobuy-window-patch';
    script.textContent = `
      (function() {
        const originalWindowOpen = window.open;
        window.open = function(url, target, features) {
          if (typeof url === 'string' && url.includes('hoobuy.com/product/')) {
            try {
              const urlObj = new URL(url);
              if (urlObj.searchParams.has('inviteCode') && !urlObj.searchParams.has('utm_source')) {
                const parts = urlObj.pathname.split('/').filter(Boolean);
                const productId = parts[parts.length - 1];
                if (productId) {
                  urlObj.searchParams.set('utm_source', 'website');
                  urlObj.searchParams.set('utm_medium', 'share');
                  urlObj.searchParams.set('utm_campaign', 'product_details');
                  urlObj.searchParams.set('utm_content', productId);
                  url = urlObj.toString();
                }
              }
            } catch(e) {}
          }
          return originalWindowOpen.call(this, url, target, features);
        };
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
  }

  // 6. Configurar ícones customizados na página de Store
  if (window.location.href.includes('/store')) {
    // 1. Busca globalmente todas as caixas que possivelmente guardam os ícones baseando-se no shape
    const allBoxes = document.querySelectorAll('.w-14.h-14.rounded-2xl.flex.items-center.justify-center.mx-auto');

    // 2. Filtra exclusivamente aquelas que têm o vetor do "raiozinho" dentro delas para não quebrar outros botões
    const validBoxes = Array.from(allBoxes).filter(box => box.innerHTML.includes('M4 14a1 1 0 0 1-.78-1.63l9.9-10.2'));

    // 3. Ordem rigorosamente exigida
    const evoUrls = [
      'https://i.imgur.com/aebN4UW.png',
      'https://i.imgur.com/qU3oNn3.png',
      'https://i.imgur.com/t42qnks.png'
    ];

    // 4. Varre aplicando ou consertando as capas baseando-se no index real do componente na página
    for (let i = 0; i < 3 && i < validBoxes.length; i++) {
      const parentBox = validBoxes[i];
      const correctUrl = evoUrls[i];

      // Função Helper para escalar
      const aplicarTamanhoDaImagem = (imagemEl, url) => {
        imagemEl.className = 'w-14 h-14 object-contain evo-store-icon';
        // Aumenta em 40% do tamanho físico apenas nestes 2 ícones
        if (url.includes('qU3oNn3') || url.includes('t42qnks')) {
          imagemEl.style.transform = 'scale(1.4)';
          imagemEl.style.maxWidth = 'max-content'; // Rompe as bordas pro lado de fora
        } else {
          imagemEl.style.transform = 'none';
          imagemEl.style.maxWidth = '100%';
        }
      };

      // Se já existe a tag img injetada por nós
      const existingImg = parentBox.querySelector('img.evo-store-icon');
      if (existingImg) {
        // Se, pelo re-render do React, ele perdeu a posição e tá com a imagem anterior errada
        if (existingImg.src !== correctUrl) {
          existingImg.src = correctUrl;
        }
        aplicarTamanhoDaImagem(existingImg, correctUrl);
        continue;
      }

      // Primeira injeção na caixa
      if (parentBox.dataset.evoStoreMod !== "true") {
        parentBox.dataset.evoStoreMod = "true";

        parentBox.dataset.evoOldBg = parentBox.style.background;
        parentBox.dataset.evoOldBorder = parentBox.style.border;

        parentBox.style.background = 'transparent';
        parentBox.style.border = 'none';

        const svg = parentBox.querySelector('svg');
        if (svg) svg.style.display = 'none';

        const img = document.createElement('img');
        img.src = correctUrl;
        aplicarTamanhoDaImagem(img, correctUrl);
        parentBox.appendChild(img);
      }
    }

    // 6.5. Injetar imagem de fundo no Plano "BRONZE (Explorador)"
    const explorerCards = Array.from(document.querySelectorAll('.flex.flex-col.justify-between.p-6')).filter(card => {
      // Usamos find robusto de texto no innerHTML para não errar e pegar o Gold ou Silver
      return card.innerHTML.includes('Explorador') && card.innerHTML.includes('BRONZE');
    });

    explorerCards.forEach(card => {
      if (card.dataset.evoBgMod !== "true") {
        card.dataset.evoBgMod = "true";

        // Cria o contêiner relativo pra prender a imagem de forma absoluta nele
        card.style.position = 'relative';
        card.style.overflow = 'hidden';

        // Garante que todo o texto flutue em cima da imagem fantasma
        Array.from(card.children).forEach(child => {
          child.style.position = 'relative';
          child.style.zIndex = '10';
        });

        // Cria e joga a imagem lá no fundão (index 0) com tailwind pra cobrir a div
        const bgImg = document.createElement('img');
        bgImg.src = 'https://imgur.com/ZhPqpqJ.png';
        bgImg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-store-bg';
        bgImg.style.opacity = '0.8';
        bgImg.style.zIndex = '0';

        card.insertBefore(bgImg, card.firstChild);

        // Troca a cor da fonte escrito "BRONZE" para cor de bronze real e metálico
        const bronzeP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.trim() === 'BRONZE');
        if (bronzeP) {
          bronzeP.classList.remove('text-blue-400');
          bronzeP.style.color = '#cd7f32';
          bronzeP.dataset.evoColorMod = "true";
        }

        // Substitui o ícone SVG ao lado do título Explorador
        const cardIconBox = card.querySelector('.w-14.h-14.rounded-2xl.flex.items-center.justify-center');
        if (cardIconBox) {
          // Guarda estilos antigos para a reversão
          cardIconBox.dataset.evoOldBg = cardIconBox.style.background;
          cardIconBox.dataset.evoOldBorder = cardIconBox.style.border;

          cardIconBox.style.background = 'transparent';
          cardIconBox.style.border = 'none';

          const svgIcon = cardIconBox.querySelector('svg');
          if (svgIcon) svgIcon.style.display = 'none';

          const newIconImg = document.createElement('img');
          newIconImg.src = 'https://i.imgur.com/J790Vgc.png';
          newIconImg.className = 'w-14 h-14 object-contain evo-store-card-icon';
          cardIconBox.appendChild(newIconImg);
        }
      }
    });

    // 6.6. Injetar imagem de fundo no Plano "SILVER (Escavador)"
    const silverCards = Array.from(document.querySelectorAll('.flex.flex-col.justify-between.p-6')).filter(card => {
      return card.innerHTML.includes('Escavador') && card.innerHTML.includes('SILVER');
    });

    silverCards.forEach(card => {
      if (card.dataset.evoBgMod !== "true") {
        card.dataset.evoBgMod = "true";

        card.style.position = 'relative';
        card.style.overflow = 'hidden';

        Array.from(card.children).forEach(child => {
          child.style.position = 'relative';
          child.style.zIndex = '10';
        });

        const bgImg = document.createElement('img');
        bgImg.src = 'https://imgur.com/ZFmRoGL.png';
        bgImg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-store-bg';
        bgImg.style.opacity = '0.8';
        bgImg.style.zIndex = '0';
        card.insertBefore(bgImg, card.firstChild);

        const silverP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.trim() === 'SILVER');
        if (silverP) {
          silverP.classList.remove('text-blue-400');
          silverP.style.color = '#C0C0C0';
          silverP.dataset.evoColorMod = "true";
        }

        const cardIconBox = card.querySelector('.w-14.h-14.rounded-2xl.flex.items-center.justify-center');
        if (cardIconBox) {
          cardIconBox.dataset.evoOldBg = cardIconBox.style.background;
          cardIconBox.dataset.evoOldBorder = cardIconBox.style.border;

          cardIconBox.style.background = 'transparent';
          cardIconBox.style.border = 'none';

          const svgIcon = cardIconBox.querySelector('svg');
          if (svgIcon) svgIcon.style.display = 'none';

          const newIconImg = document.createElement('img');
          newIconImg.src = 'https://i.imgur.com/ibHs66L.png';
          newIconImg.className = 'w-14 h-14 object-contain evo-store-card-icon';
          cardIconBox.appendChild(newIconImg);
        }
      }
    });

    // 6.7. Injetar imagem de fundo no Plano "GOLD (Minerador)"
    const goldCards = Array.from(document.querySelectorAll('.flex.flex-col.justify-between.p-6')).filter(card => {
      return card.innerHTML.includes('Minerador') && card.innerHTML.includes('GOLD');
    });

    goldCards.forEach(card => {
      if (card.dataset.evoBgMod !== "true") {
        card.dataset.evoBgMod = "true";

        card.style.position = 'relative';
        card.style.overflow = 'hidden';

        Array.from(card.children).forEach(child => {
          child.style.position = 'relative';
          child.style.zIndex = '10';
        });

        const bgImg = document.createElement('img');
        bgImg.src = 'https://i.imgur.com/k6n0C2h.png';
        bgImg.className = 'absolute inset-0 w-full h-full object-cover pointer-events-none evo-store-bg';
        bgImg.style.opacity = '0.8';
        bgImg.style.zIndex = '0';
        card.insertBefore(bgImg, card.firstChild);

        const goldP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.trim() === 'GOLD');
        if (goldP) {
          goldP.classList.remove('text-blue-400');
          goldP.style.color = 'rgb(255, 191, 0)';
          goldP.style.fontWeight = 'bold';
          goldP.dataset.evoColorMod = "true";
        }

        const cardIconBox = card.querySelector('.w-14.h-14.rounded-2xl.flex.items-center.justify-center');
        if (cardIconBox) {
          cardIconBox.dataset.evoOldBg = cardIconBox.style.background;
          cardIconBox.dataset.evoOldBorder = cardIconBox.style.border;
          cardIconBox.dataset.evoOldRadius = cardIconBox.style.borderRadius;

          cardIconBox.style.background = 'transparent';
          cardIconBox.style.border = 'none';
          cardIconBox.style.position = 'relative';
          cardIconBox.style.overflow = 'visible'; // Libertar partículas para voarem fora da div

          const svgIcon = cardIconBox.querySelector('svg');
          if (svgIcon) svgIcon.style.display = 'none';

          // Componente interno que fará o RECORTE (clipper) circular do brilho
          let innerClipper = cardIconBox.querySelector('.evo-gold-circle-clipper');
          if (!innerClipper) {
            innerClipper = document.createElement('div');
            innerClipper.className = 'evo-gold-circle-clipper';
            cardIconBox.appendChild(innerClipper);
          }

          const newIconImg = document.createElement('img');
          newIconImg.src = 'https://i.imgur.com/UFgpPC1.png';
          newIconImg.className = 'w-14 h-14 object-contain evo-store-card-icon relative z-10';

          innerClipper.innerHTML = '';
          innerClipper.appendChild(newIconImg);

          // Injeção de Partículas com RAIÃO de dispersão
          for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'evo-gold-particle';
            // Aumento radical da distância percorrida pelas pepitas de ouro
            const x = (Math.random() - 0.5) * 160;
            const y = (Math.random() - 0.5) * 160;
            particle.style.setProperty('--x', `${x}px`);
            particle.style.setProperty('--y', `${y}px`);
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.animationDelay = `${Math.random() * 2}s`;
            cardIconBox.appendChild(particle);
          }
        }

        // Elevar e reposicionar o selo "✓ Seu plano" para sobrepor fisicamente o ícone
        const yourPlanBadge = Array.from(card.querySelectorAll('div.absolute')).find(d => d.textContent.includes('Seu plano'));
        if (yourPlanBadge) {
          yourPlanBadge.dataset.evoBadgeMod = "true";
          yourPlanBadge.dataset.evoOldTop = yourPlanBadge.style.top;
          yourPlanBadge.dataset.evoOldLeft = yourPlanBadge.style.left;
          yourPlanBadge.dataset.evoOldZIndex = yourPlanBadge.style.zIndex;

          yourPlanBadge.style.top = '28px';
          yourPlanBadge.style.left = '38px';
          yourPlanBadge.style.zIndex = '40';
        }
      }
    });

    // 6.8. Adicionar chacoalho no selo "Melhor Valor"
    document.querySelectorAll('div.absolute').forEach(div => {
      if (div.textContent.includes('Melhor Valor')) {
        if (!div.classList.contains('evo-badge-shake')) {
          div.classList.add('evo-badge-shake');
          div.dataset.evoShakeMod = "true";
        }
      }
    });

    // 6.9. Injetar imagem de fundo no Card de Vendedor (Agressivo - Universal)
    const bgUrl = 'https://gw.alicdn.com/imgextra/i2/O1CN01wb0Ioz1TWfcAY9sol_!!6000000002390-2-tps-3120-564.png';
    document.querySelectorAll('.seller-card-transition-block').forEach(transitionBlock => {
      // Procura o container principal subindo o DOM
      const card = transitionBlock.closest('div.w-full.mb-8.relative') || transitionBlock.parentElement;
      if (card && card.dataset.evoMiningMod !== "true") {
        card.dataset.evoMiningMod = "true";
        
        // Sobrescrever o background original forçadamente
        card.style.setProperty('background', 
          `linear-gradient(rgba(31, 41, 55, 0.82), rgba(31, 41, 55, 0.82)), url("${bgUrl}") center/cover no-repeat`, 
          'important'
        );
        card.style.setProperty('background-size', 'cover', 'important');
        card.style.setProperty('background-position', 'center', 'important');
        card.style.setProperty('position', 'relative', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');

        // Eleva os outros filhos para ficarem sobre a imagem e terem excelente leitura
        Array.from(card.children).forEach(child => {
          if (!child.classList.contains('seller-card-transition-block')) {
            child.style.setProperty('position', 'relative', 'important');
            child.style.setProperty('z-index', '10', 'important');
          }
        });
      }
    });
  }
}
function undoCorrections() {
  isActive = false;

  // 0. Desfazer Estilos Premium (Minerador em qualquer lugar)
  document.querySelectorAll('[data-evo-premium-mod="true"]').forEach(el => {
    el.removeAttribute('data-evo-premium-mod');
    el.style.color = el.dataset.evoOldColor || '';
    el.style.borderColor = el.dataset.evoOldBorderColor || '';
    el.style.width = '';
    el.style.display = '';
    el.style.alignItems = '';
    el.style.gap = '';
    el.style.padding = '';
    el.style.fontSize = '';
    el.style.lineHeight = '';
    el.style.fontWeight = '';
    el.style.textTransform = '';
    el.style.letterSpacing = '';

    if (el.dataset.evoOldClasses) {
      el.className = el.dataset.evoOldClasses;
    }

    const icon = el.querySelector('.evo-gold-badge-icon');
    if (icon) icon.remove();
    
    const clipper = el.querySelector('.evo-shine-clipper');
    if (clipper) clipper.remove();

    el.querySelectorAll('.evo-glitter-star').forEach(star => star.remove());

    const originalSvg = el.querySelector('svg');
    if (originalSvg) originalSvg.style.display = '';
  });

  // 1. Reexibir os e-mails
  emailElementsHidden.forEach(p => {
    if (document.body.contains(p)) {
      p.style.display = ''; // Limpa o display:none
    }
  });
  emailElementsHidden = []; // Reseta

  // 2. Voltar os mineradores pros lugares originais
  movedMineradores.forEach(moved => {
    // Confere se eles ainda existem na tela antes de tentar mexer
    if (document.body.contains(moved.el) && document.body.contains(moved.parent)) {
      moved.parent.insertBefore(moved.el, moved.sibling);
      moved.el.style.width = ''; // Remove a restrição de tamanho
      moved.el.style.display = '';
      moved.el.style.alignItems = '';
      moved.el.style.gap = '';

      // Restaura cores e padding
      moved.el.style.color = moved.el.dataset.evoOldColor || '';
      moved.el.style.borderColor = moved.el.dataset.evoOldBorderColor || '';
      moved.el.style.background = '';
      moved.el.style.padding = '';
      moved.el.style.fontSize = '';
      moved.el.style.lineHeight = '';
      moved.el.removeAttribute('data-evo-old-color');
      moved.el.removeAttribute('data-evo-old-border-color');

      // Remove ícone customizado, glitter e clipper
      moved.el.querySelectorAll('img.evo-gold-badge-icon, .evo-glitter-star, .evo-shine-clipper').forEach(el => el.remove());

      moved.el.classList.remove('evo-minerador-brilho'); // Retira a animação
    }
  });
  movedMineradores = []; // Reseta

  // 2.1. Desfazer Avatar Gold
  const avatar = document.querySelector('.sidebar-profile-avatar[data-evo-avatar-mod="true"]');
  if (avatar) {
    avatar.classList.remove('evo-gold-avatar');
    avatar.style.overflow = '';
    avatar.style.padding = '';
    avatar.style.background = '';
    avatar.removeAttribute('data-evo-avatar-mod');
  }

  // 2.2. Desfazer Background do Cabeçalho Sidebar
  const profileHeader = document.querySelector('[data-evo-header-mod="true"]');
  if (profileHeader) {
    profileHeader.removeAttribute('data-evo-header-mod');
    profileHeader.style.position = '';
    profileHeader.style.overflow = '';
    const bg = profileHeader.querySelector('img.evo-profile-header-bg');
    if (bg) bg.remove();

    Array.from(profileHeader.children).forEach(child => {
      child.style.position = '';
      child.style.zIndex = '';
    });
  }

  // 2.3. Desfazer Background do Container do Logo
  const logoHeader = document.querySelector('[data-evo-logo-bg-mod="true"]');
  if (logoHeader) {
    logoHeader.removeAttribute('data-evo-logo-bg-mod');
    logoHeader.style.position = '';
    logoHeader.style.overflow = '';
    const bg = logoHeader.querySelector('img.evo-logo-header-bg');
    if (bg) bg.remove();

    Array.from(logoHeader.children).forEach(child => {
      child.style.position = '';
      child.style.zIndex = '';
    });
  }

  // 3. Desfazer as caixas editáveis e voltar a exibir texto puro do React
  document.querySelectorAll('span[data-evo-editable="true"]').forEach(span => {
    span.removeAttribute('data-evo-editable');
    const input = span.querySelector('input.evo-editable-number');
    if (input) input.remove();
    const innerSpan = span.querySelector('span'); // Revela o texto protegido
    if (innerSpan) innerSpan.style.display = '';
  });

  // 4. Remover boxes gerados do Goofish
  if (typeof removeGoofishCard === 'function') removeGoofishCard();

  // 5. Restaurar links originais da Hoobuy sem UTMs
  document.querySelectorAll('a[data-evo-original-href]').forEach(link => {
    link.href = link.getAttribute('data-evo-original-href');
    link.removeAttribute('data-evo-original-href');
  });

  // 6. Restaurar SVGs e caixas originais da Aba Store
  document.querySelectorAll('div[data-evo-store-mod="true"]').forEach(div => {
    div.removeAttribute('data-evo-store-mod');
    div.style.background = div.dataset.evoOldBg || '';
    div.style.border = div.dataset.evoOldBorder || '';
    const img = div.querySelector('img.evo-store-icon');
    if (img) img.remove();
    const svg = div.querySelector('svg');
    if (svg) svg.style.display = '';
  });

  // 7. Retirar background do plano BRONZE
  document.querySelectorAll('div[data-evo-bg-mod="true"]').forEach(card => {
    card.removeAttribute('data-evo-bg-mod');
    card.style.position = '';
    card.style.overflow = '';

    const bgImg = card.querySelector('img.evo-store-bg');
    if (bgImg) bgImg.remove();

    Array.from(card.children).forEach(child => {
      child.style.position = '';
      child.style.zIndex = '';
    });

    // Desfaz cor alternativa e traz azul de volta
    card.querySelectorAll('p[data-evo-color-mod="true"]').forEach(p => {
      p.removeAttribute('data-evo-color-mod');
      p.style.color = '';
      p.classList.add('text-blue-400');
    });

    // Desfaz a troca do ícone interno
    const cardIconImg = card.querySelector('img.evo-store-card-icon');
    if (cardIconImg) {
      // O contêiner agora é o avô se houver clipper, ou o pai
      const cardIconBox = cardIconImg.closest('.w-14.h-14.rounded-2xl') || cardIconImg.parentNode.parentNode;
      if (cardIconBox) {
        cardIconBox.style.background = cardIconBox.dataset.evoOldBg || '';
        cardIconBox.style.border = cardIconBox.dataset.evoOldBorder || '';
        cardIconBox.style.borderRadius = cardIconBox.dataset.evoOldRadius || '';
        cardIconBox.style.overflow = ''; // Volta pro padrão

        const svgIcon = cardIconBox.querySelector('svg');
        if (svgIcon) svgIcon.style.display = '';

        // Limpa partículas e o clipper interno
        cardIconBox.querySelectorAll('.evo-gold-particle').forEach(p => p.remove());
        const clipper = cardIconBox.querySelector('.evo-gold-circle-clipper');
        if (clipper) clipper.remove();
      }
      // Se não removeu no clipper, remove solto
      if (cardIconImg && cardIconImg.parentNode) cardIconImg.remove();
    }

    // Desfaz z-index elevado e reposicionamento do selo "Seu plano"
    card.querySelectorAll('div[data-evo-badge-mod="true"]').forEach(badge => {
      badge.removeAttribute('data-evo-badge-mod');
      badge.style.zIndex = badge.dataset.evoOldZIndex || '';
      badge.style.top = badge.dataset.evoOldTop || '';
      badge.style.left = badge.dataset.evoOldLeft || '';
    });

    // Desfaz animação de chacoalho
    document.querySelectorAll('div[data-evo-shake-mod="true"]').forEach(div => {
      div.removeAttribute('data-evo-shake-mod');
      div.classList.remove('evo-badge-shake');
    });

    // 8. Desfazer fundo do card de /mining
    document.querySelectorAll('div[data-evo-mining-mod="true"]').forEach(card => {
      card.removeAttribute('data-evo-mining-mod');
      card.style.background = '';
      card.style.backgroundSize = '';
      card.style.backgroundPosition = '';
      
      Array.from(card.children).forEach(child => {
        child.style.position = '';
        child.style.zIndex = '';
      });
    });
  });
}

// Configura um MutationObserver para detectar mudanças dinâmicas no site
const observer = new MutationObserver((mutations) => {
  if (!isActive) return; // Se estiver desligado não faz nada

  let deveVerificar = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      deveVerificar = true;
      break;
    }
  }

  if (deveVerificar) {
    applyCorrections();
    setupGoofishSearchListener();
  }
});

// Inicia a observação no body do site
observer.observe(document.body, { childList: true, subtree: true });

// ==========================================
// MÓDULO NEW: INTEGRAÇÃO PREVIEW DE GOOFISH
// ==========================================

// Prende um ouvinte na Input Box destinada às URLs
function setupGoofishSearchListener() {
  if (!isActive) return;

  const searchBox = document.querySelector('.search-box[type="url"]');
  if (!searchBox) return;

  if (searchBox.dataset.goofishBound === "true") return;
  searchBox.dataset.goofishBound = "true";

  let typingTimer;
  let lastSearchedUrl = '';

  // Sempre que a caixa tiver texto adicionado, editado ou colado
  searchBox.addEventListener('input', (e) => {
    clearTimeout(typingTimer);
    const url = e.target.value.trim();

    // Evita loop se for mesma url recarregada
    if (url === lastSearchedUrl) return;

    if (url.includes('goofish.com/personal') || url.includes('goofish.com/')) {
      // Aguarda o usuário parar de digitar por 800ms
      typingTimer = setTimeout(() => {
        lastSearchedUrl = url;
        handleGoofishUrl(url, searchBox);
      }, 800);
    } else {
      lastSearchedUrl = '';
      removeGoofishCard();
    }
  });
}

// Aciona a Inteligência para injetar o Preview Card
function handleGoofishUrl(url, inputElement) {
  // Encontrar o contâiner visual onde a caixa de busca reside
  const flexContainer = inputElement.closest('.flex.gap-3.mb-6') || inputElement.parentNode.parentNode;
  if (!flexContainer) return;

  removeGoofishCard();

  const cardId = 'evo-goofish-card';
  const card = document.createElement('div');
  card.id = cardId;
  card.className = 'p-4 rounded-xl mb-4 transition-all duration-300';

  // Estética requisitada para encaixar perfeitamente com a UI da Vercel Dark
  card.style.background = 'rgb(31, 41, 55)';
  card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  card.style.boxShadow = 'var(--shadow-soft, 0 4px 6px -1px rgba(0, 0, 0, 0.1))';
  card.style.color = 'white';

  // Design Exato do Loading Status de Skeleton Blocks em CSS do tailwind embutido
  card.innerHTML = `
    <div class="flex flex-col items-center justify-center p-6 gap-3 pt-8 pb-8">
      <svg class="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <div class="text-blue-400 font-medium text-sm">
        Checando informações do Vendedor
      </div>
    </div>
  `;

  // Insere imediatamente acima da div flexContainer da SearchBox
  flexContainer.parentNode.insertBefore(card, flexContainer);

  // Solicitar ao nosso espião Background Worker que puxe os dados do Goofish
  chrome.runtime.sendMessage({ action: 'FETCH_GOOFISH', url: url }, (response) => {
    if (!response || !response.success) {
      card.innerHTML = '<div class="text-red-400 font-medium p-2">Erro na tentativa de carregar informações do Goofish. A URL pode ser inválida, bloqueada por login, ou a conexão falhou.</div>';
      return;
    }

    // Aqui não precisamos mais usar DOMParser porque a mecânica Phantom Tab do background 
    // já nos devolve o objeto JSON certinho com as variáveis raspadas por JavaScript do outro lado!
    const dados = response.data;

    const avatarUrl = dados.avatar || '';
    const name = dados.name || 'Vendedor Restrito do Goofish';
    const levelUrl = dados.level || '';
    const location = dados.location || 'Localização Desconhecida';
    const desc = dados.desc || 'O vendedor não informou nenhuma descrição visível publicamente no perfil.';
    const products = dados.products || '';
    const reviews = dados.reviews || '';

    // Normalização das Imagens AliCdn pois costumam vir omitindo protocolo em "//img.alicdn"
    const safeAvatarUrl = avatarUrl.startsWith('//') ? 'https:' + avatarUrl : avatarUrl;
    const safeLevelUrl = levelUrl.startsWith('//') ? 'https:' + levelUrl : levelUrl;

    // Obriga propositalmente a respeitar os 2seg (ou mais, dependendo do Scraping) para o show off
    setTimeout(() => {
      // Função conversora inteligente para interpretar W (Dez Mil chinês), e converter pra "K" (Milhares)
      const formatSocialNumber = (str) => {
        if (!str || str === '-') return '-';
        // Adicionado o suporte a "," na Regex, pois o Google Translate injeta vírgulas brasileiras! (1.9w -> 1,9w)
        let match = str.match(/([0-9.,]+)([wWkKmM]?)/);
        if (!match) return '-';

        // Substitui a vírgula do tradutor antes de usar a Matemática do JavaScript (que só entende ponto)
        let cleanNumber = match[1].replace(',', '.');
        let num = parseFloat(cleanNumber);
        let suffix = match[2].toLowerCase();

        // No chinês, 1w (wàn) = 10.000. Então 1.9w * 10 = 19K (milhares em inglês/universal)
        if (suffix === 'w') {
          num = num * 10;
          suffix = 'k';
        }

        num = Number.isInteger(num) ? num : parseFloat(num.toFixed(1));
        if (suffix === 'k') return num + 'K';
        if (suffix === 'm') return num + 'M';
        return num.toString();
      };

      // O Google Tradutor frequentemente injeta espaços sem querer, ex: "1.9w" => "1, 9 w".
      // Vamos higienizar a string tirando TODOS os espaços antes de extrair com Regex!
      const safeFollowers = dados.followers ? dados.followers.replace(/\\s+/g, '') : '';
      const safeProducts = products ? products.replace(/\\s+/g, '') : '';
      const safeReviews = reviews ? reviews.replace(/\\s+/g, '') : '';

      // As regex pescam a vírgula [0-9.,] colada no numeral e multiplicador
      const extractedFoll = safeFollowers.match(/[0-9.,]+[wWkKmM]?/) ? safeFollowers.match(/[0-9.,]+[wWkKmM]?/)[0] : '-';
      const extractedProd = safeProducts.match(/[0-9.,]+[wWkKmM]?/) ? safeProducts.match(/[0-9.,]+[wWkKmM]?/)[0] : '-';
      const extractedRev = safeReviews.match(/[0-9.,]+[wWkKmM]?/) ? safeReviews.match(/[0-9.,]+[wWkKmM]?/)[0] : '-';

      const nFollowers = formatSocialNumber(extractedFoll);
      const nProducts = formatSocialNumber(extractedProd);
      const nReviews = formatSocialNumber(extractedRev);

      let finalUI = `
        <!-- Capa / Banner Premium envelopando todo o Cabeçalho Inicial -->
        <div class="relative w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-xl p-4">
          <!-- Selo Flutuante Top/Right Absoluto -->
          ${safeLevelUrl ? '<img src="' + safeLevelUrl + '" style="position: absolute; top: 16px; right: 16px; height: 22px; width: auto; object-fit: contain;" />' : ''}
          
          <div class="flex items-start gap-6">
            
            <!-- Avatar com Borda Degradê Dourada -->
            <div class="flex flex-col items-center flex-shrink-0 gap-2">
              <div class="rounded-2xl p-1" style="background: linear-gradient(135deg, #FACC15 0%, #F59E0B 100%); box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
                ${safeAvatarUrl
          ? '<img src="' + safeAvatarUrl + '" alt="Avatar" class="rounded-xl" style="width: 136px; height: 136px; object-fit: cover;">'
          : '<div class="rounded-xl flex items-center justify-center text-4xl" style="width: 136px; height: 136px; background: rgb(17, 24, 39);">👤</div>'}
              </div>
            </div>
            
            <!-- Cabeçalho Principal -->
            <div class="flex flex-col flex-1 pt-1 relative">
              <!-- Container exclusivo e contido para o Nomge para forçar a quebra rápida -->
              <div class="flex items-center mb-1" style="max-width: 75%; min-height: 28px;">
                <h3 class="text-lg font-extrabold tracking-tight text-white m-0 line-clamp-2" style="line-height: 1.2; word-break: break-word;">
                  ${name}
                </h3>
              </div>
              
              <div class="mt-1.5">
                <p class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 text-[11px] font-bold uppercase tracking-widest border border-white/5" style="box-shadow: 0 2px 4px rgba(0,0,0,0.3); width: max-content;">
                  <span style="font-size: 11px;">📍</span> ${location}
                </p>
              </div>

              <!-- Divisor e Stats Line (Estilo Twitter) -->
              <div class="flex items-center gap-6 mt-4 pt-4 border-t" style="border-color: rgba(255,255,255,0.06);">
                <div class="flex flex-col">
                  <span class="text-xl font-black text-white leading-none">👤 ${nFollowers}</span>
                  <span class="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">Seguidores</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xl font-black text-white leading-none">📦 ${nProducts}</span>
                  <span class="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">Itens à Venda</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xl font-black text-white leading-none">👍 ${nReviews}</span>
                  <span class="text-[10px] text-gray-400 uppercase tracking-widest mt-1.5 font-bold">Reviews Positivos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Descrição / Bio fora do Banner Premium -->
        <div class="px-1 pb-1">
          ${desc ? `
          <div class="mt-3 rounded-xl p-4" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.03);">
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Descrição do Vendedor</div>
            <div class="text-[13px]" style="color: #D1D5DB; line-height: 1.7; word-break: break-word;">
              ${desc}
            </div>
          </div>` : ''}
        </div>
      `;
      // Pra garantir que a div pai comporte a 'capa' absolute sem transbordar
      card.style.position = 'relative';
      card.style.overflow = 'hidden';
      card.innerHTML = finalUI;
    }, 2000);
  });
}

function removeGoofishCard() {
  const existingCard = document.getElementById('evo-goofish-card');
  if (existingCard) {
    existingCard.remove();
  }
}

// Em caso do script ligar quando as caixas já estavam carregadas (Inicalização)
setupGoofishSearchListener();
