from django.urls import path
from . import views

urlpatterns = [
    path('', views.test_gemini, name='test_gemini'),  # View principal na raiz
    path('demo/', views.demo_page, name='demo_page'),  # Nova URL para a página de demonstração
]
