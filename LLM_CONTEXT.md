# Chunkify - Technical Design Document

## Visão Geral do Projeto

Chunkify é uma aplicação web que divide temas complexos em partes menores e mais digestíveis chamadas "chunks". O sistema utiliza modelos de linguagem de IA (Gemini da Google e Zuki Journey API) para gerar guias de estudo estruturados a partir de um tema especificado pelo usuário. O conteúdo é organizado em seções (introdução, partes numeradas e conclusão) e apresentado em uma interface de fácil navegação.

## Arquitetura Técnica

A aplicação segue uma arquitetura MVC (Model-View-Controller) implementada com Django, com os seguintes componentes:

- **Backend**: Django (Python)
- **Frontend**: HTML, CSS (Bootstrap), JavaScript
- **APIs de IA**: 
  - Principal: Zuki Journey API (wrapper OpenAI)
  - Fallback: Google Gemini API
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)

## Principais Componentes

### Backend

1. **Views (main/views.py)**: 
   - `test_gemini`: View principal que processa as solicitações e interage com as APIs de IA

2. **Prompts (main/prompts/chunking_prompt.py)**:
   - Define os prompts estruturados enviados às APIs de IA 

3. **Middleware**:
   - Sistema de fallback automático entre APIs
   - Mecanismo de modo de manutenção

### Frontend

1. **Páginas**:
   - `index.html`: Interface principal para entrada e exibição de conteúdo
   - `500.html`: Página de erro

2. **JavaScript (static/js/index.js)**:
   - Processa e estrutura o conteúdo HTML/Markdown gerado pela IA
   - Cria cards organizados para as diferentes partes do conteúdo
   - Gera uma navegação dinâmica (TOC)
   - Implementa layout responsivo com Masonry

3. **CSS (static/css/index.css)**:
   - Estilização personalizada dos componentes
   - Responsividade

## Fluxo de Funcionamento

1. Usuário insere um tema e seleciona o número de partes (chunks)
2. A aplicação envia o prompt para a API primária (Zuki Journey)
3. Em caso de falha, ocorre fallback automático para a API secundária (Gemini)
4. A resposta em Markdown é processada e convertida para HTML
5. O JavaScript analisa o HTML e:
   - Extrai título, introdução, partes e conclusão
   - Organiza o conteúdo em cards estruturados
   - Cria uma navegação (TOC) para as seções
   - Renderiza a interface com o conteúdo formatado

## Considerações de Implementação

### Estratégia de Chunking

- Para temas com poucas partes (<10): Uma única solicitação à API
- Para temas grandes (>10 partes): Múltiplas solicitações divididas
  - Introdução separada
  - Partes em blocos
  - Conclusão separada

### Robustez e Fallback

- Sistema automático de fallback entre APIs
- Tratamento de erros específicos (créditos insuficientes, filtro de conteúdo, etc.)
- Modo de manutenção ativável via comando Django

### Detalhes da Interface

- Cards com estilo consistente para cada seção:
  - Introdução (azul)
  - Partes numeradas (verde)
  - Conclusão (azul)
- Cada card de parte contém:
  - Título
  - Objetivo de aprendizagem
  - Conteúdo principal
  - Conceitos-chave (badges)
  - Pergunta de reflexão
- Navegação lateral (TOC) fixa e recolhível

### Fontes e Pesos

1. **Fontes e Pesos**
    1.1. **Exo 2** (Títulos e Interface)

        | Peso | Uso Recomendado                  | Fallback |
        | ---- | -------------------------------- | -------- |
        | 400  | Textos longos em interfaces      | Arial    |
        | 500  | Botões e labels importantes      | Arial    |
        | 600  | Títulos de seções e cards       | Arial    |
        | 700  | Títulos principais e destaques   | Arial    |

    1.2. **Inter** (Corpo de Texto)

        | Peso | Uso Recomendado          | Fallback    |
        | ---- | ------------------------ | ----------- |
        | 400  | Parágrafos e textos longos | system-ui   |
        | 500  | Destaques e citações     | system-ui   |

## Estrutura de Arquivos Principal

