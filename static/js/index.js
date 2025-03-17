/**
 * ChunkMaster - Sistema de processamento e exibição de conteúdo em chunks
 * Este script processa o conteúdo HTML gerado pela IA e o exibe em cards organizados
 */

// Estado global da aplicação
const state = {
    mainTitle: '',
    introContent: null,
    parts: [],
    conclusion: null,
    masonry: null
};

// Quando o DOM estiver carregado, iniciar o processamento
document.addEventListener('DOMContentLoaded', () => {
    // Configurar o aviso para muitos chunks
    setupWarnings();
    
    // Iniciar o processamento do conteúdo
    processContent();
    
    // Configurar comportamentos da interface
    setupUIBehaviors();
});

/**
 * Configura avisos e interações iniciais
 */
function setupWarnings() {
    const numPartesInput = document.querySelector('input[name="num_partes"]');
    if (numPartesInput) {
        numPartesInput.addEventListener('input', function() {
            const warning = document.getElementById('parts-warning');
            if (warning) {
                warning.classList.toggle('d-none', parseInt(this.value) <= 8);
            }
        });
        
        // Verificar valor inicial
        const warning = document.getElementById('parts-warning');
        if (warning) {
            warning.classList.toggle('d-none', parseInt(numPartesInput.value) <= 8);
        }
    }
}

/**
 * Configura comportamentos da UI
 */
function setupUIBehaviors() {
    // Toggle para o índice de navegação
    const tocToggle = document.getElementById('toc-toggle');
    if (tocToggle) {
        tocToggle.addEventListener('click', () => {
            const tocContent = document.getElementById('toc-content');
            const icon = tocToggle.querySelector('i');
            
            if (icon.classList.contains('fa-chevron-up')) {
                // Recolher
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                tocContent.style.maxHeight = '0';
                tocContent.style.padding = '0';
                tocContent.style.overflow = 'hidden';
            } else {
                // Expandir
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                tocContent.style.maxHeight = '';
                tocContent.style.padding = '';
                tocContent.style.overflow = 'auto';
            }
        });
    }
}

/**
 * Processa o conteúdo HTML
 */
function processContent() {
    const contentContainer = document.getElementById('html-content-container');
    if (!contentContainer) return;
    
    try {
        // Criar elemento temporário para processar o HTML
        const tempElement = document.createElement('div');
        tempElement.innerHTML = contentContainer.innerHTML;
        
        // Extrair o conteúdo e organizar em chunks
        extractContent(tempElement);
        
        // Criar os cards baseados no conteúdo extraído
        createCards();
        
        // Criar a navegação (TOC)
        createTableOfContents();
        
        // Inicializar Masonry para layout responsivo
        initializeLayout();
        
        // Esconder loading e remover conteúdo original
        hideLoadingAndCleanup();
    } catch (error) {
        console.error('Erro ao processar conteúdo:', error);
        showFallbackContent();
    }
}

/**
 * Extrai o conteúdo do HTML temporário
 */
function extractContent(element) {
    // Extrair título principal
    const mainTitle = element.querySelector('h1');
    state.mainTitle = mainTitle ? mainTitle.textContent.trim() : 'ChunkMaster';
    
    // Encontrar todas as seções h2
    const sections = element.querySelectorAll('h2');
    
    // Variáveis para processamento
    let introContentHtml = '';
    let partSections = [];
    let conclusionSection = null;
    
    // Classificar todas as seções
    for (const section of sections) {
        const sectionText = section.textContent.toLowerCase();
        
        if (sectionText.includes('parte')) {
            partSections.push(section);
        } 
        else if (sectionText.includes('conclus')) {
            conclusionSection = section;
        } 
        else {
            // Seção de introdução
            const sectionClone = section.cloneNode(true);
            introContentHtml += sectionClone.outerHTML;
            
            // Capturar conteúdo até a próxima seção h2
            let nextElement = section.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H2') {
                introContentHtml += nextElement.outerHTML;
                nextElement = nextElement.nextElementSibling;
            }
        }
    }
    
    // Se não encontramos conteúdo de introdução nas seções h2, capturar conteúdo entre h1 e primeira parte
    if (!introContentHtml && mainTitle) {
        let nextElement = mainTitle.nextElementSibling;
        while (nextElement && (nextElement.tagName !== 'H2' || !nextElement.textContent.toLowerCase().includes('parte'))) {
            if (nextElement.tagName !== 'H2' || !nextElement.textContent.toLowerCase().includes('conclus')) {
                introContentHtml += nextElement.outerHTML;
            }
            nextElement = nextElement.nextElementSibling;
        }
    }
    
    // Armazenar introdução
    state.introContent = introContentHtml;
    
    // Processar partes
    state.parts = processPartSections(partSections);
    
    // Processar conclusão
    if (conclusionSection) {
        let conclusionHtml = conclusionSection.outerHTML;
        let nextElement = conclusionSection.nextElementSibling;
        
        while (nextElement) {
            conclusionHtml += nextElement.outerHTML;
            nextElement = nextElement.nextElementSibling;
        }
        
        state.conclusion = conclusionHtml;
    }
}

