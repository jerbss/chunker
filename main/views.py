from django.shortcuts import render
from django.conf import settings
from django.utils.safestring import mark_safe
import markdown
import re
import requests
import logging
import traceback
from .prompts.chunking_prompt import generate_prompt
from openai import OpenAI
import os
import google.generativeai as genai

# Configurar o logger
logger = logging.getLogger(__name__)

def test_gemini(request):
    result = None
    error = None
    tema = ""
    num_partes = 2
    html_result = None
    
    # Verificar se o sistema está em modo de manutenção (por exemplo, sem créditos)
    maintenance_mode = os.path.exists(os.path.join(settings.BASE_DIR, 'maintenance_mode'))
    if maintenance_mode:
        error = "O serviço está temporariamente indisponível para manutenção. Por favor, tente novamente mais tarde."
        return render(request, 'index.html', {
            'error': error,
            'tema': tema,
            'num_partes': num_partes
        })
    
    try:
        # Configurar ambos os clientes, mas começar com Zuki
        zuki_client = OpenAI(
            base_url="https://api.zukijourney.com/v1",
            api_key=settings.ZUKI_API_KEY
        )
        
        # Configurar o cliente Gemini (será usado como fallback)
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        use_gemini_fallback = False  # Flag para indicar se devemos usar o fallback
        
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
            
            # Função para processar com Gemini (fallback)
            def process_with_gemini():
                nonlocal result
                logger.info("Usando API Gemini como fallback")
                
                # Gerar o prompt uma vez
                prompt = generate_prompt(tema, num_partes)
                
                # Configurar o modelo Gemini
                gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                
                # Fazer a requisição ao Gemini
                gemini_response = gemini_model.generate_content(prompt)
                
                # Verificar se a resposta foi gerada com sucesso
                if gemini_response and hasattr(gemini_response, 'text'):
                    result = gemini_response.text
                    logger.info(f"Resposta recebida do Gemini com {len(result) if result else 0} caracteres")
                else:
                    raise Exception("Resposta inválida do Gemini.")
            
            # Prepara o prompt baseado no número de partes
            if num_partes > 10:
                # Dividir em múltiplas solicitações para temas com muitas partes
                meio = num_partes // 2
                prompt_parte1 = f"""Crie um guia de estudos para o tema "{tema}" detalhando COMPLETAMENTE apenas as partes de 1 até {meio}.

Use esta formatação:
- Seções principais como Heading 1 (#): "# Parte X: [Título]" 
- Dentro de cada parte use destaque em negrito:
  - **Objetivo de Aprendizagem:** (1 parágrafo)
  - **Tópicos Principais:** (lista de 3-5 itens com descrições)
  - **Conceitos-chave:** (lista de termos)
  - **Pergunta de Reflexão:** (questão instigante)"""
                
                prompt_parte2 = f"""Crie um guia de estudos para o tema "{tema}" detalhando COMPLETAMENTE apenas as partes de {meio+1} até {num_partes}.

Use esta formatação:
- Seções principais como Heading 1 (#): "# Parte X: [Título]" 
- Dentro de cada parte use destaque em negrito:
  - **Objetivo de Aprendizagem:** (1 parágrafo)
  - **Tópicos Principais:** (lista de 3-5 itens com descrições)
  - **Conceitos-chave:** (lista de termos)
  - **Pergunta de Reflexão:** (questão instigante)

Ao final, adicione uma conclusão como Heading 1 (# Conclusão) que sintetize tudo."""
                
                prompt_parte3 = f"""Crie a introdução para um guia de estudos para o tema "{tema}" em {num_partes} partes.
Use esta formatação:
- Título principal como Heading 2 (##): "## {tema} em {num_partes} Partes"
- Subseções como Heading 2 (##):
  - ## Contextualização (2-3 parágrafos)
  - ## Objetivos Gerais (4-5 competências em lista)"""
                
                try:
                    if use_gemini_fallback:
                        process_with_gemini()
                    else:
                        # Gerar as três partes usando Zuki
                        response1 = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": prompt_parte1}],
                            max_tokens=4096,
                            temperature=0.7
                        )
                        
                        response2 = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": prompt_parte2}],
                            max_tokens=4096,
                            temperature=0.7
                        )
                        
                        response3 = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": prompt_parte3}],
                            max_tokens=4096,
                            temperature=0.7
                        )
                        
                        # Combinar os resultados
                        result = (response3.choices[0].message.content + "\n\n" + 
                                  response1.choices[0].message.content + "\n\n" + 
                                  response2.choices[0].message.content)
                        
                except Exception as api_error:
                    # Log detalhado do erro
                    logger.error(f"API Error: {str(api_error)}")
                    logger.error(traceback.format_exc())
                    
                    # Determinar o tipo de erro para uma mensagem mais informativa
                    error_msg = str(api_error).lower()
                    if "insufficient credits" in error_msg or ("credits" in error_msg and "available" in error_msg):
                        # Tentar fallback para Gemini
                        logger.info("Detectado erro de créditos insuficientes, tentando fallback para Gemini")
                        try:
                            use_gemini_fallback = True
                            process_with_gemini()
                        except Exception as gemini_error:
                            logger.error(f"Gemini API Error: {str(gemini_error)}")
                            error = "Créditos insuficientes e o fallback também falhou. Por favor, tente novamente mais tarde."
                            return render(request, 'index.html', {
                                'error': error,
                                'tema': tema,
                                'num_partes': num_partes
                            })
                    elif "content filter" in error_msg or "blocked" in error_msg or "safety" in error_msg:
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
                    
                    if not use_gemini_fallback:  # Só renderizar se não estiver usando fallback
                        logger.info(f"Mensagem de erro exibida: {error}")
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes
                        })
            
            # Para temas muito complexos que podem resultar em respostas truncadas
            elif tema.lower() in ['inteligência artificial', 'inteligencia artificial', 'machine learning', 
                                 'deep learning', 'cloud computing', 'cybersecurity']:
                # Para temas complexos, vamos gerar cada parte separadamente para garantir completude
                try:
                    if use_gemini_fallback:
                        process_with_gemini()
                    else:
                        # Gerar introdução usando Zuki
                        intro_prompt = f"""Crie apenas a introdução para um guia de estudos sobre "{tema}" em {num_partes} partes.
Use esta formatação:
- Título principal como Heading 1 (#): "# {tema} em {num_partes} Partes"
- Subseções como Heading 2 (##):
  - ## Contextualização (2-3 parágrafos)
  - ## Objetivos Gerais (4-5 competências em lista)"""
                    
                        intro_response = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": intro_prompt}],
                            max_tokens=2048,
                            temperature=0.7
                        )
                    
                        result = intro_response.choices[0].message.content + "\n\n"
                    
                        # Gerar cada parte individualmente
                        for i in range(1, num_partes + 1):
                            parte_prompt = f"""Crie APENAS a parte {i} de um guia de estudos sobre "{tema}".
Use esta formatação:
- Título da parte como Heading 1 (#): "# Parte {i}: [Título Descritivo]"
- **Objetivo de Aprendizagem:** (1 parágrafo)
- **Tópicos Principais:** (lista de 3-5 itens com descrições)
- **Conceitos-chave:** (lista de termos)
- **Pergunta de Reflexão:** (questão instigante)

IMPORTANTE: Crie APENAS esta parte, sem introdução ou partes adicionais."""
                        
                            parte_response = zuki_client.chat.completions.create(
                                model="gemini-2.0-flash-thinking-exp-01-21",
                                messages=[{"role": "user", "content": parte_prompt}],
                                max_tokens=2048,
                                temperature=0.7
                            )
                        
                            result += parte_response.choices[0].message.content + "\n\n"
                    
                        # Gerar conclusão
                        conclusion_prompt = f"""Crie apenas a conclusão para um guia de estudos sobre "{tema}" em {num_partes} partes.
Use esta formatação:
- Título como Heading 1 (#): "# Conclusão"
Sintetize a progressão do conhecimento através das partes e explique como elas se integram."""
                    
                        conclusion_response = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": conclusion_prompt}],
                            max_tokens=2048,
                            temperature=0.7
                        )
                    
                        result += conclusion_response.choices[0].message.content
                    
                except Exception as api_error:
                    # Log detalhado do erro
                    logger.error(f"API Error: {str(api_error)}")
                    logger.error(traceback.format_exc())
                    
                    # Determinar o tipo de erro para uma mensagem mais informativa
                    error_msg = str(api_error).lower()
                    if "insufficient credits" in error_msg or ("credits" in error_msg and "available" in error_msg):
                        # Tentar fallback para Gemini
                        logger.info("Detectado erro de créditos insuficientes, tentando fallback para Gemini")
                        try:
                            use_gemini_fallback = True
                            process_with_gemini()
                        except Exception as gemini_error:
                            logger.error(f"Gemini API Error: {str(gemini_error)}")
                            error = "Créditos insuficientes e o fallback também falhou. Por favor, tente novamente mais tarde."
                            return render(request, 'index.html', {
                                'error': error,
                                'tema': tema,
                                'num_partes': num_partes
                            })
                    elif "content filter" in error_msg or "blocked" in error_msg or "safety" in error_msg:
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
                    
                    if not use_gemini_fallback:  # Só renderizar se não estiver usando fallback
                        logger.info(f"Mensagem de erro exibida: {error}")
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes
                        })
            else:
                # Para poucos tópicos, usar abordagem normal
                prompt = generate_prompt(tema, num_partes)
                
                try:
                    logger.info(f"Enviando prompt para a API: tema='{tema}', num_partes={num_partes}")
                    
                    if use_gemini_fallback:
                        process_with_gemini()
                    else:
                        # Usar Zuki
                        response = zuki_client.chat.completions.create(
                            model="gemini-2.0-flash-thinking-exp-01-21",
                            messages=[{"role": "user", "content": prompt}],
                            max_tokens=8192,
                            temperature=0.7
                        )
                        
                        result = response.choices[0].message.content
                        logger.info(f"Resposta recebida da API Zuki com {len(result) if result else 0} caracteres")
                    
                except Exception as api_error:
                    # Log detalhado do erro
                    logger.error(f"API Error: {str(api_error)}")
                    logger.error(traceback.format_exc())
                    
                    # Determinar o tipo de erro para uma mensagem mais informativa
                    error_msg = str(api_error).lower()
                    if "insufficient credits" in error_msg or ("credits" in error_msg and "available" in error_msg):
                        # Tentar fallback para Gemini
                        logger.info("Detectado erro de créditos insuficientes, tentando fallback para Gemini")
                        try:
                            use_gemini_fallback = True
                            process_with_gemini()
                        except Exception as gemini_error:
                            logger.error(f"Gemini API Error: {str(gemini_error)}")
                            error = "Créditos insuficientes e o fallback também falhou. Por favor, tente novamente mais tarde."
                            return render(request, 'index.html', {
                                'error': error,
                                'tema': tema,
                                'num_partes': num_partes
                            })
                    elif "content filter" in error_msg or "blocked" in error_msg or "safety" in error_msg:
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
                    
                    if not use_gemini_fallback:  # Só renderizar se não estiver usando fallback
                        logger.info(f"Mensagem de erro exibida: {error}")
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes
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
        'app_title': 'ChunkMaster',
        'used_fallback': use_gemini_fallback  # Adicionar indicador de fallback para UI
    }
    
    return render(request, 'index.html', context)
