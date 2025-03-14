from django.shortcuts import render
from django.conf import settings
import google.generativeai as genai

def test_gemini(request):
    result = None
    error = None
    
    try:
        # Configurar a API com a chave
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Usar o modelo específico solicitado
        model = genai.GenerativeModel("models/gemini-1.5-pro")
        
        if request.method == 'POST':
            prompt = request.POST.get('prompt')
            
            # Gerar resposta
            response = model.generate_content(prompt)
            result = response.text
    except Exception as e:
        error = str(e)
    
    return render(request, 'gemini_test.html', {
        'result': result,
        'error': error,
    })