/**
 * Processa todas as seções de partes
 */
function processPartSections(partSections) {
    const parts = [];
    
    for (let i = 0; i < partSections.length; i++) {
        const section = partSections[i];
        const nextSection = partSections[i + 1] || null;
        
        const part = {
            title: section.textContent.trim(),
            content: section.outerHTML,
            objective: null,
            concepts: [],
            reflection: null
        };
        
        // Capturar todo o conteúdo até a próxima seção
        let nextElement = section.nextElementSibling;
        while (nextElement && (nextElement !== nextSection && nextElement.tagName !== 'H2')) {
            // Adicionar o elemento ao conteúdo da parte
            part.content += nextElement.outerHTML;
            
            // Extrair metadados se existirem
            const elementContent = nextElement.innerHTML || '';
            
            if (elementContent.includes('Objetivo de Aprendizagem:')) {
                part.objective = elementContent.split('Objetivo de Aprendizagem:')[1].trim();
            }
            
            if (elementContent.includes('Conceitos-chave:')) {
                const conceptsText = elementContent.split('Conceitos-chave:')[1].trim();
                part.concepts = conceptsText.split(',').map(c => c.trim()).filter(c => c);
            }
            
            if (elementContent.includes('Pergunta de Reflexão:')) {
                part.reflection = elementContent.split('Pergunta de Reflexão:')[1].trim();
            }
            
            nextElement = nextElement.nextElementSibling;
        }
        
        parts.push(part);
    }
    
    return parts;
}

/**
 * Cria todos os cards com base no conteúdo extraído
 */
function createCards() {
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';
    
    // Card de Introdução
    if (state.introContent) {
        const introCard = createIntroCard();
        cardsContainer.appendChild(introCard);
    }
    
    // Divisor de partes
    if (state.parts.length > 0) {
        const partsDivider = createSectionDivider('PARTES', 'success');
        cardsContainer.appendChild(partsDivider);
        
        // Cards de Partes
        state.parts.forEach((part, index) => {
            const partCard = createPartCard(part, index);
            cardsContainer.appendChild(partCard);
        });
    }
    
    // Divisor de conclusão
    if (state.conclusion) {
        const conclusionDivider = createSectionDivider('CONCLUSÃO', 'primary');
        cardsContainer.appendChild(conclusionDivider);
        
        // Card de Conclusão
        const conclusionCard = createConclusionCard();
        cardsContainer.appendChild(conclusionCard);
    }
}

/**
 * Cria um divisor de seção
 */
