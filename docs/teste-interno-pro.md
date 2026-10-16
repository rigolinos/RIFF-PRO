# Riff Pro: teste interno na Google Play

Roteiro para quem testa e lista do que a Play Store pede. Só o Riff Pro; o Riff Clubes vem depois.

## 1. Antes de publicar o teste

| Item | Situação |
|---|---|
| Conta de desenvolvedor do Google Play | Criada, aguardando validação de idade |
| Manifest (nome, ícones 192 e 512, maskable, atalhos, `id`) | Feito (`public/manifest.webmanifest`) |
| Tela "sem conexão" | Feito (`public/sw.js`, `public/offline.html`) |
| Página pública de exclusão de conta | Feito: `https://riff-pro.vercel.app/excluir-conta` |
| Política de privacidade pública | `https://riff-pro.vercel.app/privacidade` (dados da empresa e e-mail de contato ainda entre colchetes) |
| Pacote `.aab` (TWA) | A gerar no PWABuilder, com o app publicado |
| `/.well-known/assetlinks.json` | Depende da impressão digital SHA-256 que a Play Console mostra depois do primeiro envio (Configuração > Integridade do app > Assinatura de apps) |
| Ficha da loja | Nome, descrição curta (80) e completa (4000), ícone 512, imagem de destaque 1024x500, 2 a 8 capturas de celular |
| Questionários da Play Console | Classificação de conteúdo, público-alvo (18+), segurança dos dados, anúncios (não tem), acesso ao app (conta de teste para o revisor) |

Sem o `assetlinks.json` certo, o app abre com a barra de endereço do navegador no topo. Funciona, mas não parece app.

### Segurança dos dados (respostas para o formulário)

- Coleta: nome, e-mail, telefone, foto, cidade; de quem organiza, CPF ou CNPJ, data de nascimento e chave Pix; local aproximado só se a pessoa permitir; reservas, presenças e avaliações.
- Compartilha: nome e foto com o organizador e com quem reservou a mesma atividade; Pix e WhatsApp do organizador com quem reserva; texto da busca de endereço com o Geoapify.
- Não vende dados, não tem anúncios, não tem pagamento dentro do app (o Pix é direto para o organizador).
- Dados em trânsito criptografados (HTTPS). A pessoa pode excluir a conta pelo app e pela página `/excluir-conta`.

## 2. Roteiro de teste

Use duas contas em dois celulares (ou um celular e um computador): uma organiza, a outra participa. Anote o que travar, com print e horário.

### A. Instalação e entrada

1. Instalar pelo link do teste interno. O ícone e o nome "Riff Pro" aparecem certos na tela inicial.
2. Abrir: tela de entrada sem barra de endereço do navegador.
3. Criar conta com e-mail e senha (8 caracteres, letras e números). Senha fraca é recusada com mensagem clara.
4. Depois de criar a conta aparece "Confirme seu e-mail" com o e-mail digitado. Confirmar pelo link recebido; "Reenviar e-mail" funciona depois de 60 s.
5. Primeiro acesso de participante: o app pergunta a cidade ("Onde você joga?").
6. Aceitar os Termos de Uso e a Política de Privacidade.
7. Sair e entrar de novo. "Esqueci minha senha" envia o e-mail e a nova senha funciona.
8. Modo avião e abrir o app: aparece "Você está sem conexão"; ao voltar a internet, "Tentar de novo" abre o app.

### B. Organizador

