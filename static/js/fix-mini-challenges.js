/**
 * Script para corrigir a hierarquia dos mini-desafios no HTML gerado
 */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(fixMiniChallenges, 100); // Pequeno delay para garantir que o DOM está pronto
});

function fixMiniChallenges() {
    console.log("Executando fixMiniChallenges");
    
    // Identificar todas as conquistas primeiro
    document.querySelectorAll('li strong, li .conquest-marker').forEach(element => {
        if (element.textContent.includes('Conquista:')) {
            const conquestItem = element.closest('li');
            if (conquestItem) {
                conquestItem.classList.add('conquest-item');
                conquestItem.dataset.processed = 'true';
            }
        }
    });
    
    // Identificar todos os mini-desafios
    let miniChallenges = [];
    document.querySelectorAll('li em, li .mini-desafio, span.mini-desafio').forEach(element => {
        if (element.textContent.includes('Mini-desafio:')) {
            const challengeItem = element.closest('li');
            if (challengeItem && !challengeItem.classList.contains('conquest-item')) {
                challengeItem.classList.add('mini-challenge');
                miniChallenges.push(challengeItem);
                challengeItem.dataset.processed = 'true';
            }
        }
    });
    
    // Procurar por mini-desafios com a marcação ↳
    document.querySelectorAll('li').forEach(item => {
        if (item.textContent.includes('↳') && 
            item.textContent.includes('Mini-desafio:') && 
            !item.classList.contains('mini-challenge') &&
            !item.classList.contains('conquest-item')) {
            item.classList.add('mini-challenge');
            miniChallenges.push(item);
            item.dataset.processed = 'true';
        }
    });
    
    // Segunda passagem - organizar mini-desafios sob suas conquistas
    miniChallenges.forEach(challenge => {
        // Já está em uma mini-challenges-list?
        if (challenge.parentNode.classList.contains('mini-challenges-list')) {
            // Nada a fazer, já está corretamente aninhado
            return;
        }
        
        // Encontrar a conquista anterior
        let conquestItem = findPreviousConquestItem(challenge);
        
        if (conquestItem) {
            // Marcar a conquista
            conquestItem.classList.add('has-mini-challenge');
            
            // Criar ou encontrar a sublista para mini-desafios
            let sublist = conquestItem.querySelector('ul.mini-challenges-list');
            if (!sublist) {
                sublist = document.createElement('ul');
                sublist.className = 'mini-challenges-list';
                
                // Inserir após qualquer conteúdo existente na conquista
                conquestItem.appendChild(sublist);
            }
            
            // Mover o mini-desafio para a sublista
            sublist.appendChild(challenge);
        }
    });
    
    // Garantir que todas as conquistas com mini-desafios tenham a classe correta
    document.querySelectorAll('.mini-challenges-list').forEach(list => {
        const parentItem = list.parentNode;
        if (parentItem.tagName === 'LI') {
            parentItem.classList.add('has-mini-challenge');
        }
    });
    
    // Aplicar estilos aos cabeçalhos especiais
    applyHeaderStyles();
    
    // Adicionar estilos inline para garantir consistência
    applyConsistentStyles();
    
    // Limpar listas vazias
    cleanupEmptyLists();
    
    console.log("fixMiniChallenges concluído");
}

// Aplicar estilos aos cabeçalhos especiais
function applyHeaderStyles() {
    document.querySelectorAll('h2').forEach(heading => {
        const headingText = heading.textContent.trim();
        
        // Lista de cabeçalhos especiais que devem receber a mesma formatação
        const specialHeadings = [
            'Por Onde Começar?',
            'O Que Você Vai Construir:',
            'Kit Ferramentas Incluso:',
            'Primeiro Passo Imediato:'
        ];
        
        if (specialHeadings.some(title => headingText.includes(title))) {
            // Aplicar a classe section-heading
            heading.classList.add('section-heading');
            
            // Aplicar estilos inline para garantir consistência
            heading.style.fontFamily = "'Exo 2', sans-serif";
            heading.style.fontWeight = "700";
            heading.style.color = "var(--text-color)";
            heading.style.marginTop = "1.5rem";
            heading.style.marginBottom = "1rem";
            heading.style.paddingBottom = "0.5rem";
            heading.style.borderBottom = "2px solid var(--primary-color)";
        }
    });
}

