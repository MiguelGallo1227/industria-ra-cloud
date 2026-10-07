# Matriz de testes

Preencha a coluna "Resultado" (OK/Falhou) e anexe prints/vídeo. Comandos usados estão no README.

| ID | Ação | Resultado esperado | Resultado | Observações |
|---|---|---|---|---|
| T01 | Abrir WebAR | Câmera disponível | | |
| T02 | Apontar para o target | Estado RA ATIVA | | |
| T03 | Movimentar celular/target | Hotspots acompanham o ativo | | |
| T04 | Tocar hotspot 1 a 4 | Informação estática apresentada | | |
| T05 | Tocar Monitoramento (M) | API consultada e JSON apresentado | | |
| T06 | `mosquitto_pub -t industria/CNC-01/temperatura -m 55.5` | API recebe/atualiza o dado | | |
| T07 | Tocar "Consultar novamente" | Novo valor aparece na RA | | |
| T08 | `docker compose stop api` | Mensagem de indisponibilidade | | |
| T09 | `docker compose start api` | Consulta volta a funcionar | | |

Obs.: para T06 ficar visível, pare o simulador antes (`docker compose stop simulator`), senão ele sobrescreve o valor em 3 s.
