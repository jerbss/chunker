from django.shortcuts import render
from django.conf import settings
from django.utils.safestring import mark_safe
import google.generativeai as genai
import markdown
import re
import requests
from .prompts.chunking_prompt import generate_prompt

def test_gemini(request):
    result = None
    error = None
    tema = ""
    num_partes = 2
    html_result = None
    
    try:
        # Configurar a API com a chave
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Usar o modelo específico solicitado
        model = genai.GenerativeModel("models/gemini-1.5-pro")
        
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
            
            # Se o número de partes for grande, vamos usar uma estratégia diferente
            if num_partes > 10:
                # Dividir em duas solicitações para conseguir detalhes completos
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
- Título principal como Heading 2 (##): "## Guia de Estudos: {tema} em {num_partes} Partes (Nível: Intermediário)"
- Subseções como Heading 2 (##):
  - ## Contextualização (2-3 parágrafos)
  - ## Objetivos Gerais (4-5 competências em lista)"""
                
                # Configuração correta para o modelo Gemini
                generation_config = genai.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=8192,
                )
                
                try:
                    # Gerar as três partes com a configuração correta
                    response1 = model.generate_content(prompt_parte1, generation_config=generation_config)
                    response2 = model.generate_content(prompt_parte2, generation_config=generation_config)  
                    response3 = model.generate_content(prompt_parte3, generation_config=generation_config)
                    
                    # Combinar os resultados
                    result = response3.text + "\n\n" + response1.text + "\n\n" + response2.text
                except Exception as api_error:
                    if "429" in str(api_error):
                        error = "Quota da API excedida. Você atingiu o limite de solicitações para a API Gemini. Por favor, tente novamente mais tarde ou utilize uma chave de API diferente."
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes,
                            'quota_exceeded': True
                        })
                    else:
                        raise api_error
            else:
                # Para poucos tópicos, usar abordagem normal
                prompt = generate_prompt(tema, num_partes)
                
                # Configuração correta para o modelo Gemini
                generation_config = genai.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=8192,
                )
                
                # Safety settings como parâmetro separado
                safety_settings = [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                ]
                
                try:
                    response = model.generate_content(
                        prompt,
                        generation_config=generation_config,
                        safety_settings=safety_settings
                    )
                    result = response.text
                except Exception as api_error:
                    if "429" in str(api_error):
                        error = "Quota da API excedida. Você atingiu o limite de solicitações para a API Gemini. Por favor, tente novamente mais tarde ou utilize uma chave de API diferente."
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes,
                            'quota_exceeded': True
                        })
                    else:
                        raise api_error
            
            # Converter markdown para HTML
            html_result = mark_safe(markdown.markdown(result, extensions=['extra', 'fenced_code']))
    except requests.exceptions.HTTPError as http_error:
        if http_error.response.status_code == 429:
            error = "Quota da API excedida. Você atingiu o limite de solicitações para a API Gemini. Por favor, tente novamente mais tarde ou utilize uma chave de API diferente."
        else:
            error = f"Erro HTTP: {http_error}"
    except Exception as e:
        error = str(e)
    
    return render(request, 'index.html', {
        'result': result,
        'html_result': html_result,
        'error': error,
        'tema': tema,
        'num_partes': num_partes,
        'quota_exceeded': "429" in str(error) if error else False
    })
