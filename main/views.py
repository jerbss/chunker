from django.shortcuts import render
from django.conf import settings
from django.utils.safestring import mark_safe
import markdown
import re
import requests
from .prompts.chunking_prompt import generate_prompt
from openai import OpenAI

def test_gemini(request):
    result = None
    error = None
    tema = ""
    num_partes = 2
    html_result = None
    
    try:
        # Configurar o cliente OpenAI para ZukiJourney
        client = OpenAI(
            base_url="https://api.zukijourney.com/v1",
            api_key=settings.ZUKI_API_KEY
        )
        
        if request.method == 'POST':
            tema = request.POST.get('tema', '')
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
                    # Gerar as três partes
                    response1 = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": prompt_parte1}],
                        max_tokens=4096,
                        temperature=0.7
                    )
                    
                    response2 = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": prompt_parte2}],
                        max_tokens=4096,
                        temperature=0.7
                    )
                    
                    response3 = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": prompt_parte3}],
                        max_tokens=4096,
                        temperature=0.7
                    )
                    
                    # Combinar os resultados
                    result = (response3.choices[0].message.content + "\n\n" + 
                              response1.choices[0].message.content + "\n\n" + 
                              response2.choices[0].message.content)
                    
                except Exception:
                    error = "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde."
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
                    # Gerar introdução
                    intro_prompt = f"""Crie apenas a introdução para um guia de estudos sobre "{tema}" em {num_partes} partes.
Use esta formatação:
- Título principal como Heading 1 (#): "# {tema} em {num_partes} Partes"
- Subseções como Heading 2 (##):
  - ## Contextualização (2-3 parágrafos)
  - ## Objetivos Gerais (4-5 competências em lista)"""
                    
                    intro_response = client.chat.completions.create(
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
                        
                        parte_response = client.chat.completions.create(
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
                    
                    conclusion_response = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": conclusion_prompt}],
                        max_tokens=2048,
                        temperature=0.7
                    )
                    
                    result += conclusion_response.choices[0].message.content
                    
                except Exception:
                    error = "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes
                    })
            else:
                # Para poucos tópicos, usar abordagem normal
                prompt = generate_prompt(tema, num_partes)
                
                try:
                    response = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=8192,
                        temperature=0.7
                    )
                    
                    result = response.choices[0].message.content
                    
                except Exception:
                    error = "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes
                    })
            
            # Converter markdown para HTML
            if result:
                # Usar safe para garantir que o HTML não é escapado
                html_result = mark_safe(markdown.markdown(
                    result, 
                    extensions=['extra', 'fenced_code', 'tables', 'nl2br', 'sane_lists']
                ))
                
                # Verificar se temos um resultado válido
                if not html_result or not str(html_result).strip():
                    error = "Erro: Não foi possível gerar o conteúdo solicitado."
    except requests.exceptions.HTTPError:
        error = "Erro de conexão. Por favor, tente novamente mais tarde."
    except Exception:
        error = "Ops! Não conseguimos processar esse tema. Por favor, tente novamente mais tarde."
    
    context = {
        'result': result,
        'html_result': html_result,
        'error': error,
        'tema': tema,
        'num_partes': num_partes,
        'has_content': bool(html_result),
        'app_title': 'ChunkMaster'
    }
    
    return render(request, 'index.html', context)

# Função demo_page removida, já que o template demo.html será excluído
