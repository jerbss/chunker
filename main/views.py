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
            except ValueError:
                error = "O número de partes deve ser um número inteiro válido."
                return render(request, 'gemini_test.html', {
                    'error': error,
                    'tema': tema,
                    'num_partes': 2
                })
            
            # Gerar o prompt completo
            prompt = generate_prompt(tema, num_partes)
            
            # Gerar resposta
            response = model.generate_content(prompt)
            result = response.text
            
            # Extrair código Mermaid se existir
            mermaid_pattern = r"```mermaid\s*([\s\S]*?)\s*```"
            mermaid_matches = re.findall(mermaid_pattern, result)
            
            if mermaid_matches:
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
