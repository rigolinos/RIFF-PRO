# Revisão do caminho do usuário: Riff Pro e Riff Clubes

16/10/2026. Revisão tela por tela, feita a partir do código e do retorno dos testes com usuários (eles se perdem ao criar atividade no Pro, e sentem atrito em outros pontos). Nada foi codado: isto é o diagnóstico e o plano.

## 1. Como vamos validar

Tudo o que muda no caminho do usuário passa por três checagens: antes de começar (para ter a linha de base), em cada lote e no fim.

**1. Teste com pessoas (o que decide).** Cinco organizadores e cinco participantes que nunca usaram o app, cada um sozinho com o celular, pensando em voz alta. Ninguém ajuda: se a pessoa pede ajuda, a tarefa conta como falha. Cinco pessoas por perfil acham a maior parte dos problemas de uma tela.

Para cada tarefa, anotamos quatro números:

- **Sucesso:** fez sozinha ou não.
- **Tempo** até concluir.
- **Erros:** toques errados e voltas.
- **Facilidade:** depois de cada tarefa, a pessoa responde "de 1 a 7, quão fácil foi?".

| Tarefa | Quem faz | Meta depois das mudanças |
|---|---|---|
| T1. Criar a conta e chegar à primeira tela útil | todos | 5 de 5 sem ajuda |
| T2. Publicar a primeira atividade e mandar o convite no WhatsApp | organizador | 4 de 5 sem ajuda, menos de 4 min (sem contar o cadastro de organizador), nota 6+ |
| T3. Reservar uma atividade paga e pagar | participante | 5 de 5, nota 6+ |
| T4. Fechar o app no meio do pagamento e achar o Pix de novo | participante | 4 de 5 |
| T5. Confirmar que um participante pagou, antes da atividade | organizador | 4 de 5 |
| T6. Fazer a chamada depois da atividade | organizador | 5 de 5 |
| T7. Cancelar uma reserva | participante | 5 de 5 |
| T8. Repetir uma atividade na semana seguinte | organizador | 4 de 5 |
| T9. Uma pessoa que só participa decide organizar | participante | 4 de 5 acham o caminho em menos de 30 s |

**2. Revisão de cada tela antes do PR.** Para toda tela que mudar, eu checo seis pontos:

- Ela responde "onde estou, o que faço aqui, o que vem depois"?
- Usa as palavras do glossário (seção 2)?
- Mostra o que está acontecendo (carregando, salvo, erro)?
- Dá para desfazer ou voltar sem perder o que foi preenchido?
- O erro diz o que fazer?
- Funciona com uma mão, numa tela de 375 px?

O PR leva a captura de cada tela nova.

**3. Números do uso real (opcional, decisão sua).** Contar quantos começam a criar uma atividade e quantos publicam, e quantos reservam e quantos pagam. Precisa de uma tabela nova de eventos, sem dado pessoal além do id da conta, e de uma linha na Política de Privacidade. Sem isso, a validação fica só nos testes com pessoas.

## 2. Princípios: o app conversa com a pessoa

1. **Uma pergunta de cada vez quando a decisão importa.** Criar atividade, pagar e virar organizador são conversas em passos curtos, não formulários longos.
2. **O botão diz o que acontece.** Exemplos: "Publicar e chamar a galera", "Já fiz o Pix", "Confirmar que recebi". Evitar "Continuar" quando dá para dizer mais.
3. **Depois de cada ação importante, o próximo passo aparece na frente.** Publicou: compartilhe. Reservou: pague. Pagou: avise. Terminou: faça a chamada.
4. **O app só promete o que faz.** Hoje o ingresso diz "mostre o QR ao organizador", mas o organizador não tem como ler o QR.
5. **Mesmo nome para a mesma coisa, sempre** (glossário abaixo).
6. **Nada se perde.** Voltar, sair do app ou cair a internet não apagam o que a pessoa preencheu, e o app avisa quando recupera um rascunho.

**Glossário proposto (os dois apps):**

| Termo | O que é |
|---|---|
| Atividade (no Pro) e Evento (no Clubes) | A coisa que acontece |
| Reserva (Pro) e Inscrição (Clubes) | O lugar garantido de uma pessoa |
| Vaga | Uma unidade da capacidade |
| Organizador e Participante | Quem conduz e quem vai |
| Sua página | A vitrine pública do organizador (hoje: "vitrine", "@seu-nome", "link público") |
| Chamada | Marcar quem veio (hoje: "Fechar", "Encerrar atividade", "Presença", "Inscritos e presença") |
| Pagamento confirmado e Aguardando pagamento | Situação do Pix |
| Painel | A tela inicial de quem organiza (hoje aparece também "Dashboard") |

