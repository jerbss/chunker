/**
 * Script de inicialização para garantir que os cards sejam exibidos corretamente
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando exibição de cards...");
    
    // Esconder o fallback content
    const fallbackContent = document.getElementById('fallback-content');
    if (fallbackContent) {
        console.log("Fallback content encontrado, escondendo...");
        fallbackContent.classList.add('d-none');
    } else {
        console.log("Fallback content não encontrado.");
    }
    
    // Verificar se o carregamento de cards está visível
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        console.log("Container de loading encontrado, exibindo...");
        loadingContainer.classList.remove('d-none');
    } else {
        console.log("Container de loading não encontrado.");
    }
    
    // Verificar se o container de cards existe
    const cardsContainer = document.getElementById('cards-container');
    if (cardsContainer) {
        console.log("Container de cards encontrado!");
        console.log(`Quantidade de cards no container: ${cardsContainer.children.length}`);
        
        // Se não tiver conteúdo mas o fallback tiver, forçar reprocessamento
        if (cardsContainer.children.length === 0 && fallbackContent) {
            console.log("Forçando reprocessamento de conteúdo...");
            
            // Habilitar debug para diagnóstico
            if (typeof enableDebugMode === 'function') {
                enableDebugMode();
                console.log("Modo de debug ativado para diagnóstico.");
            } else {
                console.log("Função enableDebugMode não disponível.");
            }
            
            // Tentar reprocessar o conteúdo
            if (typeof processContent === 'function') {
                console.log("Chamando processContent()...");
                processContent();
            } else {
                console.log("Função processContent não disponível.");
            }
        } else if (cardsContainer.children.length > 0) {
            console.log("Cards já foram gerados, não é necessário reprocessar.");
        }
    } else {
        console.log("Container de cards NÃO encontrado!");
    }
});
