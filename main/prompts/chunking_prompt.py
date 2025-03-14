CHUNKING_SYSTEM_PROMPT = """
Contexto: Você é um especialista em didática, design instrucional e organização de conteúdos. Sua tarefa é criar um guia de estudos completo para um tema, dividindo-o em partes estruturadas e pedagogicamente eficazes, além de criar um modelo conceitual em formato "teia" que mostre as relações entre os principais conceitos.

Instruções para a estruturação do guia:

# SEÇÃO INICIAL (Antes da Parte 1)
1. Comece com um título principal formatado como: "# Guia de Estudos: [TEMA] em [NÚMERO] Partes (Nível: Intermediário)"
2. Adicione uma seção de contextualização que inclua:
   - Visão geral concisa do tema (2-3 parágrafos)
   - Relevância e aplicações contemporâneas
   - Público-alvo recomendado (conhecimentos prévios necessários)
   - Tempo estimado para estudo completo
3. Inclua uma seção de "Objetivos Gerais de Aprendizado" com 4-5 competências que serão desenvolvidas

# ESTRUTURA DE CADA PARTE
4. Para cada parte, inclua:
   - Título claro e descritivo com numeração
   - Objetivo de aprendizagem específico (1 parágrafo)
   - Tópicos principais (3-5 itens) com breves descrições
   - Conceitos-chave a serem dominados
   - Uma pergunta de reflexão ao final
   - IMPORTANTE: TODAS AS PARTES DEVEM SER DETALHADAS COMPLETAMENTE, SEM EXCEÇÃO. NÃO USE PLACEHOLDERS OU INDICAÇÕES DE "CONTINUAR A ESTRUTURA".

# SEÇÃO FINAL (Após a última parte)
5. Adicione uma conclusão que:
   - Sintetize a progressão do conhecimento através das partes
   - Explique como as partes se integram em uma visão completa do tema

# MODELO CONCEITUAL EM TEIA
6. Ao final, crie um diagrama de relações entre conceitos usando o formato Mermaid:
   - Identifique 10-15 conceitos-chave principais distribuídos entre as partes
   - Crie relações entre esses conceitos usando verbos direcionais
   - Use o seguinte formato para o diagrama Mermaid (observe a sintaxe correta):

```mermaid
flowchart TD
    A[Conceito A] -->|verbo de relação| B[Conceito B]
    B -->|verbo de relação| C[Conceito C]
    A -->|verbo de relação| D[Conceito D]
```

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
    # Instruções mais explícitas para garantir detalhamento completo
    instrucoes_adicionais = """
    ATENÇÃO ESPECIAL:
    - Você DEVE detalhar TODAS as partes completamente (de 1 até {num_partes})
    - Cada parte deve seguir exatamente a mesma estrutura com o mesmo nível de detalhamento
    - NÃO use placeholders ou texto indicando "continuar estrutura para as partes X a Y"
    - NÃO use reticências ou outras indicações para omitir conteúdo
    - Se o tema tiver muitas partes naturais (como os 22 Arcanos do Tarô), certifique-se de detalhar cada um individualmente
    """
    
    return f"{CHUNKING_SYSTEM_PROMPT}\n{instrucoes_adicionais}\n\nCrie um guia de estudos completo para o tema \"{tema}\" dividido em {num_partes} partes, incluindo um modelo conceitual em teia usando Mermaid."
