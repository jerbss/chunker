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
            # Adicionar verificação de limite diário
            try:
                # Teste simples para verificar se a API está respondendo
                test_response = client.chat.completions.create(
                    model="gemini-2.0-flash-thinking-exp-01-21",
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=10
                )
            except Exception as quota_error:
                if "429" in str(quota_error):
                    error = "Limite diário de requisições atingido. Por favor, tente novamente mais tarde ou atualize para um plano pago."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes,
                        'quota_exceeded': True,
                        'daily_limit': True
                    })
                elif "401" in str(quota_error):
                    error = "Chave de API inválida ou expirada. Por favor, verifique sua chave da ZukiJourney."
                    return render(request, 'index.html', {
                        'error': error,
                        'tema': tema,
                        'num_partes': num_partes
                    })
                
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
                    
                except Exception as api_error:
                    if "429" in str(api_error):
                        error = "Quota da API excedida. Você atingiu o limite de solicitações para a API. Por favor, tente novamente mais tarde."
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes,
                            'quota_exceeded': True
                        })
                    else:
                        raise api_error
            
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
                    
                except Exception as api_error:
                    if "429" in str(api_error):
                        error = "Quota da API excedida. Você atingiu o limite de solicitações para a API. Por favor, tente novamente mais tarde."
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
                
                try:
                    response = client.chat.completions.create(
                        model="gemini-2.0-flash-thinking-exp-01-21",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=8192,
                        temperature=0.7
                    )
                    
                    result = response.choices[0].message.content
                    
                except Exception as api_error:
                    if "429" in str(api_error):
                        error = "Quota da API excedida. Você atingiu o limite de solicitações para a API. Por favor, tente novamente mais tarde."
                        return render(request, 'index.html', {
                            'error': error,
                            'tema': tema,
                            'num_partes': num_partes,
                            'quota_exceeded': True
                        })
                    else:
                        raise api_error
            
            # Converter markdown para HTML
            if result:
                # Usar safe para garantir que o HTML não é escapado
                html_result = mark_safe(markdown.markdown(
                    result, 
                    extensions=['extra', 'fenced_code', 'tables', 'nl2br', 'sane_lists']
                ))
                
                # Verificar se temos um resultado válido
                if not html_result or not str(html_result).strip():
                    error = "Erro: Não foi possível gerar o HTML do conteúdo."
    except requests.exceptions.HTTPError as http_error:
        if http_error.response.status_code == 429:
            error = "Quota da API excedida. Você atingiu o limite de solicitações para a API. Por favor, tente novamente mais tarde."
        else:
            error = f"Erro HTTP: {http_error}"
    except Exception as e:
        error = f"Ops! Não conseguimos chunkar esse tema. Erro: {str(e)}"
    
    context = {
        'result': result,
        'html_result': html_result,
        'error': error,
        'tema': tema,
        'num_partes': num_partes,
        'quota_exceeded': "429" in str(error) if error else False,
        'has_content': bool(html_result),
        'app_title': 'ChunkMaster'  # Adicionando título da aplicação ao contexto
    }
    
    return render(request, 'index.html', context)

