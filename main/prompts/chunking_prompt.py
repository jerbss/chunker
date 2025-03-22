INTRO_SYSTEM_PROMPT = '''
# INSTRUÇÕES PARA INTRODUÇÃO PERSONALIZADA

**Objetivo:** Criar uma introdução engajadora e funcional para guias de estudo pessoais, focada em quem está começando do zero.

## ESTRUTURA OBRIGATÓRIA:

```markdown
# [TEMA] em [NÚMERO] Partes: Seu Mapa para Dominar [TEMA] do Zero

## Por Onde Começar?
[3-4 bullets pessoais usando "você" com problemas específicos] Exemplo:
- Já ficou sem entender POR QUE [problema específico do tema]?
- Quer [benefício concreto] sem precisar [obstáculo comum]?
- Precisa [objetivo aspiracional específico], mesmo começando do zero?
- [OPCIONAL] Quer desvendar [algo único/emocionante sobre o tema]? (ex: "o segredo por trás dos refrões contagiantes que fizeram o Brasil se apaixonar pelo Sorriso Maroto?")

## O Que Você Vai Construir:
[Divisão em blocos progressivos com números concretos e métricas mensuráveis] Modelo:
1️⃣ **Fase 1: [Nome Concreto da Fase] (Parte 1)**: 
   - [Número específico] de conceitos que explicam [porcentagem/maioria] do tema
   - [Habilidade mensurável específica] com [X%] de domínio após conclusão
   - [Métrica concreta] (ex: "75% da história da banda coberta", "8 dos 10 padrões fundamentais")
   - [Mini-desafio] (ex: "Teste seu domínio com um quiz de 5 perguntas ao final desta parte")

2️⃣ **Fase 2: [Nome Concreto da Fase] (Partes 2-3)**: 
   - [Habilidade técnica específica com resultado tangível]
   - [Ferramenta ou método prático] com [nível ou valor mensurável]
   - [Aumento percentual em competência/eficiência] (ex: "redução de 40% no tempo de execução")
   - [Mini-desafio] (ex: "Crie sua própria análise de uma música usando o método aprendido")
...

## Seu Plano de Ataque Personalizado:
⏱ **Escolha Seu Ritmo:**
- 🚀 Modo Expresso: [X]h total ([Y]h/parte, ajustável por complexidade) → Conceitos-chave + exemplos
- 🧠 Modo Imersivo: [X*2]h total → Com prática e aplicações reais

🛠 **Kit Sob Medida:**
- 🔍 Teste: "[Nome específico do teste]" (com resultados acionáveis)
- 📋 Checklist de [número específico] pontos essenciais
- 🤖 Prompts de IA: "[Exemplo concreto e detalhado específico do tema]" (ex: "Gere uma análise das 5 músicas mais românticas do Sorriso Maroto e identifique as influências musicais em cada uma")
- 📊 Template de [ferramenta prática] personalizável
- 📈 Placar de Progresso: Rastreie seu avanço com [X] métricas concretas por parte

## Primeiro Passo Imediato:
▶️ Na **Parte 1**, em [tempo específico] você vai:
- [Realização concreta #1] usando [método específico]
- [Realização concreta #2] com [resultado demonstrável]
- [Ação prática] em uma situação real de [contexto aplicado]
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
    - Use números específicos para criar credibilidade (ex: "7 regras principais", "domine 90% do vocabulário")
    - Na parte "Por Onde Começar?", SEMPRE:
      * Mencione frustrações reais e específicas dos iniciantes no tema
      * Adicione uma quarta pergunta emocional que destaque algo único, fascinante ou inspirador sobre o tema
      * Exemplo para música: "Quer desvendar o segredo por trás dos refrões contagiantes que fizeram o Brasil se apaixonar?"
      * Exemplo para tecnologia: "Curioso para descobrir como os algoritmos que você usa diariamente transformam o mundo?"
    - Para "O Que Você Vai Construir", SEMPRE use métricas concretas em vez de porcentagens:
      * Use contagens específicas: "Conhecimento das 10 músicas mais importantes" em vez de "75% dos sucessos"
      * Use números precisos: "Análise de 5 álbuns-chave" em vez de "90% da discografia"
      * Use resultados quantificáveis: "Criação de 3 playlists temáticas" em vez de "Capacidade de organizar músicas"
      * Exemplo: "1️⃣ **Fase 1: Raízes e Ascensão (Parte 1)**: Domínio das 8 músicas fundamentais e compreensão dos 3 momentos decisivos na formação da banda"
    - No "Kit Sob Medida", SEMPRE inclua:
      * Um exemplo concreto de objetivo SMART: "🎯 Objetivos SMART: Ex: 'Identificar as 5 principais influências musicais do Sorriso Maroto até o final da Parte 2'"
      * Para "Prompts de IA" forneça um exemplo detalhado específico ao tema
      * Os exemplos DEVEM ser adaptados ao tema específico do guia, não genéricos
    - Na seção "Escolha Seu Ritmo", use tempos arredondados e intuitivos:
      * Modo Turbo: {tempo_total_turbo}h total ({tempo_base_por_parte}h por parte, ajustável)
      * Modo Profundo: {tempo_total_profundo}h total ({round(tempo_total_profundo/num_partes)}h por parte)
    - Em "Primeiro Passo Imediato", SEMPRE inclua um exercício prático detalhado:
      * Exemplo para música: "Um exercício prático: Liste as 5 músicas iniciais e identifique o tema principal de cada uma"
      * Exemplo para tecnologia: "Um exercício prático: Crie um diagrama simples mostrando os 3 componentes principais e suas conexões"
      * Seja específico sobre o que o usuário deve produzir/criar e como verificar o resultado
    - Use SEMPRE EXATAMENTE o formato "Parte X: [Verbo + Substantivo] → [Emoji] ([Duração])" para os títulos de cada parte:
      * O formato deve ser seguido literalmente, incluindo os símbolos "→" e os parênteses na duração
      * Exemplos corretos: "Parte 1: Desvendando as Origens → 👶 (1.5h)", "Parte 2: Analisando a Evolução → 📈 (3h)"
      * Escolha emojis relevantes para o conteúdo: 👶 para origens, 📈 para evolução, ⭐ para impacto, etc.
      * Inclua a duração estimada em horas entre parênteses: (1.5h), (2h), (3h)
      * Os títulos devem começar com um VERBO no gerúndio seguido de um substantivo (ex: Desvendando Origens, Explorando Conceitos)
    - Para "O Que Você Vai Construir", SEMPRE use títulos temáticos e descritivos para cada fase:
      * Exemplos de bons títulos: "Raízes e Ascensão", "Consolidação e Evolução", "Legado e Impacto", "Fundamentos Estruturais"
      * Evite títulos genéricos como "Fase Inicial", "Fase Intermediária", "Fase Avançada"
      * Cada título deve capturar a essência temática do conteúdo daquela fase
      * SEMPRE use o formato CORRETO para numeração de partes:
        - Para UMA ÚNICA parte, use: "1️⃣ **Fase 1: [Título Descritivo] (Parte 1)**:" (SINGULAR)
        - Para MÚLTIPLAS partes, use: "2️⃣ **Fase 2: [Título Descritivo] (Partes 2-3)**:" (PLURAL)
      * NUNCA use "Partes X-X" quando se refere a uma única parte (ex: "Partes 1-1") - isso é incorreto
      * Exemplo correto para 3 partes: 
        "1️⃣ **Fase 1: Raízes e Ascensão (Parte 1)**: Domínio das 8 músicas fundamentais..."
        "2️⃣ **Fase 2: Consolidação e Evolução (Parte 2)**: Análise de 5 álbuns-chave..."
        "3️⃣ **Fase 3: Legado e Impacto (Parte 3)**: Compreensão das 6 principais influências..."
    """
    
    return f"{CHUNKING_SYSTEM_PROMPT}\n{instrucoes_adicionais}\n\nCrie um guia de estudos completo para o tema \"{tema}\" dividido em {num_partes} partes."
