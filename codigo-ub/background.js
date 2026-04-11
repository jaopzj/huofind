chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_GOOFISH') {
    // O Goofish é um site Single Page Application (Client-Side Rendered),
    // o que significa que o 'fetch' tradicional retorna apenas o código vazio sem a DOM montada.
    // A solução avançada é abrir uma aba desativada no Chrome do usuário, rodar o JavaScript da aba,
    // fazer o Scraping dos dados e fechar a aba silenciosamente sem interromper a navegação principal.

    chrome.tabs.create({ url: request.url, active: false }, (tab) => {
      const tabId = tab.id;
      let attempts = 0;
      const maxAttempts = 15; // Máximo de tempo de espera: ~15 segundos pra página carregar
      
      const checkDOM = () => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            // Este código roda DENTRO da aba do Goofish!
            // Usamos o 'nome' como âncora: se ele não existe, a página nem carregou ainda
            const name = document.querySelector('.nick--sP8UifWP');
            if (!name) return null;

            // Extrai a contagem de produtos à venda antes de trocar de aba!
            if (!window._gfExtractedProducts) {
               const prodTabs = document.querySelectorAll('.tabItem--HiFOTMcp');
               if (prodTabs && prodTabs.length > 0) {
                  // O Goofish contém 3 guias com a exata mesma classe: "Todos" | "À Venda" | "Vendidos". 
                  // Convertemos em array e caçamos a guia exata que contenha o texto chinês de "À Venda" (在售), 
                  // ou pegamos a do meio caso o texto mude no futuro!
                  const targetProd = Array.from(prodTabs).find(t => t.textContent.includes('在售')) || prodTabs[1] || prodTabs[0];
                  window._gfExtractedProducts = targetProd.innerText.trim();
               } else {
                  // No React, a grid de produtos demora um pouco mais que o nome para renderizar.
                  // Precisamos abortar e esperar 1 segundo antes de clicar na aba de Avaliações, 
                  // se não a DOM original será destruída sem rasparmos os Produtos!
                  window._gfProdWait = (window._gfProdWait || 0) + 1;
                  if (window._gfProdWait < 5) return null;
               }
            }

            // A aba de "Crédito e avaliação" fica escondida. Precisamos clicar nela primeiro!
            if (!window._gfClickedReviewTab) {
               // A classe textShadow--FlVQQmey são os títulos das abas. A aba de reviews é a segunda.
               const tabHeaders = document.querySelectorAll('.textShadow--FlVQQmey');
               if (tabHeaders.length > 0) {
                  // Clica na última aba encontrada (geralmente é "Avaliações" em oposição a "Bens")
                  const reviewTab = tabHeaders.length > 1 ? tabHeaders[1] : tabHeaders[0];
                  reviewTab.click();
                  window._gfClickedReviewTab = true;
                  return null; // Força retorno nulo para o script esperar +1s pela re-renderização
               }
            }

            // Procura o elemento de avaliações AGORA que o clique aconteceu e a DOM mudou
            const reviewTabs = document.querySelectorAll('.tabItem--Rc38fjYm');
            let reviews = null;
            if (reviewTabs && reviewTabs.length > 0) {
               // A aba possui os filtros: "Todos | Com Foto | Positivos | Compradores | Vendedores". 
               // Isolamos os "Positivos" (好评) igual fizemos nos Produtos
               reviews = Array.from(reviewTabs).find(t => t.textContent.includes('好评')) || reviewTabs[2] || reviewTabs[0];
            } else if (window._gfExtraWait !== true) {
               window._gfExtraWait = true;
               return null; // Dá mais 1 segundinho de "choro" pra conexão lenta
            }

            // Fim da linha: Coleta todo o resto do site!
            const avatar = document.querySelector('.avatar--IswHbxD9');
            const level = document.querySelector('.levelIcon--x9YcHlL5');
            const desc = document.querySelector('.bottom--eUkWZRHp');
            const infos = document.querySelectorAll('.infoCenterText--oYf75roe');
            let infoArray = [];
            infos.forEach(el => infoArray.push(el.textContent.trim()));

            return {
               avatar: avatar ? avatar.src : '',
               name: name.textContent.trim(),
               level: level ? level.src : '',
               infoArray: infoArray,
               desc: desc ? desc.innerText.trim() : '', // Usa innerText pra limpar tags indesejadas antes de traduzir
               products: window._gfExtractedProducts || '',
               reviews: reviews ? reviews.innerText.trim() : ''
            };
          }
        }, (results) => {
          // Trata erros de caso a guia tenha sido fechada no meio do processo
          if (chrome.runtime.lastError) {
             console.error(chrome.runtime.lastError);
             sendResponse({ success: false, error: 'A aba foi fechada ou houve erro de script.' });
             return;
          }

          if (results && results[0] && results[0].result) {
            // Sucesso! A página carregou, o script retornou dados, vamos fechar a aba silenciosa
            chrome.tabs.remove(tabId).catch(()=>{});
            const data = results[0].result;
            
            // Função async interna para traduzir do Chinês com o Google Translate Cloud
            const translateZhToPt = async (text) => {
              if (!text) return text;
              try {
                const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=pt&dt=t&q=' + encodeURIComponent(text));
                const json = await res.json();
                let txt = '';
                if (json && json[0]) {
                  for (let part of json[0]) {
                    if (part[0]) txt += part[0];
                  }
                }
                return txt || text;
              } catch(e) {
                return text; // Fallback pra chinês se a requisição falhar
              }
            };

            // Descobre o que é Location e o que é Seguidores
            let rawLocation = '';
            let rawFollowers = '';
            
            if (data.infoArray && data.infoArray.length > 0) {
               // A seção infoCenter possui 3 tags aglutinadas sob a mesma classe:
               // 1. "Localização", 2. "Seguidores (粉丝)", e 3. "Seguindo (关注)".
               
               // Isolamos ativamente a tag que contenha o texto "Seguidores" em Chinês.
               const followersObj = data.infoArray.find(t => t.includes('粉丝'));
               if (followersObj) {
                  rawFollowers = followersObj;
               } else {
                  // Fallback: Caça a primeira tag que tenha número, EXCLUINDO "Seguindo", para evitar sobrescrita!
                  rawFollowers = data.infoArray.find(t => /\d/.test(t) && !t.includes('关注')) || '';
               }
               
               // E a tag sem nenhum número deduzimos tratar-se da Província (Localização)
               rawLocation = data.infoArray.find(t => !/\d/.test(t)) || '';
            }

            // Dispara as traduções em paralelo APENAS para os campos de texto.
            // As métricas (Seguidores, Vendas, Revisões) NUNCA devem ser traduzidas 
            // pois o Google Tradutor apaga a preciosa letra "w" (que significa Myriad/10k) da frase!
            Promise.all([
               translateZhToPt(data.name),
               translateZhToPt(rawLocation),
               translateZhToPt(data.desc)
            ]).then(([tName, tLoc, tDesc]) => {
               data.name = tName;
               data.location = tLoc;
               // Estes seguem imaculados (ex: "1.9w粉丝") pro content.js que possui RegEx forte pra extraí-los.
               data.followers = rawFollowers;
               
               // Converte as quebras de linha textuais (\n) em quebra HTML <br> para padronizar UI
               data.desc = (tDesc || '').replace(/\n/g, '<br/>');
               
               // Devolve a respsota completa e em PT-BR para o site huofind
               sendResponse({ success: true, data: data });
            });
          } else {
            // A página ainda está carregando no loop do React/Vue do Goofish. Vamos testar dnv:
            attempts++;
            if (attempts >= maxAttempts) {
              chrome.tabs.remove(tabId).catch(()=>{}); // Desiste, fecha a aba e avisa que expirou
              sendResponse({ success: false, error: 'Tempo limite esgotado esperando o carregamento do Goofish.' });
            } else {
              setTimeout(checkDOM, 1000); // Tenta de novo em 1 segundo
            }
          }
        });
      };
      
      // Espera 1,5s após iniciar a aba para disparar a primeira verificação de DOM
      setTimeout(checkDOM, 1500);
    });

    // Mantém o canal de Promise assíncrono conectado enquanto não damos sendResponse
    return true; 
  }
});

// Interceptador Global Nível Navegador (O "Martelo" Final)
// Independentemente de como o Huofind abrir o link (via React, Window.Open, Redirecionamento 302 de API),
// no milissegundo que uma aba TENTAR carregar um produto hoobuy, isto intercepta DEPOIS que o clique saiu do site.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      if (url.hostname.includes('hoobuy.com') && url.pathname.includes('/product/')) {
        // Checa se é o inviteCode isolado sem os parametros do Google
        if (url.searchParams.has('inviteCode') && !url.searchParams.has('utm_source')) {
          
          const parts = url.pathname.split('/').filter(Boolean);
          const productId = parts[parts.length - 1]; 
          // Parts é um array ['product', '2', '7473724598']. O ultimo sempre é o ID!

          if (productId) {
            // Construção HARDCODED e agressiva para garantir a ordem exata imposta pelo usuário
            const finalUrl = `${url.origin}${url.pathname}?utm_source=website&utm_medium=share&utm_campaign=product_details&utm_content=${productId}&inviteCode=6EDjePGR`;
            
            // Força a aba atual a mudar o rumo estaticamente ANTES dela renderizar
            chrome.tabs.update(tabId, { url: finalUrl });
          }
        }
      }
    } catch(e) {}
  }
});
