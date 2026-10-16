# Riff Clubes: teste interno na Google Play

Mesmo preparo do Riff Pro (`docs/teste-interno-pro.md`), com o que muda no Clubes. Publicar depois do Pro.

## 1. Antes de publicar o teste

| Item | Situação |
|---|---|
| Manifest (nome, ícones 192 e 512, maskable, atalhos, `id`) | Feito (`apps/clubes/public/manifest.webmanifest`) |
| Tela "sem conexão" | Feito (`apps/clubes/public/sw.js`, `offline.html`) |
| Página pública de exclusão de conta | Feito: `https://riff-pro-clubes.vercel.app/excluir-conta` |
| Política de privacidade pública | `https://riff-pro-clubes.vercel.app/privacidade` (responsável e e-mail de contato ainda entre colchetes) |
| Denunciar e bloquear | Feito (perfil do vizinho, atividade, lista de bloqueados no Perfil) |
| Registro de erros das telas | Feito no código; depende da migration 0028 aplicada |
| Ícone e imagem próprios do Clubes | **Falta.** Hoje o ícone é o mesmo do Riff Pro: na loja, dois apps com o mesmo ícone confundem e podem ser recusados como repetidos |
| Pacote `.aab` e `assetlinks.json` | A fazer, com a impressão digital SHA-256 do app do Clubes (é outra, diferente da do Pro) |
| Ficha da loja | Textos e capturas próprios do Clubes (não reaproveitar os do Pro) |

### O que é diferente do Pro nos formulários da Play Console

- **Público-alvo:** a conta é só para maiores de 18. Menores não usam o app; aparecem como dependentes, cadastrados pelo responsável. Declarar público 18+ e dizer, na classificação de conteúdo, que o app guarda nome e nascimento de menores informados pelo responsável.
- **Segurança dos dados:** além do que o Pro coleta (menos CPF e Pix, que são só do organizador do Pro), o Clubes guarda nome, nascimento e parentesco de dependentes, e a comunidade (condomínio ou clube) de cada pessoa. Nada é vendido, não tem anúncio, não tem pagamento no app.
- **Acesso ao app para o revisor:** o Clubes só mostra conteúdo dentro de uma comunidade. O revisor precisa de uma conta já confirmada **e já membro de uma comunidade de demonstração**, com alguns eventos marcados. Sem isso ele vê telas vazias e pode recusar por "funcionalidade mínima".
- **App parecido com outro do mesmo desenvolvedor:** deixar claro na ficha que o Clubes é para moradores e sócios de comunidades fechadas, e o Pro para quem vende atividades. Ícone, nome, capturas e descrição diferentes.

## 2. Roteiro de teste

Use três contas: um gestor, um morador e um morador responsável por um dependente. A comunidade de teste é criada pela equipe Riff (terminal).

### A. Instalação e entrada

1. Instalar, abrir sem barra de endereço, criar conta, confirmar e-mail, aceitar os Termos e a Política do Clubes.
2. A mesma conta do Riff Pro entra no Clubes (e pede o aceite dos documentos do Clubes).
3. Modo avião e abrir o app: "Você está sem conexão".

### B. Entrar numa comunidade

1. Com código de convite (`XXXX-XXXX`) dado pelo gestor.
2. Sem código: "Cadastrar comunidade" com um endereço a menos de 150 m da comunidade de teste: o app oferece "Pedir para entrar". O gestor aprova em Gestão.
3. Endereço novo: o pedido fica pendente; uma segunda conta usa "Eu também quero".

### C. Morador

1. Início mostra os eventos da semana; filtrar por dia e por comunidade.
2. Criar um evento num espaço oficial; marcar outro no mesmo horário: aparece o aviso de conflito.
3. Participar de um evento, ver "quem vai", cancelar (regra das 4 horas).
4. Depois do evento: avaliar "como foi" e dar elogios; conferir o ranking do mês e o perfil esportista.
5. Modo reservado no Perfil: some do ranking e aparece como "Membro" em quem vai.
6. Sede da comunidade: endereço e "Como chegar" só para membros.

### D. Dependentes

1. Cadastrar um dependente (aceite do Termo do Responsável).
2. Evento sem "aceita menores" não deixa inscrever; evento que aceita, com idade mínima, respeita a idade.
3. Remover o dependente: as inscrições futuras dele são canceladas.

### E. Gestor

1. Gestão: membros, convites, pedidos de entrada, espaços (criar, editar, arquivar).
2. Mudar o papel de um membro e remover um membro.
3. Registrar presença de um evento ou marcar "não aconteceu".

### F. Conta e segurança

1. Denunciar o perfil de um vizinho e uma atividade: "Denúncia enviada".
2. Bloquear um vizinho: os eventos criados por ele somem do Início e da agenda da comunidade; em Perfil > Pessoas bloqueadas, desbloquear.
3. Excluir a conta: sai das comunidades, dependentes são anonimizados. `/excluir-conta` abre sem login.
4. Uma conta de fora da comunidade não vê nada dela (nem pelo link direto de um evento).

### G. Coisas de aparelho

Iguais às do Pro: botão voltar, girar, fonte grande, teclado, rede fraca, continuar logado.

## 3. Antes do público

Além da lista do Pro (CAPTCHA, e-mail próprio, revisão jurídica, domínio):

- Revisão jurídica do Termo do Responsável e do tratamento de dados de menores (LGPD art. 14).
- Apagar o jogo e a comunidade de teste.
- Ícone, imagem de compartilhamento e identidade do Clubes.
