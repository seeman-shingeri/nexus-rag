# NEXUS Testing & Quality Verification Guide

## 1. Testing Philosophy

In a safety intelligence system, automated verification is critical. NEXUS enforces test suites across four primary vectors:
1. **Security & RBAC Isolation**: Ensuring unauthorized users cannot mutate rules, access evidence, or delete documents.
2. **Deterministic Safety Rules**: Ensuring persistence thresholds, cooldown windows, and deduplication logic operate flawlessly.
3. **Grounded RAG & Citation Accuracy**: Ensuring answers match retrieved chunks and prompt injections are neutralized.
4. **Temporal Memory & Digital Twin**: Verifying time-window queries return bounded results and discrepancy logic fires when expected conditions are violated.

---

## 2. Running Automated Tests

### Backend Test Suite (Pytest)
```bash
cd backend
pytest -v --tb=short
```

To run specific test categories:
```bash
# Test deterministic safety engine
pytest app/tests/test_safety_engine.py -v

# Test document RAG and citation grounding
pytest app/tests/test_rag_pipeline.py -v

# Test authentication and RBAC
pytest app/tests/test_auth_rbac.py -v

# Test vision processing & synthetic streams
pytest app/tests/test_vision_service.py -v
```

### Frontend Build & Lint Checks
```bash
cd frontend
npm run build
```

---

## 3. Manual Hardware Verification Checklist

When deploying to a physical workstation with active camera sensors:
- [ ] Connect USB webcam or IP camera stream.
- [ ] Verify browser prompts for camera permission explicitly.
- [ ] Confirm FPS counter renders smoothly (15-30 FPS).
- [ ] Test bounding box alignment with physical target in camera view.
- [ ] Trigger test condition (e.g., sample liquid card or obstruction) and confirm cooldown deduplication prevents alert storm.
