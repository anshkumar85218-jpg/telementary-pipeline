
const express = require("express");

const router = express.Router();

// Simulated soil moisture sensor reading (percentage)
const state = {
  soilMoisture: 25,
  mode: "AUTO",
  pump: "OFF",
  lastUpdated: Date.now()
};

// Settings for automatic irrigation
const DRY_THRESHOLD = 30;
const WET_THRESHOLD = 45;

// Check soil moisture and control the simulated pump
function controlIrrigation() {
  if (state.mode !== "AUTO") {
    return;
  }

  if (state.soilMoisture < DRY_THRESHOLD) {
    state.pump = "ON";
  } else if (state.soilMoisture >= WET_THRESHOLD) {
    state.pump = "OFF";
  }
}

// View current irrigation status
router.get("/status", (req, res) => {
  controlIrrigation();

  res.json({
    message: "Irrigation system status",
    soilMoisture: state.soilMoisture,
    mode: state.mode,
    pump: state.pump
  });
});

// Change the simulated soil moisture
router.post("/soil", (req, res) => {
  const moisture = Number(req.body.soilMoisture);

  if (
    req.body.soilMoisture === undefined ||
    !Number.isFinite(moisture) ||
    moisture < 0 ||
    moisture > 100
  ) {
    return res.status(400).json({
      error: "Soil moisture must be a number from 0 to 100"
    });
  }

  state.soilMoisture = moisture;
  state.lastUpdated = Date.now();

  controlIrrigation();

  res.json({
    message: "Soil moisture updated",
    soilMoisture: state.soilMoisture,
    pump: state.pump
  });
});

// Change AUTO or MANUAL mode
router.post("/mode", (req, res) => {
  const mode = req.body.mode;

  if (!["AUTO", "MANUAL"].includes(mode)) {
    return res.status(400).json({
      error: "Mode must be AUTO or MANUAL"
    });
  }

  state.mode = mode;

  if (mode === "AUTO") {
    controlIrrigation();
  }

  res.json({
    message: "Irrigation mode updated",
    mode: state.mode,
    pump: state.pump
  });
});

// Manually switch the simulated pump ON or OFF
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

module.exports = router;
