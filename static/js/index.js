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
    
    // Input Group interactions - fazer com que clicar nos ícones ative o input correspondente
    document.querySelectorAll('.input-group .input-group-text').forEach(icon => {
        icon.addEventListener('click', function() {
            // Encontra o input mais próximo dentro do mesmo input-group
            const input = this.closest('.input-group').querySelector('input');
            if (input) {
                input.focus();
            }
        });
    });
    
    // Inicializar tooltips do Bootstrap
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
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
        
        // Debugging para verificar extração de partes
        if (DEBUG.enabled) {
            console.log("Partes extraídas:", state.parts.length);
            console.log("Partes:", state.parts.map(p => p.title));
        }
        
        // Remover o fallback content imediatamente para evitar que ele seja mostrado
        const fallbackContent = document.getElementById('fallback-content');
        if (fallbackContent) {
            fallbackContent.classList.add('d-none');
        }
        
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
        // Remover partes que têm o mesmo título que o título principal, vazias ou iguais a "PARTES"
        state.parts = state.parts.filter(part => 
            part.title !== state.mainTitle && 
            part.title.trim() !== "" &&
            part.title.trim().toLowerCase() !== "partes"
        );
        
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
    
    // Criar cards de partes INDIVIDUALMENTE, sem wrapper row
    if (state.parts.length > 0) {
        state.parts.forEach((part, index) => {
            const partCard = createPartCard(part, index);
            cardsContainer.appendChild(partCard);
        });
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
                    <span class="badge bg-white text-primary">Introdução</span>
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
 * Cria um card para uma parte com estrutura melhorada para autodidatas
 */
function createPartCard(part, index) {
    const partNumber = index + 1;
    const cardId = `card-part-${partNumber}`;
    const colClass = 'col-12'; // Usa largura total
    
    const card = document.createElement('div');
    card.className = `${colClass} mb-4`;
    card.id = cardId;
    
    // Extrair metadados do conteúdo da parte
    const metadata = extractPartMetadata(part.content);
    
    // Extrair informações específicas do título
    const titleInfo = extractTitleInfo(part.title);
    const emoji = titleInfo.emoji || '📚';
    const duration = titleInfo.duration || '1.5h';
    
    // Construir o conteúdo estruturado
    const structuredContent = organizeStructuredContent(part.content, metadata);
    
    // Criar a estrutura do card com layout melhorado para autodidatas
    card.innerHTML = `
        <div class="card shadow h-100">
            <!-- 1. HEADER DO CARD -->
            <div class="card-header bg-success text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h3 class="mb-0" style="font-family: 'Exo 2', sans-serif; font-weight: 700; letter-spacing: -0.03em;">${part.title}</h3>
                    <span class="badge bg-white text-success">Parte ${partNumber}</span>
                </div>
            </div>
            
            <!-- Metadados superiores: dificuldade, taxonomia, etc. -->
            <div class="card-header metadata-header py-2 px-3 bg-light border-bottom">
                <div class="row g-2">
                    <div class="col-sm-6 col-lg-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-gauge-high text-secondary me-2"></i>
                            <span class="text-muted small">Dificuldade: </span>
                            <span class="ms-1 fw-medium">${metadata.difficulty || '1/5'}</span>
                        </div>
                    </div>
                    <div class="col-sm-6 col-lg-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-brain text-secondary me-2"></i>
                            <span class="text-muted small">Bloom: </span>
                            <span class="ms-1 fw-medium">${metadata.bloomTaxonomy || 'Compreender'}</span>
                        </div>
                    </div>
                    <div class="col-sm-6 col-lg-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-graduation-cap text-secondary me-2"></i>
                            <span class="text-muted small">Estilo: </span>
                            <span class="ms-1 fw-medium">${metadata.learningStyle || 'Visual'}</span>
                        </div>
                    </div>
                    <div class="col-sm-6 col-lg-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-clock text-secondary me-2"></i>
                            <span class="text-muted small">Duração: </span>
                            <span class="ms-1 fw-medium">${duration}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 2. CONTEXTO DA APRENDIZAGEM -->
            ${part.objective ? 
                `<div class="card-img-top context-block bg-light border-bottom">
                    <div class="p-3">
                        <div class="d-flex align-items-start mb-3">
                            <div class="flex-shrink-0 me-3">
                                <div class="objective-icon bg-success-subtle rounded-circle p-2">
                                    <i class="fas fa-bullseye text-success fs-5"></i>
                                </div>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-2 text-success" style="font-family: 'Exo 2', sans-serif;">
                                    O que você vai dominar nesta parte:
                                </h4>
                                <p class="lead mb-0">${part.objective}</p>
                            </div>
                        </div>
                        
                        ${metadata.progressPercent ? 
                            `<div class="mt-3 context-progress p-2 bg-white rounded shadow-sm border">
                                <div class="d-flex justify-content-between align-items-center small mb-1">
                                    <span class="fw-medium">Progresso acumulado no domínio completo</span>
                                    <span class="badge bg-success">${metadata.progressPercent}%</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-success" role="progressbar" 
                                         style="width: ${metadata.progressPercent}%" 
                                         aria-valuenow="${metadata.progressPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </div>` : ''
                        }
                        
                        ${metadata.connections ? 
                            `<div class="mt-3 context-connections p-2 bg-white rounded shadow-sm border">
                                <div class="d-flex align-items-center mb-1">
                                    <i class="fas fa-link text-primary me-2"></i>
                                    <span class="fw-medium">Conexões com outras partes:</span>
                                </div>
                                <div class="connections-map">
                                    ${metadata.connections}
                                </div>
                            </div>` : ''
                        }
                    </div>
                </div>` : ''
            }
            
            <!-- Corpo principal do card -->
            <div class="card-body">
                <!-- 3. ROTEIRO DE APRENDIZADO -->
                <div class="learning-journey mb-4">
                    <div class="journey-header mb-3 pb-2 border-bottom border-success">
                        <h4 class="d-flex align-items-center text-success" style="font-family: 'Exo 2', sans-serif; font-weight: 700;">
                            <i class="fas fa-map-signs me-2"></i>
                            Sua Jornada de Aprendizado
                        </h4>
                        <p class="text-muted mb-0">Siga esta sequência para dominar todos os conceitos desta parte:</p>
                    </div>
                    
                    <!-- Tópicos nucleares reorganizados como jornada -->
                    ${structuredContent.nucleosHTML}
                </div>
                
                <!-- 4. GUIA PRÁTICO -->
                <div class="practical-guide mb-4">
                    <div class="row">
                        <!-- Desafio Relâmpago -->
                        ${metadata.challenge ? 
                            `<div class="col-md-6 mb-3">
                                <div class="card h-100 border-warning">
                                    <div class="card-header bg-warning bg-opacity-10 border-warning">
                                        <h5 class="d-flex align-items-center mb-0">
                                            <i class="fas fa-bolt text-warning me-2"></i>
                                            Pratique Agora
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="d-flex align-items-center mb-2">
                                            <div class="challenge-timer bg-warning bg-opacity-10 rounded p-1 px-2 me-2">
                                                <i class="fas fa-stopwatch text-warning me-1"></i>
                                                <span class="fw-medium">15 min</span>
                                            </div>
                                            <span class="text-muted small">Desafio rápido</span>
                                        </div>
                                        <p class="mb-0">${metadata.challenge}</p>
                                    </div>
                                </div>
                            </div>` : ''
                        }
                        
                        <!-- Caso Real -->
                        ${metadata.realCase ? 
                            `<div class="col-md-6 mb-3">
                                <div class="card h-100 border-info">
                                    <div class="card-header bg-info bg-opacity-10 border-info">
                                        <h5 class="d-flex align-items-center mb-0">
                                            <i class="fas fa-briefcase text-info me-2"></i>
                                            Aplicação no Mundo Real
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <p class="fst-italic mb-0">"${metadata.realCase}"</p>
                                    </div>
                                </div>
                            </div>` : ''
                        }
                    </div>
                    
                    <!-- Armadilhas Comuns -->
                    ${structuredContent.armadilhasHTML ? 
                        `<div class="mt-2">
                            <div class="card border-danger">
                                <div class="card-header bg-danger bg-opacity-10 border-danger">
                                    <h5 class="d-flex align-items-center mb-0">
                                        <i class="fas fa-triangle-exclamation text-danger me-2"></i>
                                        Evite Estes Erros
                                    </h5>
                                </div>
                                <div class="card-body">
                                    ${structuredContent.armadilhasHTML}
                                </div>
                            </div>
                        </div>` : ''
                    }
                </div>
                
                <!-- 5. RECURSOS DE SUPORTE -->
                <div class="support-resources mb-4">
                    <div class="resources-header mb-3 pb-2 border-bottom">
                        <h4 class="d-flex align-items-center" style="font-family: 'Exo 2', sans-serif; font-weight: 700;">
                            <i class="fas fa-toolbox text-primary me-2"></i>
                            Recursos de Apoio
                        </h4>
                    </div>
                    
                    <!-- Rotas Alternativas -->
                    ${structuredContent.rotasHTML ? 
                        `<div class="mb-3">
                            <div class="card border-primary border-opacity-25">
                                <div class="card-header bg-primary bg-opacity-10">
                                    <h5 class="mb-0 d-flex align-items-center">
                                        <i class="fas fa-route text-primary me-2"></i>
                                        Caminhos Personalizados
                                    </h5>
                                </div>
                                <div class="card-body">
                                    ${structuredContent.rotasHTML}
                                </div>
                            </div>
                        </div>` : ''
                    }
                    
                    <!-- AI Prompt Card -->
                    ${metadata.aiPrompt || part.instructionPrompt ? 
                        `<div class="mb-3">
                            <div class="card border-primary border-opacity-25">
                                <div class="card-header bg-primary bg-opacity-10">
                                    <h5 class="mb-0 d-flex align-items-center">
                                        <i class="fas fa-robot text-primary me-2"></i>
                                        Assistente de Aprendizado
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <p class="mb-2">Use este prompt para obter ajuda personalizada com IA:</p>
                                    <div class="d-flex justify-content-end mb-2">
                                        <button class="btn btn-sm btn-outline-primary copy-prompt" 
                                                data-prompt="${encodeURIComponent(metadata.aiPrompt || part.instructionPrompt)}">
                                            <i class="fas fa-copy me-1"></i>Copiar Prompt
                                        </button>
                                    </div>
                                    <pre class="bg-light border rounded p-2 mb-0">${metadata.aiPrompt || part.instructionPrompt}</pre>
                                </div>
                            </div>
                        </div>` : ''
                    }
                    
                    <!-- Conceitos-chave Card -->
                    <div class="mb-3">
                        <div class="card border-success border-opacity-25">
                            <div class="card-header bg-success bg-opacity-10">
                                <h5 class="mb-0 d-flex align-items-center">
                                    <i class="fas fa-tags text-success me-2"></i>
                                    Conceitos-chave
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="concepts-container">
                                    ${Array.isArray(part.concepts) && part.concepts.length > 0 
                                        ? part.concepts.map(concept => 
                                            `<span class="badge bg-success bg-opacity-10 text-success me-2 mb-2 p-2">${concept}</span>`
                                          ).join('')
                                        : '<span class="text-muted">Sem conceitos-chave definidos</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 6. AUTOAVALIAÇÃO -->
                <div class="self-assessment">
                    <div class="assessment-header mb-3 pb-2 border-bottom">
                        <h4 class="d-flex align-items-center" style="font-family: 'Exo 2', sans-serif; font-weight: 700;">
                            <i class="fas fa-chart-simple text-secondary me-2"></i>
                            Verifique Seu Progresso
                        </h4>
                    </div>
                    
                    <!-- Checklist de Domínio -->
                    <div class="mb-3">
                        <div class="card border-secondary border-opacity-25">
                            <div class="card-header bg-secondary bg-opacity-10">
                                <h5 class="mb-0 d-flex align-items-center">
                                    <i class="fas fa-check-circle text-secondary me-2"></i>
                                    Checklist de Domínio
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="checklist-container">
                                    ${metadata.domainChecklist ? 
                                        createStructuredChecklist(metadata.domainChecklist, cardId) : 
                                        createDefaultChecklist(part, cardId)
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Reflexão e Autoavaliação -->
                    <div class="row">
                        ${part.reflection ? 
                            `<div class="col-md-6 mb-3">
                                <div class="card h-100 border-info border-opacity-25">
                                    <div class="card-header bg-info bg-opacity-10">
                                        <h5 class="mb-0 d-flex align-items-center">
                                            <i class="fas fa-lightbulb text-info me-2"></i>
                                            Reflexão
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <p class="fst-italic mb-0">${part.reflection}${!part.reflection.endsWith('?') ? '?' : ''}</p>
                                    </div>
                                </div>
                            </div>` : ''
                        }
                        
                        <div class="col-md-6 mb-3">
                            <div class="card h-100 border-secondary border-opacity-25">
                                <div class="card-header bg-secondary bg-opacity-10">
                                    <h5 class="mb-0 d-flex align-items-center">
                                        <i class="fas fa-sliders text-secondary me-2"></i>
                                        Autoavaliação
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <p class="mb-2">Em uma escala de 1-5, qual seu nível de entendimento?</p>
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div class="rating-labels d-flex justify-content-between w-100 px-2">
                                            <span class="small">Iniciante</span>
                                            <span class="small">Intermediário</span>
                                            <span class="small">Avançado</span>
                                        </div>
                                    </div>
                                    <div class="rating-container d-flex align-items-center mt-1">
                                        <input type="range" class="form-range" min="1" max="5" value="3" id="rating-${cardId}">
                                    </div>
                                    <div class="mt-2 p-2 border rounded d-none feedback-area" id="feedback-${cardId}">
                                        <p class="feedback-text mb-0 small"></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Organiza o conteúdo estruturado a partir do HTML bruto da parte
 * @param {string} contentHTML - HTML do conteúdo da parte
 * @param {Object} metadata - Metadados extraídos do conteúdo
 * @returns {Object} - Objeto com conteúdo estruturado em HTML para cada seção
 */
function organizeStructuredContent(contentHTML, metadata) {
    const result = {
        nucleosHTML: '',
        rotasHTML: '',
        armadilhasHTML: ''
    };
    
    // Criar um elemento temporário para analisar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHTML;
    
    // Extrair os núcleos (tópicos principais)
    result.nucleosHTML = extractNucleosHTML(tempDiv);
    
    // Extrair rotas alternativas
    result.rotasHTML = extractRotasHTML(tempDiv);
    
    // Extrair armadilhas comuns
    result.armadilhasHTML = extractArmadilhasHTML(tempDiv);
    
    return result;
}

/**
 * Extrai os núcleos formatados como jornada de aprendizado
 * @param {HTMLElement} container - Container com o conteúdo HTML
 * @returns {string} - HTML formatado dos núcleos
 */
function extractNucleosHTML(container) {
    // Procurar pela seção "Tópicos Nucleares"
    const nucleosSections = Array.from(container.querySelectorAll('p, li'))
        .filter(el => el.textContent.includes('Tópicos Nucleares:'));
    
    if (nucleosSections.length === 0) return '';
    
    // Localizar a lista de núcleos (geralmente é a primeira lista após a seção "Tópicos Nucleares")
    let nuclearList = null;
    let currentElement = nucleosSections[0];
    
    // Procurar pela lista de núcleos
    while (currentElement && !nuclearList) {
        const nextElement = currentElement.nextElementSibling;
        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
            nuclearList = nextElement;
        } else if (currentElement.querySelector('ul, ol')) {
            nuclearList = currentElement.querySelector('ul, ol');
        } else {
            currentElement = nextElement;
        }
    }
    
    if (!nuclearList) return '';
    
    // Extrair os núcleos da lista
    const nucleos = [];
    const nucleoItems = nuclearList.querySelectorAll(':scope > li');
    
    nucleoItems.forEach((item, index) => {
        // Extrair o título do núcleo (geralmente está dentro de um <strong>)
        let nucleoTitle = '';
        const strongEl = item.querySelector('strong');
        if (strongEl) {
            nucleoTitle = strongEl.textContent.replace(/^\d+\.\s+/, '').replace(/:$/, '');
        } else {
            // Se não houver <strong>, extrair do texto do item
            const titleMatch = item.textContent.match(/^(\d+\.\s+)?([^:]+):/);
            nucleoTitle = titleMatch ? titleMatch[2] : `Núcleo ${index + 1}`;
        }
        
        // Extrair os subtópicos (geralmente estão em uma sublista)
        const subtopics = [];
        const sublist = item.querySelector('ul, ol');
        if (sublist) {
            const subitems = sublist.querySelectorAll('li');
            subitems.forEach(subitem => {
                subtopics.push(subitem.innerHTML);
            });
        }
        
        nucleos.push({
            title: nucleoTitle,
            subtopics,
            color: getColorForIndex(index)
        });
    });
    
    // Criar o HTML da jornada de aprendizado
    let result = '';
    
    nucleos.forEach((nucleo, index) => {
        result += `
            <div class="learning-step mb-4">
                <div class="step-header d-flex align-items-center mb-3">
                    <div class="step-number rounded-circle bg-${nucleo.color} text-white d-flex align-items-center justify-content-center me-3"
                         style="width: 40px; height: 40px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        ${index + 1}
                    </div>
                    <h5 class="mb-0 step-title fw-bold" style="font-family: 'Exo 2', sans-serif;">${nucleo.title}</h5>
                </div>
                
                ${nucleo.subtopics.length > 0 ? `
                    <div class="step-content ms-5 ps-3 border-start border-${nucleo.color}">
                        <ul class="step-list">
                            ${nucleo.subtopics.map(subtopic => `
                                <li class="step-item mb-2">${subtopic}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    return result || '<p class="text-muted">Não foram encontrados tópicos nucleares definidos.</p>';
}

/**
 * Extrai o HTML para rotas alternativas
 * @param {HTMLElement} container - Container com o conteúdo HTML
 * @returns {string} - HTML formatado das rotas alternativas
 */
function extractRotasHTML(container) {
    // Procurar pela seção "Rotas Alternativas"
    const rotasSections = Array.from(container.querySelectorAll('p, li'))
        .filter(el => el.textContent.includes('Rotas Alternativas:'));
    
    if (rotasSections.length === 0) return '';
    
    // Localizar os itens das rotas alternativas
    let rotasList = null;
    let currentElement = rotasSections[0];
    
    // Procurar pela lista de rotas
    while (currentElement && !rotasList) {
        const nextElement = currentElement.nextElementSibling;
        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
            rotasList = nextElement;
        } else if (currentElement.querySelector('ul, ol')) {
            rotasList = currentElement.querySelector('ul, ol');
        } else {
            currentElement = nextElement;
        }
    }
    
    if (!rotasList) return '';
    
    // Extrair as rotas
    const routes = [];
    const routeItems = rotasList.querySelectorAll('li');
    
    routeItems.forEach(item => {
        // Extrair o tipo de rota e sua descrição
        const strongEl = item.querySelector('strong');
        if (!strongEl) return;
        
        const routeType = strongEl.textContent.replace(/:$/, '');
        
        // Classificar as rotas
        let routeClass = '';
        let routeIcon = '';
        
        if (routeType.toLowerCase().includes('simples') || 
            routeType.toLowerCase().includes('básico') || 
            routeType.toLowerCase().includes('iniciante')) {
            routeClass = 'success';
            routeIcon = 'turtle';
        } else {
            routeClass = 'danger';
            routeIcon = 'rocket';
        }
        
        // Extrair a descrição (texto após o <strong>)
        let description = '';
        let currentNode = strongEl.nextSibling;
        
        while (currentNode) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                description += currentNode.textContent;
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                description += currentNode.outerHTML;
            }
            currentNode = currentNode.nextSibling;
        }
        
        // Limpar a descrição
        description = description.replace(/^:/, '').trim();
        
        routes.push({
            type: routeType,
            description,
            class: routeClass,
            icon: routeIcon
        });
    });
    
    // Criar o HTML das rotas alternativas
    let result = '';
    
    routes.forEach((route, index) => {
        result += `
            <div class="route-item d-flex ${index < routes.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}">
                <div class="route-icon rounded-circle bg-${route.class} bg-opacity-10 p-2 me-3 d-flex align-items-center justify-content-center"
                     style="width: 45px; height: 45px;">
                    <i class="fas fa-${route.icon} text-${route.class}"></i>
                </div>
                <div>
                    <h6 class="fw-bold mb-1">${route.type}</h6>
                    <p class="mb-0">${route.description}</p>
                </div>
            </div>
        `;
    });
    
    return result;
}

