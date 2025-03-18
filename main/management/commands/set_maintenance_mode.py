from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Ativar ou desativar o modo de manutenção da aplicação'

    def add_arguments(self, parser):
        parser.add_argument(
            '--on',
            action='store_true',
            help='Ativar o modo de manutenção',
        )
        parser.add_argument(
            '--off',
            action='store_true',
            help='Desativar o modo de manutenção',
        )

    def handle(self, *args, **options):
        maintenance_file = os.path.join(settings.BASE_DIR, 'maintenance_mode')
        
        if options['on']:
            # Criar o arquivo de flag de manutenção
            with open(maintenance_file, 'w') as f:
                f.write('Sistema em manutenção. API sem créditos suficientes.')
            
            self.stdout.write(
                self.style.SUCCESS('Modo de manutenção ATIVADO')
            )
            
        elif options['off']:
            # Remover o arquivo de flag de manutenção se existir
            if os.path.exists(maintenance_file):
                os.remove(maintenance_file)
                
            self.stdout.write(
                self.style.SUCCESS('Modo de manutenção DESATIVADO')
            )
            
        else:
            # Status atual
            if os.path.exists(maintenance_file):
                self.stdout.write('Modo de manutenção: ATIVADO')
            else:
                self.stdout.write('Modo de manutenção: DESATIVADO')
