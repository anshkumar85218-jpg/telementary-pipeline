from kafka import KafkaConsumer
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import json

# InfluxDB connection
INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN =  "x5tJNGhJRF6fftdZm1DsYH2fJXedOEfKkfu9W1vbfnRB_dM-cWsUax4TKP8_CVzsQbIhVRTEP-wtW4Sto2M5_Q=="
INFLUX_ORG = "iot-org"
INFLUX_BUCKET = "telemetry"

influx_client = InfluxDBClient(
    url=INFLUX_URL,
    token=INFLUX_TOKEN,
    org=INFLUX_ORG
)

write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Kafka connection
consumer = KafkaConsumer(
    "telemetry",
    bootstrap_servers="localhost:9092",
    auto_offset_reset="latest",
    enable_auto_commit=True,
    group_id="iot-processor-test",
    value_deserializer=lambda x: json.loads(x.decode("utf-8"))
)

print("Python processor connected to Kafka")
print("InfluxDB connection configured")
print("Waiting for telemetry...\n")

for message in consumer:
    telemetry = message.value

    point = (
        Point("device_telemetry")
        .tag("deviceId", telemetry["deviceId"])
        .field("temperature", float(telemetry["temperature"]))
        .field("humidity", float(telemetry["humidity"]))
        .field("pressure", float(telemetry["pressure"]))
        .field("battery", float(telemetry["battery"]))
    )

    write_api.write(
        bucket=INFLUX_BUCKET,
        org=INFLUX_ORG,
        record=point
    )

    print(
        f"Saved: {telemetry['deviceId']} | "
        f"Temp: {telemetry['temperature']}°C | "
        f"Humidity: {telemetry['humidity']}%"
    )
