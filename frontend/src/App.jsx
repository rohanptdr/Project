
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/health`)
      .then(() => setStatus("Backend Connected"))
      .catch(() => setStatus("Backend Offline"));
  }, []);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];

    setResult(null);
    setError("");
    setFile(null);
    setPreview("");

    if (!selected) return;

    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      setError("Please choose a JPG or PNG image.");
      event.target.value = "";
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a construction-site image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post(
        `${API}/api/safety/analyze`,
        formData
      );
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Upload failed. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">SMART CONSTRUCTION • AI PLATFORM</p>
          <h1>Construction Intelligence</h1>
          <p className="subtitle">
            Site safety, crack diagnostics and project planning in one place.
          </p>
        </div>

        <div className="connection">
          <span className={
            status === "Backend Connected" ? "dot online" : "dot"
          } />
          {status}
        </div>
      </header>

      <section className="welcome">
        <p className="eyebrow">SITE SAFETY MODULE</p>
        <h2>Build safer. Plan smarter.</h2>
        <p>
          Upload a construction-site image to begin the safety review workflow.
        </p>
      </section>

      <section className="safety-panel">
        <div>
          <p className="eyebrow">STEP 1 • IMAGE UPLOAD</p>
          <h2>Site Safety & PPE Audit</h2>
          <p className="subtitle">
            Select a JPG or PNG photo of a construction site.
          </p>
        </div>

        <form onSubmit={handleUpload} className="upload-form">
          <label htmlFor="site-image" className="upload-box">
            <span className="upload-icon">📷</span>
            <strong>Choose a construction-site image</strong>
            <span>JPG or PNG format</span>
            <input
              id="site-image"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
            />
          </label>

          {preview && (
            <div className="preview-container">
              <img
                src={preview}
                alt="Selected construction site"
                className="image-preview"
              />
              <p>{file?.name}</p>
            </div>
          )}

          <button
            className="analyze-button"
            type="submit"
            disabled={loading || !file}
          >
            {loading ? "Uploading..." : "Upload & Check"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

       
{result && (
  <div className="result-panel">
    <div className="report-header">
      <div>
        <p className="eyebrow">AI ANALYSIS REPORT</p>
        <h2>Site Safety Assessment</h2>
        <p className="subtitle">{result.filename}</p>
      </div>
      <span className="report-status">
        {result.status === "analysis_completed"
          ? "Analysis Complete"
          : "Upload Received"}
      </span>
    </div>

    {result.analysis?.safety_score != null ? (
      <div className="score-card">
        <div>
          <p className="eyebrow">SAFETY SCORE</p>
          <p className="score-description">
            AI-estimated score based on visible evidence
          </p>
        </div>
        <strong className="score-number">
          {result.analysis.safety_score}/100
        </strong>
      </div>
    ) : (
      <p>{result.message}</p>
    )}

    {result.analysis?.overall_status && (
      <p>
        <strong>Overall status: </strong>
        {result.analysis.overall_status}
      </p>
    )}

    {result.analysis?.summary && (
      <div className="report-section">
        <h3>Analysis Summary</h3>
        <p>{result.analysis.summary}</p>
      </div>
    )}

    <div className="report-section">
      <h3>PPE Checklist</h3>

      {result.analysis?.ppe_checklist?.length ? (
        result.analysis.ppe_checklist.map((item, index) => (
          <div className="finding-row" key={`${item.item}-${index}`}>
            <div>
              <strong>{item.item}</strong>
              <p>{item.evidence}</p>
            </div>
            <span className="finding-status">
              {item.status}
            </span>
          </div>
        ))
      ) : (
        <p>No PPE checklist data was returned.</p>
      )}
    </div>

    <div className="report-section">
      <h3>Visible Hazards & Recommendations</h3>

      {result.analysis?.hazards?.length ? (
        result.analysis.hazards.map((hazard, index) => (
          <div className="hazard-card" key={`hazard-${index}`}>
            <div className="hazard-heading">
              <strong>{hazard.hazard}</strong>
              <span className="finding-status">
                {hazard.severity}
              </span>
            </div>
            <p>{hazard.recommendation}</p>
          </div>
        ))
      ) : (
        <p>
          No hazards were reported by the AI. This does not guarantee
          that the site is safe.
        </p>
      )}
    </div>

    {result.analysis?.limitations && (
      <div className="report-section">
        <h3>Limitations</h3>
        <p>{result.analysis.limitations}</p>
      </div>
    )}

    <p className="disclaimer">
      AI-generated findings may be incorrect or incomplete. Have a
      qualified safety professional verify them before taking action.
    </p>

    <button
      type="button"
      className="download-button"
      onClick={() => {
        const blob = new Blob(
          [JSON.stringify(result, null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "construction-safety-report.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      Download Safety Report (JSON)
    </button>
  </div>
)}

      </section>

      <section className="modules">
        <article className="module-card">
          <span className="module-icon">🦺</span>
          <h3>Site Safety & PPE Audit</h3>
          <p>Upload site images and prepare safety checks.</p>
        </article>
        <article className="module-card">
          <span className="module-icon">🏗️</span>
          <h3>Crack Diagnostics</h3>
          <p>Concrete crack analysis will be added next.</p>
        </article>
        <article className="module-card">
          <span className="module-icon">📊</span>
          <h3>Planning & Valuation</h3>
          <p>Construction budgets and property estimates in INR.</p>
        </article>
        <article className="module-card">
          <span className="module-icon">🌦️</span>
          <h3>Site Assistant & Weather</h3>
          <p>Weather-aware recommendations will be added next.</p>
        </article>
      </section>

      <footer>
        <span>Construction Intelligence Platform</span>
        <span>Development Version 1.0</span>
      </footer>
    </main>
  );
}

export default App;
