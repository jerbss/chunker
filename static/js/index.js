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
 * Cria um card para uma parte - versão reestruturada
 */
function createPartCard(part, index) {
    const partNumber = index + 1;
    const cardId = `card-part-${partNumber}`;
    const colClass = 'col-12'; // Usa largura total
    
    const card = document.createElement('div');
    card.className = `${colClass} mb-4`;
    card.id = cardId;
    
    // Extrair metadados do conteúdo da parte (como no exemplo fornecido)
    const metadata = extractPartMetadata(part.content);
    
    // Extrair informações específicas do título
    const titleInfo = extractTitleInfo(part.title);
    const emoji = titleInfo.emoji || '📚';
    const duration = titleInfo.duration || '1.5h';
    
    // Criar a estrutura do card com layout aprimorado
    card.innerHTML = `
        <div class="card shadow h-100">
            <!-- Header principal com título da parte -->
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
            
            <!-- Objetivo de aprendizagem (se existir) -->
            ${part.objective ? 
                `<div class="card-img-top bg-light border-bottom">
                    <div class="d-flex align-items-start p-3">
                        <div class="flex-shrink-0 me-3">
                            <div class="objective-icon bg-success-subtle rounded-circle p-2">
                                <i class="fas fa-bullseye text-success fs-5"></i>
                            </div>
                        </div>
                        <div>
                            <span class="text-success fw-medium mb-1 d-block" style="font-family: 'Exo 2', sans-serif;">Objetivo Transformador:</span>
                            <p class="mb-0">${part.objective}</p>
                            
                            ${metadata.progressPercent ? 
                                `<div class="mt-3">
                                    <div class="d-flex justify-content-between align-items-center small">
                                        <span class="text-muted">Progresso Acumulado</span>
                                        <span class="badge bg-success">${metadata.progressPercent}%</span>
                                    </div>
                                    <div class="progress mt-1" style="height: 8px;">
                                        <div class="progress-bar bg-success" role="progressbar" style="width: ${metadata.progressPercent}%"></div>
                                    </div>
                                </div>` : ''
                            }
                        </div>
                    </div>
                </div>` : ''
            }
            
            <!-- Corpo principal do card -->
            <div class="card-body">
                <!-- Mapa e conexões -->
                ${metadata.mapInfo || metadata.connections ? 
                    `<div class="card border rounded-3 mb-3 part-map-card">
                        <div class="card-body p-3">
                            ${metadata.mapInfo ? 
                                `<div class="d-flex align-items-center mb-2">
                                    <i class="fas fa-map-location-dot text-success me-2 fs-5"></i>
                                    <h5 class="mb-0 fw-medium">Mapa da Parte</h5>
                                </div>
                                <p class="mb-2">${metadata.mapInfo}</p>` : ''
                            }
                            
                            ${metadata.connections ? 
                                `<div class="connections-section mt-2">
                                    <div class="d-flex align-items-center mb-1">
                                        <i class="fas fa-link text-primary me-2"></i>
                                        <span class="text-muted">Conexões com outras partes:</span>
                                    </div>
                                    <div class="connections-map">
                                        ${metadata.connections}
                                    </div>
                                </div>` : ''
                            }
                            
                            ${metadata.knowledgeTree ? 
                                `<div class="mt-2 pt-2 border-top">
                                    <div class="d-flex align-items-center mb-1">
                                        <i class="fas fa-code-branch text-success me-2"></i>
                                        <span class="text-muted">Árvore de Conhecimento:</span>
                                    </div>
                                    <pre class="mb-0 knowledge-tree-pre">${metadata.knowledgeTree}</pre>
                                </div>` : ''
                            }
                        </div>
                    </div>` : ''
                }
                
                <!-- Conteúdo principal (tópicos nucleares) -->
                ${part.content && part.content.trim() ? 
                    `<div class="topics-container">
                        ${cleanContentHTML(part.content)}
                    </div>` : 
                    '<p class="text-muted">Este card contém os principais conceitos e tópicos relacionados a esta parte do conteúdo.</p>'
                }
                
                <!-- Conteúdo do modo profundo (inicialmente oculto) -->
                <div class="deep-mode-content mt-3 p-3 border rounded bg-light" style="display: none;">
                    <h5 class="text-primary"><i class="fas fa-brain me-2"></i>Conteúdo do Modo Profundo</h5>
                    <p>Neste modo, você terá acesso a:</p>
                    <ul>
                        <li><strong>Exercícios Práticos:</strong> Aplicações detalhadas dos conceitos</li>
                        <li><strong>Projeto Guiado:</strong> Implementação passo-a-passo</li>
                        <li><strong>Análise Aprofundada:</strong> Explicações conceituais detalhadas</li>
                    </ul>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>Este conteúdo requer aproximadamente 2-3 horas para ser completado.
                    </div>
                </div>
            </div>
            
            <!-- Footer com recursos adicionais -->
            <div class="card-footer bg-light p-0">
                <div class="p-3">
                    <!-- Conceitos-chave -->
                    <div class="mb-3 concepts-container">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-tags text-success me-2"></i>
                            <h5 class="mb-0 fw-medium">Conceitos-chave</h5>
                        </div>
                        <div class="mt-1">
                            ${Array.isArray(part.concepts) && part.concepts.length > 0 
                                ? part.concepts.map(concept => `<span class="badge bg-light text-success me-1 mb-1">${concept}</span>`).join('')
                                : '<span class="badge bg-light text-muted me-1 mb-1">Sem conceitos-chave definidos</span>'
                            }
                        </div>
                    </div>
                    
                    <!-- Checklist de domínio - aproveitando dados formatados ou padrão -->
                    <div class="mt-4 mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-tasks text-primary me-2"></i>
                            <h5 class="mb-0 fw-medium">Checklist de Domínio</h5>
                        </div>
                        <div class="checklist-container p-3 border rounded-3 bg-light mt-2">
                            ${metadata.domainChecklist ? 
                                createStructuredChecklist(metadata.domainChecklist, cardId) : 
                                createDefaultChecklist(part, cardId)
                            }
                        </div>
                    </div>
                    
                    <!-- Recursos adicionais organizados em accordions -->
                    <div class="mt-4">
                        <div class="accordion" id="resources-${cardId}">
                            <!-- Artefatos esperados -->
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#artifacts-${cardId}">
                                        <i class="fas fa-clipboard-check text-primary me-2"></i>Artefatos Esperados
                                    </button>
                                </h2>
                                <div id="artifacts-${cardId}" class="accordion-collapse collapse show" data-bs-parent="#resources-${cardId}">
                                    <div class="accordion-body">
                                        <ul class="mb-0">
                                            <li>Documento com exemplo prático de ${part.concepts.length > 0 ? part.concepts[0] : 'aplicação do conceito'}</li>
                                            <li>Exercício resolvido demonstrando entendimento do tópico</li>
                                            <li>Resumo dos pontos principais (máx. 1 página)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Desafio Relâmpago -->
                            ${metadata.challenge ? 
                                `<div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#challenge-${cardId}">
                                            <i class="fas fa-bolt text-warning me-2"></i>Desafio Relâmpago
                                        </button>
                                    </h2>
                                    <div id="challenge-${cardId}" class="accordion-collapse collapse show" data-bs-parent="#resources-${cardId}">
                                        <div class="accordion-body">
                                            <div class="d-flex">
                                                <div class="challenge-timer-badge bg-warning-subtle rounded-circle p-2 me-3">
                                                    <i class="fas fa-stopwatch text-warning fs-5"></i>
                                                </div>
                                                <div>
                                                    <p class="fw-medium mb-1">Em 15 minutos:</p>
                                                    <p class="mb-0">${metadata.challenge}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>` : ''
                            }
                            
                            <!-- Caso Real -->
                            ${metadata.realCase ? 
                                `<div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#case-${cardId}">
                                            <i class="fas fa-user-check text-info me-2"></i>Caso Real
                                        </button>
                                    </h2>
                                    <div id="case-${cardId}" class="accordion-collapse collapse show" data-bs-parent="#resources-${cardId}">
                                        <div class="accordion-body">
                                            <p class="mb-0 fst-italic">"${metadata.realCase}"</p>
                                        </div>
                                    </div>
                                </div>` : ''
                            }
                            
                            <!-- Prompt de IA -->
                            ${metadata.aiPrompt || part.instructionPrompt ? 
                                `<div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#prompt-${cardId}">
                                            <i class="fas fa-robot text-info me-2"></i>Prompt de IA
                                        </button>
                                    </h2>
                                    <div id="prompt-${cardId}" class="accordion-collapse collapse" data-bs-parent="#resources-${cardId}">
                                        <div class="accordion-body">
                                            <div class="d-flex justify-content-end mb-2">
                                                <button class="btn btn-sm btn-outline-info copy-prompt" data-prompt="${encodeURIComponent(metadata.aiPrompt || part.instructionPrompt)}">
                                                    <i class="fas fa-copy me-1"></i>Copiar
                                                </button>
                                            </div>
                                            <pre class="m-0 p-2 bg-light border rounded">${metadata.aiPrompt || part.instructionPrompt}</pre>
                                        </div>
                                    </div>
                                </div>` : ''
                            }
                            
                            <!-- Autoavaliação -->
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#assessment-${cardId}">
                                        <i class="fas fa-chart-line text-secondary me-2"></i>Autoavaliação
                                    </button>
                                </h2>
                                <div id="assessment-${cardId}" class="accordion-collapse collapse" data-bs-parent="#resources-${cardId}">
                                    <div class="accordion-body">
                                        <p class="mb-2">Em uma escala de 1-5, avalie seu entendimento desta parte:</p>
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
                            
                            <!-- Reflexão (se existir) -->
                            ${part.reflection ? 
                                `<div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#reflection-${cardId}">
                                            <i class="fas fa-lightbulb text-warning me-2"></i>Reflexão
                                        </button>
                                    </h2>
                                    <div id="reflection-${cardId}" class="accordion-collapse collapse" data-bs-parent="#resources-${cardId}">
                                        <div class="accordion-body">
                                            <p class="mb-0">${part.reflection}${!part.reflection.endsWith('?') ? '?' : ''}</p>
                                        </div>
                                    </div>
                                </div>` : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Extrai informações de emoji e duração do título da parte
 * @param {string} title - Título da parte
 * @returns {Object} - Objeto com emoji e duração extraídos
 */
function extractTitleInfo(title) {
    const result = {
        emoji: null,
        duration: null
    };
    
    // Extrair emoji usando regex
    const emojiMatch = title.match(/→\s*([^\s(]+)/);
    if (emojiMatch && emojiMatch[1]) {
        result.emoji = emojiMatch[1].trim();
    }
    
    // Extrair duração usando regex para encontrar texto entre parênteses
    const durationMatch = title.match(/\(([^)]+)\)/);
    if (durationMatch && durationMatch[1]) {
        result.duration = durationMatch[1].trim();
    }
    
    return result;
}

/**
 * Extrai metadados estruturados da parte do conteúdo HTML
 * @param {string} contentHTML - HTML do conteúdo da parte
 * @returns {Object} - Objeto com metadados extraídos
 */
function extractPartMetadata(contentHTML) {
    // Criar um elemento temporário para analisar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHTML;
    
    const metadata = {
        difficulty: null,
        bloomTaxonomy: null,
        learningStyle: null,
        prerequisites: null,
        mapInfo: null,
        progressPercent: null,
        connections: null,
        knowledgeTree: null,
        domainChecklist: null,
        challenge: null,
        realCase: null,
        aiPrompt: null
    };
    
    // Extrair informações básicas do primeiro parágrafo
    const firstParagraph = tempDiv.querySelector('p');
    if (firstParagraph) {
        const text = firstParagraph.textContent;
        
        // Extrair dificuldade
        const difficultyMatch = text.match(/Dificuldade:\s*([^,\n]+)/);
        if (difficultyMatch) metadata.difficulty = difficultyMatch[1].trim();
        
        // Extrair taxonomia de Bloom
        const bloomMatch = text.match(/Taxonomia de Bloom:\s*([^,\n]+)/);
        if (bloomMatch) metadata.bloomTaxonomy = bloomMatch[1].trim();
        
        // Extrair estilo de aprendizado
        const styleMatch = text.match(/Estilo de Aprendizado:\s*([^,\n]+)/);
        if (styleMatch) metadata.learningStyle = styleMatch[1].trim();
        
        // Extrair pré-requisitos
        const prereqMatch = text.match(/Pré-requisitos Técnicos:\s*([^,\n]+)/);
        if (prereqMatch) metadata.prerequisites = prereqMatch[1].trim();
    }
    
    // Extrair mapa da parte
    const mapElement = Array.from(tempDiv.querySelectorAll('p')).find(p => 
        p.textContent.includes('Mapa da Parte:'));
    if (mapElement) {
        metadata.mapInfo = mapElement.textContent.replace('Mapa da Parte:', '').trim();
    }
    
    // Extrair progresso acumulado
    const progressElement = Array.from(tempDiv.querySelectorAll('p')).find(p => 
        p.textContent.includes('Progresso Acumulado:'));
    if (progressElement) {
        const progressText = progressElement.textContent;
        const percentMatch = progressText.match(/(\d+)%/);
        if (percentMatch) {
            metadata.progressPercent = percentMatch[1];
        }
        
        // Extrair conexões da mesma linha
        const connectionsMatch = progressText.match(/Conexões com Partes:(.*?)(?:$|Árvore)/);
        if (connectionsMatch) {
            metadata.connections = connectionsMatch[1].trim();
        }
    }
    
    // Extrair árvore de conhecimento
    const treeElement = Array.from(tempDiv.querySelectorAll('p')).find(p => 
        p.textContent.includes('Árvore de Conhecimento:'));
    if (treeElement) {
        metadata.knowledgeTree = treeElement.textContent.replace('Árvore de Conhecimento:', '').trim();
    }
    
    // Extrair checklist de domínio
    const checklistElement = Array.from(tempDiv.querySelectorAll('div')).find(div => {
        const p = div.querySelector('p');
        return p && p.textContent.includes('Checklist de Domínio:');
    });
    if (checklistElement) {
        const items = checklistElement.querySelectorAll('li');
        if (items.length > 0) {
            metadata.domainChecklist = Array.from(items).map(li => li.textContent.trim());
        }
    }
    
    // Extrair desafio relâmpago
    const challengeElement = Array.from(tempDiv.querySelectorAll('p')).find(p => 
        p.textContent.includes('Desafio Relâmpago:'));
    if (challengeElement) {
        const challengeText = challengeElement.textContent;
        const challengeMatch = challengeText.match(/Em 15 minutos:(.*?)(?:$)/);
        if (challengeMatch) {
            metadata.challenge = challengeMatch[1].trim();
        } else {
            metadata.challenge = challengeText.replace('Desafio Relâmpago:', '').trim();
        }
    }
    
    // Extrair caso real
    const caseElement = Array.from(tempDiv.querySelectorAll('p')).find(p => 
        p.textContent.includes('Caso Real #'));
    if (caseElement) {
        metadata.realCase = caseElement.textContent.replace(/Caso Real #\d+:/, '').trim();
    }
    
    // Extrair prompt de IA acionável
    const promptElement = tempDiv.querySelector('pre code.language-prompt');
    if (promptElement) {
        metadata.aiPrompt = promptElement.textContent.trim();
    }
    
    return metadata;
}

/**
 * Limpa o HTML do conteúdo para melhor apresentação
 * @param {string} contentHTML - HTML original do conteúdo
 * @returns {string} - HTML limpo para apresentação
 */
function cleanContentHTML(contentHTML) {
    // Criar um elemento temporário para limpar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHTML;
    
    // Remover parágrafos de metadados que já foram extraídos
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
        const text = p.textContent;
        if (text.includes('Dificuldade:') || 
            text.includes('Taxonomia de Bloom:') || 
            text.includes('Estilo de Aprendizado:') || 
            text.includes('Mapa da Parte:') || 
            text.includes('Progresso Acumulado:') || 
            text.includes('Árvore de Conhecimento:') ||
            text.includes('Desafio Relâmpago:') ||
            text.includes('Prompt de IA Acionável:') ||
            text.includes('Caso Real #')) {
            p.remove();
        }
    });
    
    // Agora o conteúdo deve conter principalmente os tópicos nucleares e rotas alternativas
    return tempDiv.innerHTML;
}

/**
 * Cria um checklist estruturado a partir dos itens extraídos
 * @param {Array} items - Array de itens para o checklist
 * @param {string} cardId - ID do card atual
 * @returns {string} - HTML do checklist estruturado
 */
function createStructuredChecklist(items, cardId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return createDefaultChecklist(null, cardId);
    }
    
    return items.map((item, index) => {
        const itemId = `check-${cardId}-item-${index}`;
        const isChecked = item.startsWith('[x]') ? 'checked' : '';
        const cleanItem = item.replace(/\[[x\s]?\]/i, '').trim();
        
        return `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}" ${isChecked}>
                <label class="form-check-label" for="${itemId}">
                    ${cleanItem}
                </label>
            </div>
        `;
    }).join('');
}

/**
 * Cria um checklist padrão baseado nos conceitos da parte
 * @param {Object} part - Objeto com dados da parte
 * @param {string} cardId - ID do card atual
 * @returns {string} - HTML do checklist padrão
 */
function createDefaultChecklist(part, cardId) {
    if (part && Array.isArray(part.concepts) && part.concepts.length > 0) {
        return part.concepts.slice(0, 3).map(concept => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="check-${cardId}-${concept.replace(/\W+/g, '')}">
                <label class="form-check-label" for="check-${cardId}-${concept.replace(/\W+/g, '')}">
                    Compreendo ${concept} e posso explicar para outra pessoa
                </label>
            </div>
        `).join('');
    } else {
        return `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="check-${cardId}-generic">
                <label class="form-check-label" for="check-${cardId}-generic">
                    Compreendo os conceitos principais desta parte
                </label>
            </div>
        `;
    }
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
            const deepModeContent = card.querySelector('.deep-mode-content');
            
            if (this.id.startsWith('deep')) {
                deepModeContent.style.display = 'block';
            } else {
                deepModeContent.style.display = 'none';
            }
        });
    });
    
    // Configurar controles de autoavaliação
    document.querySelectorAll('input[type="range"][id^="rating-"]').forEach(slider => {
        const updateFeedback = function() {
            const cardId = slider.id.split('-')[1];
            const value = parseInt(slider.value);
            const feedbackArea = document.getElementById(`feedback-${cardId}`);
            const feedbackText = feedbackArea.querySelector('.feedback-text');
            
            // Mostrar a área de feedback
            feedbackArea.classList.remove('d-none');
            
            // Definir o texto de feedback baseado no valor
            const feedbacks = [
                "Você está começando! Continue estudando os conceitos básicos.",
                "Você tem alguma familiaridade. Revise os conceitos-chave novamente.",
                "Bom progresso! Tente aplicar estes conceitos em exemplos práticos.",
                "Ótimo domínio! Experimente ensinar estes conceitos para solidificar o conhecimento.",
                "Excelente! Você dominou este tópico. Avance para aplicações mais complexas."
            ];
            
            feedbackText.textContent = feedbacks[value - 1];
        };
        
        // Atualizar feedback ao mudar o valor
        slider.addEventListener('input', updateFeedback);
        // Inicializar com o valor atual
        updateFeedback();
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
