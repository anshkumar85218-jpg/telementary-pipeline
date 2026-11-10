
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Kafka } = require("kafkajs");
const {
  router: irrigationController,
  updateHumidity
} = require("./irrigationController");

const app = express();
let latestTelemetry = null;
const deviceReadings = new Map();
app.use(cors());
app.use(express.json());

// Irrigation controller APIs
app.use("/api/irrigation", irrigationController);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Root health-check API
app.get("/", (req, res) => {
  res.json({
    message: "IoT Telemetry Backend is running",
    status: "online",
  });
});

// Latest telemetry API
app.get("/telemetry", (req, res) => {
  if (!latestTelemetry) {
    return res.status(404).json({
      message: "No telemetry data received yet",
    });
  }

  res.json(latestTelemetry);
});

// Telemetry data ingestion endpoint
app.post("/api/telemetry", (req, res) => {
  const { deviceId, temperature, humidity, soilMoisture } = req.body;

  if (
    !deviceId ||
    temperature === undefined ||
    humidity === undefined
  ) {
    return res.status(400).json({
      error: "Missing required fields",
    });
  }

  res.status(201).json({
    status: "success",
    message: "Telemetry data ingested successfully",
    data: { deviceId, temperature, humidity, soilMoisture },
  });
});

// Mock latest telemetry records for testing
app.get("/api/telemetry/latest", (req, res) => {
  const latestData = [
    {
      deviceId: "sensor-001",
      temperature: 28.5,
      humidity: 65.2,
      soilMoisture: 42.0,
      timestamp: new Date(),
    },
  ];

  res.status(200).json(latestData);
});

// Filter telemetry by device ID
app.get("/api/telemetry/device/:deviceId", (req, res) => {
  const { deviceId } = req.params;

  const filteredData = [
    {
      deviceId,
      temperature: 28.5,
      humidity: 65.2,
      soilMoisture: 42.0,
      timestamp: new Date(),
    },
  ];

  res.status(200).json(filteredData);
});

// Device command control endpoint
app.post("/api/devices/:deviceId/command", (req, res) => {
  const { deviceId } = req.params;
  const { action, durationSeconds } = req.body;

  if (!action) {
    return res.status(400).json({
      error: "Missing command action",
    });
  }

  res.status(202).json({
    status: "success",
    message: `Command '${action}' dispatched to device ${deviceId}`,
    commandStatus: "dispatched",
    details: { deviceId, action, durationSeconds },
  });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Website connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Website disconnected:", socket.id);
  });
});

// Kafka connection
const kafka = new Kafka({
  clientId: "iot-backend",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({
  groupId: "iot-backend-test",
});

async function startKafka() {
  await consumer.connect();

  await consumer.subscribe({
    topic: "telemetry",
    fromBeginning: false,
  });

  console.log("Connected to Kafka");
  console.log("Listening for telemetry...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const telemetry = JSON.parse(message.value.toString());

        console.log("Telemetry received:", telemetry);

        latestTelemetry = telemetry;
         if (
  telemetry.deviceId &&
  Number.isFinite(Number(telemetry.humidity)) &&
  telemetry.humidity !== null &&
  telemetry.humidity !== ""
) {
  deviceReadings.set(telemetry.deviceId, telemetry);
}

// Calculate irrigation using the latest reading from every device
updateHumidity(Array.from(deviceReadings.values()));

 
        // Send live telemetry to the React frontend
        io.emit("telemetry", telemetry);
      } catch (error) {
        console.error("Error processing telemetry:", error);
      }
    },
  });
}

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);

  startKafka().catch((error) => {
    console.error("Kafka connection error:", error);
  });
});
