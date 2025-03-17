// Mostrar aviso para muitas partes
document.addEventListener('DOMContentLoaded', function() {
    // Configurar o listener para o número de partes
    const numPartesInput = document.querySelector('input[name="num_partes"]');
    if (numPartesInput) {
        numPartesInput.addEventListener('change', function() {
            var numPartes = parseInt(this.value);
            var warning = document.getElementById('parts-warning');
            
            if (numPartes > 10) {
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        });
    }

    // Verificar se temos resultado HTML para processar
    const htmlContent = document.getElementById('html-content');
    if (htmlContent) {
        // Mostrar o fallback diretamente
        document.getElementById('fallback-content').style.display = 'block';
        
        // Adicionar um timeout para processar os cards em segundo plano
        setTimeout(function() {
            try {
                // Criar um elemento temporário com o conteúdo HTML
                const tempDiv = document.createElement('div');
                tempDiv.className = 'formatted-content';
                tempDiv.innerHTML = htmlContent.innerHTML;
                document.body.appendChild(tempDiv);
                
                // Agora que temos o elemento formatado, podemos tentar gerar os cards
                parseContentIntoCards();
                createTableOfContents();
                
                // Verificar se os cards foram criados
                if (document.querySelectorAll('.chunk-card').length > 0) {
                    // Cards criados com sucesso, podemos esconder o fallback
                    document.getElementById('fallback-content').style.display = 'none';
                    
                    // Inicializar Masonry após os cards serem criados
                    initMasonry();
                }
                
                // Remover o elemento temporário
                setTimeout(() => document.body.removeChild(tempDiv), 100);
                
            } catch (error) {
                console.error("Erro ao processar conteúdo:", error);
            }
        }, 500);
    }
});

// Função para alternar a visibilidade do índice
function toggleToc() {
    const tocContainer = document.querySelector('#table-of-contents .toc-container');
    const tocToggleText = document.getElementById('toc-toggle-text');
    
    if (tocContainer.style.display === 'none') {
        tocContainer.style.display = 'block';
        tocToggleText.textContent = 'Ocultar';
    } else {
        tocContainer.style.display = 'none';
        tocToggleText.textContent = 'Mostrar';
    }
}

// Função para expandir/recolher cards
function toggleCardExpansion(cardId) {
    const card = document.getElementById(cardId);
    const cardBody = card.querySelector('.card-body');
    const expandBtn = card.querySelector('.expand-button');
    
    if (cardBody.classList.contains('collapsed')) {
        cardBody.classList.remove('collapsed');
        expandBtn.textContent = 'Mostrar menos';
    } else {
        cardBody.classList.add('collapsed');
        expandBtn.textContent = 'Mostrar mais';
    }
    
    // Atualizar layout do Masonry
    if (window.msnry) {
        setTimeout(() => window.msnry.layout(), 100);
    }
}

// Função para expandir e recolher o conteúdo de fallback
function toggleFallbackContent() {
    var content = document.querySelector('.formatted-content-visible');
    if (content.style.maxHeight === 'none') {
        content.style.maxHeight = '500px';
    } else {
        content.style.maxHeight = 'none';
    }
}

function parseContentIntoCards() {
    const content = document.querySelector('.formatted-content');
    
    if (!content || !content.innerHTML) {
        return;
    }
    
    const cardsContainer = document.getElementById('cards-container');
    
    // Extrair o título principal (h1)
    const mainTitle = content.querySelector('h1');
    let mainTitleText = mainTitle ? mainTitle.textContent : 'ChunkMaster';
    
    // Encontrar todas as seções h2
    const sections = content.querySelectorAll('h2');
    
    // Adicionar o divisor de seção para INTRODUÇÃO
    const introDivider = document.createElement('div');
    introDivider.className = 'w-100 section-block';
    introDivider.innerHTML = `
        <div class="section-divider">
            <span class="section-label">INTRODUÇÃO</span>
        </div>
    `;
    cardsContainer.appendChild(introDivider);
    
    // Variáveis para armazenar partes separadas da introdução
    let contextualizacaoHtml = '';
    let objetivosHtml = '';
    let introSections = [];
    
    // Capturar o conteúdo antes da primeira parte, que deve incluir Contextualização e Objetivos
    let capturedIntroduction = false;
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Verificar se esta seção faz parte da introdução (antes de começar as partes)
        if (!section.textContent.toLowerCase().includes('parte')) {
            // Adicionar à seção correspondente com base no título
            introSections.push(section);
            
            if (section.textContent.toLowerCase().includes('contextualização') || 
                section.textContent.toLowerCase().includes('contextualizacao')) {
                contextualizacaoHtml += section.outerHTML;
                
                // Adicionar todo conteúdo até o próximo h2 ou até "objetivos"
                let nextNode = section.nextElementSibling;
                while (nextNode && 
                      nextNode.tagName !== 'H2' && 
                      (!nextNode.textContent || !nextNode.textContent.toLowerCase().includes('objetivo'))) {
                    contextualizacaoHtml += nextNode.outerHTML;
                    nextNode = nextNode.nextElementSibling;
                }
            } 
            else if (section.textContent.toLowerCase().includes('objetivo')) {
                objetivosHtml += section.outerHTML;
                
                // Adicionar todo conteúdo até o próximo h2
                let nextNode = section.nextElementSibling;
                while (nextNode && nextNode.tagName !== 'H2') {
                    objetivosHtml += nextNode.outerHTML;
                    nextNode = nextNode.nextElementSibling;
                }
            }
            
            capturedIntroduction = true;
        } else {
            // Quando chegamos à primeira parte, paramos de capturar a introdução
            break;
        }
    }
    
    // Se não encontramos nenhuma seção introdutória mas temos conteúdo antes da primeira parte
    // (caso o modelo não tenha usado h2 para Contextualização), capturar manualmente
    if (!capturedIntroduction && mainTitle) {
        let nextNode = mainTitle.nextElementSibling;
        let foundObjetivos = false;
        
        while (nextNode && !nextNode.textContent.toLowerCase().includes('parte')) {
            if (nextNode.tagName !== 'H2') {
                // Verificar se este nó contém a palavra "objetivos"
                if (!foundObjetivos && nextNode.textContent && 
                    nextNode.textContent.toLowerCase().includes('objetivo')) {
                    foundObjetivos = true;
                }
                
                // Adicionar ao html correspondente
                if (foundObjetivos) {
                    objetivosHtml += nextNode.outerHTML;
                } else {
                    contextualizacaoHtml += nextNode.outerHTML;
                }
            }
            nextNode = nextNode.nextElementSibling;
        }
    }
    
    // Criar card para Contextualização
    if (contextualizacaoHtml) {
        const contextualizacaoCard = document.createElement('div');
        contextualizacaoCard.className = 'chunk-card context-card';
        contextualizacaoCard.id = 'card-contextualizacao';
        contextualizacaoCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-purple text-white">
                    <h3 class="card-title mb-0">Contextualização</h3>
                </div>
                <div class="card-body collapsed">
                    ${contextualizacaoHtml}
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-purple expand-button" onclick="toggleCardExpansion('card-contextualizacao')">Mostrar mais</button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(contextualizacaoCard);
    }
    
    // Criar card para Objetivos Gerais
    if (objetivosHtml) {
        const objetivosCard = document.createElement('div');
        objetivosCard.className = 'chunk-card context-card';
        objetivosCard.id = 'card-objetivos';
        objetivosCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-info text-white">
                    <h3 class="card-title mb-0">Objetivos Gerais de Aprendizado</h3>
                </div>
                <div class="card-body collapsed">
                    ${objetivosHtml}
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-info expand-button" onclick="toggleCardExpansion('card-objetivos')">Mostrar mais</button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(objetivosCard);
    }
    
    // Encontrar e criar cards para cada parte
    let parts = [];
    let currentPart = null;
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        if (section.textContent.toLowerCase().includes('parte')) {
            if (currentPart) {
                parts.push(currentPart);
            }
            
            // Iniciar uma nova parte
            currentPart = {
                title: section.textContent,
                content: '',
                html: section.outerHTML,
                size: 'medium' // Tamanho padrão
            };
            
            // Determinar o tamanho do card com base no conteúdo
            let nextNode = section.nextElementSibling;
            let contentLength = 0;
            
            while (nextNode && nextNode.tagName !== 'H2') {
                contentLength += (nextNode.textContent || '').length;
                nextNode = nextNode.nextElementSibling;
            }
            
            // Definir tamanho com base no comprimento do conteúdo
            if (contentLength > 1000) {
                currentPart.size = 'large';
            } else if (contentLength < 400) {
                currentPart.size = 'small';
            }
            
        } else if (section.textContent.toLowerCase().includes('conclusão')) {
            // Quando encontramos a conclusão, finalizamos a parte atual
            if (currentPart) {
                parts.push(currentPart);
            }
            break;
        } else if (currentPart && !introSections.includes(section)) {
            // Adicione esta seção à parte atual se não for uma seção de introdução
            currentPart.html += section.outerHTML;
        }
        
        // Para a parte atual, adicione também os elementos que seguem até o próximo h2
        if (currentPart) {
            let nextNode = section.nextElementSibling;
            while (nextNode && nextNode.tagName !== 'H2') {
                if (section.textContent.toLowerCase().includes('parte')) {
                    currentPart.html += nextNode.outerHTML;
                    
                    // Extrair objetivos e conceitos-chave
                    if (nextNode.innerHTML && nextNode.innerHTML.includes('<strong>Objetivo de Aprendizagem:</strong>')) {
                        currentPart.objective = nextNode.innerHTML.replace('<strong>Objetivo de Aprendizagem:</strong>', '').trim();
                    }
                    if (nextNode.innerHTML && nextNode.innerHTML.includes('<strong>Conceitos-chave:</strong>')) {
                        currentPart.concepts = nextNode.innerHTML.replace('<strong>Conceitos-chave:</strong>', '').trim();
                    }
                    if (nextNode.innerHTML && nextNode.innerHTML.includes('<strong>Pergunta de Reflexão:</strong>')) {
                        currentPart.question = nextNode.innerHTML.replace('<strong>Pergunta de Reflexão:</strong>', '').trim();
                    }
                }
                nextNode = nextNode.nextElementSibling;
            }
        }
    }
    
    // Adicionar a última parte se existir
    if (currentPart) {
        parts.push(currentPart);
    }
    
    // Antes de adicionar os cards de partes, adicionar um divisor de seção
    if (parts.length > 0) {
        const partsDivider = document.createElement('div');
        partsDivider.className = 'w-100 section-block';
        partsDivider.innerHTML = `
            <div class="section-divider">
                <span class="section-label">PARTES</span>
            </div>
        `;
        cardsContainer.appendChild(partsDivider);
    }
    
    // Criar os cards para cada parte com classes diferentes baseadas no tamanho
    parts.forEach((part, index) => {
        const partCard = document.createElement('div');
        
        // Definir classes baseadas no tamanho para grid layout
        let sizeClass;
        switch(part.size) {
            case 'large':
                sizeClass = 'col-md-8 col-lg-6';
                break;
            case 'small':
                sizeClass = 'col-md-4 col-lg-3';
                break;
            default: // medium
                sizeClass = 'col-md-6 col-lg-4';
        }
        
        partCard.className = `chunk-card ${sizeClass}`;
        partCard.id = `card-part-${index + 1}`;
        
        // Extract badges (concepts) if they exist
        let badgesHtml = '';
        if (part.concepts) {
            const concepts = part.concepts.split(',').map(c => c.trim());
            badgesHtml = concepts.slice(0, 3).map(concept => 
                `<span class="badge bg-secondary me-1">${concept}</span>`
            ).join('');
        }
        
        // Create reflection box if a question exists
        let reflectionHtml = '';
        if (part.question) {
            reflectionHtml = `
                <div class="reflection-box mt-3 border-start border-warning ps-2">
                    <strong>Reflexão:</strong> ${part.question}
                </div>
            `;
        }
        
        partCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-success text-white">
                    <h3 class="card-title mb-0">${part.title}</h3>
                </div>
                <div class="card-body collapsed">
                    ${part.objective ? `<p class="objective-text">${part.objective}</p>` : ''}
                    ${part.html}
                    ${reflectionHtml}
                </div>
                <div class="card-footer">
                    <div class="mb-2">${badgesHtml}</div>
                    <button class="btn btn-outline-success expand-button" onclick="toggleCardExpansion('card-part-${index + 1}')">Mostrar mais</button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(partCard);
    });
    
    // Encontrar e criar o card de conclusão
    const conclusionSection = Array.from(sections).find(s => 
        s.textContent.toLowerCase().includes('conclusão'));
    
    // Antes de adicionar o card de conclusão, adicionar um divisor de seção
    if (conclusionSection) {
        const conclusionDivider = document.createElement('div');
        conclusionDivider.className = 'w-100 section-block';
        conclusionDivider.innerHTML = `
            <div class="section-divider">
                <span class="section-label">CONCLUSÃO</span>
            </div>
        `;
        cardsContainer.appendChild(conclusionDivider);
        
        let conclusionHtml = conclusionSection.outerHTML;
        let nextNode = conclusionSection.nextElementSibling;
        while (nextNode) {
            conclusionHtml += nextNode.outerHTML;
            nextNode = nextNode.nextElementSibling;
        }
        
        const conclusionCard = document.createElement('div');
        conclusionCard.className = 'chunk-card conclusion-card';
        conclusionCard.id = 'card-conclusion';
        conclusionCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header bg-purple text-white">
                    <h3 class="card-title mb-0">Conclusão</h3>
                </div>
                <div class="card-body collapsed">
                    ${conclusionHtml}
                </div>
                <div class="card-footer">
                    <button class="btn btn-outline-purple expand-button" onclick="toggleCardExpansion('card-conclusion')">Mostrar mais</button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(conclusionCard);
    }
    
    // Criar array para rastrear todos os cards
    let allCards = [];
    
    // Após criar o card de introdução:
    if (introHtml) {
        const introCard = document.createElement('div');
        // Configuração do card...
        cardsContainer.appendChild(introCard);
        
        // Adicionar ao array de cards
        allCards.push({ type: 'intro', element: introCard });
    }
    
    // Após criar os cards de partes:
    parts.forEach((part, index) => {
        const partCard = document.createElement('div');
        // Configuração do card...
        cardsContainer.appendChild(partCard);
        
        // Adicionar ao array de cards
        allCards.push({ type: 'part', element: partCard });
    });
    
    // Após criar o card de conclusão:
    if (conclusionSection) {
        const conclusionCard = document.createElement('div');
        // Configuração do card...
        cardsContainer.appendChild(conclusionCard);
        
        // Adicionar ao array de cards
        allCards.push({ type: 'conclusion', element: conclusionCard });
    }
    
    // Passar todos os cards para a função de criação do índice
    createTableOfContents(allCards);
}

