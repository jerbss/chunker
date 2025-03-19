/**
 * Chunkify - Sistema de processamento e exibição de conteúdo em chunks
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
    state.mainTitle = mainTitle ? mainTitle.textContent.trim() : 'Chunkify';
    
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
    
    // Verificação adicional para evitar partes com título duplicado ou sem título correto
    if (state.parts.length > 0) {
        // Remover partes que têm o mesmo título que o título principal
        state.parts = state.parts.filter(part => 
            part.title !== state.mainTitle && part.title.trim() !== "");
        
        // Se ainda não temos partes após a filtragem, criar pelo menos uma parte genérica
        if (state.parts.length === 0) {
            state.parts.push({
                title: `Parte 1: ${state.mainTitle}`,
                content: "<p>Conteúdo desta parte.</p>",
                objective: "Compreender os conceitos fundamentais.",
                concepts: ["Conceito 1", "Conceito 2", "Conceito 3"],
                reflection: "Como aplicar este conhecimento?"
            });
        }
    }
    
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

function processPartSections(partSections) {
    const parts = [];
    
    for (let i = 0; i < partSections.length; i++) {
        const section = partSections[i];
        const nextSection = partSections[i + 1] || null;
        
        const part = {
            title: section.textContent.trim(),
            content: '',  // Inicializa vazio para adicionar apenas o conteúdo sem o título
            objective: null,
            concepts: [],
            reflection: null,
            instructionPrompt: null // Novo campo para prompt de instrução
        };
        
        // Pular o H1 inicial (título) e começar a capturar a partir do próximo elemento
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
                // Extrair e preparar a string completa de conceitos
                const conceptsText = elementText.split('Conceitos-chave:')[1].trim();
                // Dividir conceitos por vírgulas e pontos, tratar cada item individualmente
                part.concepts = conceptsText
                    .replace(/\.$/, '') // Remover ponto final
                    .split(/,\s*|\.\s*/) // Dividir por vírgula ou ponto
                    .map(c => c.trim())
                    .filter(c => c && c.length > 0); // Filtrar itens vazios
            }
            
            if (elementText.includes('Pergunta de Reflexão:')) {
                part.reflection = elementText.split('Pergunta de Reflexão:')[1].trim();
            }
            
            if (elementText.includes('Prompt de Instrução:')) {
                part.instructionPrompt = elementText.split('Prompt de Instrução:')[1].trim();
            }
            
            nextElement = nextElement.nextElementSibling;
        }

        // Remover o título da parte do conteúdo
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = part.content;
        const firstH1 = tempDiv.querySelector('h1');
        if (firstH1 && firstH1.textContent.trim() === part.title) {
            firstH1.remove();
        }

        // Remover TODOS os parágrafos que contenham conceitos-chave, com busca mais abrangente
        const allParagraphs = tempDiv.querySelectorAll('p');
        allParagraphs.forEach(paragraph => {
            if (paragraph.textContent.includes('Conceitos-chave:')) {
                paragraph.remove();
            }
        });

        // Remover a pergunta de reflexão do conteúdo
        const reflectionElements = tempDiv.querySelectorAll('strong');
        reflectionElements.forEach(el => {
            if (el.textContent.includes('Reflexão:')) {
                let parent = el.parentNode;
                if (parent.tagName === 'P') {
                    parent.remove();
                } else {
                    el.remove();
                }
            }
        });

        // Remover o objetivo de aprendizagem do conteúdo
        const objectiveElements = tempDiv.querySelectorAll('strong');
        objectiveElements.forEach(el => {
            if (el.textContent.includes('Objetivo de Aprendizagem:')) {
                let parent = el.parentNode;
                if (parent.tagName === 'P') {
                    parent.remove();
                } else {
                    el.remove();
                }
            }
        });

        // Remover os conceitos-chave do conteúdo também
        const conceptElements = tempDiv.querySelectorAll('strong');
        conceptElements.forEach(el => {
            if (el.textContent.includes('Conceitos-chave:')) {
                let parent = el.parentNode;
                if (parent.tagName === 'P') {
                    parent.remove();
                } else {
                    el.remove();
                }
            }
        });

        // Remover o prompt de instrução do conteúdo também
        const instructionPromptElements = tempDiv.querySelectorAll('strong');
        instructionPromptElements.forEach(el => {
            if (el.textContent.includes('Prompt de Instrução:')) {
                let parent = el.parentNode;
                if (parent.tagName === 'P') {
                    parent.remove();
                } else {
                    el.remove();
                }
            }
        });

        // Remover marcadores de lista indesejados
        part.content = tempDiv.innerHTML.replace(/^(\s*--\s*Tópicos Principais:)/m, '')
                                         .replace(/(\s*Conceitos-chave:\s*--)$/m, '');
        
        part.content = part.content.trim();
        
        // Gerar automaticamente um prompt de instrução se não existir
        if (!part.instructionPrompt) {
            // Extrair título principal sem "Parte X: "
            let cleanTitle = part.title.replace(/^Parte \d+:\s*/i, '').trim();
            
            // Gerar um prompt estruturado baseado no título e conceitos
            part.instructionPrompt = `Explique detalhadamente sobre ${cleanTitle}, abordando os seguintes aspectos:${
                part.concepts.length > 0 
                ? '\n\n1. ' + part.concepts.slice(0, 5).map(c => `O que é ${c} e qual sua importância?`).join('\n2. ') 
                : ''
            }${
                part.objective 
                ? '\n\nConsidere o seguinte objetivo de aprendizagem: ' + part.objective 
                : ''
            }\n\nForneça exemplos práticos e aplicações no mundo real.`;
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
    
    // Divisor de conclusão - mudando para "CONSIDERAÇÕES FINAIS"
    if (state.conclusion) {
        const conclusionDivider = createSectionDivider('CONSIDERAÇÕES FINAIS', 'primary');
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
                    <h3 class="mb-0" style="font-family: 'Exo 2', sans-serif; font-weight: 700; letter-spacing: -0.03em;">${state.mainTitle}</h3>
                    <span class="badge bg-light text-primary">Introdução</span>
                </div>
            </div>
            <div class="card-body">
                ${state.introContent}
            </div>
        </div>
    `;

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
    
    // Criar badges para TODOS os conceitos-chave sem limitar quantidade
    const conceptBadges = Array.isArray(part.concepts) && part.concepts.length > 0 
        ? part.concepts.map(concept => `<span class="badge bg-light text-success me-1 mb-1">${concept}</span>`).join('')
        : '<span class="badge bg-light text-muted me-1 mb-1">Sem conceitos-chave definidos</span>';
    
    // Criar bloco de reflexão se existir (agora com melhor formatação e posição)
    const reflectionBlock = part.reflection 
        ? `<div class="mt-3 p-3 border-start border-warning bg-light">
               <strong class="text-warning" style="font-family: 'Exo 2', sans-serif; font-weight: 600;"><i class="fas fa-lightbulb me-1"></i>Reflexão:</strong> 
               <p class="mb-0 mt-1">${part.reflection}${!part.reflection.endsWith('?') ? '?' : ''}</p>
           </div>`
        : '';
    
    // Criar bloco de prompt de instrução se existir
    const instructionPromptBlock = part.instructionPrompt 
        ? `<div class="mt-3 p-3 border-start border-info bg-light">
               <div class="d-flex justify-content-between align-items-start">
                   <strong class="text-info" style="font-family: 'Exo 2', sans-serif; font-weight: 600;">
                       <i class="fas fa-robot me-1"></i>Prompt de Instrução
                   </strong>
                   <button class="btn btn-sm btn-outline-info copy-prompt" data-prompt="${encodeURIComponent(part.instructionPrompt)}">
                       <i class="fas fa-copy"></i> Copiar
                   </button>
               </div>
               <pre class="mb-0 mt-2 p-2 theme-adaptive-pre" style="white-space: pre-wrap; border-radius: 4px;">${part.instructionPrompt}</pre>
           </div>`
        : '';
    
    // Verificar se há conteúdo real no corpo do card, caso contrário, adicionar um placeholder
    const bodyContent = (part.content && part.content.trim()) 
        ? part.content 
        : '<p class="text-muted">Este card contém os principais conceitos e tópicos relacionados a esta parte do conteúdo.</p>';
    
    card.innerHTML = `
        <div class="card shadow h-100">
            <div class="card-header bg-success text-white">
                <h3 class="mb-0" style="font-family: 'Exo 2', sans-serif; font-weight: 700; letter-spacing: -0.03em;">${part.title}</h3>
            </div>
            
            ${part.objective ? 
                `<div class="card-img-top text-center py-3 bg-light">
                    <span class="text-success" style="font-family: 'Exo 2', sans-serif; font-weight: 600;"><i class="fas fa-bullseye me-1"></i>Objetivo:</span>
                    <p class="mb-0 px-3">${part.objective}</p>
                </div>` : ''
            }
            
            <div class="card-body">
                ${bodyContent}
            </div>
            
            <div class="card-footer bg-light">
                <div class="mb-2 concepts-container">${conceptBadges}</div>
                ${part.reflection ? reflectionBlock : ''}
                ${instructionPromptBlock}
            </div>
        </div>
    `;
    
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
                    <h3 class="mb-0" style="font-family: 'Exo 2', sans-serif; font-weight: 700; letter-spacing: -0.03em;">Integração dos Conhecimentos</h3>
                    <span class="badge bg-light text-primary">Síntese</span>
                </div>
            </div>
            <div class="card-body">
                ${state.conclusion}
            </div>
        </div>
    `;
    
    return card;
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
                <span style="font-family: 'Exo 2', sans-serif; font-weight: 500;">${state.mainTitle}</span>
            </a>
        `;
        nav.appendChild(introItem);
    }
    
    // Adicionar links para partes
    if (state.parts.length > 0) {
        const partsHeader = document.createElement('h6');
        partsHeader.className = 'text-uppercase text-muted mt-4 mb-2 border-top pt-2';
        partsHeader.style.fontFamily = "'Exo 2', sans-serif";
        partsHeader.style.fontWeight = "700";
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
                    <span style="font-family: 'Exo 2', sans-serif; font-weight: 500;">${part.title}</span>
                </a>
            `;
            partsList.appendChild(partItem);
        });
        
        nav.appendChild(partsList);
    }
    
    // Adicionar link para conclusão - mantendo "Conclusão" apenas no TOC
    if (state.conclusion) {
        const conclusionItem = document.createElement('div');
        conclusionItem.className = 'mt-3 border-top pt-2';
        conclusionItem.innerHTML = `
            <a href="#card-conclusion" class="d-flex align-items-center text-decoration-none text-primary">
                <i class="fas fa-flag-checkered me-2"></i>
                <span style="font-family: 'Exo 2', sans-serif; font-weight: 500;">Conclusão</span>
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
    
    // Inicializar comportamentos dos cards
    initializeCardBehaviors();
}

/**
 * Inicializa comportamentos dinâmicos após a criação dos cards
 */
function initializeCardBehaviors() {
    // Adicionar evento para botões de cópia de prompt
    document.querySelectorAll('.copy-prompt').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const promptText = decodeURIComponent(this.getAttribute('data-prompt'));
            
            // Copiar para a área de transferência
            navigator.clipboard.writeText(promptText)
                .then(() => {
                    // Feedback visual temporário
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    this.classList.remove('btn-outline-info');
                    this.classList.add('btn-success');
                    
                    // Restaurar após 2 segundos
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.classList.remove('btn-success');
                        this.classList.add('btn-outline-info');
                    }, 2000);
                })
                .catch(err => {
                    console.error('Erro ao copiar: ', err);
                    alert('Não foi possível copiar o texto. Por favor, copie manualmente.');
                });
        });
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
