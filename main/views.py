from django.shortcuts import render
from django.conf import settings
from django.utils.safestring import mark_safe
import google.generativeai as genai
import markdown
import re
from .prompts.chunking_prompt import generate_prompt

def test_gemini(request):
    result = None
    error = None
    tema = ""
    num_partes = 2
    html_result = None
    mermaid_code = None  # Mudança aqui - vamos armazenar apenas o código
    
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
                    return render(request, 'gemini_test.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes
                    })
                # Adicionando limite máximo de partes
                if num_partes > 22:
                    error = "O número máximo de partes permitido é 22."
                    return render(request, 'gemini_test.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': 22  # Redefinindo para o máximo permitido
                    })
            except ValueError:
                error = "O número de partes deve ser um número inteiro válido."
                return render(request, 'gemini_test.html', {
                    'error': error,
                    'tema': tema,
                    'num_partes': 2
                })
            
            # Se o número de partes for grande, vamos usar uma estratégia diferente
            if num_partes > 10:
                # Dividir em duas solicitações para conseguir detalhes completos
                meio = num_partes // 2
                prompt_parte1 = f"Crie um guia de estudos para o tema \"{tema}\" detalhando COMPLETAMENTE apenas as partes de 1 até {meio}, seguindo exatamente esta estrutura para cada parte:\n\n- Título claro e descritivo com numeração\n- Objetivo de aprendizagem específico (1 parágrafo)\n- Tópicos principais (3-5 itens) com breves descrições\n- Conceitos-chave a serem dominados\n- Uma pergunta de reflexão ao final"
                
                prompt_parte2 = f"Crie um guia de estudos para o tema \"{tema}\" detalhando COMPLETAMENTE apenas as partes de {meio+1} até {num_partes}, seguindo exatamente esta estrutura para cada parte:\n\n- Título claro e descritivo com numeração\n- Objetivo de aprendizagem específico (1 parágrafo)\n- Tópicos principais (3-5 itens) com breves descrições\n- Conceitos-chave a serem dominados\n- Uma pergunta de reflexão ao final\n\nE por fim, adicione uma conclusão que sintetize a progressão do conhecimento e como as partes se integram."
                
                prompt_parte3 = f"Crie a introdução para um guia de estudos para o tema \"{tema}\" em {num_partes} partes, incluindo:\n\n- Título principal\n- Contextualização (2-3 parágrafos)\n- Público-alvo e tempo estimado\n- Objetivos gerais (4-5)\n\nE então crie um diagrama mermaid mostrando as relações entre 10-15 conceitos-chave deste tema, usando verbos direcionais nas setas."
                
                # Configuração correta para o modelo Gemini
                generation_config = genai.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=8192,
                )
                
                # Gerar as três partes com a configuração correta
                response1 = model.generate_content(prompt_parte1, generation_config=generation_config)
                response2 = model.generate_content(prompt_parte2, generation_config=generation_config)  
                response3 = model.generate_content(prompt_parte3, generation_config=generation_config)
                
                # Combinar os resultados
                result = response3.text + "\n\n" + response1.text + "\n\n" + response2.text
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
                
                response = model.generate_content(
                    prompt,
                    generation_config=generation_config,
                    safety_settings=safety_settings
                )
                result = response.text
            
            # Extrair código Mermaid se existir
            mermaid_pattern = r"```mermaid\s*([\s\S]*?)\s*```"
            mermaid_matches = re.findall(mermaid_pattern, result)
            
            if (mermaid_matches):
                mermaid_code = mermaid_matches[0].strip()
                # Remover possíveis espaços extras e indentação
                mermaid_code = '\n'.join(line.strip() for line in mermaid_code.split('\n'))
            
            # Converter markdown para HTML (excluindo o código mermaid)
            result_without_mermaid = re.sub(mermaid_pattern, '', result)
            html_result = mark_safe(markdown.markdown(result_without_mermaid, extensions=['extra', 'fenced_code']))
    except Exception as e:
        error = str(e)
    
    return render(request, 'gemini_test.html', {
        'result': result,
        'html_result': html_result,
        'mermaid_code': mermaid_code,  # Passar o código ao invés do diagrama
        'error': error,
        'tema': tema,
        'num_partes': num_partes
    })
