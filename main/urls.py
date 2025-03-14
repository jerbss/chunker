from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test_gemini, name='test_gemini'),
]
