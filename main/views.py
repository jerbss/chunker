from django.shortcuts import render
from django.conf import settings
from django.utils.safestring import mark_safe
import markdown
import re
import requests
import logging
import traceback
from .prompts.chunking_prompt import generate_prompt
import os
import google.generativeai as genai
import time

# Configurar o logger
logger = logging.getLogger(__name__)

def test_gemini(request):
    result = None
    error = None
    tema = ""
    num_partes = 2
    html_result = None
    
    # Verificar se o sistema está em modo de manutenção
    maintenance_mode = os.path.exists(os.path.join(settings.BASE_DIR, 'maintenance_mode'))
    if maintenance_mode:
        error = "O serviço está temporariamente indisponível para manutenção. Por favor, tente novamente mais tarde."
        return render(request, 'index.html', {
            'error': error,
            'tema': tema,
            'num_partes': num_partes
        })
    
    try:
        # Configurar o cliente Gemini
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
        except Exception as gemini_error:
            logger.error(f"Erro ao configurar Gemini API: {str(gemini_error)}")
            error = "Erro na configuração do serviço de IA. Por favor, tente novamente mais tarde."
            return render(request, 'index.html', {
                'error': error,
                'tema': tema,
                'num_partes': num_partes
            })
        
        if request.method == 'POST':
            tema = request.POST.get('tema', '')
            
            # Log do tema recebido para diagnóstico
            logger.info(f"Tema recebido: '{tema}' (tamanho: {len(tema)} caracteres)")
            
            # Verificar se o tema é muito longo
            if (len(tema) > 200):
                error = f"O tema é muito longo ({len(tema)} caracteres). Por favor, reduza para no máximo 200 caracteres."
                return render(request, 'index.html', {
                    'error': error,
                    'tema': tema,
                    'num_partes': num_partes
                })
                
            try:
                num_partes = int(request.POST.get('num_partes', '2'))
                if num_partes < 2:
                    error = "O número de partes deve ser maior que 1."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes
                    })
                # Adicionando limite máximo de partes
                if num_partes > 22:
                    error = "O número máximo de partes permitido é 22."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': 22  # Redefinindo para o máximo permitido
                    })
            except ValueError:
                error = "O número de partes deve ser um número inteiro válido."
                return render(request, 'index.html', {
                    'error': error,
                    'tema': tema,
                    'num_partes': 2
                })
            
            try:
                # Implementação da abordagem de uma requisição por parte usando Gemini
                logger.info(f"Processando '{tema}' com {num_partes} partes usando abordagem de requisição por parte")
                
                # Definir o modelo Gemini a ser utilizado
                gemini_model = genai.GenerativeModel('gemini-2.0-flash')
                
                # Resultado final para ser concatenado
                final_result = ""
                
                # Calcular distribuição das partes entre as fases
                def calculate_phase_distribution(total_parts):
                    # Para 6 partes exemplo: [1-2], [3-4], [5-6]
                    first_phase = max(1, total_parts // 3)
                    third_phase = max(1, total_parts // 3)
                    second_phase = total_parts - first_phase - third_phase
                    
                    return [
                        (1, first_phase),
                        (first_phase + 1, first_phase + second_phase),
                        (first_phase + second_phase + 1, total_parts)
                    ]
                
                phase_distribution = calculate_phase_distribution(num_partes)
                
                # ETAPA NOVA: Gerar esqueleto estrutural (invisível ao usuário)
                logger.info("Gerando esqueleto estrutural invisível para guiar a estrutura...")
                
                skeleton_prompt = f"""Crie um esqueleto estrutural detalhado e CONSISTENTE para um guia de estudos sobre "{tema}" em {num_partes} partes.

Para cada parte, defina:
1. Um título específico (começando com um verbo e incluindo um emoji)
2. 3-4 tópicos principais que serão abordados nesta parte
3. Nível de dificuldade (1-5, aumentando progressivamente)

Use EXATAMENTE este formato estruturado:
Parte {num_partes}:
- Título: [Título específico com verbo e emoji]
- Tópicos principais:
  - [Tópico 1]
  - [Tópico 2]
  - [Tópico 3]
- Nível de dificuldade: [Nível de dificuldade]"""

                skeleton_response = gemini_model.generate_content(skeleton_prompt)
                if hasattr(skeleton_response, 'text'):
                    skeleton_content = skeleton_response.text
                    logger.info(f"Esqueleto estrutural gerado com sucesso:\n{skeleton_content}")
                else:
                    raise Exception("Resposta inválida na geração do esqueleto estrutural.")
                
                # Parsear o esqueleto para extrair títulos e tópicos
                skeleton_parts = {}
                for part in range(1, num_partes + 1):
                    # Tentar vários formatos possíveis para capturar a resposta da API
                    patterns = [
                        # Formato original com asteriscos
                        rf"\*\*Parte {part}:\*\*\n- Título: (.*?)\n- Tópicos principais:\n(.*?)\n- Nível de dificuldade: (\d+)",
                        # Formato sem asteriscos (como visto no log)
                        rf"Parte {part}:\n- Título: (.*?)\n- Tópicos principais:\n(.*?)\n- Nível de dificuldade: (\d+)",
                        # Possível formato alternativo
                        rf"Parte {part}:\s*\n\s*- Título: (.*?)\n\s*- Tópicos principais:\n(.*?)\n\s*- Nível de dificuldade: (\d+)"
                    ]
                    
                    match = None
                    for pattern in patterns:
                        match = re.search(pattern, skeleton_content, re.DOTALL)
                        if match:
                            break
                    
                    if match:
                        title = match.group(1).strip()
                        # Limpar os tópicos de indentação e marcadores
                        topics_text = match.group(2)
                        topics = [line.strip().lstrip('- ') for line in topics_text.strip().split("\n")]
                        difficulty = int(match.group(3).strip())
                        skeleton_parts[part] = {
                            "title": title,
                            "topics": topics,
                            "difficulty": difficulty
                        }
                
                # Verificar se todas as partes foram encontradas
                if len(skeleton_parts) != num_partes:
                    missing_parts = [i for i in range(1, num_partes + 1) if i not in skeleton_parts]
                    logger.warning(f"Partes faltantes no esqueleto: {missing_parts}. Formato retornado:\n{skeleton_content}")
                    raise Exception(f"Falha ao extrair todas as partes do esqueleto ({len(skeleton_parts)}/{num_partes})")
                
                # Função auxiliar para extrair emoji de um título
                def extract_emoji(title):
                    """Extrai o emoji de um título de parte"""
                    emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)
                    emojis = emoji_pattern.findall(title)
                    return emojis[0] if emojis else "📚"  # Emoji padrão se nenhum for encontrado

                # Preparar títulos das fases baseados na distribuição
                phase_titles = []

                for phase_idx, (start, end) in enumerate(phase_distribution, 1):
                    if start == end:  # Uma única parte na fase
                        phase_title = skeleton_parts[start]['title']
                        emoji = extract_emoji(phase_title)
                        phase_titles.append(f"{phase_title}")
                    else:  # Múltiplas partes na fase
                        # Para fases com múltiplas partes, criar uma síntese
                        part_titles = [skeleton_parts[i]['title'] for i in range(start, end + 1)]
                        part_titles_base = [re.sub(r'[\U00010000-\U0010ffff]', '', title).strip() for title in part_titles]
                        
                        # Instrução para sintetizar os títulos
                        synthesis_instruction = f"[Sintetize um título que combine: {', '.join(part_titles_base)}]"
                        phase_titles.append(synthesis_instruction)
                
                # Gerar introdução
                logger.info("Gerando introdução...")
                intro_prompt = f"""Crie apenas a introdução para um guia de estudos sobre "{tema}" em {num_partes} partes.

Use esta formatação:
# {tema} em {num_partes} Partes: Seu Mapa para Dominar {tema} do Zero

## Por Onde Começar?
[4 perguntas específicas com problemas relacionados a {tema}, sem começar com "Você"]
FORMATO CORRETO (sem pronome inicial):
- Se sente perdido ao tentar [ação específica de {tema}]?
- Tem dificuldade em entender [conceito específico de {tema}]?
- Fica confuso ao tentar [ação relacionada a {tema}]?
- Precisa dominar [habilidade específica] em [tempo determinado]?

## O Que Você Vai Construir:
1️⃣ **Fase 1: {phase_titles[0]} (Parte{'s' if phase_distribution[0][1] > phase_distribution[0][0] else ''} {phase_distribution[0][0]}{f'-{phase_distribution[0][1]}' if phase_distribution[0][1] > phase_distribution[0][0] else ''})**
- **Conquista:** [Habilidade concreta específica sobre {tema}]
    - *Mini-desafio:* [Tarefa prática sobre {tema} relacionada à conquista acima]
- **Conquista:** [Outra habilidade concreta específica sobre {tema}]
    - *Mini-desafio:* [Outra tarefa prática sobre {tema} relacionada à conquista acima]

2️⃣ **Fase 2: {phase_titles[1]} (Parte{'s' if phase_distribution[1][1] > phase_distribution[1][0] else ''} {phase_distribution[1][0]}{f'-{phase_distribution[1][1]}' if phase_distribution[1][1] > phase_distribution[1][0] else ''})**
- **Conquista:** [Habilidade intermediária específica sobre {tema}]
    - *Mini-desafio:* [Tarefa mais complexa sobre {tema} relacionada à conquista acima]
- **Conquista:** [Outra habilidade intermediária específica sobre {tema}]
    - *Mini-desafio:* [Outra tarefa complexa sobre {tema} relacionada à conquista acima]
- **Conquista:** [Terceira habilidade intermediária sobre {tema}]
    - *Mini-desafio:* [Tarefa desafiadora sobre {tema} relacionada à conquista acima]

3️⃣ **Fase 3: {phase_titles[2]} (Parte{'s' if phase_distribution[2][1] > phase_distribution[2][0] else ''} {phase_distribution[2][0]}{f'-{phase_distribution[2][1]}' if phase_distribution[2][1] > phase_distribution[2][0] else ''})**
- **Conquista:** [Habilidade avançada específica sobre {tema}]
    - *Mini-desafio:* [Projeto avançado sobre {tema} relacionado à conquista acima]
- **Conquista:** [Outra habilidade avançada sobre {tema}]
    - *Mini-desafio:* [Outro projeto avançado sobre {tema} relacionado à conquista acima]
- **Conquista:** [Habilidade de expert em {tema}]
    - *Mini-desafio:* [Projeto complexo sobre {tema} para demonstrar maestria]

## Kit Ferramentas Incluso:
[Lista de 5 ferramentas principais para {tema}, cada uma com emoji e descrição específica de uso]
Exemplo de formato para cada ferramenta:
- [Emoji] **[Nome da Ferramenta]:** [Descrição curta e específica do uso para {tema}]

## Primeiro Passo Imediato:
[3 ações concretas e verificáveis para começar com {tema} em 1 hora, com foco em resultados práticos]
Exemplo de formato para cada ação:
1️⃣ [Ação específica com duração] → [Resultado esperado]

IMPORTANTE: Os títulos das fases devem:
1. EVITAR termos genéricos como "Fundamentos", "Intermediário" ou "Avançado"
2. USAR terminologia específica de {tema}, como:
   - Para Django: "Construindo Views", "Modelagem de Dados", "APIs REST"
   - Para IA: "Redes Neurais", "Deep Learning", "Processamento Natural"
   - Para Playstation: "História dos Consoles", "Jogos Exclusivos", "Evolução Gráfica"
3. SE ADAPTAR ao número total de {num_partes} partes
4. INCLUIR corretamente "Parte" (singular) ou "Partes" (plural) com números"""

                intro_response = gemini_model.generate_content(intro_prompt)
                if hasattr(intro_response, 'text'):
                    intro_content = intro_response.text
                    final_result += intro_content + "\n\n# PARTES\n\n"
                else:
                    raise Exception("Resposta inválida na geração da introdução.")
                
                # Passo 2: Gerar cada parte individualmente
                def get_phase_for_part(part_num, phase_distribution):
                    """Determina a qual fase pertence uma parte específica"""
                    for phase_idx, (start, end) in enumerate(phase_distribution, 1):
                        if start <= part_num <= end:
                            return phase_idx
                    return 1  # Fallback para fase 1

                for part_num in range(1, num_partes + 1):
                    logger.info(f"Gerando parte {part_num}...")
                    
                    # Breve pausa entre chamadas para evitar rate limiting
                    if part_num > 1:
                        time.sleep(0.5)
                    
                    part_prompt = f"""Crie APENAS a parte {part_num} de um guia de estudos sobre "{tema}" em {num_partes} partes.

IMPORTANTE: Use EXATAMENTE este título, sem alterações:
# Parte {part_num}: {skeleton_parts[part_num]['title']}

Esta parte se refere à Fase {get_phase_for_part(part_num, phase_distribution)} do guia.

Inclua para a Parte {part_num}:
- Dificuldade: {skeleton_parts[part_num]['difficulty']}/5  
- Taxonomia de Bloom: [Nível]
- Estilo de Aprendizado: [Perfil]
- Progresso Acumulado: [{part_num*10}]% do core mastery
- Objetivo Transformador: frase específica sobre o que a pessoa conseguirá fazer
- Conexões com partes anteriores e posteriores
- Tópicos Nucleares: {', '.join(skeleton_parts[part_num]['topics'])}
- Rotas Alternativas: caminho simples e avançado para aprender
- Armadilhas Comuns: problemas reais frequentes com soluções concretas
- Checklist de Domínio: 3-4 itens verificáveis sobre habilidades concretas
- Caso Real: exemplo específico de uso de {tema} no mundo real
- Prompt de IA: um prompt detalhado para praticar o aprendizado
- Desafio Relâmpago: desafio específico

IMPORTANTE:
1. Seja ALTAMENTE ESPECÍFICO sobre {tema}, use exemplos reais e termos técnicos
2. Crie APENAS a parte {part_num}, sem introdução ou conclusão
3. Use linguagem técnica própria de {tema}
4. NÃO INCLUA nenhuma referência a tempo de estudo (horas, dias, semanas, etc.)"""

                    part_response = gemini_model.generate_content(part_prompt)
                    if hasattr(part_response, 'text'):
                        part_content = part_response.text
                        final_result += part_content + "\n\n"
                    else:
                        raise Exception(f"Resposta inválida na geração da parte {part_num}.")
                
                # Passo 3: Gerar conclusão
                logger.info("Gerando conclusão...")
                conclusion_prompt = f"""Crie apenas a conclusão para um guia de estudos sobre "{tema}" em {num_partes} partes.

Use esta formatação:
# CONSIDERAÇÕES FINAIS
## Integração dos Conhecimentos
## Síntese
## Conclusão

A conclusão deve:
1. Sintetizar a progressão de conhecimento através das {num_partes} partes 
2. Explicar como os conceitos aprendidos se integram no uso real de {tema}
3. Sugerir próximos passos para continuar o aprendizado
4. Reforçar a jornada completa de domínio do {tema}

Seja específico sobre {tema}, não use texto genérico."""

                conclusion_response = gemini_model.generate_content(conclusion_prompt)
                if hasattr(conclusion_response, 'text'):
                    conclusion_content = conclusion_response.text
                    final_result += conclusion_content
                else:
                    raise Exception("Resposta inválida na geração da conclusão.")
                
                # Atribuir o resultado final
                result = final_result
                logger.info(f"Geração completa, resultado com {len(result)} caracteres")
                
            except Exception as api_error:
                # Log detalhado do erro
                logger.error(f"API Error: {str(api_error)}")
                logger.error(traceback.format_exc())
                
                # Determinar o tipo de erro para uma mensagem mais informativa
                error_msg = str(api_error).lower()
                if "content filter" in error_msg or "blocked" in error_msg or "safety" in error_msg:
                    error = "O tema foi bloqueado pelo filtro de conteúdo da API. Por favor, tente outro tema."
                elif "rate limit" in error_msg or "quota" in error_msg:
                    error = "Limite de requisições da API atingido. Por favor, tente novamente em alguns minutos."
                elif "context length" in error_msg or "too many tokens" in error_msg or "maximum token" in error_msg:
                    error = "O tema solicitado é muito complexo ou extenso. Por favor, tente um tema mais específico ou reduza o número de partes."
                elif "timeout" in error_msg or "deadline" in error_msg:
                    error = "A requisição excedeu o tempo limite. Por favor, tente novamente ou escolha um tema menos complexo."
                elif "invalid" in error_msg and "character" in error_msg:
                    error = "O tema contém caracteres inválidos ou especiais. Por favor, simplifique o texto."
                else:
                    # Se estiver em modo de desenvolvimento, mostrar o erro real
                    if settings.DEBUG:
                        error = f"Erro na API: {str(api_error)}"
                    else:
                        error = "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde."
                
                logger.info(f"Mensagem de erro exibida: {error}")
                return render(request, 'index.html', {
                    'error': error,
                    'tema': tema,
                    'num_partes': num_partes,
                    'has_content': False,
                    'app_title': 'Chunkify'
                })
            
            # Converter markdown para HTML
            if result:
                try:
                    # Função aprimorada para processamento de mini-desafios
                    def process_mini_challenges(markdown_text):
                        # Garantir quebras de linha consistentes
                        markdown_text = markdown_text.replace("\r\n", "\n")
                        
                        # Corrigir setas duplicadas antes do processamento
                        markdown_text = markdown_text.replace('↳ ↳', '↳')
                        
                        # Pré-processamento: inserir marcadores de início de fase
                        phase_pattern = r'(^\d+️⃣\s+\*\*Fase\s+\d+:.*?\*\*\s*$)'
                        markdown_text = re.sub(phase_pattern, r'<!-- phase-marker -->\n\1', markdown_text, flags=re.MULTILINE)
                        
                        # Dividir o conteúdo em linhas para processamento
                        lines = markdown_text.split('\n')
                        result_lines = []
                        
                        # Mapeamento para rastrear as conquistas e seus mini-desafios
                        conquest_map = {}
                        current_conquest = None
                        current_phase = None
                        
                        # Primeira passagem: identificar todas as conquistas e fases
                        for i, line in enumerate(lines):
                            if '<!-- phase-marker -->' in line:
                                current_phase = i + 1  # A linha seguinte contém a fase
                            
                            if "**Conquista:**" in line or "*Conquista:*" in line:
                                conquest_id = f"conquest-{len(conquest_map)}"
                                conquest_map[conquest_id] = {
                                    'line_number': i,
                                    'phase': current_phase,
                                    'mini_challenges': []
                                }
                                current_conquest = conquest_id
                            
                            if ("*Mini-desafio:*" in line or "Mini-desafio:" in line) and current_conquest:
                                conquest_map[current_conquest]['mini_challenges'].append(i)
                        
                        # Segunda passagem: processar todas as linhas e criar estrutura aninhada
                        i = 0
                        while i < len(lines):
                            line = lines[i]
                            
                            # Substituir marcador de fase
                            if '<!-- phase-marker -->' in line:
                                result_lines.append('')  # Linha em branco para separar
                                i += 1
                                continue
                            
                            # Identificar linhas de conquistas e aplicar classes
                            if "**Conquista:**" in line or "*Conquista:*" in line:
                                # Adicionar classe e começar uma estrutura para a conquista
                                conquest_line = line.replace("- **Conquista:**", "- <span class='conquest-marker'>**Conquista:**</span>")
                                conquest_line = conquest_line.replace("- *Conquista:*", "- <span class='conquest-marker'>*Conquista:*</span>")
                                result_lines.append(conquest_line)
                                
                                # Verificar se a próxima linha é um mini-desafio
                                has_mini_challenge = False
                                
                                # Procurar pela próxima linha para verificar se é um mini-desafio
                                next_index = i + 1
                                while next_index < len(lines) and not ("**Conquista:**" in lines[next_index] or "*Conquista:*" in lines[next_index]):
                                    if "*Mini-desafio:*" in lines[next_index] or "Mini-desafio:" in lines[next_index]:
                                        has_mini_challenge = True
                                        break
                                    next_index += 1
                                
                                if has_mini_challenge:
                                    # Começar uma lista HTML explícita para os mini-desafios
                                    result_lines.append("<ul class='mini-challenges-list'>")
                                    
                                    # Encontrar e processar todos os mini-desafios consecutivos
                                    next_i = i + 1
                                    while next_i < len(lines):
                                        if "**Conquista:**" in lines[next_i] or "*Conquista:*" in lines[next_i]:
                                            break
                                        
                                        if "*Mini-desafio:*" in lines[next_i] or "Mini-desafio:" in lines[next_i]:
                                            mini_line = lines[next_i].strip()
                                            if mini_line.startswith("- "):
                                                mini_line = mini_line[2:]
                                            
                                            # Aplicar formatação consistente
                                            mini_line = mini_line.replace("*Mini-desafio:*", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                            mini_line = mini_line.replace("Mini-desafio:", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                            
                                            # Adicionar como item de lista
                                            result_lines.append(f"  <li class='mini-challenge'>{mini_line}</li>")
                                            
                                            # Marcar como processado para evitar duplicação
                                            lines[next_i] = f"<!-- processed: {next_i} -->"
                                        
                                        next_i += 1
                                    
                                    # Fechar a lista de mini-desafios
                                    result_lines.append("</ul>")
                            
                            # Se for um mini-desafio já processado, pular
                            elif line.startswith("<!-- processed:"):
                                pass
                            # Se for um mini-desafio órfão (não vinculado diretamente a uma conquista)
                            elif "*Mini-desafio:*" in line or "Mini-desafio:" in line:
                                # Tentar encontrar a última conquista para associar
                                last_conquest_index = -1
                                for j in range(len(result_lines) - 1, -1, -1):
                                    if "conquest-marker" in result_lines[j]:
                                        last_conquest_index = j
                                        break
                                
                                if last_conquest_index >= 0:
                                    # Verificar se já existe uma lista de mini-desafios
                                    if last_conquest_index + 1 < len(result_lines) and result_lines[last_conquest_index + 1] == "<ul class='mini-challenges-list'>":
                                        # Encontrar o último </ul> para adicionar antes dele
                                        for k in range(last_conquest_index + 2, len(result_lines)):
                                            if result_lines[k] == "</ul>":
                                                # Formatar mini-desafio
                                                mini_line = line.strip()
                                                if mini_line.startswith("- "):
                                                    mini_line = mini_line[2:]
                                                
                                                mini_line = mini_line.replace("*Mini-desafio:*", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                                mini_line = mini_line.replace("Mini-desafio:", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                                
                                                # Adicionar à lista existente
                                                result_lines.insert(k, f"  <li class='mini-challenge'>{mini_line}</li>")
                                                break
                                    else:
                                        # Criar nova lista para mini-desafios
                                        result_lines.insert(last_conquest_index + 1, "<ul class='mini-challenges-list'>")
                                        
                                        # Formatar mini-desafio
                                        mini_line = line.strip()
                                        if mini_line.startswith("- "):
                                            mini_line = mini_line[2:]
                                        
                                        mini_line = mini_line.replace("*Mini-desafio:*", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                        mini_line = mini_line.replace("Mini-desafio:", "<span class='mini-desafio'>↳ <em>Mini-desafio:</em></span>")
                                        
                                        # Adicionar mini-desafio à lista
                                        result_lines.insert(last_conquest_index + 2, f"  <li class='mini-challenge'>{mini_line}</li>")
                                        result_lines.insert(last_conquest_index + 3, "</ul>")
                                else:
                                    # Se não encontrar conquista, adicionar o mini-desafio normalmente
                                    result_lines.append(line)
                            else:
                                # Outras linhas são adicionadas sem alteração
                                result_lines.append(line)
                            
                            i += 1
                        
                        # Limpar linhas vazias consecutivas
                        cleaned_lines = []
                        for i, line in enumerate(result_lines):
                            if i > 0 and line.strip() == '' and result_lines[i-1].strip() == '':
                                continue
                            cleaned_lines.append(line)
                        
                        return '\n'.join(cleaned_lines)
                    
                    # Aplicar o pré-processamento
                    processed_result = process_mini_challenges(result)

                    # Usar safe para garantir que o HTML não é escapado
                    html_result = mark_safe(markdown.markdown(
                        processed_result, 
                        extensions=['extra', 'fenced_code', 'tables', 'nl2br', 'sane_lists'],
                        output_format='html5'
                    ))
                    
                    # Verificar se temos um resultado válido
                    if not html_result or not str(html_result).strip():
                        logger.warning("Resultado HTML vazio ou inválido")
                        error = "Erro: Não foi possível gerar o conteúdo solicitado. Resultado vazio."
                except Exception as md_error:
                    logger.error(f"Erro na conversão Markdown: {str(md_error)}")
                    error = "Erro na formatação do conteúdo. Por favor, tente novamente."
                    
    except requests.exceptions.HTTPError as http_error:
        logger.error(f"HTTP Error: {str(http_error)}")
        error = "Erro de conexão com o serviço de IA. Por favor, tente novamente mais tarde."
    except requests.exceptions.ConnectionError as conn_error:
        logger.error(f"Connection Error: {str(conn_error)}")
        error = "Não foi possível conectar ao serviço de IA. Verifique sua conexão de internet."
    except requests.exceptions.Timeout as timeout_error:
        logger.error(f"Timeout Error: {str(timeout_error)}")
        error = "A requisição excedeu o tempo limite. Por favor, tente novamente mais tarde."
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        if settings.DEBUG:
            error = f"Erro inesperado: {str(e)}"
        else:
            error = "Ops! Não conseguimos processar esse tema. Por favor, tente novamente mais tarde."
    
    context = {
        'result': result,
        'html_result': html_result,
        'error': error,
        'tema': tema,
        'num_partes': num_partes,
        'has_content': bool(html_result),
        'app_title': 'Chunkify'
    }
    
    return render(request, 'index.html', context)

def visualize_markdown(request):
    """
    Função para visualizar a saída markdown original da API Gemini (apenas introdução)
    """
    raw_markdown = None
    error = None
    tema = request.GET.get('tema', 'Python')
    num_partes = int(request.GET.get('num_partes', '3'))
    
    try:
        # Configurar o cliente Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Usar o mesmo modelo da função principal
        gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Usar o mesmo prompt para gerar a introdução
        intro_prompt = f"""Crie apenas a introdução para um guia de estudos sobre "{tema}" em {num_partes} partes.

Use esta formatação:
# {tema} em {num_partes} Partes: Seu Mapa para Dominar {tema} do Zero

## Por Onde Começar?
[4 perguntas específicas com problemas relacionados a {tema}, sem começar com "Você"]
FORMATO CORRETO (sem pronome inicial):
- Se sente perdido ao tentar [ação específica de {tema}]?
- Tem dificuldade em entender [conceito específico de {tema}]?
- Fica confuso ao tentar [ação relacionada a {tema}]?
- Precisa dominar [habilidade específica] em [tempo determinado]?

## O Que Você Vai Construir:
1️⃣ **Fase 1: Fundamentos Sólidos (Parte 1)**
- **Conquista:** [Habilidade concreta específica sobre {tema}]
    - *Mini-desafio:* [Tarefa prática sobre {tema} relacionada à conquista acima]
- **Conquista:** [Outra habilidade concreta específica sobre {tema}]
    - *Mini-desafio:* [Outra tarefa prática sobre {tema} relacionada à conquista acima]

2️⃣ **Fase 2: Aplicação Intermediária (Parte 1 e Parte 2)**
- **Conquista:** [Habilidade intermediária específica sobre {tema}]
    - *Mini-desafio:* [Tarefa mais complexa sobre {tema} relacionada à conquista acima]
- **Conquista:** [Outra habilidade intermediária específica sobre {tema}]
    - *Mini-desafio:* [Outra tarefa complexa sobre {tema} relacionada à conquista acima]
- **Conquista:** [Terceira habilidade intermediária sobre {tema}]
    - *Mini-desafio:* [Tarefa desafiadora sobre {tema} relacionada à conquista acima]

3️⃣ **Fase 3: Domínio Avançado (Parte 2)**
- **Conquista:** [Habilidade avançada específica sobre {tema}]
    - *Mini-desafio:* [Projeto avançado sobre {tema} relacionado à conquista acima]
- **Conquista:** [Outra habilidade avançada sobre {tema}]
    - *Mini-desafio:* [Outro projeto avançado sobre {tema} relacionado à conquista acima]
- **Conquista:** [Habilidade de expert em {tema}]
    - *Mini-desafio:* [Projeto complexo sobre {tema} para demonstrar maestria]

## Kit Ferramentas Incluso:
[Lista de 5 ferramentas úteis com emoji e descrição específica para {tema}]
Exemplo de formato para cada ferramenta:
- [Emoji] **[Nome da Ferramenta]:** [Descrição curta e específica do uso para {tema}]

## Primeiro Passo Imediato:
[3 ações concretas para começar com {tema} em 1 hora]

IMPORTANTE: 
1. Use APENAS exemplos e termos específicos de {tema}, NUNCA use exemplos genéricos ou de outros temas
2. NÃO mencione assuntos como DaisyUI, Tailwind, programação ou tecnologia se o tema não for relacionado a estes assuntos
3. Adapte todos os exemplos para serem extremamente específicos de {tema}
4. Seja MUITO ESPECÍFICO sobre {tema}, usando exemplos concretos e terminologia própria desta área
5. Escreva APENAS a introdução, não comece as partes!"""

        # Gerar apenas a introdução
        intro_response = gemini_model.generate_content(intro_prompt)
        if hasattr(intro_response, 'text'):
            raw_markdown = intro_response.text
        else:
            error = "Resposta inválida da API Gemini."
            
    except Exception as e:
        error = f"Erro ao gerar o markdown: {str(e)}"
        if settings.DEBUG:
            logger.error(traceback.format_exc())
    
    # Renderizar uma página simples com o markdown bruto
    return render(request, 'visualize_markdown.html', {
        'raw_markdown': raw_markdown,
        'tema': tema,
        'num_partes': num_partes,
        'error': error
    })
