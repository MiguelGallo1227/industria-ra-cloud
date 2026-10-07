"""Simulador de telemetria do Torno CNC (valores FICTICIOS, didaticos)."""
import os
import random
import time

import paho.mqtt.client as mqtt

HOST = os.getenv("MQTT_HOST", "localhost")
PORT = int(os.getenv("MQTT_PORT", "1883"))
EQ = os.getenv("EQUIPAMENTO_ID", "CNC-01")
INTERVALO = float(os.getenv("INTERVALO_S", "3"))

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.reconnect_delay_set(min_delay=1, max_delay=10)
client.connect_async(HOST, PORT, keepalive=30)
client.loop_start()

temperatura, vibracao = 40.0, 2.0
while True:
    temperatura = min(60.0, max(30.0, temperatura + random.uniform(-1.5, 1.5)))
    vibracao = min(4.0, max(1.0, vibracao + random.uniform(-0.3, 0.3)))
    status = random.choices(["operando", "standby", "parado"], weights=[8, 1.5, 0.5])[0]
    if client.is_connected():
        client.publish(f"industria/{EQ}/temperatura", f"{temperatura:.1f}")
        client.publish(f"industria/{EQ}/vibracao", f"{vibracao:.1f}")
        client.publish(f"industria/{EQ}/status", status)
        print(f"publicado: {temperatura:.1f} C | {vibracao:.1f} mm/s | {status}")
    else:
        print("aguardando broker MQTT...")
    time.sleep(INTERVALO)
