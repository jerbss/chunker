#!/usr/bin/env python
"""
Utilitário para gerar uma nova SECRET_KEY Django.
"""
import random
import string

def generate_secret_key():
    """Gera uma chave secreta aleatória para Django."""
    chars = string.ascii_letters + string.digits + string.punctuation
    # Remove alguns caracteres que podem causar problemas em variáveis de ambiente
    chars = chars.replace("'", "").replace('"', "").replace('\\', "")
    return ''.join(random.choice(chars) for _ in range(50))

if __name__ == '__main__':
    print("Gerando nova SECRET_KEY para Django...")
    print(generate_secret_key())
    print("\nCopie esta chave e defina-a como uma variável de ambiente no Railway:")
    print("SECRET_KEY=sua_chave_gerada")
