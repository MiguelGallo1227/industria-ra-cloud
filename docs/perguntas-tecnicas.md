# Respostas-guia para a apresentação (adapte com suas palavras)

- **Onde executa o Flask?** No container `api` (Gunicorn, porta 5000), iniciado pelo Docker Compose na máquina/VM da equipe.
- **Função do broker MQTT?** Receber as publicações do simulador (ou de gateways) e entregá-las por tópico a quem assinou, de forma assíncrona e desacoplada.
- **Por que a WebAR usa HTTP/JSON?** É simples para o navegador, fácil de testar e tratar erro, e mantém o broker escondido atrás da API.
- **Serviço por container?** mqtt → Mosquitto; api → Flask; simulator → publicador; frontend → Nginx.
- **Se o broker cair?** A API continua no ar e responde o último valor guardado (ficará desatualizado); ela reconecta sozinha quando o broker volta. `/api/health` mostra `mqtt_conectado`.
- **Onde fica o último dado?** Em memória no processo da API (dicionário `telemetria`). Reiniciar a API zera os valores; para persistir, usaria banco de dados.
- **Como os hotspots acompanham o target?** Cada hotspot tem uma âncora 3D filha do target no MindAR. A cada frame projetamos a posição 3D para a tela e movemos o botão.
- **Target físico x .mind?** O target é a imagem real; o .mind é o arquivo com as características extraídas dessa imagem, que o MindAR usa para reconhecê-la.
- **O que escalar se muitos usuários?** A API (várias réplicas atrás de balanceador). Com várias réplicas, o estado deixa de caber em memória: usar Redis/banco compartilhado.
- **IaaS mais adequado?** Cenário 1 (VM com Docker), pois a empresa controla o ambiente.
- **O que muda em PaaS?** Enviamos código/imagem e a plataforma cuida de servidores, SO e escala; o broker viraria serviço gerenciado.
- **O que funciona se a API parar?** A câmera, o reconhecimento, os hotspots e as informações estáticas; só o monitoramento mostra a mensagem de indisponibilidade.
- **Que problema o container resolve?** Empacota código + dependências + versão do Python, então roda igual em qualquer máquina, sem "na minha máquina funciona", e o Compose sobe tudo com um comando.