1. Com uma conta que só participa, tocar em **Criar** (no meio do menu). O assistente pergunta, uma tela por vez: tipo, esporte (testar "tennis", "bjj" e um esporte que não existe), quando, onde (buscar o endereço e o ponto de encontro), vagas e preço, e o nome (já vem sugerido).
2. Na revisão, "Alterar" leva ao passo e volta para a revisão.
3. Ao publicar pela primeira vez, aparece "Falta só o seu cadastro de organizador". O cadastro pede nome completo, CPF ou CNPJ, nascimento, celular, área, cidade, apresentação, Pix e o Termo. CPF inválido, menor de 18 e CPF repetido são recusados com mensagem clara. Depois do cadastro, a revisão volta preenchida e publica com um toque.
4. Sair no meio do Criar e voltar: aparece "Continuar de onde parei" ou "Começar do zero".
5. Depois de publicar: tela "Agora chame a galera". "Mandar o convite" sai com título, data, hora e local; no WhatsApp o link mostra imagem e título.
6. A atividade aparece em Agenda > Organizo e na sua página.
7. Editar a atividade (horário e vagas) e conferir que o participante vê a mudança.
8. Quando alguém reservar uma atividade paga: no Início aparece "N pagamentos para confirmar". Em Ganhos, tocar em "Recebi" (dá para desfazer). Confirmar **antes** do horário da atividade.
9. Depois do horário: no Início aparece "N chamadas para fazer", que leva à aba Chamada. Fazer a chamada (presente, atrasado, ausente, justificado); o código da reserva (#XXXXXX) aparece ao lado de cada nome.
10. Painel (pelo resumo no Início) e Ganhos mostram os números da atividade encerrada.
11. Repetir na semana seguinte: abre a revisão com tudo igual e a data +7.
12. Criar outra atividade e cancelar: quem reservou vê como cancelada.

### C. Participante

1. Abrir o link do convite sem estar logado: a atividade aparece; ao reservar, pede login e volta para a mesma atividade.
2. Início: "Filtrar" abre a gaveta (tipo, esporte, preço); cada filtro ligado vira um chip com "×". Explorar: buscar pelo nome da atividade, pelo esporte e pelo organizador.
3. Abrir a atividade: "Quem vai", "Onde é", "Como chegar" (abre Google Maps ou Waze).
4. Reservar uma atividade paga: aparece o QR do Pix com o valor e "Copiar código Pix". "Já fiz o Pix: avisar" abre o WhatsApp do organizador com valor, atividade e dia.
5. Fechar no meio do Pix. Em Agenda (ou na página da atividade), a reserva pendente tem "Pagar agora" e o Pix volta. O ingresso mostra o seu nome e o código da reserva (sem QR).
6. Cancelar uma reserva com mais de 4 horas de antecedência; com menos, o app explica por que não dá.
7. Atividade lotada, cancelada ou encerrada não aceita reserva.
8. Depois da atividade: avaliar (3 passos). A avaliação aparece no perfil do organizador, sem o seu sobrenome.
9. Perfil: trocar foto, nome e cidade; ver o perfil esportista; ligar o modo reservado e conferir o "Quem vai" na outra conta.

### D. Conta e privacidade

1. Perfil > Termos e Política abrem e dá para voltar.
2. Excluir a conta (digitar EXCLUIR). Depois: o login não funciona mais, o perfil público some, as reservas futuras ficam canceladas para o organizador.
3. `https://riff-pro.vercel.app/excluir-conta` abre sem login.
4. Denunciar: no perfil de um organizador, numa atividade e numa avaliação (bandeirinha), escolher o motivo e enviar. Aparece "Denúncia enviada".
5. Bloquear um organizador: as atividades dele somem do Início e do Explorar, e não dá mais para reservar com ele. Em Perfil > Pessoas bloqueadas, desbloquear e conferir que volta.
6. Como organizador, em "Inscritos e chamada", bloquear um participante: ele não consegue reservar de novo (vê "Esta atividade não está disponível para você").

### E. Coisas de aparelho

1. Botão "voltar" do Android: volta uma tela; na primeira tela, sai do app.
2. Girar o celular, fonte grande do sistema e modo escuro/claro do Android: nada quebra nem corta texto.
3. Teclado não cobre o campo que está sendo preenchido nem o botão de enviar.
4. Rede fraca (3G): as telas mostram carregamento, não ficam em branco.
5. Fechar o app e abrir de novo: continua logado.

## 3. Depois do teste interno, antes do público

- CAPTCHA (Turnstile) nos dois apps e, só então, ligar no Supabase.
- E-mail próprio para envio (SMTP), no lugar do padrão do Supabase.
- Revisão jurídica dos textos e dados da empresa nos documentos.
- Apagar os dados de exemplo (`supabase/seeds/demo_cleanup.sql`).
- Domínio próprio (muda `brand.ts`, og tags, CSP, origens do Geoapify, URLs do Supabase e o `assetlinks.json`).
- O teste fechado da Play Store exige 12 testadores por 14 dias seguidos para contas pessoais novas, antes de liberar a produção.
