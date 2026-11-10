const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "iot-simulator",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

const devices = 10;

async function startSimulator() {
  await producer.connect();

  console.log("IoT Simulator connected to Kafka");

  setInterval(async () => {
    for (let i = 1; i <= devices; i++) {
      const telemetry = {
        deviceId: `Device-${String(i).padStart(2, "0")}`,
        temperature: Number((25 + Math.random() * 8).toFixed(1)),
        humidity: Math.floor(20 + Math.random() * 55),
        pressure: Math.floor(1008 + Math.random() * 10),
        battery: Math.floor(60 + Math.random() * 40),
        timestamp: new Date().toISOString(),
      };

      await producer.send({
        topic: "telemetry",
        messages: [
          {
            value: JSON.stringify(telemetry),
          },
        ],
      });

      console.log("Sent:", telemetry);
    }
  }, 1000);
}

startSimulator().catch(console.error);