function createTableOfContents() {
    const toc = document.querySelector('#table-of-contents .toc-container');
    toc.innerHTML = ''; // Limpar conteúdo anterior
    
    // SEÇÃO 1: INTRODUÇÃO (sempre incluir, mesmo se não encontrar o card)
    const introHeader = document.createElement('div');
    introHeader.className = 'fw-bold text-purple mb-2';
    introHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-book me-1" viewBox="0 0 16 16">
            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
        </svg>
        <span class="section-title">INTRODUÇÃO</span>
    `;
    toc.appendChild(introHeader);
    
    // Link para o card de contextualização
    const contextualizacaoCard = document.getElementById('card-contextualizacao');
    if (contextualizacaoCard) {
        const contextualizacaoLink = document.createElement('a');
        contextualizacaoLink.href = '#card-contextualizacao';
        contextualizacaoLink.className = 'ms-3 d-block mb-2 text-decoration-none border-start border-purple ps-2 py-1';
        contextualizacaoLink.textContent = 'Contextualização';
        toc.appendChild(contextualizacaoLink);
    }
    
    // Link para o card de objetivos
    const objetivosCard = document.getElementById('card-objetivos');
    if (objetivosCard) {
        const objetivosLink = document.createElement('a');
        objetivosLink.href = '#card-objetivos';
        objetivosLink.className = 'ms-3 d-block mb-3 text-decoration-none border-start border-info ps-2 py-1';
        objetivosLink.textContent = 'Objetivos Gerais de Aprendizado';
        toc.appendChild(objetivosLink);
    }
    
    // SEÇÃO 2: PARTES DO ESTUDO
    const partsHeader = document.createElement('div');
    partsHeader.className = 'fw-bold text-success mb-2 mt-3';
    partsHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-grid-3x3-gap me-1" viewBox="0 0 16 16">
            <path d="M4 2v2H2V2h2zm1 12v-2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V7a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm5 10v-2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm5 10v-2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V7a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm0-5V2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/>
        </svg>
        <span class="section-title">PARTES</span>
    `;
    toc.appendChild(partsHeader);
    
    // Adicionar links para cada parte
    for (let i = 1; i <= 22; i++) {  // Máximo de 22 partes conforme limitação do formulário
        const partCard = document.getElementById(`card-part-${i}`);
        if (partCard) {
            const partTitle = partCard.querySelector('.card-title')?.textContent || `Parte ${i}`;
            const partLink = document.createElement('a');
            partLink.href = `#card-part-${i}`;
            partLink.className = 'ms-3 d-block mb-2 text-decoration-none border-start border-success ps-2 py-1';
            partLink.textContent = partTitle;
            toc.appendChild(partLink);
        } else {
            // Se não encontrarmos mais cards de parte, parar o loop
            break;
        }
    }
    
    // SEÇÃO 3: CONCLUSÃO
    const conclusionHeader = document.createElement('div');
    conclusionHeader.className = 'fw-bold text-purple mb-2 mt-3';
    conclusionHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle me-1" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
        </svg>
        <span class="section-title">CONCLUSÃO</span>
    `;
    toc.appendChild(conclusionHeader);
    
    // Link para o card de conclusão
    const conclusionCard = document.getElementById('card-conclusion');
    if (conclusionCard) {
        const conclusionLink = document.createElement('a');
        conclusionLink.href = '#card-conclusion';
        conclusionLink.className = 'ms-3 d-block mb-2 text-decoration-none border-start border-purple ps-2 py-1';
        conclusionLink.textContent = 'Síntese e integração';
        toc.appendChild(conclusionLink);
    }
}

// Inicializar o Masonry para layout em grade
function initMasonry() {
    // Inicializa o Masonry com opções
    window.msnry = new Masonry('#cards-container', {
        itemSelector: '.chunk-card',
        columnWidth: '.chunk-card',
        percentPosition: true,
        gutter: 20
    });
    
    // Atualizar layout do Masonry quando as imagens carregarem
    window.addEventListener('load', () => {
        window.msnry.layout();
    });
}
