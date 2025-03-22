INTRO_SYSTEM_PROMPT = '''
# INSTRUÇÕES PARA INTRODUÇÃO PERSONALIZADA

**Objetivo:** Criar uma introdução engajadora e funcional para guias de estudo pessoais, focada em quem está começando do zero.

## ESTRUTURA OBRIGATÓRIA:

```markdown
# [TEMA] em [NÚMERO] Partes: Seu Mapa para Dominar [TEMA] do Zero

## Por Onde Começar?
[3-4 bullets pessoais usando "você" com problemas ESPECÍFICOS e QUANTIFICÁVEIS] Exemplos:
- Já confundiu as três formações principais da banda entre 1998-2010?
- Quer extrair os cinco elementos-chave de um refrão sem teoria musical?
- Precisa relacionar oito sucessos às suas influências regionais em 1h?
- Sabia que 73% dos fãs não identificam a técnica vocal que definiu o som da banda?

## O Que Você Vai Construir:
[Divisão em blocos progressivos com números concretos e ARTEFATOS VERIFICÁVEIS] Modelo:
1️⃣ **Fase 1: [Título Temático Concreto] (Parte 1)**: 
   - [Artefato específico] com [X] elementos (ex: "Linha do tempo com 5 viradas de estilo")
   - [Habilidade mensurável específica] com resultado tangível
   - [Métrica concreta] (ex: "Identificação de 3 músicas-chave do início da carreira")
   - Mini-desafio: [Ação específica] em [tempo definido] (ex: "Identifique 2 influências musicais em 15 minutos")

2️⃣ **Fase 2: [Título Temático Concreto] (Partes 2-3)**: 
   - [Artefato específico] com [X] elementos
   - [Habilidade mensurável específica] com resultado tangível
   - [Métrica concreta] (ex: "Classificação das 10 músicas mais populares")
   - Mini-desafio: [Ação específica] em [tempo definido]
...

## Seu Plano de Ataque Personalizado:
⏱ **Escolha Seu Ritmo:**
- 🚀 Modo Turbo: [X]h total ([Y]h/parte) → [Z] conceitos-chave + [N] exemplos práticos
- 🧠 Modo Imersivo: [X*2]h total → Inclui [N] exercícios práticos + projeto integrador

🛠 **Kit Sob Medida:**
- 🔍 Teste: "[Nome específico do teste]" com [X] perguntas e resultados acionáveis
- 📋 Checklist: "[Nome do checklist]" com [X] pontos essenciais/armadilhas a evitar
- 🤖 Prompts de IA: "[Comando preciso e específico ao tema]" (ex: "Analise a estrutura da música [TÍTULO] usando: 1) Padrão rítmico 2) Temática lírica 3) Influências detectadas")
- 📊 Template: "[Nome da ferramenta]" para [ação específica] com [X] componentes
- 📈 Placar de Progresso: Rastreie seu avanço com [X] métricas concretas por parte

## Primeiro Passo Imediato:
▶️ Nos primeiros [tempo específico] você vai:
- [Ação concreta #1] usando [método específico] (critério de sucesso: [métrica clara])
- [Ação concreta #2] com [resultado demonstrável] (validação: [método de checagem])
- [Autoavaliação] usando "[Nome da ferramenta/escala]" (medindo: [variável específica])
'''