## 3. Riff Pro

Gravidade:

- **Alta:** faz a pessoa desistir ou errar.
- **Média:** atrapalha ou confunde.
- **Baixa:** acabamento.

### 3.1 O que mais pesa: os "dois modos"

**Como é hoje.** Quem organiza tem dois menus diferentes, o de Organizar e o de Participar, os dois com um item "Início". Trocar de modo fica escondido em três lugares:

- a seta ao lado do nome ("Alternar perfil");
- o botão "Participante" no Painel;
- a faixa dourada "Você está no Modo Participante · Voltar ao Dashboard".

Quem só participa não vê o botão Criar. Para organizar, precisa descobrir "Quero organizar" dentro da seta do nome. Além disso, o login e a tela de entrada mandam todo mundo para o Início do participante, inclusive o organizador.

**Por que pesa.** A pessoa não sabe em qual "app" está, e o menu muda de baixo dela. É a causa mais provável do "me perdi no meio do caminho": ela sai do formulário para cadastrar o Pix ou ver algo, volta pelo menu e cai em outro modo.

**Proposta (decisão sua).** Acabar com os modos. Um menu só para todos:

> **Início · Explorar · Criar · Agenda · Perfil**

- **Criar** aparece para todos. Para quem ainda não organiza, ele abre a explicação e o cadastro de organizador.
- **Agenda** junta "Vou" (minhas reservas) e "Organizo" (minhas atividades), com abas.
- **Painel e Ganhos** do organizador ficam no topo do Início ("Hoje você organiza 2 atividades", "3 pagamentos para confirmar") e dentro da Agenda, na aba "Organizo".
- O login leva o organizador ao Início com o resumo dele.

A alternativa mais leve é manter os modos, mas com uma chave "Participar | Organizar" sempre visível no topo e o Criar nos dois menus. Resolve a descoberta, mas não a sensação de trocar de app.

### 3.2 Criar atividade (o problema relatado)

**O que acontece hoje, passo a passo:**

1. A pessoa toca em Criar. Se ainda não passou pelo cadastro de organizador, cai direto em três telas pedindo CPF, nascimento, celular, área, apresentação, Pix e o Termo, antes de ver qualquer coisa da atividade e sem explicar por quê.
2. Depois vem um formulário único, com 8 blocos e cerca de 25 controles:
   - tipo (5 opções);
   - esporte (busca e chips);
   - nome e foto;
   - quando (dia em chips e campo de data, horário em chips e campo, duração);
   - onde (busca, seus locais e ponto de encontro);
   - vagas;
   - preço (chips e campo);
   - detalhes.
3. A prévia no topo some ao rolar. Não há "passo 3 de 6". O que falta aparece só no rodapé, um item por vez.
4. Se a pessoa já abriu o Criar antes, o formulário volta preenchido com o rascunho antigo, sem avisar.
5. Publicou: aparece um aviso rápido e a pessoa cai na lista de Atividades. O passo mais importante, mandar o convite, não é oferecido.

| # | Problema | Gravidade |
|---|---|---|
| C1 | Formulário longo numa tela só, sem progresso: a pessoa perde a noção de onde está | Alta |
| C2 | Cadastro de organizador antes da atividade, sem aviso do que vem | Alta |
| C3 | Depois de publicar não há o próximo passo (compartilhar) | Alta |
| C4 | Rascunho volta sem avisar: parece que o app "lembrou errado" | Média |
| C5 | Ordem pouco natural: pede o nome antes de quando e onde. O nome é o mais difícil de inventar e fica mais fácil depois | Média |
| C6 | "Quando" tem três decisões e dois jeitos de escolher cada uma | Média |
| C7 | O tipo "Outro" aparece como "Atividade", que é o nome de tudo | Média |
| C8 | Sugestões de nome só para 3 esportes (futevôlei, yoga, crossfit) | Baixa |
| C9 | Aviso de Pix leva para fora do formulário | Baixa (o cadastro de organizador já exige o Pix) |

**Proposta: assistente em 6 passos + revisão + tela de sucesso**

Cada passo é uma tela com uma pergunta, uma frase curta explicando, o botão fixo embaixo e "Passo X de 6" no topo. Voltar não perde nada.