/**
 * Extrai o HTML para armadilhas comuns
 * @param {HTMLElement} container - Container com o conteúdo HTML
 * @returns {string} - HTML formatado das armadilhas comuns
 */
function extractArmadilhasHTML(container) {
    // Procurar pela seção "Armadilhas Comuns"
    const armadilhasSections = Array.from(container.querySelectorAll('p, li'))
        .filter(el => el.textContent.includes('Armadilhas Comuns:'));
    
    if (armadilhasSections.length === 0) return '';
    
    // Localizar a lista de armadilhas
    let armadilhasList = null;
    let currentElement = armadilhasSections[0];
    
    // Procurar pela lista de armadilhas
    while (currentElement && !armadilhasList) {
        const nextElement = currentElement.nextElementSibling;
        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
            armadilhasList = nextElement;
        } else if (currentElement.querySelector('ul, ol')) {
            armadilhasList = currentElement.querySelector('ul, ol');
        } else {
            currentElement = nextElement;
        }
    }
    
    if (!armadilhasList) return '';
    
    // Extrair as armadilhas
    const pitfalls = [];
    const pitfallItems = armadilhasList.querySelectorAll('li');
    
    pitfallItems.forEach(item => {
        const itemText = item.innerHTML;
        
        // Tentar extrair problema e solução
        const parts = itemText.split(/<strong>Solução:<\/strong>/i);
        
        if (parts.length >= 2) {
            let problem = parts[0].replace(/<strong>Problema:<\/strong>/i, '').trim();
            let solution = parts[1].trim();
            
            pitfalls.push({
                problem,
                solution
            });
        } else {
            // Formato alternativo: texto regular
            pitfalls.push({
                problem: itemText,
                solution: ''
            });
        }
    });
    
    // Criar o HTML das armadilhas comuns
    let result = '';
    
    pitfalls.forEach((pitfall, index) => {
        result += `
            <div class="pitfall-item ${index < pitfalls.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}">
                <div class="d-flex align-items-start mb-2">
                    <div class="flex-shrink-0 me-2" style="color: var(--bs-danger);">
                        <i class="fas fa-exclamation-circle fs-5"></i>
                    </div>
                    <div>
                        <h6 class="fw-bold text-danger mb-1">Problema:</h6>
                        <p class="mb-0">${pitfall.problem}</p>
                    </div>
                </div>
                
                ${pitfall.solution ? `
                    <div class="d-flex align-items-start mt-2 ms-4">
                        <div class="flex-shrink-0 me-2" style="color: var(--bs-success);">
                            <i class="fas fa-check-circle fs-5"></i>
                        </div>
                        <div>
                            <h6 class="fw-bold text-success mb-1">Solução:</h6>
                            <p class="mb-0">${pitfall.solution}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    return result;
}

/**
 * Retorna uma cor Bootstrap baseada no índice
 * @param {number} index - Índice do item
 * @returns {string} - Nome da cor Bootstrap
 */
function getColorForIndex(index) {
    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    return colors[index % colors.length];
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
                    <span class="badge bg-white text-primary">Síntese</span>
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
            // Garantir que o container possua posição relativa para conter os itens posicionados absolutamente
            cardsContainer.style.position = 'relative';
            
            // Inicializar o Masonry com opções para layout responsivo sem overflow
            new Masonry(cardsContainer, {
                itemSelector: '.col-12',
                percentPosition: true,
                originTop: true,
                gutter: 20
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
    
    // Garantir que o fallback esteja escondido
    const fallbackContent = document.getElementById('fallback-content');
    if (fallbackContent) {
        fallbackContent.classList.add('d-none');
        // Para garantir, podemos até remover completamente em vez de apenas esconder
        fallbackContent.remove();
    }
    
    // Remover o conteúdo HTML original
    const htmlContentContainer = document.getElementById('html-content-container');
    if (htmlContentContainer) {
        htmlContentContainer.remove();
    }
    
    // Verificar se os cards foram criados corretamente
    const cardsContainer = document.getElementById('cards-container');
    if (cardsContainer && DEBUG.enabled) {
        console.log("Cards no container:", cardsContainer.children.length);
        console.log("Conteúdo do container de cards:", cardsContainer.innerHTML.substring(0, 100) + "...");
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

    // Converter parágrafos com listas em elementos <ul> e processar seções especiais
    processAllContentSections();

    // Inicializar comportamentos para novos elementos
    initializeNewCardFeatures();
}

/**
 * Inicializa os comportamentos para os novos recursos dos cards
 */
function initializeNewCardFeatures() {
    // Toggle dos detalhes do mini-desafio
    document.querySelectorAll('.toggle-challenge-details').forEach(button => {
        button.addEventListener('click', function() {
            const detailsContainer = this.closest('.border-start').querySelector('.challenge-details');
            const isHidden = detailsContainer.style.display === 'none';
            
            // Toggle da visibilidade
            detailsContainer.style.display = isHidden ? 'block' : 'none';
            
            // Atualizar o ícone
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-chevron-down', !isHidden);
            icon.classList.toggle('fa-chevron-up', isHidden);
            
            // Atualizar o texto do botão
            this.innerHTML = isHidden 
                ? '<i class="fas fa-chevron-up"></i> Ocultar Dicas'
                : '<i class="fas fa-chevron-down"></i> Dicas';
        });
    });
    
    // Toggle entre modos de estudo
    document.querySelectorAll('.btn-check[name^="mode-"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const cardId = this.name.split('-')[1];
            const card = document.getElementById(cardId);
            if (!card) return;
            
            const deepModeContent = card.querySelector('.deep-mode-content');
            if (!deepModeContent) return;
            
            deepModeContent.style.display = this.id.startsWith('deep') ? 'block' : 'none';
        });
    });
    
    // Configurar controles de autoavaliação
    document.querySelectorAll('input[type="range"][id^="rating-"]').forEach(slider => {
        const updateFeedback = function() {
            const sliderId = slider.id;
            const cardId = sliderId.replace('rating-', '');
            
            if (!cardId) {
                console.warn('ID do card não pôde ser extraído do slider:', slider.id);
                return;
            }
            
            if (DEBUG.enabled) {
                console.log(`Processando feedback para o card com ID: ${cardId}`);
            }
            
            const value = parseInt(slider.value);
            const feedbackArea = document.getElementById(`feedback-${cardId}`);
            
            if (!feedbackArea) {
                console.warn(`Elemento feedback-${cardId} não encontrado`);
                return;
            }
            
            // Tenta selecionar o elemento .feedback-text dentro do feedbackArea
            let feedbackText = feedbackArea.querySelector('.feedback-text');
            if (!feedbackText) {
                console.warn(`Elemento .feedback-text não encontrado dentro de feedback-${cardId}. Criando novo elemento.`);
                feedbackText = document.createElement('p');
                feedbackText.className = 'feedback-text mb-0 small';
                feedbackArea.appendChild(feedbackText);
            }
            
            // Mostrar a área de feedback
            feedbackArea.classList.remove('d-none');
            
            const feedbacks = [
                "Você está começando! Continue estudando os conceitos básicos.",
                "Você tem alguma familiaridade. Revise os conceitos-chave novamente.",
                "Bom progresso! Tente aplicar estes conceitos em exemplos práticos.",
                "Ótimo domínio! Experimente ensinar estes conceitos para solidificar o conhecimento.",
                "Excelente! Você dominou este tópico. Avance para aplicações mais complexas."
            ];
            
            feedbackText.textContent = feedbacks[value - 1];
        };
        
        try {
            slider.addEventListener('input', updateFeedback);
            try {
                updateFeedback();
            } catch (initError) {
                console.warn('Erro ao inicializar o feedback:', initError);
            }
        } catch (error) {
            console.warn('Erro ao configurar evento de input para slider:', error);
        }
    });
}

/**
 * Processa todas as seções de conteúdo nos cards
 * Abordagem completamente nova para tratar listas e seções especiais
 */
function processAllContentSections() {
    // Pré-processar conteúdo para garantir consistência
    cleanupHtmlContent();
    
    // Processar todas as seções em ordem específica
    processMarkdownLists();
    processSpecialHeadings();
    processEmojiBullets();
    processSpecialSections();
    
    // Realizar ajustes finais na estrutura HTML
    finalizeContentStructure();
}

/**
 * Limpa o HTML para garantir consistência antes do processamento
 */
function cleanupHtmlContent() {
    // Remover espaços extras e padronizar quebras de linha
    document.querySelectorAll('.card-body').forEach(cardBody => {
        // Substituir múltiplas quebras de linha por uma única
        cardBody.innerHTML = cardBody.innerHTML
            .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
            .replace(/\s*<br\s*\/?>\s*/gi, '<br>');
        
        // Remover quebras de linha no início e fim de parágrafos
        cardBody.querySelectorAll('p').forEach(p => {
            p.innerHTML = p.innerHTML
                .replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/g, '')
                .trim();
            
            // Se o parágrafo estiver vazio após a limpeza, removê-lo
            if (!p.textContent.trim() && !p.querySelector('img')) {
                p.remove();
            }
        });
    });
}

