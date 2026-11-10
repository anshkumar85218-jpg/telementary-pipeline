import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import {
  LayoutDashboard,
  Cpu,
  Activity,
  BarChart3,
  Bell,
  Wifi,
  Thermometer,
  Droplets,
  Sprout,
  Power,
  RefreshCw,
} from "lucide-react";

const API = "http://localhost:5000";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [telemetry, setTelemetry] = useState([]);

  const [irrigation, setIrrigation] = useState({
    averageHumidity: null,
    mode: "AUTO",
    pump: "OFF",
    lastUpdated: null,
    dryThreshold: 40,
    wetThreshold: 50,
  });

  const [irrigationError, setIrrigationError] = useState("");
  const [irrigationLoading, setIrrigationLoading] = useState(false);

  // Load the latest irrigation status from the backend
  const loadIrrigationStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/irrigation/status`);

      if (!response.ok) {
        throw new Error(`Irrigation status request failed (${response.status})`);
      }

      const data = await response.json();
      setIrrigation(data);
      setIrrigationError("");
    } catch (error) {
      setIrrigationError(
        error.message || "Could not connect to the irrigation API."
      );
    }
  }, []);

  useEffect(() => {
    loadIrrigationStatus();
  }, [loadIrrigationStatus]);

  // Connect to live Kafka telemetry through Socket.IO
  useEffect(() => {
    const socket = io(API);

    socket.on("connect", () => {
      console.log("Connected to telemetry backend");
    });

    socket.on("telemetry", (data) => {
      console.log("Live telemetry received:", data);

      setTelemetry((previous) => {
        const updated = [
          data,
          ...previous.filter((item) => item.deviceId !== data.deviceId),
        ];

        return updated.slice(0, 10);
      });
    });

    socket.on("connect_error", (error) => {
      console.error("Telemetry connection error:", error.message);
    });

    return () => socket.disconnect();
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API}/`);

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const data = await response.json();
        setBackendStatus(data.status || "Online");
      } catch {
        setBackendStatus("Offline");
      }
    };

    checkBackend();
  }, []);

  // Send a command to the irrigation backend
  const sendIrrigationCommand = async (endpoint, body) => {
    setIrrigationLoading(true);
    setIrrigationError("");

    try {
      const response = await fetch(`${API}/api/irrigation/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Read text first so an HTML 404 page doesn't cause a JSON parsing error
      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `The server returned an unexpected response (${response.status}). Check the backend route.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || `Command failed (${response.status})`);
      }

      await loadIrrigationStatus();
    } catch (error) {
      setIrrigationError(
        error.message || "Could not send the irrigation command."
      );
    } finally {
      setIrrigationLoading(false);
    }
  };

  // Calculate averages from the latest reading of each visible device
  const averageTemperature =
    telemetry.length > 0
      ? (
          telemetry.reduce(
            (sum, item) => sum + Number(item.temperature || 0),
            0
          ) / telemetry.length
        ).toFixed(1)
      : "—";

  const averageHumidity =
    telemetry.length > 0
      ? (
          telemetry.reduce(
            (sum, item) => sum + Number(item.humidity || 0),
            0
          ) / telemetry.length
        ).toFixed(1)
      : "—";

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1>IoT Pulse</h1>

        <nav>
          <button
            className={activePage === "Dashboard" ? "active" : ""}
            onClick={() => setActivePage("Dashboard")}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button
            className={activePage === "Devices" ? "active" : ""}
            onClick={() => setActivePage("Devices")}
          >
            <Cpu size={18} />
            Devices
          </button>

          <button
            className={activePage === "Live Telemetry" ? "active" : ""}
            onClick={() => setActivePage("Live Telemetry")}
          >
            <Activity size={18} />
            Live Telemetry
          </button>

          <button
            className={activePage === "Analytics" ? "active" : ""}
            onClick={() => setActivePage("Analytics")}
          >
            <BarChart3 size={18} />
            Analytics
          </button>

          <button
            className={activePage === "Alerts" ? "active" : ""}
            onClick={() => setActivePage("Alerts")}
          >
            <Bell size={18} />
            Alerts
          </button>

          <button
            className={activePage === "Irrigation" ? "active" : ""}
            onClick={() => setActivePage("Irrigation")}
          >
            <Sprout size={18} />
            Irrigation
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header className="topbar">
          <div>
            <h2>
              {activePage === "Dashboard"
                ? "Telemetry Dashboard"
                : activePage}
            </h2>
            <p>Real-time IoT monitoring system</p>
          </div>

          <div className="status">
            <Wifi size={16} />
            System {backendStatus}
          </div>
        </header>

        {/* Dashboard */}
        {activePage === "Dashboard" && (
          <section className="cards">
            <div className="card">
              <div className="card-icon">
                <Cpu />
              </div>
              <h3>{telemetry.length}</h3>
              <p>Active Devices</p>
            </div>

            <div className="card">
              <div className="card-icon">
                <Activity />
              </div>
              <h3>Live</h3>
              <p>Telemetry Stream</p>
            </div>

            <div className="card">
              <div className="card-icon">
                <Thermometer />
              </div>
              <h3>{averageTemperature}°C</h3>
              <p>Average Temperature</p>
            </div>

            <div className="card">
              <div className="card-icon">
                <Droplets />
              </div>
              <h3>{averageHumidity}{averageHumidity !== "—" ? "%" : ""}</h3>
              <p>Average Humidity</p>
            </div>
          </section>
        )}

        {/* Live Telemetry */}
        {activePage === "Live Telemetry" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Live Telemetry</h3>
                <p>Real-time data from connected devices</p>
              </div>
              <span className="live-badge">● LIVE</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Temperature</th>
                    <th>Humidity</th>
                    <th>Pressure</th>
                    <th>Battery</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {telemetry.length === 0 ? (
                    <tr>
                      <td colSpan="6">Waiting for telemetry...</td>
                    </tr>
                  ) : (
                    telemetry.map((item) => (
                      <tr key={item.deviceId}>
                        <td>{item.deviceId}</td>
                        <td>{item.temperature}°C</td>
                        <td>{item.humidity}%</td>
                        <td>{item.pressure} hPa</td>
                        <td>{item.battery}%</td>
                        <td>
                          <span className="online">Online</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Devices */}
        {activePage === "Devices" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Connected Devices</h3>
                <p>
                  {telemetry.length} devices currently sending telemetry
                </p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Temperature</th>
                    <th>Humidity</th>
                    <th>Battery</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {telemetry.length === 0 ? (
                    <tr>
                      <td colSpan="5">Waiting for devices...</td>
                    </tr>
                  ) : (
                    telemetry.map((item) => (
                      <tr key={item.deviceId}>
                        <td>{item.deviceId}</td>
                        <td>{item.temperature}°C</td>
                        <td>{item.humidity}%</td>
                        <td>{item.battery}%</td>
                        <td>
                          <span className="online">Online</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Analytics */}
        {activePage === "Analytics" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Analytics</h3>
                <p>Current telemetry averages from visible devices</p>
              </div>
            </div>

            <div className="cards">
              <div className="card">
                <h3>{averageTemperature}°C</h3>
                <p>Average Temperature</p>
              </div>

              <div className="card">
                <h3>{averageHumidity}{averageHumidity !== "—" ? "%" : ""}</h3>
                <p>Average Humidity</p>
              </div>
            </div>
          </section>
        )}

        {/* Alerts */}
        {activePage === "Alerts" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Alerts</h3>
                <p>No alert rules have been configured on this page yet.</p>
              </div>
            </div>
          </section>
        )}

        {/* Smart Irrigation */}
        {activePage === "Irrigation" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Smart Irrigation Control</h3>
                <p>
                  Monitor live average humidity and manage the simulated pump.
                </p>
              </div>

              <button
                onClick={loadIrrigationStatus}
                disabled={irrigationLoading}
                title="Refresh irrigation status"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {irrigationError && (
              <p role="alert" style={{ color: "crimson" }}>
                {irrigationError}
              </p>
            )}

            {/* Irrigation Status Cards */}
            <section className="cards">
              <div className="card">
                <div className="card-icon">
                  <Droplets />
                </div>
                <h3>
                  {irrigation.averageHumidity == null
                    ? "—"
                    : `${Number(irrigation.averageHumidity).toFixed(1)}%`}
                </h3>
                <p>Average Humidity</p>
              </div>

              <div className="card">
                <div className="card-icon">
                  <Sprout />
                </div>
                <h3>{irrigation.mode}</h3>
                <p>Operating Mode</p>
              </div>

              <div className="card">
                <div className="card-icon">
                  <Power />
                </div>
                <h3>{irrigation.pump}</h3>
                <p>Simulated Pump</p>
              </div>
            </section>

            {/* Automatic Rules */}
            <div style={{ marginTop: "24px" }}>
              <h3>Automatic Irrigation Rules</h3>

              <p>
                Below {irrigation.dryThreshold ?? 40}% average humidity:
                the pump turns ON automatically.
              </p>

              <p>
                At or above {irrigation.wetThreshold ?? 50}% average humidity:
                the pump turns OFF automatically.
              </p>

              <p>
                Between these thresholds, the pump keeps its previous state.
              </p>

              <p>
                Last updated:{" "}
                {irrigation.lastUpdated
                  ? new Date(irrigation.lastUpdated).toLocaleString()
                  : "Waiting for telemetry"}
              </p>
            </div>

            {/* Operating Mode */}
            <div style={{ marginTop: "24px" }}>
              <h3>Operating Mode</h3>

              <p>
                Current mode: <strong>{irrigation.mode}</strong>
              </p>

              <button
                disabled={irrigationLoading || irrigation.mode === "AUTO"}
                onClick={() =>
                  sendIrrigationCommand("mode", { mode: "AUTO" })
                }
              >
                Enable AUTO
              </button>

              <button
                disabled={
                  irrigationLoading || irrigation.mode === "MANUAL"
                }
                onClick={() =>
                  sendIrrigationCommand("mode", { mode: "MANUAL" })
                }
                style={{ marginLeft: "8px" }}
              >
                Enable MANUAL
              </button>
            </div>

            {/* Manual Pump Controls */}
            <div style={{ marginTop: "24px" }}>
              <h3>Manual Pump Control</h3>

              <p>
                Switch to MANUAL mode before controlling the pump yourself.
              </p>

              <button
                disabled={
                  irrigationLoading ||
                  irrigation.mode !== "MANUAL" ||
                  irrigation.pump === "ON"
                }
                onClick={() =>
                  sendIrrigationCommand("pump", { pump: "ON" })
                }
              >
                <Power size={16} />
                Turn Pump ON
              </button>

              <button
                disabled={
                  irrigationLoading ||
                  irrigation.mode !== "MANUAL" ||
                  irrigation.pump === "OFF"
                }
                onClick={() =>
                  sendIrrigationCommand("pump", { pump: "OFF" })
                }
                style={{ marginLeft: "8px" }}
              >
                <Power size={16} />
                Turn Pump OFF
              </button>
            </div>

            {irrigationLoading && <p>Sending command...</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
