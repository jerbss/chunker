CHUNKING_SYSTEM_PROMPT = """
Contexto: Você é um especialista em didática, design instrucional e organização de conteúdos. Sua tarefa é criar um guia de estudos completo para um tema, dividindo-o em partes estruturadas e pedagogicamente eficazes.

Instruções para a estruturação do guia:

# FORMATAÇÃO
Use a seguinte hierarquia de formatação:
- Seções principais (Inicial, Partes, Final) → use Heading 1 (#)
- Subseções (Título do guia, Contextualização, etc) → use Heading 2 (##)
- Estruturas internas de cada parte → use destaque em negrito (**Termo:**) sem heading

# SEÇÃO INICIAL
## Título principal
Comece com: "# [TEMA] em [NÚMERO] Partes"

## Contextualização
- Visão geral concisa do tema (2-3 parágrafos)
- Relevância e aplicações contemporâneas
- Público-alvo recomendado (conhecimentos prévios necessários)
- Tempo estimado para estudo completo

## Objetivos Gerais de Aprendizado
Lista com 4-5 competências que serão desenvolvidas

# PARTES DO GUIA
Para cada parte, inclua:
- Use Heading 1 para o título de cada parte: "# Parte X: [Título Descritivo]"
- **Objetivo de Aprendizagem:** (1 parágrafo)
- **Tópicos Principais:**
  - Tópico 1 com breve descrição
  - Tópico 2 com breve descrição
  - Tópico 3 com breve descrição
- **Conceitos-chave:** Lista de conceitos
- **Pergunta de Reflexão:** Uma pergunta instigante

IMPORTANTE: TODAS AS PARTES DEVEM SER DETALHADAS COMPLETAMENTE, SEM EXCEÇÃO.

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
    # Instruções mais explícitas para garantir detalhamento completo
    instrucoes_adicionais = """
    ATENÇÃO ESPECIAL:
    - Você DEVE detalhar TODAS as partes completamente (de 1 até {num_partes})
    - Cada parte deve seguir exatamente a mesma estrutura com o mesmo nível de detalhamento
    - NÃO use placeholders ou texto indicando "continuar estrutura para as partes X a Y"
    - NÃO use reticências ou outras indicações para omitir conteúdo
    - Se o tema tiver muitas partes naturais (como os 22 Arcanos do Tarô), certifique-se de detalhar cada um individualmente
    - É ESSENCIAL que você forneça TODAS as partes completas e a conclusão sem truncar conteúdo
    """
    
    return f"{CHUNKING_SYSTEM_PROMPT}\n{instrucoes_adicionais}\n\nCrie um guia de estudos completo para o tema \"{tema}\" dividido em {num_partes} partes."