/**
 * Processa listas em formato Markdown (- item ou * item) em todos os parágrafos
 */
function processMarkdownLists() {
    document.querySelectorAll('.card-body p').forEach(paragraph => {
        const html = paragraph.innerHTML;
        
        // Verificar se o parágrafo contém marcadores de lista
        if (html.includes('<br>- ') || 
            html.includes('<br>• ') || 
            html.includes('<br>* ') ||
            html.match(/<br>\d+[\.\):]/) || 
            html.startsWith('- ') || 
            html.startsWith('• ') || 
            html.startsWith('* ') ||
            html.match(/^\d+[\.\):]/)) {
            
            // Dividir o conteúdo do parágrafo por quebras de linha
            const lines = html.split('<br>');
            
            // Verificar se a primeira linha é um título
            let title = '';
            let items = [];
            
            // Se a primeira linha não começa com marcador, é provavelmente um título
            if (lines.length > 0 && 
                !lines[0].trim().startsWith('-') && 
                !lines[0].trim().startsWith('•') && 
                !lines[0].trim().startsWith('*') &&
                !lines[0].trim().match(/^\d+[\.\):]/)) {
                title = lines[0];
                items = lines.slice(1);
            } else {
                items = lines;
            }
            
            // Criar o novo elemento para substituir o parágrafo
            const container = document.createElement('div');
            
            // Adicionar o título se existir
            if (title.trim()) {
                const titleEl = document.createElement('p');
                titleEl.innerHTML = title.trim();
                container.appendChild(titleEl);
            }
            
            // Filtrar itens vazios
            items = items.filter(item => item.trim());
            
            if (items.length > 0) {
                // Determinar o tipo de lista (ordenada ou não ordenada)
                const isOrderedList = items[0].trim().match(/^\d+[\.\):]/);
                const list = document.createElement(isOrderedList ? 'ol' : 'ul');
                
                // Adicionar cada item à lista
                items.forEach(item => {
                    const li = document.createElement('li');
                    // Remover o marcador do início
                    li.innerHTML = item.trim()
                        .replace(/^-\s+/, '')
                        .replace(/^•\s+/, '')
                        .replace(/^\*\s+/, '')
                        .replace(/^\d+[\.\):]\s*/, '');
                    list.appendChild(li);
                });
                
                container.appendChild(list);
            }
            
            // Substituir o parágrafo original pelo novo container
            paragraph.replaceWith(container);
        }
    });
}

