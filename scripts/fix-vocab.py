import glob
import re

for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    new_content = re.sub(r'Avisar turma', 'Avisar participantes', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'Cancelar turma', 'Cancelar atividade', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'Turma lotada', 'Atividade lotada', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'turma', 'atividade', new_content)
    new_content = re.sub(r'Turma', 'Atividade', new_content)
    
    new_content = re.sub(r'agendar seu próximo treino', 'reservar sua próxima atividade', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'Sem academia, sem matrícula.', 'As melhores aulas, jogos e eventos da cidade.', new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
