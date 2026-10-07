# Sistema de Apoio à Manutenção Industrial com RA e Nuvem: Torno CNC 01

Protótipo didático: WebAR (A-Frame + MindAR) → API Flask ← MQTT (Mosquitto) ← simulador, tudo em Docker Compose.
**Todos os valores de temperatura, vibração e status são simulados e não representam limites reais de segurança ou manutenção.**

## Estrutura
```
frontend/   WebAR (index.html), modo sem câmera (demo.html), css/, js/app.js, assets/targets/
backend/    app.py (Flask + cliente MQTT), requirements.txt, Dockerfile
mqtt/       mosquitto.conf
simulator/  simulator.py, Dockerfile
docs/       arquitetura.md, testes.md, iaas-paas-saas.md, perguntas-tecnicas.md
compose.yaml
```

## 1. Gerar o arquivo .mind (passo manual obrigatório)
1. Abra https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Envie `frontend/assets/targets/torno-cnc-01.png` (ou, melhor, uma foto da etiqueta/máquina real, com bastante detalhe) e clique em **Start**.
3. Baixe o `targets.mind` e salve em `frontend/assets/targets/targets.mind`.
4. Se usar outra imagem, imprima-a e ajuste `TARGET_ASPECT` (altura/largura) e as posições `nx, ny` em `frontend/js/app.js`.

## 2. Executar
```bash
docker compose up --build
```
| Serviço | Endereço |
|---|---|
| Frontend (WebAR) | http://localhost:8080 |
| Modo demo sem câmera | http://localhost:8080/demo.html |
| API | http://localhost:5000/api/equipamentos/CNC-01 e `/telemetria` e `/api/health` |
| Broker MQTT | localhost:1883 |

Portas necessárias: 8080, 5000, 1883. Dependências: a `api` e o `simulator` esperam o `mqtt` (`depends_on`) e reconectam sozinhos se ele demorar.

## 3. Testar no celular (câmera exige HTTPS)
Celular e PC na mesma rede, e dois túneis HTTPS (ex.: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) ou ngrok):
```bash
cloudflared tunnel --url http://localhost:8080   # -> https://AAA.trycloudflare.com  (frontend)
cloudflared tunnel --url http://localhost:5000   # -> https://BBB.trycloudflare.com  (API)
```
Abra no celular: `https://AAA.trycloudflare.com/?api=https://BBB.trycloudflare.com`

A página em HTTPS não pode chamar uma API em HTTP (bloqueio de conteúdo misto), por isso a API também precisa de HTTPS.

**Publicação:** o frontend pode ir para GitHub Pages (pasta `frontend/`) e a API para uma VM/PaaS com HTTPS; use `?api=URL` ou altere `API_BASE` em `app.js`.

## 4. Simular dados por MQTT
```bash
docker compose stop simulator
docker compose exec mqtt mosquitto_pub -t industria/CNC-01/temperatura -m 55.5
docker compose exec mqtt mosquitto_pub -t industria/CNC-01/status -m operando
curl http://localhost:5000/api/equipamentos/CNC-01/telemetria
```

## 5. Falha da API
`docker compose stop api` → tocar em Monitoramento mostra a mensagem de indisponibilidade; `docker compose start api` restaura.

## 6. ThingSpeak (opcional)
Crie um canal com 3 campos (temperatura, vibração, status), copie a *Write API Key* e descomente `THINGSPEAK_API_KEY` no `compose.yaml`. A API envia uma cópia a cada ≥16 s.

## Endpoints
- `GET /api/equipamentos/<id>` → `{id, tipo, setor, status}`
- `GET /api/equipamentos/<id>/telemetria` → `{temperatura, vibracao, status, atualizacao}`
- `GET /api/health`

## Uso de IA
Partes deste projeto foram geradas com apoio de IA. Todos os integrantes devem saber explicar cada arquivo (veja `docs/perguntas-tecnicas.md`).