1. **O que você vai organizar?** Cinco cartões grandes, cada um com um exemplo ("Aula: você ensina, costuma repetir toda semana").
2. **Qual esporte?** Os que a pessoa já usou primeiro, depois a busca. Mantém o "não achei meu esporte".
3. **Quando?** Dia (Hoje, Amanhã, Sábado, Domingo ou outro), horário e duração, um abaixo do outro.
4. **Onde?** Os locais que a pessoa já usou primeiro, depois a busca de endereço, depois o ponto de encontro.
5. **Vagas e preço.** Contador de vagas, preço (Grátis ou valor) e a frase "o Pix cai direto na sua chave ••••1234".
6. **Nome e detalhes.** Nome já sugerido a partir do que foi escolhido ("Vôlei de praia · sábado de manhã"), foto e descrição opcionais.
7. **Revisão.** A prévia do ingresso inteira, com "alterar" em cada linha, e o botão "Publicar".
8. **Pronto!** "Sua atividade está no ar. Agora chame a galera": Compartilhar no WhatsApp (o convite que já existe), Copiar link, Ver a atividade.

Junto com o assistente:

- **Cadastro de organizador no fim, não no começo.** Quem ainda não é organizador monta a atividade inteira. Ao tocar em Publicar, vê: "Falta só seu cadastro de organizador (2 min) para publicar". Termina o cadastro e a atividade é publicada sozinha. O rascunho já existe, então nada se perde. Isso aproveita a motivação de quem já investiu na atividade.
- **Rascunho explícito.** Ao abrir o Criar com um rascunho guardado: "Você começou 'Treino de sábado'. Continuar ou Começar do zero?"
- **Repetir na semana seguinte** abre o assistente já na revisão, com tudo preenchido e a data da semana seguinte. Hoje publica na hora, sem revisão, e perde coordenada, ponto de encontro, o que levar, foto e esporte novo (bug).
- **Componente no núcleo.** O assistente é feito uma vez em `packages/core` e usado pelo Pro e pelo Clubes.

### 3.3 Pagamento e reserva (participante e organizador)

| # | Problema | Gravidade |
|---|---|---|
| R1 | **O organizador só confirma o Pix na chamada**, depois que a atividade começa. Antes disso o participante fica "Aguardando pagamento" mesmo tendo pago. Ganhos mostra "A receber", mas sem botão para confirmar | Alta |
| R2 | **Quem fecha a janela do Pix não acha mais o Pix.** Em Reservas, a reserva pendente só tem "Falar com o organizador" | Alta |
| R3 | "Já paguei / Pagar depois" é um botão só para duas coisas opostas | Média |
| R4 | O botão "Calendário" cria o evento sem data nem horário (bug) | Média |
| R5 | "Ver rota", depois de reservar, ignora a coordenada (o "Como chegar" da página usa) | Baixa |
| R6 | O código Pix "copia e cola" aparece cru na tela, ocupando espaço | Baixa |
| R7 | O texto alterna maiúsculas: "Resumo da Reserva", "Confirmar Reserva", "Seu Ingresso" | Baixa |

**Proposta:**

- **Participante.** A reserva paga pendente ganha um botão "Pagar agora" (QR, copiar código, avisar no WhatsApp) em Agenda e na página da atividade. No pagamento, dois botões claros: "Já fiz o Pix, avisar o organizador" e "Pago depois". A situação fica sempre visível: Aguardando pagamento, Pagamento confirmado, Cancelada.
- **Organizador.** Uma lista "Pagamentos para confirmar" no Início e em Ganhos, com "Confirmar que recebi" por pessoa, a qualquer momento. Na chamada continua dando para marcar.

### 3.4 Check-in e ingresso

| # | Problema | Gravidade |
|---|---|---|
| K1 | O ingresso mostra um QR "para mostrar ao organizador", mas o app do organizador não lê QR: a chamada é manual | Média |

**Proposta, em duas etapas:**

1. **Agora:** o ingresso mostra o nome da pessoa, a atividade e um código curto, com o texto "Seu nome está na lista de quem organiza". O QR sai.
2. **Depois (lote próprio):** "Ler ingresso" na chamada, usando a câmera, marcando presente na hora. Exige liberar a câmera na Permissions-Policy.

### 3.5 Painel, atividades e chamada (organizador)

