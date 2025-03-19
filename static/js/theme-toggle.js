/**
 * Controla a funcionalidade do botão de alternância de tema claro/escuro
 */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const htmlElement = document.documentElement;
    
    // Verifica se há preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme');
    
    // Verifica se o sistema tem preferência por tema escuro
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Define o tema inicial baseado na preferência salva ou no sistema
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        htmlElement.classList.add('dark-theme');
        htmlElement.classList.remove('light-theme');
    } else {
        htmlElement.classList.add('light-theme');
        htmlElement.classList.remove('dark-theme');
    }
    
    // Adiciona evento de clique ao botão
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            // Alterna entre os temas
            if (htmlElement.classList.contains('dark-theme')) {
                htmlElement.classList.replace('dark-theme', 'light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                htmlElement.classList.replace('light-theme', 'dark-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // Monitora mudanças na preferência do sistema
    prefersDarkScheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                htmlElement.classList.replace('light-theme', 'dark-theme');
            } else {
                htmlElement.classList.replace('dark-theme', 'light-theme');
            }
        }
    });
});