function createSectionDivider(title, colorClass) {
    const divider = document.createElement('div');
    divider.className = 'col-12 mb-4';
    divider.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="flex-grow-1 border-top border-${colorClass}"></div>
            <h2 class="mx-3 text-${colorClass}">${title}</h2>
            <div class="flex-grow-1 border-top border-${colorClass}"></div>
        </div>
    `;
    return divider;
}

/**
 * Cria o card de introdução
 */
function createIntroCard() {
    const card = document.createElement('div');
    card.className = 'col-12 mb-4';
    card.id = 'card-intro';
    
    card.innerHTML = `
        <div class="card shadow h-100">
            <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h3 class="mb-0">${state.mainTitle}</h3>
                    <span class="badge bg-light text-primary">Introdução</span>
                </div>
            </div>
            <div class="card-body collapsed-content" style="max-height: 250px; overflow: hidden; position: relative; mask-image: linear-gradient(to bottom, black 80%, transparent 100%);">
                ${state.introContent}
            </div>
            <div class="card-footer bg-light">
                <button class="btn btn-outline-primary expand-btn" data-target="card-intro">
                    <i class="fas fa-chevron-down me-1"></i>Expandir
                </button>
            </div>
        </div>
    `;
    
    // Adicionar evento para expandir/recolher
    const expandBtn = card.querySelector('.expand-btn');
    expandBtn.addEventListener('click', handleExpandCollapse);
    
    return card;
}

/**
 * Cria um card para uma parte
 */
function createPartCard(part, index) {
    const partNumber = index + 1;
    const cardId = `card-part-${partNumber}`;
    
    // Determinar tamanho do card baseado no conteúdo
    const contentLength = part.content.length;
    let colClass = 'col-md-6 col-lg-6';
    
    if (contentLength > 1500) {
        colClass = 'col-12';
    } else if (contentLength < 500) {
        colClass = 'col-md-4 col-lg-4';
    }
    
    const card = document.createElement('div');
    card.className = `${colClass} mb-4`;
    card.id = cardId;
    
    // Criar badges para conceitos
    const conceptBadges = part.concepts
        .slice(0, 3)
        .map(concept => `<span class="badge bg-light text-success me-1 mb-1">${concept}</span>`)
        .join('');
    
    // Criar bloco de reflexão se existir
    const reflectionBlock = part.reflection 
        ? `<div class="mt-3 p-3 border-start border-warning bg-light">
               <strong class="text-warning"><i class="fas fa-lightbulb me-1"></i>Reflexão:</strong> 
               <p class="mb-0 mt-1">${part.reflection}</p>
           </div>`
        : '';
    
    card.innerHTML = `
        <div class="card shadow h-100">
            <div class="card-header bg-success text-white">
                <h3 class="mb-0">${part.title}</h3>
            </div>
            
            ${part.objective ? 
                `<div class="card-img-top text-center py-3 bg-light">
                    <span class="text-success"><i class="fas fa-bullseye me-1"></i>Objetivo:</span>
                    <p class="mb-0 px-3">${part.objective}</p>
                </div>` : ''
            }
            
            <div class="card-body collapsed-content" style="max-height: 250px; overflow: hidden; position: relative; mask-image: linear-gradient(to bottom, black 80%, transparent 100%);">
                ${part.content}
                ${reflectionBlock}
            </div>
            
            <div class="card-footer bg-light">
                <div class="mb-2">${conceptBadges}</div>
                <button class="btn btn-outline-success expand-btn" data-target="${cardId}">
                    <i class="fas fa-chevron-down me-1"></i>Expandir
                </button>
            </div>
        </div>
    `;
    
    // Adicionar evento para expandir/recolher
    const expandBtn = card.querySelector('.expand-btn');
    expandBtn.addEventListener('click', handleExpandCollapse);
    
    return card;
}

/**
 * Cria o card de conclusão
 */
function createConclusionCard() {
    const card = document.createElement('div');
    card.className = 'col-12';
    card.id = 'card-conclusion';
    
    card.innerHTML = `
        <div class="card shadow h-100">
            <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h3 class="mb-0">Conclusão</h3>
                    <span class="badge bg-light text-primary">Síntese</span>
                </div>
            </div>
            <div class="card-body collapsed-content" style="max-height: 250px; overflow: hidden; position: relative; mask-image: linear-gradient(to bottom, black 80%, transparent 100%);">
                ${state.conclusion}
            </div>
            <div class="card-footer bg-light">
                <button class="btn btn-outline-primary expand-btn" data-target="card-conclusion">
                    <i class="fas fa-chevron-down me-1"></i>Expandir
                </button>
            </div>
        </div>
    `;
    
    // Adicionar evento para expandir/recolher
    const expandBtn = card.querySelector('.expand-btn');
    expandBtn.addEventListener('click', handleExpandCollapse);
    
    return card;
}

/**
 * Manipulador de evento para expandir/recolher cards
 */
function handleExpandCollapse() {
    const cardId = this.getAttribute('data-target');
    const card = document.getElementById(cardId);
    
    if (!card) return;
    
    const cardBody = card.querySelector('.card-body');
    const icon = this.querySelector('i');
    
    if (cardBody.classList.contains('collapsed-content')) {
        // Expandir
        cardBody.classList.remove('collapsed-content');
        cardBody.style.maxHeight = '';
        cardBody.style.overflow = '';
        cardBody.style.maskImage = '';
        cardBody.style.webkitMaskImage = '';
        
        this.innerHTML = `<i class="fas fa-chevron-up me-1"></i>Recolher`;
    } else {
        // Colapsar
        cardBody.classList.add('collapsed-content');
        cardBody.style.maxHeight = '250px';
        cardBody.style.overflow = 'hidden';
        cardBody.style.maskImage = 'linear-gradient(to bottom, black 80%, transparent 100%)';
        cardBody.style.webkitMaskImage = 'linear-gradient(to bottom, black 80%, transparent 100%)';
        
        this.innerHTML = `<i class="fas fa-chevron-down me-1"></i>Expandir`;
        
        // Scroll para o topo do card
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Atualizar layout do Masonry
    if (state.masonry) {
        setTimeout(() => state.masonry.layout(), 100);
    }
}

/**
 * Cria o índice de navegação
 */
function createTableOfContents() {
    const tocContent = document.getElementById('toc-content');
    if (!tocContent) return;
    
    // Limpar conteúdo existente
    tocContent.innerHTML = '';
    
    const nav = document.createElement('nav');
    
    // Adicionar link para introdução
    if (state.introContent) {
        const introItem = document.createElement('div');
        introItem.className = 'mb-3';
        introItem.innerHTML = `
            <a href="#card-intro" class="d-flex align-items-center text-decoration-none text-primary">
                <i class="fas fa-book-open me-2"></i>
                <span>${state.mainTitle}</span>
            </a>
        `;
        nav.appendChild(introItem);
    }
    
    // Adicionar links para partes
    if (state.parts.length > 0) {
        const partsHeader = document.createElement('h6');
        partsHeader.className = 'text-uppercase text-muted mt-4 mb-2 border-top pt-2';
        partsHeader.innerHTML = '<i class="fas fa-layer-group me-1"></i> Partes';
        nav.appendChild(partsHeader);
        
        // Lista de partes
        const partsList = document.createElement('div');
        partsList.className = 'ms-2 mb-3';
        
        state.parts.forEach((part, index) => {
            const partNumber = index + 1;
            const partItem = document.createElement('div');
            partItem.className = 'mb-2';
            partItem.innerHTML = `
                <a href="#card-part-${partNumber}" class="d-flex align-items-center text-decoration-none text-success">
                    <span class="me-2">${partNumber}.</span>
                    <span>${part.title}</span>
                </a>
            `;
            partsList.appendChild(partItem);
        });
        
        nav.appendChild(partsList);
    }
    
    // Adicionar link para conclusão
    if (state.conclusion) {
        const conclusionItem = document.createElement('div');
        conclusionItem.className = 'mt-3 border-top pt-2';
        conclusionItem.innerHTML = `
            <a href="#card-conclusion" class="d-flex align-items-center text-decoration-none text-primary">
                <i class="fas fa-flag-checkered me-2"></i>
                <span>Conclusão</span>
            </a>
        `;
        nav.appendChild(conclusionItem);
    }
    
    tocContent.appendChild(nav);
}

/**
 * Inicializa o layout Masonry
 */
function initializeLayout() {
    try {
        const cardsContainer = document.getElementById('cards-container');
        if (cardsContainer && window.Masonry) {
            state.masonry = new Masonry(cardsContainer, {
                itemSelector: '.col-12, .col-md-6, .col-md-4',
                gutter: 20,
                percentPosition: true
            });
            
            // Atualizar layout quando as imagens carregam
            window.addEventListener('load', () => {
                state.masonry.layout();
            });
        }
    } catch (error) {
        console.error('Erro ao inicializar Masonry:', error);
    }
}

/**
 * Esconde loading e limpa conteúdo desnecessário
 */
function hideLoadingAndCleanup() {
    // Remover loading spinner
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.classList.add('d-none');
    }
    
    // Remover fallback
    const fallbackContent = document.getElementById('fallback-content');
    if (fallbackContent) {
        fallbackContent.remove();
    }
    
    // Remover o conteúdo HTML original
    const htmlContentContainer = document.getElementById('html-content-container');
    if (htmlContentContainer) {
        htmlContentContainer.remove();
    }
    
    // Remover elementos temporários
    document.querySelectorAll('.formatted-content, .formatted-content-visible').forEach(el => {
        if (el) el.remove();
    });
}

/**
 * Mostra o conteúdo de fallback em caso de erro
 */
function showFallbackContent() {
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.classList.add('d-none');
    }
    
    const fallbackContent = document.getElementById('fallback-content');
    if (fallbackContent) {
        fallbackContent.classList.remove('d-none');
    }
}