| # | Problema | Gravidade |
|---|---|---|
| O1 | "Primeiros passos" lista 7 itens, e 2 já vêm feitos pelo cadastro de organizador (Pix e WhatsApp). Os números do Painel (Receita de todo o período, "Reservas abertas") não dizem o que fazer | Média |
| O2 | A aba "Fechar" em Atividades não diz o que é. "Encerrar atividade", "Presença" e "Inscritos e presença" são a mesma coisa com quatro nomes | Média |
| O3 | Cancelar a atividade abre o WhatsApp sem destinatário. A pessoa precisa saber colar no grupo certo | Baixa |
| O4 | "Escolher seu link (@seu-nome)" sem explicar para que serve | Baixa |

**Proposta.** O topo do Início do organizador vira uma lista de pendências ("2 pagamentos para confirmar", "1 chamada para fazer", "Compartilhe a atividade de sábado: 3 de 10 vagas"). A aba "Fechar" vira "Fazer chamada". Os Primeiros passos ficam só com o que falta de verdade: foto, sua página, primeira atividade, primeiro convite.

### 3.6 Entrada, cadastro e perfil

| # | Problema | Gravidade |
|---|---|---|
| E1 | O cadastro pergunta "Quero participar / Quero organizar", mas a conta é a mesma. Quem escolhe organizar ainda passa pelo cadastro de organizador depois. É uma escolha que não decide nada | Média |
| E2 | Depois de criar a conta, a pessoa cai na tela de login com um aviso pequeno para confirmar o e-mail. É fácil tentar entrar antes de confirmar e achar que a senha está errada | Média |
| E3 | A tela "Onde você joga?" (cidade do participante) não é chamada por nenhum caminho. Quem entra fica sem cidade e o Início mostra "Sua cidade" | Média |
| E4 | O Perfil mistura dados, sua página, Pix, perfil esportista, bloqueados e conta numa tela só | Média |

**Proposta:**

- O cadastro pede só nome, e-mail e senha. A escolha "organizar" vira o Criar.
- Tela própria "Confirme seu e-mail", com o endereço digitado, "Abrir meu e-mail" e "Reenviar".
- Primeiro acesso: aceite dos termos e depois "Onde você joga?" (cidade).
- Perfil em seções que abrem: Meus dados · Sua página (organizador) · Recebimento (organizador) · Perfil esportista · Privacidade e conta.

### 3.7 Descobrir atividades

| # | Problema | Gravidade |
|---|---|---|
| D1 | O Início tem duas faixas de filtros (5 tipos e dezenas de esportes) antes da lista | Média |
| D2 | O ícone de busca do Início diz "Buscar organizadores", mas o Explorar busca atividades também | Baixa |

**Proposta.** O Início mostra a semana na sua cidade com um botão "Filtrar" (tipo, esporte, preço) que abre uma gaveta. A busca vira "Buscar atividades e organizadores".

### 3.8 Lotes do Pro, na ordem

| Lote | Conteúdo | Banco | Tarefas que valida |
|---|---|---|---|
| **P0** | Bugs e textos: calendário sem data (R4), rota sem coordenada (R5), repetir atividade perdendo dados, login do organizador, cidade do participante (E3), glossário aplicado nas telas | não | T1, T8 |
| **P1** | Criar atividade: assistente, revisão, tela de sucesso, rascunho explícito, cadastro de organizador no fim | não | T2, T9 |
| **P2** | Pagamento: "Pagar agora" na reserva e "Pagamentos para confirmar" para o organizador (R1, R2, R3) | sim (confirmar pagamento antes do início) | T3, T4, T5 |
| **P3** | Menu único e Agenda "Vou / Organizo" (3.1), Início do organizador com pendências | não | T9, T5, T6 |
| **P4** | Ingresso honesto (K1), cadastro enxuto e "Confirme seu e-mail" (E1, E2), Perfil em seções (E4) | não | T1 |
| **P5** | Início do participante com "Filtrar" (D1, D2) | não | T3 |
| depois | Leitura do ingresso pela câmera; números de uso (seção 1, item 3) | sim | T6 |

Antes do P1, um teste de linha de base com a versão atual (tarefas T1 a T9) para comparar depois. Ao fim do P1 e do P3, repetir com pessoas novas.

## 4. Riff Clubes

O Clubes herda o núcleo e vários problemas do Pro em versão menor. O que é só dele:

### 4.1 Menu e palavras