def demo_page(request):
    """
    View para demonstração da interface sem usar a API do Gemini.
    Usa texto fictício (lorem ipsum) para mostrar a estrutura de cards.
    """
    tema = "Ciência de Dados"
    num_partes = 5
    
    # Gerar conteúdo fictício em formato markdown
    demo_markdown = """
# Ciência de Dados em 5 Partes

## Contextualização
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Phasellus tincidunt, sapien eget ultricies ullamcorper, ipsum felis gravida elit, vitae auctor eros libero a metus. Sed eget consectetur odio, vel rhoncus diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.

Aliquam fringilla magna id sem condimentum, vel elementum est rutrum. Fusce tempus efficitur tellus, eget facilisis eros aliquet in. Nulla id semper urna, et convallis erat. Aliquam erat volutpat. Nulla suscipit vel sem in auctor.

## Objetivos Gerais
- Compreender os fundamentos da análise de dados e suas aplicações
- Desenvolver habilidades técnicas em ferramentas como Python, SQL e R
- Aplicar algoritmos de machine learning para solução de problemas reais
- Visualizar dados de forma efetiva para comunicação dos resultados
- Implementar projetos de análise de dados do início ao fim

# Parte 1: Fundamentos da Ciência de Dados

**Objetivo de Aprendizagem:** Compreender os conceitos básicos da ciência de dados, suas aplicações e o papel do cientista de dados no mercado atual.

**Tópicos Principais:**
- História e evolução da ciência de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam placerat justo a eros tincidunt, non convallis metus lobortis.
- Tipos de análise de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas fermentum magna eget ligula tempor, in efficitur nunc dictum.
- Ciclo de vida de um projeto de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque id neque libero. Integer at ligula ac eros posuere aliquet.
- Principais áreas de aplicação: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin feugiat lectus eu nulla maximus, et fringilla mi ullamcorper.

**Conceitos-chave:** Análise descritiva, Análise preditiva, Big Data, Business Intelligence, Data-driven decision making

**Pergunta de Reflexão:** Como a ciência de dados pode transformar informações brutas em insights valiosos para organizações?

# Parte 2: Ferramentas e Linguagens de Programação

**Objetivo de Aprendizagem:** Conhecer e aplicar as principais ferramentas e linguagens usadas na ciência de dados, com foco em Python e seus ecossistemas.

**Tópicos Principais:**
- Python para ciência de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ultricies lorem eget dapibus consectetur. Maecenas ac tristique nisi.
- Bibliotecas essenciais (NumPy, Pandas): Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis efficitur gravida lectus, vel dictum nisl dapibus nec.
- Ferramentas de visualização: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Cras tempor cursus sem, sed vehicula justo pharetra ut.
- SQL e bancos de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque nisi risus, tincidunt at augue quis, rhoncus tempor velit.

**Conceitos-chave:** Python, R, SQL, Jupyter Notebook, DataFrame, Arrays

**Pergunta de Reflexão:** Qual linguagem de programação é mais adequada para diferentes tipos de projetos de ciência de dados?

# Parte 3: Preparação e Exploração de Dados

**Objetivo de Aprendizagem:** Dominar as técnicas de preparação, limpeza e exploração de dados, essenciais para qualquer projeto de análise.

**Tópicos Principais:**
- Coleta e importação de dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce finibus turpis in dolor posuere mollis.
- Limpeza e tratamento: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eget est aliquam, blandit sem at, feugiat lacus.
- Análise exploratória: Lorem ipsum dolor sit amet, consectetur adipiscing elit. In nec rutrum erat. Vivamus volutpat lorem vel ante tincidunt consequat.
- Feature engineering: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque scelerisque malesuada lorem, sit amet aliquam velit aliquet et.

**Conceitos-chave:** ETL, Data Wrangling, Outliers, Missing Values, EDA, Features

**Pergunta de Reflexão:** Por que a etapa de preparação de dados geralmente consome tanto tempo em projetos de ciência de dados?

# Parte 4: Machine Learning Aplicado

**Objetivo de Aprendizagem:** Entender e aplicar algoritmos de machine learning para resolver problemas práticos com dados.

**Tópicos Principais:**
- Algoritmos supervisionados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ornare sagittis orci, at tincidunt erat rhoncus quis.
- Algoritmos não supervisionados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut auctor augue et mi luctus lacinia.
- Avaliação de modelos: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac pulvinar risus, quis vulputate nisi.
- Deploy de soluções: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras et tortor nec sapien interdum convallis quis ut arcu.

**Conceitos-chave:** Classificação, Regressão, Clustering, Validação Cruzada, Overfitting, Underfitting

**Pergunta de Reflexão:** Como equilibrar a complexidade do modelo com sua capacidade de generalização para novos dados?

# Parte 5: Comunicação e Visualização de Resultados

**Objetivo de Aprendizagem:** Desenvolver habilidades para comunicar resultados técnicos complexos de forma clara e persuasiva para diferentes públicos.

**Tópicos Principais:**
- Princípios de visualização efetiva: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at commodo risus, a ullamcorper orci.
- Ferramentas de visualização avançadas: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi scelerisque felis ac justo vehicula viverra.
- Storytelling com dados: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam semper congue tortor, nec lobortis ex pulvinar at.
- Apresentação para stakeholders: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque ultricies urna eget sapien consectetur, nec ultrices ipsum congue.

**Conceitos-chave:** Data Storytelling, Dashboards, Visualização Interativa, Comunicação Técnica

**Pergunta de Reflexão:** Como adaptar a apresentação de resultados técnicos para diferentes públicos e objetivos?

# Conclusão

A jornada pela ciência de dados é um processo contínuo de aprendizagem e aperfeiçoamento. O caminho percorrido nas cinco partes deste guia oferece uma base sólida para compreender e aplicar as principais técnicas e ferramentas do campo.

Começando pelos fundamentos, passando pelas ferramentas essenciais, técnicas de preparação de dados, aplicações de machine learning e finalmente comunicação efetiva, este guia proporciona uma visão abrangente do ciclo completo de um projeto de ciência de dados.

À medida que você avança na prática, lembre-se que a integração dessas diferentes áreas é o que realmente diferencia um cientista de dados eficaz. Combine habilidades técnicas com pensamento crítico e comunicação clara para transformar dados em valor concreto.
"""
    
    # Converter markdown para HTML
    html_result = mark_safe(markdown.markdown(
        demo_markdown,
        extensions=['extra', 'fenced_code', 'tables', 'nl2br', 'sane_lists']
    ))
    
    context = {
        'result': demo_markdown,
        'html_result': html_result,
        'tema': tema,
        'num_partes': num_partes,
        'has_content': True,
        'is_demo': True,
        'app_title': 'ChunkMaster Demo'
    }
    
    return render(request, 'demo.html', context)
