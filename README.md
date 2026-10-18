# NEXUS — See. Remember. Protect.

[![CI Pipeline](https://github.com/seeman-shingeri/nexus-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/seeman-shingeri/nexus-rag/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React: 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript: 5](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS: 3](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

> **Privacy-first multimodal RAG safety intelligence platform combining real-time computer vision, temporal event memory, explainable safety alerts, and evidence-grounded AI.**

---

## 1. Executive Overview

**NEXUS** bridges the gap between what artificial intelligence observes in the physical world and what it understands from structured compliance documentation, standard operating procedures (SOPs), and historical facility memory.

Rather than relying on ungrounded generative models or opaque black-box alerts, NEXUS couples **real-time visual perception** with a **deterministic safety engine** and a **vector-grounded document retrieval pipeline (RAG)**. Every hazard alert, discrepancy report, and procedural recommendation is accompanied by an audit trail containing:
1. Exact visual observation timestamp and camera identifier.
2. Verified confidence score and bounding-box coordinates.
3. Rule-matching logic with persistence and hysteresis cooldown.
4. Verifiable citations to ingested safety manuals and regulatory standards.
5. Mandatory human verification protocols before any high-impact escalation.

```mermaid
flowchart TD
    subgraph World["Physical Environment & Sensors"]
        CAM["Webcam / RTSP Stream"] --> CAPTURE["Frame Ingestion & Sampling"]
        DEMO["Synthetic Video Engine (Demo)"] -.-> CAPTURE
    end

    subgraph Perception["Vision Intelligence & Edge Engine"]
        CAPTURE --> DETECT["Object Detection & Anomaly Spotting"]
        DETECT --> COORD["Zone Coordinate Mapping"]
        COORD --> SNAP["Evidence Frame Compression & Storage"]
    end

    subgraph Knowledge["Document RAG Pipeline"]
        DOCS["Safety Manuals (PDF/TXT/MD)"] --> INGEST["Parser & Semantic Chunker"]
        INGEST --> EMBED["Vector Embedder"]
        EMBED --> VEC_DB[("Vector & Keyword Index")]
    end

    subgraph Safety["Deterministic Safety & Temporal Engine"]
        DETECT --> RULES{"Rule Engine & Persistence Filter"}
        RULES --"Match Verified"--> INCIDENT["Incident Generator"]
        VEC_DB --"SOP Citation"--> INCIDENT
        SNAP --"Evidence Thumbnail"--> INCIDENT
        INCIDENT --> MEMORY[("Temporal Event DB")]
    end

    subgraph DigitalTwin["Digital Twin & Monitoring"]
        MEMORY --> TWIN["Facility Zone Map & Discrepancies"]
        TWIN --> WS["WebSocket Live Telemetry"]
    end

    subgraph Interface["Futuristic Ops Center (React + TypeScript)"]
        WS --> UI_OVERVIEW["Overview Dashboard"]
        WS --> UI_VISION["Live Vision Stream"]
        INCIDENT --> UI_INCIDENTS["Incident Center"]
        VEC_DB --> UI_KB["Knowledge Base"]
        VEC_DB --> UI_ASK["Ask NEXUS Conversational RAG"]
        TWIN --> UI_TWIN["Digital Twin Facility Map"]
        RULES --> UI_RULES["Safety Rules Config"]
    end
```

---

## 2. Core Capabilities

- **Live Vision Intelligence**: Real-time browser webcam streaming and video stream analysis detecting individuals, machinery, liquid spills/hazards, obstructions, and missing PPE proxies with clear visual demarcation.
- **Explainable Safety Alerts**: Strict deterministic logic calculates observation persistence and cooldown deduplication before firing an incident. Never invents detections.
- **Evidence-Grounded Document RAG**: Parses PDFs, Markdown, and text compliance documents, performs hybrid vector + BM25 keyword search, and generates answers citing exact paragraphs. Explicitly refuses when evidence is insufficient.
- **Temporal Facility Memory**: Searchable event history enabling time-bounded queries (e.g. *"What changes occurred in Zone 2 between 14:00 and 16:00?"*).
- **Interactive Digital Twin**: Visualizes spatial zones, monitored equipment, expected facility conditions, and real-time discrepancy alerts.
- **Privacy by Design & RBAC**: Role-Based Access Control (`ADMIN`, `SAFETY_OFFICER`, `OPERATOR`, `VIEWER`), automated evidence retention policies, zero biometric identification, and audit logging.
- **Zero-Dependency Standalone Mode**: Runs out of the box with SQLite and local embedding/deterministic response generation, with instant toggle to PostgreSQL + pgvector and Google Gemini LLM API.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons | High-performance, dark navy futuristic AI operations dashboard |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Uvicorn | Asynchronous REST API, WebSocket pub/sub, validation |
| **Database** | SQLAlchemy 2.0, SQLite (local) / PostgreSQL with pgvector (prod) | Relational event store, vector embeddings, audit trail |
| **Vision** | OpenCV, NumPy, Haar/DNN detection proxies, synthetic demo engine | Edge frame processing, bounding boxes, snapshot extraction |
| **RAG & Search** | NumPy vector cosine similarity, BM25 ranker, chunking engine | Hybrid semantic + keyword retrieval with document citations |
| **AI Providers** | Google Gemini (`google-genai`) & Local Deterministic Engine | Multi-model strategy supporting air-gapped and cloud setups |
| **Security** | Python-jose (JWT), Passlib / Cryptography, RBAC middleware | Authentication, role authorization, rate limiting, sanitization |

---

## 4. Quick Start Guide

### Prerequisites
- **Node.js** v18+ (tested with v26)
- **Python** 3.10+ (managed via `uv` or system Python)

### Step 1: Clone & Configure
```bash
git clone https://github.com/seeman-shingeri/nexus-rag.git
cd nexus-rag
cp .env.example .env
```

### Step 2: Backend Setup
```bash
cd backend
# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Seed initial database with sample safety SOPs and zones
python seed_db.py

# Launch FastAPI backend
uvicorn main:app --reload --port 8000
```
Backend API interactive documentation will be available at: `http://localhost:8000/docs`

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Open your browser to: `http://localhost:5173`

Default credentials for testing:
- **Admin**: `admin@nexus.ai` / `NexusAdmin@2026`
- **Safety Officer**: `officer@nexus.ai` / `OfficerSafety@2026`
- **Operator**: `operator@nexus.ai` / `OperatorDuty@2026`

---

## 5. Project Structure

```text
nexus-rag/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated linting, test suite, and build checks
├── backend/
│   ├── app/
│   │   ├── api/                 # REST & WebSocket endpoints
│   │   ├── core/                # Config, security, JWT, database session
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── rag_service.py   # Ingestion, chunking, embeddings, hybrid retrieval
│   │   │   ├── vision_service.py# Frame processing, object detection, demo stream
│   │   │   ├── safety_engine.py # Deterministic rules, cooldown, persistence
│   │   │   └── twin_service.py  # Facility digital twin & anomaly detector
│   │   └── tests/               # Backend pytest test suite
│   ├── storage/                 # Document uploads & evidence snapshots
│   ├── main.py                  # FastAPI application entrypoint
│   ├── requirements.txt         # Pinned backend dependencies
│   └── seed_db.py               # Seed synthetic initial data & rules
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI cards, modal, badges, navigation
│   │   ├── pages/               # 8 Core Operational Views
│   │   │   ├── Dashboard.tsx    # System overview & live telemetry
│   │   │   ├── LiveVision.tsx   # Camera feed & bounding overlays
│   │   │   ├── KnowledgeBase.tsx# Document upload, indexing & citation preview
│   │   │   ├── IncidentCenter.tsx# Incident triaging & review workflows
│   │   │   ├── AskNexus.tsx     # Conversational grounded RAG
│   │   │   ├── DigitalTwin.tsx  # Interactive zone map & discrepancies
│   │   │   ├── SafetyRules.tsx  # Deterministic rule configuration
│   │   │   └── Settings.tsx     # RBAC, audit logs, privacy controls
│   │   ├── services/            # Axios API client & WebSocket listener
│   │   ├── types/               # TypeScript data definitions
│   │   └── App.tsx              # Router & layout container
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md          # In-depth architectural specifications
│   ├── PRIVACY.md               # Data minimization, retention & audit rules
│   ├── TESTING.md               # Verification procedures & automated suites
│   └── DEPLOYMENT.md            # Production deployment guidelines
├── .env.example
├── .gitignore
├── DEVELOPMENT_LOG.md           # Continuous audit trail of verified commits
├── LICENSE                      # MIT Open Source License
├── README.md
└── SECURITY.md                  # Responsible vulnerability reporting
```

---

## 6. Verification & Testing

Run all unit, integration, and security tests:

```bash
# Backend test suite
cd backend
pytest -v

# Frontend build check
cd ../frontend
npm run build
```

---

## 7. License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
