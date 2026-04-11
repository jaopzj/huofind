document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');

  // Carrega o estado atual da extensão ao abrir o popup
  chrome.storage.sync.get(['isActive'], (result) => {
    // true é o padrão se nada foi definido ainda
    const isActive = result.isActive !== false;
    toggleSwitch.checked = isActive;
    updateVisuals(isActive);
  });

  // Salva no storage do Chrome sempre que liga ou desliga
  toggleSwitch.addEventListener('change', () => {
    const isActive = toggleSwitch.checked;
    chrome.storage.sync.set({ isActive: isActive }, () => {
      updateVisuals(isActive);
    });
  });

  // Atualiza as cores e o texto
  function updateVisuals(isActive) {
    if (isActive) {
      statusText.textContent = 'Ativado';
      statusText.style.color = '#0696d9';
    } else {
      statusText.textContent = 'Desativado';
      statusText.style.color = '#999999';
    }
  }
});
