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
                gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                
                # Resultado final para ser concatenado
                final_result = ""
                
                # Passo 1: Gerar introdução
                logger.info("Gerando introdução...")
                intro_prompt = f"""Crie apenas a introdução para um guia de estudos sobre "{tema}" em {num_partes} partes.

Use esta formatação:
# {tema} em {num_partes} Partes: Seu Mapa para Dominar {tema} do Zero

## Por Onde Começar?
[4 perguntas específicas usando "você" com problemas relacionados a {tema}]

## O Que Você Vai Construir:
[Divida em 3 fases progressivas, indicando quais partes numeradas estão em cada fase]
[Cada fase deve ter 3-4 conquistas específicas com mini-desafios]

## Seu Plano de Ataque Personalizado:
⏱ Escolha Seu Ritmo:
- 🚀Modo Turbo: [X]h total ([Y]h por parte) → Foco no essencial
- 🐢Modo Profundo: [X*2]h total → Com projetos práticos

🛠 Kit Ferramentas Incluso:
[Lista de 5 ferramentas úteis com emoji e descrição específica para {tema}]

## Primeiro Passo Imediato:
[3 ações concretas para começar com {tema} em 1 hora]

Seja MUITO ESPECÍFICO sobre {tema}, usando exemplos concretos e terminologia própria desta área.
IMPORTANTE: Escreva APENAS a introdução, não comece as partes!"""

                intro_response = gemini_model.generate_content(intro_prompt)
                if hasattr(intro_response, 'text'):
                    intro_content = intro_response.text
                    final_result += intro_content + "\n\n# PARTES\n\n"
                else:
                    raise Exception("Resposta inválida na geração da introdução.")
                
                # Passo 2: Gerar cada parte individualmente
                for part_num in range(1, num_partes + 1):
                    logger.info(f"Gerando parte {part_num}...")
                    
                    # Breve pausa entre chamadas para evitar rate limiting
                    if part_num > 1:
                        time.sleep(0.5)
                    
                    part_prompt = f"""Crie APENAS a parte {part_num} de um guia de estudos sobre "{tema}" em {num_partes} partes.

Use exatamente esta formatação:
# Parte {part_num}: [Verbo + Substantivo específico de {tema}] → [Emoji] ([Duração])

Inclua para a Parte {part_num}:
- Dificuldade: [X]/5  
- Taxonomia de Bloom: [Nível]
- Estilo de Aprendizado: [Perfil]
- Duração: [Tempo específico]
- Progresso Acumulado: [{part_num*10}]% do core mastery
- Objetivo Transformador: frase específica sobre o que a pessoa conseguirá fazer
- Conexões com partes anteriores e posteriores
- Tópicos Nucleares: 2-3 núcleos detalhados com subtópicos práticos e ESPECÍFICOS
- Rotas Alternativas: caminho simples e avançado para aprender
- Armadilhas Comuns: problemas reais frequentes com soluções concretas
- Checklist de Domínio: 3-4 itens verificáveis sobre habilidades concretas
- Caso Real: exemplo específico de uso de {tema} no mundo real
- Prompt de IA: um prompt detalhado para praticar o aprendizado
- Desafio Relâmpago: desafio específico de 15 minutos

IMPORTANTE:
1. Seja ALTAMENTE ESPECÍFICO sobre {tema}, use exemplos reais e termos técnicos
2. Crie APENAS a parte {part_num}, sem introdução ou conclusão
3. Use linguagem técnica própria de {tema}"""

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
                    # Usar safe para garantir que o HTML não é escapado
                    html_result = mark_safe(markdown.markdown(
                        result, 
                        extensions=['extra', 'fenced_code', 'tables', 'nl2br', 'sane_lists']
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
