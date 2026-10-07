# Análise IaaS, PaaS e SaaS

A classificação depende de **quem gerencia o quê**.

**Cenário 1: VM Linux com Docker, Flask e MQTT instalados pela empresa → IaaS.**
O provedor entrega hardware virtualizado, rede e armazenamento. Continuam com a empresa: sistema operacional e atualizações, instalação do Docker, configuração de rede/firewall e portas, segurança do broker, deploy, monitoramento, backup e escalabilidade.

**Cenário 2: enviar a aplicação a uma plataforma que administra infraestrutura e ambiente de execução → PaaS.**
Deixam de ser responsabilidade da equipe: servidores, sistema operacional, runtime Python, balanceamento e, em geral, escala e patches. A equipe cuida do código, das configurações e dos dados. O broker MQTT precisaria de serviço gerenciado ou de um contêiner à parte.

**Cenário 3: técnico apenas acessa uma aplicação pronta pelo navegador → SaaS (sob a ótica do usuário).**
O consumidor não instala, atualiza nem opera nada: só usa o software. O provedor responde por infraestrutura, plataforma e aplicação. Nosso protótipo se aproximaria disso para o técnico, se a empresa o oferecesse como serviço pronto.

O ThingSpeak, usado de forma opcional, é um exemplo de serviço em nuvem pronto para IoT, consumido como SaaS/PaaS.