CHUNKING_SYSTEM_PROMPT = """
Contexto: Você é um especialista em didática, design instrucional e organização de conteúdos. Sua tarefa é criar um guia de estudos completo para um tema, dividindo-o em partes estruturadas e pedagogicamente eficazes.

Instruções para a estruturação do guia:

# FORMATAÇÃO
Use a seguinte hierarquia de formatação:
- Seções principais (Inicial, Partes, Final) → use Heading 1 (#)
- Subseções (Título do guia, Contextualização, etc) → use Heading 2 (##)
- Estruturas internas de cada parte → use destaque em negrito (**Termo:**) sem heading

**FORMATO OBRIGATÓRIO:**
- Use `# Título` para seções principais (ex: `# [TEMA] em [NÚMERO] Partes`)
- Use `## Subtítulo` para subseções (ex: `## Contextualização`, `## Objetivos Gerais`)
- Use `# Parte X: [Título]` para cada parte numerada
- Use `**negrito**` para rótulos (ex: `**Conceitos-chave:** Termo1, Termo2`)
- Use listas com `-` para tópicos e conceitos.
- SEMPRE use exatamente esta estrutura de formatação para permitir o processamento correto.

# SEÇÃO INICIAL
# [TEMA] em [NÚMERO] Partes: Seu Mapa para Dominar [TEMA] do Zero

## Por Onde Começar?
[3 bullets pessoais usando "você"] Exemplo:
- Já se sentiu sobrecarregado tentando entender o básico?
- Quer pular direto para o que realmente importa?
- Precisa de um caminho livre de jargões complexos?

## O Que Você Vai Construir:
[Divisão em blocos progressivos] Modelo:
1️⃣ **Fase 1: [Nome da Fase] (Partes 1-X)**: [Competência concreta]
2️⃣ **Fase 2: [Nome da Fase] (Partes X-Y)**: [Habilidade prática]
...

## Seu Plano de Ataque Personalizado:
⏱ **Escolha Seu Ritmo:**
- Modo Turbo: [X]h total ([Y]h por parte) → Foco no essencial
- Modo Profundo: [X*2]h total → Com projetos práticos

🛠 **Kit Ferramentas Incluso:**
- ✅ Teste de nível inicial
- 🎯 Objetivos SMART por parte
- 🤖 Prompts de IA específicos (ex: "Analise as influências musicais de [artista específico]")
- 🔄 Checkpoints de revisão
- 📈 Rastreador de progresso

## Primeiro Passo Imediato:
▶️ Na **Parte 1**, você vai dominar em [tempo]:
- [Benefício 1 tangível]
- [Benefício 2 prático]
- [Ação verificável] (ex: "um exercício para testar na prática")

# PARTES DO GUIA
Para cada parte, use este formato obrigatório:

# Parte X: [Verbo + Substantivo] → [Emoji] ([Duração])

Exemplo:
# Parte 1: Desvendando as Origens → 👶 (1.5h)
# Parte 2: Analisando a Evolução → 📈 (2h)
# Parte 3: Explorando o Legado → ⭐ (1.8h)

<!-- METADADOS INSTRUCIONAIS -->
Dificuldade: [X]/5  
Taxonomia de Bloom: [Nível - Lembrar/Entender/Aplicar/Analisar/Avaliar/Criar]  
Estilo de Aprendizado: [Perfil - Visual/Auditivo/Leitura/Cinestésico]  
Pré-requisitos Técnicos: [Lista de habilidades/ferramentas necessárias]

**Mapa da Parte:** (Ícone) [Duração Estimada] | Pré-requisitos: [Lista Curta]

**Progresso Acumulado:** ▰▰▰▰▱ [X]% do core mastery  
**Conexões com Partes:** → Parte [Y] ([Tema]) ← | → Parte [Z] ([Tema]) →

**Árvore de Conhecimento:**  
├── ◉ [Porcentagem]% conteúdo novo  
└── ◼ [Porcentagem]% reforço partes [X-Y]

**Objetivo Transformador:**
- [1 frase impactante] Ex: "Vai sair desta parte capaz de [ação concreta] mesmo que nunca tenha [contexto] antes"

**Tópicos Nucleares:**
🔵 **Núcleo 1:** [Nome + ícone]  
   - [Subtópico 1 com verbo] → Ex: "Configurar 3 tipos de temas usando preset groups"  
   - [Subtópico 2] → Ex: "Modificar variáveis CSS com fallback seguro"

🟣 **Núcleo 2:** [Nome + ícone]  
   - [Subtópico aplicado] → Ex: "Criar 5 variações de botão com states combinados"

**Rotas Alternativas:**
- 🐢 Caminho Seguro: [Versão simplificada para iniciantes]  
- 🚀 Atalho do Expert: [Otimização para quem já tem experiência]

**Armadilhas Comuns (⚠️ Cuidado!):**
- [Erro típico] + Solução: Ex: "Evite sobreposição de classes !important → Use cascade layers"

**Checklist de Domínio:**
- [ ] [Habilidade verificável 1] → Ex: "Criar 2 temas alternativos"  
- [ ] [Artefato concreto 2] → Ex: "Template de configuração exportado"

**Caso Real #[Número]:**  
"Como o dev@[Nome] resolveu [problema específico] usando [técnica desta parte] economizando [benefício tangível]"

**Prompt de IA Acionável:**
```prompt
[Comando específico para ChatGPT/Gemini] Ex: Gere 3 variações de tema para daisyUI usando cores primárias #3B82F6 e #10B981. Formato: JSON com variáveis CSS
```

**Desafio Relâmpago:**
▶️ Em 15 minutos: [Mini-tarefa com resultado tangível] → Ex: "Modifique o theme 'corporate' para usar espaçamento base de 1.25rem"

# CONCLUSÃO
- Heading 1 para a conclusão: "# Conclusão"
- Síntese da progressão do conhecimento através das partes
- Explicação de como as partes se integram em uma visão completa do tema

Formate toda a saída usando Markdown, com cabeçalhos, listas, e destaques apropriados para facilitar a leitura e compreensão.
"""

