from django.urls import path
from . import views

urlpatterns = [
    path('', views.test_gemini, name='test_gemini'),  # View principal na raiz
    # Remoção da URL para a página de demonstração
]