/**
 * Processa cabeçalhos especiais - ajustando hierarquia e formatação
 */
function processSpecialHeadings() {
    // Ajustar altura de cabeçalhos h2 em seções específicas
    document.querySelectorAll('.card-body h2').forEach(heading => {
        const text = heading.textContent.toLowerCase();
        
        // Cabeçalhos específicos que devem ter formatação especial
        if (text.includes('plano de ataque') || 
            text.includes('por onde começar') || 
            text.includes('primeiro passo') ||
            text.includes('o que você vai construir')) {
            
            // Destacar visualmente esses cabeçalhos
            heading.classList.add('section-heading');
            heading.style.borderBottom = '2px solid var(--primary-color)';
            heading.style.paddingBottom = '0.5rem';
            heading.style.marginBottom = '1rem';
        }
    });
}

/**
 * Processa itens de lista que começam com emojis
 */
function processEmojiBullets() {
    // Regular expression para detectar emojis comuns usados nos roteiros
    const emojiRegex = /([\u{1F300}-\u{1F6FF}]|[0-9][\.\)]|⏱|🛠|✅|🎯|🤖|🔄|📈|🚀|🐢|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣)/u;
    
    document.querySelectorAll('.card-body ul li, .card-body ol li').forEach(item => {
        const html = item.innerHTML;
        
        // Verificar se o item começa com emoji
        const match = html.match(new RegExp(`^${emojiRegex.source}\\s+`, 'u'));
        
        if (match) {
            // Destacar o emoji e manter o restante do conteúdo
            const emoji = match[0].trim();
            const restOfContent = html.slice(match[0].length);
            
            // Substituir com o emoji destacado seguido pelo conteúdo
            item.innerHTML = `<strong style="margin-right: 0.25rem;">${emoji}</strong>${restOfContent}`;
        }
    });
}

