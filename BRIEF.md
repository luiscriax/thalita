# Thalita Mariano — brief do projeto

> *Maquiagem com a sua cara.*

Este repositório guarda só a ideia do projeto, para conversar e planejar. O código de antes foi retirado daqui (continua na pasta local).

## A ideia em uma frase
Um app da maquiadora **Thalita Mariano** em que a cliente **vê a make no próprio rosto antes de marcar**, agenda e paga o sinal ali mesmo. A Thalita recebe uma **ficha técnica pronta** (o Beauty Brief) de cada atendimento.

## O problema que resolve
- **Para a cliente:** é difícil imaginar como uma make vai ficar no próprio rosto. Fotos de referência são de outras pessoas, e a conversa por WhatsApp é cheia de idas e vindas para combinar o estilo, o horário, o local e o valor.
- **Para a Thalita:** muito tempo vai em atendimento manual (orçamento, deslocamento, cobrança do sinal, confirmação), e ela chega no atendimento sabendo pouco do que a cliente realmente quer.

## Para quem
- **Cliente:** mulheres com um momento especial (casamento, formatura, ensaio, evento social ou corporativo), que podem ser a noiva, a madrinha, a convidada, a formanda… A make pode ser para ela mesma ou para outra pessoa (filha, mãe, amiga, presente).
- **Thalita:** maquiadora autônoma (MEI) que atende no próprio espaço ou na casa da cliente.

## Jornada da cliente
1. **Momento:** escolhe a ocasião ("Cada momento pede uma make").
2. **Papel:** diz qual é o papel dela no evento. Cada papel tem um cuidado e um preço.
3. **Estilo:** natural, soft glam, glam, olho marcante ou boca marcante. Pode mandar uma foto de referência e dizer o que gostou nela.
4. **Sua foto:** manda uma selfie sem maquiagem. O app checa se o rosto está bem enquadrado.
5. **Simulação com IA:** vê a make no próprio rosto, em comparação de antes e depois. Pode pedir "mais suave", "mais intenso" ou escrever/falar um ajuste. A imagem sempre aparece como *inspiração*, não como promessa.
6. **Agendar:**
   - *Quem:* para ela ou para outra pessoa. Se for menor de idade, pede autorização de um responsável.
   - *Onde:* no espaço da Thalita ou em casa. Em casa, a taxa de deslocamento é calculada pelo CEP. Fora da área padrão, vira um pedido de orçamento.
   - *Quando:* dia e horário. Há um adicional antes das 7h e uma antecedência mínima.
7. **Pedido enviado:** a Thalita confere e aceita. Aí aparece o **Pix do sinal** no app. Com o sinal pago, o horário fica confirmado.
8. **Área da cliente:** próxima make, reservas, makes salvas, pessoas cadastradas, notificações, ajuda e o botão "Falar com a Thalita".

**Limite de simulações por dia** (para controlar o custo da IA): 1 sem conta, 5 com conta e 15 para quem tem reserva.

## Lado da Thalita (Studio)
- **Pedidos e agenda**, com status escritos como ação: *Novo pedido*, *Definir deslocamento*, *Aguardando o sinal*, *Confirmada*, *Realizada*, *Sinal não pago*, *Cancelada*, *Recusada*.
- **Beauty Brief:** para cada atendimento, a IA compara a selfie sem make com a simulação aprovada e monta uma ficha com:
  - leitura do rosto e da luz da foto;
  - pele (tom e subtom *estimados*, com grau de confiança);
  - olhos, sobrancelhas e boca;
  - paleta de cores, intensidade e ordem de execução;
  - o que foi adaptado do pedido da cliente, duração e fixação;
  - o que **confirmar pessoalmente** (testar a base, alergias, traje, óculos).

  A ficha é uma direção, não uma receita: não cita marcas e não identifica a pessoa.
- **Serviços e preços**, que podem ser ligados e desligados (ex.: teste de make para noivas). Pedidos já feitos mantêm o preço da época.
- **Configurações:** valor do sinal, nome no Pix, endereço do espaço, taxas de deslocamento (fixa perto e por km para outra cidade), adicional de madrugada, antecedência mínima, avisos no celular e resumo diário por e-mail, sincronização com o Google Agenda.
- **Acervo:** fotos das makes que aparecem no catálogo.

## Marca e tom
- Nome: **Thalita Mariano** (o nome antigo era "Glam by Thalita"). Slogan: *"Maquiagem com a sua cara."*
- Na interface é sempre **"make"**, nunca "look".
- Visual em tons de pele: pó, nude, champanhe, terra e cacau. Elegante e acolhedor.
- Uma decisão por tela e um botão principal ao alcance do polegar. Pensado primeiro para celular, instalável como app.
- Linguagem direta e próxima: "A Thalita confirma com você", "Agora é com a Thalita".

## Princípios
- A IA serve para **inspirar e alinhar expectativa**, não para substituir a maquiadora.
- **Privacidade:** a foto do rosto é dado sensível. A IA não infere idade, etnia nem saúde. Há termos e política de privacidade.
- **Transparência no preço:** a cliente vê a taxa de deslocamento e o sinal antes de se comprometer.

## Tecnologia prevista (referência)
App web instalável (Next.js), Supabase (banco e login), Gemini (simulação e Beauty Brief), detecção de rosto no próprio aparelho, Pix para o sinal, Google Agenda e avisos por e-mail.

## Em aberto para conversar
- Modelo de negócio: é um app só da Thalita ou pode virar produto para outras maquiadoras?
- Política de sinal, cancelamento e remarcação.
- Quanto custa a IA por cliente e se o limite de simulações está bom.
- Como divulgar e trazer as primeiras clientes.
- Qual é a versão mínima para lançar.