// Encontra o item de conquista anterior para um mini-desafio
function findPreviousConquestItem(miniChallengeItem) {
    // Casos base
    if (!miniChallengeItem) return null;
    
    // Verificar se está em uma lista de desafios
    if (miniChallengeItem.parentNode.classList.contains('mini-challenges-list')) {
        return miniChallengeItem.parentNode.parentNode;
    }
    
    // Buscar para trás no DOM
    let currentNode = miniChallengeItem.previousElementSibling;
    while (currentNode) {
        if (currentNode.classList.contains('conquest-item')) {
            return currentNode;
        }
        currentNode = currentNode.previousElementSibling;
    }
    
    // Verificar listas anteriores
    let currentList = miniChallengeItem.closest('ul');
    if (!currentList) return null;
    
    // Buscar na lista anterior
    let previousList = currentList.previousElementSibling;
    while (previousList) {
        if (previousList.tagName === 'UL') {
            // Buscar das últimas para as primeiras conquistas na lista
            const conquests = previousList.querySelectorAll('.conquest-item');
            if (conquests.length > 0) {
                return conquests[conquests.length - 1];
            }
        } else if (previousList.classList.contains('conquest-item')) {
            return previousList;
        }
        previousList = previousList.previousElementSibling;
    }
    
    // Buscar no elemento pai
    let parentElement = currentList.parentNode;
    if (parentElement && parentElement.classList.contains('conquest-item')) {
        return parentElement;
    }
    
    // Se o mini-desafio está em uma lista isolada logo após uma fase
    const previousSibling = miniChallengeItem.parentNode.previousElementSibling;
    if (previousSibling && previousSibling.tagName === 'DIV') {
        const firstConquest = previousSibling.querySelector('.conquest-item');
        if (firstConquest) {
            return firstConquest;
        }
    }
    
    return null;
}

// Aplicar estilos consistentes a todos os elementos
function applyConsistentStyles() {
    // Estilizar todos os mini-desafios
    document.querySelectorAll('.mini-challenge, li:has(.mini-desafio)').forEach(item => {
        item.style.color = '#17a2b8';
        item.style.fontSize = '0.95em';
        item.style.position = 'relative';
        
        // Corrigir setas duplicadas no texto
        const text = item.innerHTML;
        if (text.includes('↳ ↳')) {
            item.innerHTML = text.replace('↳ ↳', '↳');
        }
        
        // Corrigir spans aninhados com setas duplicadas
        const nestedSpans = item.querySelectorAll('span.mini-desafio span.mini-desafio');
        if (nestedSpans.length > 0) {
            nestedSpans.forEach(nestedSpan => {
                // Obter o conteúdo do span interno
                const innerContent = nestedSpan.innerHTML;
                // Substituir o span aninhado pelo seu conteúdo
                nestedSpan.outerHTML = innerContent;
            });
        }
    });
    
    // Buscar por qualquer ocorrência remanescente de setas duplicadas
    document.querySelectorAll('span.mini-desafio').forEach(span => {
        // Verificar se o conteúdo contém setas duplicadas
        if (span.innerHTML.includes('↳ ↳') || span.innerHTML.includes('↳ <em>↳')) {
            span.innerHTML = span.innerHTML.replace(/↳\s*<em>?↳/g, '↳');
        }
        
        // Garantir que a cor seja aplicada
        span.style.color = '#17a2b8';
    });
    
    // Estilizar todas as conquistas que têm mini-desafios
    document.querySelectorAll('.has-mini-challenge > strong, .conquest-item.has-mini-challenge > strong').forEach(title => {
        title.style.color = '#28a745';
    });
    
    // Garantir que os marcadores de mini-desafio estejam estilizados
    document.querySelectorAll('.mini-desafio').forEach(span => {
        span.style.color = '#17a2b8';
    });
    
    // Garantir que todos os mini-desafios da primeira conquista tenham os estilos corretos
    document.querySelectorAll('ul:not(.mini-challenges-list) > li.mini-challenge').forEach(challenge => {
        if (isFirstConquestChallenge(challenge)) {
            const previousElement = challenge.parentNode.previousElementSibling;
            if (previousElement) {
                const firstConquest = previousElement.querySelector('.conquest-item');
                if (firstConquest && !firstConquest.querySelector('.mini-challenges-list')) {
                    // Criar nova lista de mini-desafios
                    const miniChallengesList = document.createElement('ul');
                    miniChallengesList.className = 'mini-challenges-list';
                    miniChallengesList.style.listStyleType = 'none';
                    miniChallengesList.style.paddingLeft = '1.5rem';
                    miniChallengesList.style.marginTop = '0.5rem';
                    miniChallengesList.style.marginBottom = '0.75rem';
                    
                    // Mover o mini-desafio para a nova lista
                    miniChallengesList.appendChild(challenge.cloneNode(true));
                    firstConquest.appendChild(miniChallengesList);
                    
                    // Marcar a conquista
                    firstConquest.classList.add('has-mini-challenge');
                    
                    // Ocultar o mini-desafio original
                    challenge.style.display = 'none';
                }
            }
        }
    });
}

// Limpar listas vazias
function cleanupEmptyLists() {
    document.querySelectorAll('ul').forEach(list => {
        if (list.children.length === 0) {
            list.remove();
        }
    });
}

// Adicionar função para verificar se um mini-desafio pertence à primeira conquista
function isFirstConquestChallenge(miniChallenge) {
    // Verificar se o mini-desafio está em uma lista isolada logo após uma fase
    const parentList = miniChallenge.closest('ul');
    if (!parentList) return false;
    
    const previousElement = parentList.previousElementSibling;
    if (!previousElement) return false;
    
    // Verificar se o elemento anterior é uma div contendo uma fase
    if (previousElement.tagName === 'DIV' && 
        previousElement.querySelector('p strong') && 
        previousElement.querySelector('p strong').textContent.includes('Fase')) {
        return true;
    }
    
    return false;
}
