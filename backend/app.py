"""API Flask - Sistema de Apoio a Manutencao Industrial (prototipo didatico).

Todos os valores de temperatura, vibracao e status sao SIMULADOS e nao
representam limites reais de seguranca ou parametros oficiais de maquinas.
"""
import os
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime

import paho.mqtt.client as mqtt
from flask import Flask, jsonify
from flask_cors import CORS

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_BASE = "industria"
# Opcional: envia copia da telemetria ao ThingSpeak (vazio = desativado)
THINGSPEAK_KEY = os.getenv("THINGSPEAK_API_KEY", "")

app = Flask(__name__)
CORS(app)  # frontend e servido em outra origem/porta

EQUIPAMENTOS = {
    "CNC-01": {"id": "CNC-01", "tipo": "Torno CNC", "setor": "Usinagem", "status": "operacional"},
}

# Ultimo dado recebido por equipamento (memoria do processo)
telemetria = {
    eq: {"temperatura": None, "vibracao": None, "status": None, "atualizacao": None}
    for eq in EQUIPAMENTOS
}
lock = threading.Lock()
mqtt_conectado = False
_ultimo_thingspeak = 0.0


def enviar_thingspeak(dados):
    """Envia ao ThingSpeak no maximo 1x a cada 16 s (limite do plano gratuito)."""
    global _ultimo_thingspeak
    if not THINGSPEAK_KEY or time.time() - _ultimo_thingspeak < 16:
        return
    if dados["temperatura"] is None or dados["vibracao"] is None:
        return
    _ultimo_thingspeak = time.time()
    qs = urllib.parse.urlencode({
        "api_key": THINGSPEAK_KEY,
        "field1": dados["temperatura"],
        "field2": dados["vibracao"],
        "field3": dados["status"] or "",
    })
    def _post():
        try:
            urllib.request.urlopen("https://api.thingspeak.com/update?" + qs, timeout=5)
        except Exception as e:
            print("ThingSpeak indisponivel:", e)
    threading.Thread(target=_post, daemon=True).start()


def on_connect(client, userdata, flags, reason_code, properties=None):
    global mqtt_conectado
    mqtt_conectado = not reason_code.is_failure
    print("MQTT conectado:", reason_code)
    client.subscribe(f"{TOPIC_BASE}/+/+")  # industria/<id>/<grandeza>


def on_disconnect(client, userdata, flags, reason_code, properties=None):
    global mqtt_conectado
    mqtt_conectado = False
    print("MQTT desconectado:", reason_code)


def on_message(client, userdata, msg):
    partes = msg.topic.split("/")
    if len(partes) != 3:
        return
    _, eq, campo = partes
    if eq not in telemetria or campo not in ("temperatura", "vibracao", "status"):
        return
    valor = msg.payload.decode(errors="ignore").strip()
    try:
        if campo in ("temperatura", "vibracao"):
            valor = float(valor)
    except ValueError:
        print("Payload invalido em", msg.topic, valor)
        return
    with lock:
        telemetria[eq][campo] = valor
        telemetria[eq]["atualizacao"] = datetime.now().strftime("%H:%M:%S")
        copia = dict(telemetria[eq])
    enviar_thingspeak(copia)


def iniciar_mqtt():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=10)
    # connect_async + loop_start: a API sobe mesmo com o broker fora do ar
    client.connect_async(MQTT_HOST, MQTT_PORT, keepalive=30)
    client.loop_start()


iniciar_mqtt()


@app.get("/api/health")
def health():
    return jsonify({"api": "ok", "mqtt_conectado": mqtt_conectado})


@app.get("/api/equipamentos")
def listar():
    return jsonify(list(EQUIPAMENTOS.values()))


@app.get("/api/equipamentos/<eq_id>")
def identificacao(eq_id):
    eq = EQUIPAMENTOS.get(eq_id)
    if not eq:
        return jsonify({"erro": "equipamento nao encontrado"}), 404
    return jsonify(eq)


@app.get("/api/equipamentos/<eq_id>/telemetria")
def obter_telemetria(eq_id):
    if eq_id not in telemetria:
        return jsonify({"erro": "equipamento nao encontrado"}), 404
    with lock:
        return jsonify(telemetria[eq_id])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
