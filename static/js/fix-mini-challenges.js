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
    
    // Adicionar estilos inline para garantir consistência
    applyConsistentStyles();
    
    // Limpar listas vazias
    cleanupEmptyLists();
    
    console.log("fixMiniChallenges concluído");
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
    
    return null;
}

// Aplicar estilos consistentes a todos os elementos
function applyConsistentStyles() {
    // Estilizar todos os mini-desafios
    document.querySelectorAll('.mini-challenge, li:has(.mini-desafio)').forEach(item => {
        item.style.color = '#17a2b8';
        item.style.fontSize = '0.95em';
        item.style.position = 'relative';
    });
    
    // Estilizar todas as conquistas que têm mini-desafios
    document.querySelectorAll('.has-mini-challenge > strong, .conquest-item.has-mini-challenge > strong').forEach(title => {
        title.style.color = '#28a745';
    });
    
    // Garantir que os marcadores de mini-desafio estejam estilizados
    document.querySelectorAll('.mini-desafio').forEach(span => {
        span.style.color = '#17a2b8';
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