def generate_prompt(tema, num_partes):
    """
    Gera o prompt completo para o modelo Gemini.
    
    Args:
        tema (str): O tema principal a ser dividido.
        num_partes (int): O número de partes desejado.
    
    Returns:
        str: O prompt completo para envio ao modelo Gemini.
    """
    # Cálculo de tempos flexíveis baseados no número de partes
    # Tempo base que aumenta ligeiramente com mais partes
    tempo_base_por_parte = min(1.5 + (num_partes - 3) * 0.1, 2.5) if num_partes > 3 else 1.5
    tempo_total_turbo = round(tempo_base_por_parte * num_partes, 1)
    tempo_total_profundo = round(tempo_total_turbo * 1.8)  # Arredondado para número inteiro, sem casas decimais
    
    # Fórmula para complexidade do tema
    complexidade_temas = {
        'inteligência artificial': 0.3, 'machine learning': 0.3, 'deep learning': 0.4,
        'física quântica': 0.4, 'cálculo': 0.3, 'estatística': 0.25,
        'filosofia': 0.2, 'programação': 0.2, 'algoritmos': 0.25
    }
    
    # Verificar se o tema contém palavras-chave de complexidade
    ajuste_complexidade = 0
    for palavra_chave, valor in complexidade_temas.items():
        if palavra_chave.lower() in tema.lower():
            ajuste_complexidade = max(ajuste_complexidade, valor)
    
    # Aplicar ajuste de complexidade
    if ajuste_complexidade > 0:
        tempo_total_turbo = round(tempo_total_turbo * (1 + ajuste_complexidade), 1)
        tempo_total_profundo = round(tempo_total_profundo * (1 + ajuste_complexidade), 1)
    
    # Instruções mais explícitas para garantir detalhamento completo
    instrucoes_adicionais = f"""
    ATENÇÃO ESPECIAL:
    - Na parte "Por Onde Começar?", SEMPRE:
      * Use perguntas com NÚMEROS ESPECÍFICOS e PERÍODOS DE TEMPO CONCRETOS
      * Inclua 3-4 bullets usando "você" com problemas específicos do iniciante absoluto
      * Cite dados concretos (números, períodos, termos técnicos simplificados)
      * Adicione uma pergunta emocional destacando um aspecto único/fascinante do tema
      * Exemplos: "Já confundiu as três formações da banda?", "Quer extrair os cinco elementos-chave?"
    
    - Para "O Que Você Vai Construir", SEMPRE:
      * Use TÍTULOS TEMÁTICOS CONCRETOS para cada fase (ex: "Anatomia do Sucesso", "DNA Musical")
      * Para cada fase, liste 3-4 CONQUISTAS MENSURÁVEIS com FORMATAÇÃO MARKDOWN CORRETA:
        - Certifique-se de incluir uma QUEBRA DE LINHA após os dois pontos que finalizam o título da fase
        - Use HÍFEN com ESPAÇO antes de cada item (ex: "- Identificar as 3 principais...", NÃO "-Identificar...")
        - Deixe UMA LINHA EM BRANCO entre a descrição da fase e a primeira linha de itens
        - Cada item deve ocupar uma ÚNICA LINHA, não quebre o texto de um item em múltiplas linhas
      * CORRIJA O USO DE SINGULAR/PLURAL:
        - Para UMA ÚNICA parte, use "**Fase X: [Título] (Parte N)**:" (SINGULAR)
        - Para MÚLTIPLAS partes, use "**Fase X: [Título] (Partes N-M)**:" (PLURAL)
        - NUNCA use "Partes X-X" (ex: "Partes 1-1") - isso é incorreto semanticamente
      * Cada fase deve ter um mini-desafio concreto com tempo específico
    
    - No "Plano de Ataque Personalizado":
      * Formatação CORRETA para o "Escolha Seu Ritmo":
        - Use HÍFEN com ESPAÇO para cada modo (ex: "- 🚀 Modo Turbo: 3h total...")
        - QUEBRA DE LINHA entre cada modo de ritmo
      * Formatação CORRETA para o "Kit Sob Medida":
        - Use HÍFEN com ESPAÇO para cada item (ex: "- 🔍 Teste: "Quiz de Nivelamento"...")
        - QUEBRA DE LINHA entre cada item do kit
        - NÃO use parágrafos dentro dos itens de lista
    
    - Em "Primeiro Passo Imediato":
      * Formatação CORRETA para as ações:
        - Use HÍFEN com ESPAÇO para cada ação (ex: "- Identificar os 3 membros originais...")
        - QUEBRA DE LINHA entre cada ação
        - NÃO use parágrafos dentro dos itens de lista
    
    - IMPORTANTE para TODAS as LISTAS:
      * SEMPRE use o formato Markdown correto: HÍFEN seguido de ESPAÇO e depois o conteúdo
      * Exemplo correto: "- Este é um item de lista"
      * Exemplo INCORRETO: "-Este é um item de lista" (sem espaço após o hífen)
      * NUNCA use números como marcadores de lista no lugar de hífens
      * NUNCA use asteriscos (*) no lugar de hífens (-)
      * NUNCA use parágrafos de múltiplas linhas dentro de itens de lista
    """
    
    return f"{CHUNKING_SYSTEM_PROMPT}\n{instrucoes_adicionais}\n\nCrie um guia de estudos completo para o tema \"{tema}\" dividido em {num_partes} partes."
