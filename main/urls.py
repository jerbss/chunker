from django.urls import path
from . import views

urlpatterns = [
    path('', views.test_gemini, name='test_gemini'),  # Mudança aqui: a view agora está na raiz
]