/**
 * Processa seções especiais como "Plano de Ataque Personalizado" e "Primeiro Passo Imediato"
 */
function processSpecialSections() {
    // Identificar seções especiais pelos cabeçalhos
    document.querySelectorAll('.card-body h2').forEach(heading => {
        const headingText = heading.textContent.toLowerCase();
        
        // Seção "Plano de Ataque Personalizado"
        if (headingText.includes('plano de ataque')) {
            processPlanSection(heading);
        }
        
        // Seção "Primeiro Passo Imediato"
        if (headingText.includes('primeiro passo')) {
            processFirstStepSection(heading);
        }
        
        // Seção "O Que Você Vai Construir"
        if (headingText.includes('o que você vai construir')) {
            processBuildSection(heading);
        }
    });
}

/**
 * Processa a seção "Plano de Ataque Personalizado"
 */
function processPlanSection(heading) {
    // Encontrar e processar subsections como "Escolha Seu Ritmo" e "Kit Ferramentas"
    let nextElement = heading.nextElementSibling;
    
    while (nextElement && !nextElement.matches('h2')) {
        const content = nextElement.textContent || '';
        
        // Verificar se o elemento contém algum dos subtítulos conhecidos
        if ((content.includes('Escolha Seu Ritmo') || 
             content.includes('Kit Ferramentas') || 
             content.includes('Kit Sob Medida')) && 
            nextElement.tagName === 'P') {
            
            // Converter este parágrafo em um bloco estruturado
            const paragraphContent = nextElement.innerHTML;
            
            // Dividir o conteúdo por quebra de linha para separar título e itens
            const lines = paragraphContent.split('<br>');
            
            if (lines.length > 1) {
                // Extrair o título (primeira linha)
                const titleLine = lines[0];
                const items = lines.slice(1).filter(line => line.trim());
                
                // Criar container para a nova estrutura
                const container = document.createElement('div');
                container.className = 'special-section mb-3';
                
                // Analisar e adicionar o título formatado
                const titleMatch = titleLine.match(/([\u{1F300}-\u{1F6FF}]|⏱|🛠)\s+\*\*([^*]+)\*\*/u);
                if (titleMatch) {
                    const emoji = titleMatch[1];
                    const titleText = titleMatch[2];
                    
                    const titleEl = document.createElement('h3');
                    titleEl.className = 'h5 d-flex align-items-center';
                    titleEl.innerHTML = `<span class="me-2">${emoji}</span> ${titleText}`;
                    container.appendChild(titleEl);
                } else {
                    // Caso não consiga extrair emoji e título formatado
                    const titleEl = document.createElement('h3');
                    titleEl.className = 'h5';
                    titleEl.innerHTML = titleLine;
                    container.appendChild(titleEl);
                }
                
                // Criar a lista de itens
                if (items.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'formatted-list';
                    
                    items.forEach(item => {
                        // Limpar o item, removendo traços iniciais
                        const cleanedItem = item.replace(/^-\s+/, '').trim();
                        
                        const li = document.createElement('li');
                        li.innerHTML = cleanedItem;
                        ul.appendChild(li);
                    });
                    
                    container.appendChild(ul);
                }
                
                // Substituir o parágrafo original
                const oldElement = nextElement;
                nextElement = nextElement.nextElementSibling;
                oldElement.replaceWith(container);
                continue;
            }
        }
        
        nextElement = nextElement.nextElementSibling;
    }
}

