from django.urls import path
from . import views

urlpatterns = [
    path('', views.test_gemini, name='home'),
    path('visualize-markdown/', views.visualize_markdown, name='visualize_markdown'),
]