| # | Problema | Gravidade |
|---|---|---|
| N1 | O menu tem "Eventos" e "Agenda", e não fica claro qual é "todos" e qual é "os meus" | Média |
| N2 | O item "Clubes" no menu aparece para quem mora em condomínio | Média |
| N3 | Mesma coisa com quatro nomes: "Criar atividade", "Novo evento", "Criar jogo", "Publicar evento" | Média |
| N4 | O papel `owner` aparece como "Responsável" em Gestão e como "Gestor" no resto | Baixa |

**Proposta:**

- Menu: **Início · Comunidade · Criar · Minha agenda · Perfil**.
- "Evento" em todas as telas do Clubes.
- "Gestor" para owner e admin em todo lugar.

### 4.2 Primeiro acesso

| # | Problema | Gravidade |
|---|---|---|
| A1 | Sem comunidade, o Início só oferece o código de convite. "Meu condomínio ainda não está no Riff" fica no fim da tela Clubes, depois da lista vazia | Alta |
| A2 | O convite que o gestor manda tem o endereço do site e o código separados. A pessoa cria conta, confirma o e-mail, entra, aceita os termos e só então volta ao WhatsApp para copiar o código | Média |

**Proposta:**

- A primeira tela sem comunidade tem duas portas do mesmo tamanho: "Tenho um código de convite" e "Meu condomínio ou clube ainda não está no Riff".
- O link de convite carrega o código: depois do cadastro e do aceite, a pessoa entra direto na comunidade.

### 4.3 Criar evento

O formulário tem 6 blocos numa tela, com os mesmos problemas do Pro (C1, C5, C6). E mais:

| # | Problema | Gravidade |
|---|---|---|
| V1 | "Aceita menores de idade" fica escondido em "Detalhes (opcional)". É uma decisão de segurança, não um detalhe | Alta |
| V2 | Depois de publicar, a pessoa vai para a página do evento, mas não há "Chamar no grupo do condomínio", que é onde os vizinhos estão | Alta |
| V3 | O conflito de horário do espaço só aparece depois de escolher espaço e hora, no meio da tela | Baixa |

**Proposta:** o mesmo assistente do núcleo, com 5 passos:

1. Esporte (o tipo já vem como Jogo para morador e Aula para instrutor, e dá para trocar).
2. Quando.
3. Onde: os espaços da comunidade primeiro, com o conflito avisado ali mesmo.
4. Vagas e "Crianças e adolescentes podem participar?", como pergunta própria, com idade mínima.
5. Nome e detalhes.

Depois vêm a revisão e a tela de sucesso, com "Mandar no grupo do condomínio" (WhatsApp).

### 4.4 Gestor

| # | Problema | Gravidade |
|---|---|---|
| G1 | A Gestão junta membros, convites, espaços e pedidos de entrada numa tela longa. Presença pendente aparece no Início, mas leva à página da comunidade, não à chamada | Média |

**Proposta.** A Gestão começa por "Para fazer" (pedidos de entrada, chamadas pendentes, convites a vencer). Embaixo, as seções Membros, Convites e Espaços. A chamada pendente leva direto à chamada.

### 4.5 Lotes do Clubes, na ordem

| Lote | Conteúdo | Banco | Validação |
|---|---|---|---|
| **C0** | Menu e palavras (N1 a N4), "Gestor" em todo lugar | não | — |
| **C1** | Primeiro acesso com as duas portas e o código seguindo no link (A1, A2) | talvez (guardar o código antes do cadastro) | síndico e 5 moradores de um condomínio piloto: entrar na comunidade |
| **C2** | Criar evento com o assistente do núcleo, menores como pergunta própria e "Mandar no grupo" (V1 a V3) | não | criar um jogo e chamar os vizinhos |
| **C3** | Gestão com "Para fazer" (G1) | não | o gestor aprova um pedido e faz uma chamada |

## 5. Perguntas para você

1. **Acabar com os modos (3.1)?** É a mudança de maior efeito no Pro e a mais trabalhosa. Recomendo fazer, no lote P3, depois do assistente de criação.
2. **Cadastro de organizador no fim da criação (3.2)?** Recomendo.
3. **Ingresso sem QR até existir a leitura pela câmera (3.4)?** Recomendo.
4. **Números de uso (seção 1, item 3)?** Opcional. Ajuda a ver onde as pessoas desistem, mas precisa de tabela nova e de uma linha na Política de Privacidade.
5. **Os testes com usuários:** se tiver as anotações (em qual passo a pessoa travou, o que falou), elas ajudam a ordenar os lotes. Se não tiver, o teste de linha de base do P1 cobre.