/**
 * Processa a seção "Primeiro Passo Imediato"
 */
function processFirstStepSection(heading) {
    // Procura o parágrafo que contém os itens de primeiro passo
    let nextElement = heading.nextElementSibling;
    
    while (nextElement && !nextElement.matches('h2')) {
        // Verificar se é um parágrafo que contém item
        if (nextElement.tagName === 'P' && 
            (nextElement.innerHTML.includes('- ') || 
             nextElement.innerHTML.includes('<br>-'))) {
            
            // Extrair conteúdo e identificar introdução e itens
            const content = nextElement.innerHTML;
            const parts = content.split('<br>-');
            
            if (parts.length > 1) {
                // A primeira parte é a introdução
                const intro = parts[0].replace(/▶️\s+/, '').trim();
                const items = parts.slice(1).map(item => item.trim());
                
                // Criar container para a nova estrutura
                const container = document.createElement('div');
                
                // Adicionar a introdução se houver
                if (intro) {
                    const introEl = document.createElement('p');
                    introEl.innerHTML = `<strong>▶️</strong> ${intro}`;
                    container.appendChild(introEl);
                }
                
                // Criar a lista de itens
                if (items.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'formatted-list';
                    
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.innerHTML = item;
                        ul.appendChild(li);
                    });
                    
                    container.appendChild(ul);
                }
                
                // Substituir o parágrafo original
                const oldElement = nextElement;
                nextElement = nextElement.nextElementSibling;
                oldElement.replaceWith(container);
                continue;
            }
        }
        
        nextElement = nextElement.nextElementSibling;
    }
}

/**
 * Processa a seção "O Que Você Vai Construir"
 */
