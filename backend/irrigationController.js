
const express = require("express");
const router = express.Router();

const state = {
  averageHumidity: null,
  mode: "AUTO",
  pump: "OFF",
  lastUpdated: null
};

const DRY_THRESHOLD = 40;
const WET_THRESHOLD = 50;

// Called whenever new live device readings arrive
function updateHumidity(readings) {
  if (!Array.isArray(readings)) return;

  const values = readings
    .map(device => Number(device.humidity))
    .filter(value => Number.isFinite(value) && value >= 0 && value <= 100);

  if (values.length === 0) return;

  state.averageHumidity =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  state.lastUpdated = new Date().toISOString();
  controlIrrigation();
}

function controlIrrigation() {
  if (state.mode !== "AUTO" || state.averageHumidity === null) return;

  if (state.averageHumidity < DRY_THRESHOLD) {
    state.pump = "ON";
  } else if (state.averageHumidity >= WET_THRESHOLD) {
    state.pump = "OFF";
  }
}

router.get("/status", (req, res) => {
  controlIrrigation();

  res.json({
    message: "Live humidity irrigation status",
    averageHumidity: state.averageHumidity,
    mode: state.mode,
    pump: state.pump,
    lastUpdated: state.lastUpdated,
    dryThreshold: DRY_THRESHOLD,
    wetThreshold: WET_THRESHOLD
  });
});

router.post("/mode", (req, res) => {
  const mode = req.body.mode;

  if (!["AUTO", "MANUAL"].includes(mode)) {
    return res.status(400).json({
      error: "Mode must be AUTO or MANUAL"
    });
  }

  state.mode = mode;
  controlIrrigation();

  res.json({
    message: "Irrigation mode updated",
    mode: state.mode,
    pump: state.pump
  });
});

router.post("/pump", (req, res) => {
  if (state.mode !== "MANUAL") {
    return res.status(400).json({
      error: "Switch to MANUAL mode before controlling the pump"
    });
  }

  const pump = req.body.pump;

  if (!["ON", "OFF"].includes(pump)) {
    return res.status(400).json({
      error: "Pump must be ON or OFF"
    });
  }

  state.pump = pump;

  res.json({
    message: "Simulated pump updated",
    mode: state.mode,
    pump: state.pump
  });
});

module.exports = { router, updateHumidity };

