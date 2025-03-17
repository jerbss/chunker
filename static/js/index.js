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

// Configuração global para debugging
const DEBUG = {
    enabled: false,   // Ative para depuração
    logStructure: true,
    highlightElements: true
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
 * Ativa o modo de depuração para identificar problemas
 */
function enableDebugMode() {
    DEBUG.enabled = true;
    
    // Aplicar classe de debug para visualizar estrutura HTML
    if (DEBUG.highlightElements) {
        const contentContainer = document.getElementById('html-content-container');
        if (contentContainer) {
            contentContainer.classList.add('debug-outline');
        }
    }
    
    console.info("🔍 Modo de depuração ativado");
    return "Modo de depuração ativado. Verifique o console para mais informações.";
}

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
 * Função para diagnóstico da estrutura HTML
 */
function analyzeHtmlStructure() {
    const contentContainer = document.getElementById('html-content-container');
    if (!contentContainer) {
        console.error("Container de conteúdo não encontrado!");
        return;
    }
    
    const structure = {
        h1: [],
        h2: [],
        h3: [],
        strong: [],
        ul: [],
        ol: [],
        complete: contentContainer.innerHTML.substring(0, 500) + '...'
    };
    
    // Analisar headers H1
    contentContainer.querySelectorAll('h1').forEach((h1, index) => {
        structure.h1.push({
            index,
            text: h1.textContent,
            nextElementType: h1.nextElementSibling ? h1.nextElementSibling.tagName : 'NONE'
        });
    });
    
    // Analisar headers H2
    contentContainer.querySelectorAll('h2').forEach((h2, index) => {
        structure.h2.push({
            index,
            text: h2.textContent,
            nextElementType: h2.nextElementSibling ? h2.nextElementSibling.tagName : 'NONE'
        });
    });
    
    // Analisar elementos strong
    contentContainer.querySelectorAll('strong').forEach((strong, index) => {
        if (index < 10) { // limitar para não sobrecarregar
            structure.strong.push({
                index,
                text: strong.textContent
            });
        }
    });
    
    console.table(structure.h1);
    console.table(structure.h2);
    console.log("Análise da estrutura HTML:", structure);
    
    return structure;
}

/**
 * Processa o conteúdo HTML
 */
function processContent() {
    const contentContainer = document.getElementById('html-content-container');
    if (!contentContainer) return;
    
    // Analisar a estrutura HTML para diagnóstico se debugging estiver ativo
    if (DEBUG.enabled && DEBUG.logStructure) {
        analyzeHtmlStructure();
    }
    
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
    
    // Encontrar todas as seções h1 e h2
    const h1Sections = element.querySelectorAll('h1');
    const h2Sections = element.querySelectorAll('h2');
    
    // Variáveis para processamento
    let introContentHtml = '';
    let partSections = [];
    let conclusionSection = null;
    
    // Classificar todas as seções h1 (titulo principal, partes e conclusão)
    h1Sections.forEach(section => {
        const sectionText = section.textContent.toLowerCase();
        
        if (sectionText.includes('parte')) {
            // É uma parte numerada
            partSections.push(section);
        } 
        else if (sectionText.includes('conclus')) {
            // É a conclusão
            conclusionSection = section;
        }
        // O título principal já foi capturado acima
    });
    
    // Processar seções h2 (contextualização e objetivos gerais)
    h2Sections.forEach(section => {
        const sectionText = section.textContent.toLowerCase();
        
        if (sectionText.includes('contextualiza') || sectionText.includes('objetivos')) {
            // Pertence à introdução
            const sectionClone = section.cloneNode(true);
            introContentHtml += sectionClone.outerHTML;
            
            // Capturar conteúdo até a próxima seção (h1 ou h2)
            let nextElement = section.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H1') {
                introContentHtml += nextElement.outerHTML;
                nextElement = nextElement.nextElementSibling;
            }
        }
    });
    
    // Se não temos conteúdo de introdução das seções h2, pegar tudo entre h1 principal e primeira parte
    if (!introContentHtml && mainTitle) {
        let nextElement = mainTitle.nextElementSibling;
        while (nextElement && 
              !(nextElement.tagName === 'H1' && 
                (nextElement.textContent.toLowerCase().includes('parte') || 
                 nextElement.textContent.toLowerCase().includes('conclus')))) {
            introContentHtml += nextElement.outerHTML;
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
    
    // Log para debugging
    if (DEBUG.enabled) {
        console.log("Extração concluída:", {
            title: state.mainTitle,
            intro: !!state.introContent,
            parts: state.parts.length,
            conclusion: !!state.conclusion
        });
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
        
        // Capturar todo o conteúdo até a próxima seção H1
        let nextElement = section.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H1') {
            // Adicionar o elemento ao conteúdo da parte
            part.content += nextElement.outerHTML;
            
            // Extrair metadados se existirem
            const elementText = nextElement.textContent || '';
            
            if (elementText.includes('Objetivo de Aprendizagem:')) {
                part.objective = elementText.split('Objetivo de Aprendizagem:')[1].trim();
            }
            
            if (elementText.includes('Conceitos-chave:')) {
                const conceptsText = elementText.split('Conceitos-chave:')[1].trim();
                part.concepts = conceptsText.split(',').map(c => c.trim()).filter(c => c);
            }
            
            if (elementText.includes('Pergunta de Reflexão:')) {
                part.reflection = elementText.split('Pergunta de Reflexão:')[1].trim();
            }
            
            nextElement = nextElement.nextElementSibling;
        }
        
        // Evitar duplicação do título principal e conteúdo da introdução na primeira parte
        if (i === 0 && state.introContent && part.content.includes(state.mainTitle)) {
            // Criar um elemento temporário para remover o título e contextualização duplicados
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = part.content;
            
            // Remover h1 e h2 duplicados
            const h1Elements = tempDiv.querySelectorAll('h1');
            const h2Elements = tempDiv.querySelectorAll('h2');
            
            h1Elements.forEach(el => {
                if (el.textContent.trim() === state.mainTitle) {
                    el.remove();
                }
            });
            
            h2Elements.forEach(el => {
                if (el.textContent.trim() === 'Contextualização' || 
                    el.textContent.trim() === 'Objetivos Gerais de Aprendizado' || 
                    el.textContent.trim().includes('Objetivos Gerais')) {
                    // Remover o elemento e todos os conteúdos até o próximo h2 ou h1
                    let currentEl = el;
                    while (currentEl && 
                           currentEl.nextElementSibling && 
                           currentEl.nextElementSibling.tagName !== 'H1' &&
                           currentEl.nextElementSibling.tagName !== 'H2') {
                        const nextToRemove = currentEl.nextElementSibling;
                        currentEl.parentNode.removeChild(nextToRemove);
                    }
                    el.remove();
                }
            });
            
            part.content = tempDiv.innerHTML;
        }

        // Remover duplicação de objetivos e reflexões
        if (part.objective || part.reflection) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = part.content;

            // Função para remover elementos com texto específico
            const removeElementsWithText = (selector, text) => {
                const elements = tempDiv.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.textContent.includes(text)) {
                        el.remove();
                    }
                });
            };

            // Função para remover qualquer elemento que contenha o texto exato
            const removeElementsContainingExactText = (text) => {
                if (!text) return;
                
                // Obter todos os elementos que podem conter texto
                const allTextElements = tempDiv.querySelectorAll('p, div, span, li, h3, h4, h5, h6');
                
                allTextElements.forEach(el => {
                    // Normalizar o texto para comparação (remover espaços extras)
                    const normalizedElText = el.textContent.trim().replace(/\s+/g, ' ');
                    const normalizedSearchText = text.trim().replace(/\s+/g, ' ');
                    
                    // Se o elemento contém exatamente o texto que queremos remover
                    if (normalizedElText === normalizedSearchText) {
                        el.remove();
                    }
                });
            };
            
            // Função para remover parágrafos completos que contêm o texto
            const removeParagraphsWithText = (text) => {
                if (!text) return;
                const paragraphs = tempDiv.querySelectorAll('p');
                paragraphs.forEach(p => {
                    if (p.textContent.includes(text)) {
                        p.remove();
                    }
                });
            };

            // Remover elementos com "Objetivo de Aprendizagem:"
            if (part.objective) {
                removeElementsWithText('strong', 'Objetivo de Aprendizagem:');
                removeParagraphsWithText('Objetivo de Aprendizagem:');
                removeElementsWithText('strong', 'Objetivo:');
                removeParagraphsWithText('Objetivo:');
                
                // Remover também parágrafos com o texto exato do objetivo
                removeElementsContainingExactText(part.objective);
            }

            // Remover elementos com "Pergunta de Reflexão:"
            if (part.reflection) {
                removeElementsWithText('strong', 'Pergunta de Reflexão:');
                removeParagraphsWithText('Pergunta de Reflexão:');
                
                // Remover também parágrafos com o texto exato da reflexão
                removeElementsContainingExactText(part.reflection + '?');
                removeElementsContainingExactText(part.reflection);
            }

            part.content = tempDiv.innerHTML;
        }
        
        // Debug log
        if (DEBUG.enabled) {
            console.log(`Parte processada: ${part.title}`, {
                objective: !!part.objective,
                conceptsCount: part.concepts.length,
                reflection: !!part.reflection,
                contentSize: part.content.length
            });
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
        if (introCard) {
            cardsContainer.appendChild(introCard);
        }
    }
    
    // Divisor de partes
    if (state.parts.length > 0) {
        const partsDivider = createSectionDivider('PARTES', 'success');
        cardsContainer.appendChild(partsDivider);
        
        // Criar wrapper row para os cards de partes
        const partsRow = document.createElement('div');
        partsRow.className = 'row g-4'; // g-4 para manter o mesmo espaçamento
        
        // Cards de Partes
        state.parts.forEach((part, index) => {
            const partCard = createPartCard(part, index);
            partsRow.appendChild(partCard); // Adicionar ao wrapper row em vez do container
        });
        
        // Adicionar a row completa ao container
        cardsContainer.appendChild(partsRow);
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
    // Se a introdução estiver vazia, não criar o card
    if (!state.introContent || !state.introContent.trim()) {
        return null;
    }

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
    const colClass = 'col-12'; // Usa largura total, igual à introdução e conclusão
    
    const card = document.createElement('div');
    card.className = `${colClass} mb-4`;
    card.id = cardId;
    
    // Criar badges para conceitos
    const conceptBadges = part.concepts
        .slice(0, 3)
        .map(concept => `<span class="badge bg-light text-success me-1 mb-1">${concept}</span>`)
        .join('');
    
    // Criar bloco de reflexão se existir (agora com melhor formatação e posição)
    const reflectionBlock = part.reflection 
        ? `<div class="mt-3 p-3 border-start border-warning bg-light">
               <strong class="text-warning"><i class="fas fa-lightbulb me-1"></i>Reflexão:</strong> 
               <p class="mb-0 mt-1">${part.reflection}${!part.reflection.endsWith('?') ? '?' : ''}</p>
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
            </div>
            
            <div class="card-footer bg-light">
                <div class="mb-2">${conceptBadges}</div>
                ${part.reflection ? reflectionBlock : ''}
                <button class="btn btn-outline-success expand-btn mt-2" data-target="${cardId}">
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