function processBuildSection(heading) {
    // Criar um objeto para rastrear as fases que já foram processadas
    const processedPhases = {};
    
    // Manter referência aos elementos a serem removidos após o processamento
    const elementsToRemove = [];
    
    // Primeiro passo: identificar todas as fases e seus elementos relacionados
    let nextElement = heading.nextElementSibling;
    
    while (nextElement && !nextElement.matches('h2')) {
        // Verificar se é um parágrafo que contém fases - estendendo para incluir Fase 3 e Fase 4
        if (nextElement.tagName === 'P' && 
            (nextElement.textContent.includes('Fase 1') || 
             nextElement.textContent.includes('1️⃣') ||
             nextElement.textContent.includes('Fase 2') || 
             nextElement.textContent.includes('2️⃣') ||
             nextElement.textContent.includes('Fase 3') || 
             nextElement.textContent.includes('3️⃣') ||
             nextElement.textContent.includes('Fase 4') || 
             nextElement.textContent.includes('4️⃣'))) {
            
            const content = nextElement.innerHTML;
            
            // Determinar qual fase está sendo processada
            let phaseNumber = null;
            if (content.includes('Fase 1') || content.includes('1️⃣')) phaseNumber = 1;
            else if (content.includes('Fase 2') || content.includes('2️⃣')) phaseNumber = 2;
            else if (content.includes('Fase 3') || content.includes('3️⃣')) phaseNumber = 3;
            else if (content.includes('Fase 4') || content.includes('4️⃣')) phaseNumber = 4;
            else if (content.includes('Fase 5') || content.includes('5️⃣')) phaseNumber = 5;
            
            if (phaseNumber) {
                // Marcar esta fase como encontrada
                if (!processedPhases[phaseNumber]) {
                    processedPhases[phaseNumber] = {
                        title: '',
                        mainItems: [],
                        additionalItems: [],
                        elements: []
                    };
                }
                
                // Adicionar este elemento à lista dessa fase
                processedPhases[phaseNumber].elements.push(nextElement);
                elementsToRemove.push(nextElement);
                
                // Extrair o conteúdo desta fase
                const lines = content.split('<br>');
                
                // Tratamento especial para parágrafos (Fase 3 e 4 geralmente aparecem como parágrafos únicos)
                if (lines.length <= 1) {
                    // É um parágrafo único sem quebras de linha
                    processedPhases[phaseNumber].title = content;
                } else {
                    // Se for a primeira vez que encontramos esta fase, extrair o título
                    if (!processedPhases[phaseNumber].title && lines.length > 0) {
                        processedPhases[phaseNumber].title = lines[0];
                        
                        // Extrair os itens principais desta fase (após o título)
                        const mainItems = lines.slice(1).filter(line => line.trim());
                        processedPhases[phaseNumber].mainItems.push(...mainItems);
                    } else {
                        // Se já temos um título para esta fase, todos os itens são adicionais
                        processedPhases[phaseNumber].additionalItems.push(...lines.filter(line => line.trim()));
                    }
                }
            }
        }
        // Verificar se este elemento é uma lista solta que pertence a uma fase anterior
        else if ((nextElement.tagName === 'UL' || nextElement.tagName === 'OL') && Object.keys(processedPhases).length > 0) {
            // Determinar a qual fase essa lista pertence
            // Por padrão, assume a última fase encontrada
            let targetPhaseNumber = Math.max(...Object.keys(processedPhases).map(Number));
            
            // Verificar se há uma fase na sequência correta
            const previousElement = nextElement.previousElementSibling;
            if (previousElement && previousElement.tagName === 'P') {
                // Verificar se o parágrafo anterior define uma fase específica
                const prevContent = previousElement.textContent;
                if (prevContent.includes('Fase 3') || prevContent.includes('3️⃣')) targetPhaseNumber = 3;
                else if (prevContent.includes('Fase 4') || prevContent.includes('4️⃣')) targetPhaseNumber = 4;
            }
            
            // Adicionar itens desta lista à fase
            const listItems = Array.from(nextElement.querySelectorAll('li'))
                .map(li => li.innerHTML);
            
            if (processedPhases[targetPhaseNumber]) {
                processedPhases[targetPhaseNumber].additionalItems.push(...listItems);
                elementsToRemove.push(nextElement);
            }
        }
        
        nextElement = nextElement.nextElementSibling;
    }
    
    // Segundo passo: criar os novos elementos estruturados para cada fase
    const phasesContainer = document.createElement('div');
    phasesContainer.className = 'phases-container';
    
    // Processar cada fase na ordem numérica
    Object.keys(processedPhases)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(phaseNumber => {
            const phase = processedPhases[phaseNumber];
            
            // Criar container para a fase
            const phaseContainer = document.createElement('div');
            phaseContainer.className = 'phase-block mb-4';
            
            // Adicionar título da fase
            const titleEl = document.createElement('p');
            titleEl.className = 'phase-title mb-2';
            titleEl.style.fontWeight = '600';
            titleEl.style.color = 'var(--secondary-color)';
            titleEl.innerHTML = phase.title;
            phaseContainer.appendChild(titleEl);
            
            // Juntar todos os itens da fase (principais e adicionais)
            const allItems = [...phase.mainItems, ...phase.additionalItems]
                .filter(item => item.trim())
                .map(item => item.replace(/^-\s+/, '').trim());
            
            // Adicionar itens da fase como lista única
            if (allItems.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'phase-items';
                
                allItems.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = item;
                    ul.appendChild(li);
                });
                
                phaseContainer.appendChild(ul);
            }
            
            phasesContainer.appendChild(phaseContainer);
        });
    
    // Inserir o container de fases após o heading
    if (Object.keys(processedPhases).length > 0) {
        heading.after(phasesContainer);
        
        // Remover os elementos originais que foram processados
        elementsToRemove.forEach(el => el.remove());
    }
}

/**
 * Realiza ajustes finais na estrutura HTML
 */
function finalizeContentStructure() {
    // Aplicar classes de estilo específicas para melhorar a aparência
    
    // Estilizar listas formatadas
    document.querySelectorAll('.formatted-list').forEach(list => {
        list.classList.add('mb-3');
    });
    
    // Estilizar títulos de fase
    document.querySelectorAll('.phase-title').forEach(title => {
        title.style.fontWeight = '600';
        title.style.color = 'var(--secondary-color)';
    });
    
    // Garantir que todos os emojis tenham destaque visual consistente
    document.querySelectorAll('.card-body li').forEach(item => {
        // Se o item tem conteúdo começando com emoji mas não foi processado
        const content = item.innerHTML;
        const emojiMatch = content.match(/^([\u{1F300}-\u{1F6FF}]|⏱|🛠|✅|🎯|🤖|🔄|📈|🚀|🐢|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣)\s+/u);
        
        if (emojiMatch && !content.includes('<strong>')) {
            const emoji = emojiMatch[1];
            const restContent = content.slice(emojiMatch[0].length);
            item.innerHTML = `<strong style="margin-right: 0.25rem;">${emoji}</strong> ${restContent}`;
        }
    });
    
    // Aplicar estilos para tornar os emojis mais visíveis
    document.querySelectorAll('.card-body strong').forEach(strong => {
        if (strong.textContent.match(/^[\u{1F300}-\u{1F6FF}]|⏱|🛠|✅|🎯|🤖|🔄|📈|🚀|🐢|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣$/u)) {
            strong.style.fontSize = '1.1em';
            strong.style.display = 'inline-block';
            strong.style.minWidth = '1.5em';
        }
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

/**
 * Extrai metadados do conteúdo da parte
 * @param {string} content - HTML do conteúdo da parte
 * @returns {Object} - Objeto com metadados extraídos
 */
function extractPartMetadata(content) {
    const metadata = {
        difficulty: '1/5',
        bloomTaxonomy: 'Compreender',
        learningStyle: 'Visual',
        progressPercent: null,
        connections: null,
        aiPrompt: null,
        challenge: null,
        realCase: null,
        domainChecklist: null
    };
    
    // Criar um elemento temporário para analisar o conteúdo
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Extrair dificuldade
    const difficultyMatch = content.match(/Dificuldade:\s*(\d+\/\d+)/i);
    if (difficultyMatch) {
        metadata.difficulty = difficultyMatch[1];
    }
    
    // Extrair taxonomia de Bloom
    const bloomMatch = content.match(/Taxonomia de Bloom:\s*([^<\n\r]+)/i);
    if (bloomMatch) {
        metadata.bloomTaxonomy = bloomMatch[1].trim();
    }
    
    // Extrair estilo de aprendizado
    const styleMatch = content.match(/Estilo de Aprendizado:\s*([^<\n\r]+)/i);
    if (styleMatch) {
        metadata.learningStyle = styleMatch[1].trim();
    }
    
    // Extrair progresso acumulado
    const progressMatch = content.match(/Progresso Acumulado:\s*(\d+)%/i);
    if (progressMatch) {
        metadata.progressPercent = progressMatch[1];
    }
    
    // Extrair conexões com outras partes
    const connectionsElements = Array.from(tempDiv.querySelectorAll('p'))
        .filter(p => p.textContent.includes('Conexões com partes anteriores e posteriores:'));
    
    if (connectionsElements.length > 0) {
        const connectionsEl = connectionsElements[0];
        let connectionsText = connectionsEl.textContent.split('Conexões com partes anteriores e posteriores:')[1] || '';
        metadata.connections = connectionsText.trim();
    }
    
    // Extrair prompt de IA
    const promptElements = Array.from(tempDiv.querySelectorAll('p'))
        .filter(p => p.textContent.includes('Prompt de IA:'));
    
    if (promptElements.length > 0) {
        const promptEl = promptElements[0];
        let promptText = promptEl.textContent.split('Prompt de IA:')[1] || '';
        metadata.aiPrompt = promptText.trim();
    }
    
    // Extrair desafio relâmpago
    const challengeElements = Array.from(tempDiv.querySelectorAll('p, li'))
        .filter(el => el.textContent.includes('Desafio Relâmpago:'));
    
    if (challengeElements.length > 0) {
        const challengeEl = challengeElements[0];
        let challengeText = challengeEl.textContent.split('Desafio Relâmpago:')[1] || '';
        // Remover especificação de tempo se existir
        challengeText = challengeText.replace(/\(\d+ minutos\):/i, '');
        challengeText = challengeText.replace(/\d+ minutos:/i, '');
        metadata.challenge = challengeText.trim();
    }
    
    // Extrair caso real
    const caseElements = Array.from(tempDiv.querySelectorAll('p, li'))
        .filter(el => el.textContent.includes('Caso Real:'));
    
    if (caseElements.length > 0) {
        const caseEl = caseElements[0];
        let caseText = caseEl.textContent.split('Caso Real:')[1] || '';
        metadata.realCase = caseText.trim();
    }
    
    // Extrair checklist de domínio
    const checklistElements = Array.from(tempDiv.querySelectorAll('p'))
        .filter(p => p.textContent.includes('Checklist de Domínio:'));
    
    if (checklistElements.length > 0) {
        const checklistEl = checklistElements[0];
        const nextElement = checklistEl.nextElementSibling;
        
        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
            const checklistItems = Array.from(nextElement.querySelectorAll('li'))
                .map(item => item.textContent.trim());
            
            if (checklistItems.length > 0) {
                metadata.domainChecklist = checklistItems;
            }
        }
    }
    
    return metadata;
}

/**
 * Extrai informações específicas do título
 * @param {string} title - Título da parte
 * @returns {Object} - Objeto com informações extraídas
 */
function extractTitleInfo(title) {
    const info = {
        emoji: '📚',
        duration: '1.5h'
    };
    
    // Extrair emoji do título se existir
    const emojiMatch = title.match(/([\u{1F300}-\u{1F6FF}]|[\u{2700}-\u{27BF}])/u);
    if (emojiMatch) {
        info.emoji = emojiMatch[1];
    }
    
    // Extrair duração entre parênteses
    const durationMatch = title.match(/\(([^)]+)\)/);
    if (durationMatch) {
        info.duration = durationMatch[1];
    }
    
    return info;
}

/**
 * Cria um checklist estruturado a partir de uma lista de itens
 * @param {Array<string>} items - Lista de itens do checklist
 * @param {string} cardId - ID do card para referência
 * @returns {string} - HTML do checklist
 */
function createStructuredChecklist(items, cardId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p class="text-muted">Nenhum item de checklist definido</p>';
    }
    
    return `
        <div class="checklist-container">
            ${items.map((item, index) => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="check-${cardId}-${index}">
                    <label class="form-check-label" for="check-${cardId}-${index}">
                        ${item}
                    </label>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Cria um checklist padrão a partir dos dados da parte
 * @param {Object} part - Objeto da parte
 * @param {string} cardId - ID do card para referência
 * @returns {string} - HTML do checklist
 */
function createDefaultChecklist(part, cardId) {
    // Criar itens padrão baseados nos conceitos-chave
    const items = [];
    
    // Adicionar item de objetivo
    if (part.objective) {
        items.push(`Compreender o objetivo: ${part.objective}`);
    }
    
    // Adicionar itens baseados nos conceitos-chave
    if (part.concepts && part.concepts.length > 0) {
        // Limitar a 3 conceitos para não sobrecarregar
        const conceptsTouse = part.concepts.slice(0, 3);
        conceptsTouse.forEach(concept => {
            items.push(`Dominar o conceito: ${concept}`);
        });
    }
    
    // Adicionar item de reflexão
    if (part.reflection) {
        items.push(`Refletir sobre: ${part.reflection}`);
    }
    
    // Se não houver itens, adicionar alguns genéricos
    if (items.length === 0) {
        items.push(
            "Compreender os conceitos fundamentais desta parte",
            "Aplicar o conhecimento em exemplos práticos",
            "Refletir sobre a aplicação destes conceitos"
        );
    }
    
    return createStructuredChecklist(items, cardId);
}
