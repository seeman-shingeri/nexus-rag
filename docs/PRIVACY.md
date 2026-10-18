# NEXUS Privacy & Data Protection Specification

## 1. Core Privacy Commitments

1. **No Facial Recognition**: NEXUS strictly rejects biometric facial recognition, facial landmarking, and identity extraction. Detection models classify generic semantic objects (`person`, `helmet`, `vest`, `machinery`), never individuals.
2. **Zero Continuous Video Recording**: Raw video frames are processed in-memory and immediately discarded. NEXUS does not act as a surveillance recorder.
3. **Evidence Minimization**: Only when a verified safety incident occurs is a single downscaled snapshot stored as supporting evidence.
4. **Configurable Region Masking**: Operators can configure exclusion or blur masks over private zones (such as breakrooms, locker rooms, or external windows).

---

## 2. Data Retention & Automatic Purging

| Data Type | Storage Location | Default Retention | Automated Purge |
|---|---|---|---|
| Ingested Raw Frames | In-memory RAM | 0 seconds (transient) | Instant drop |
| Verified Incident Evidence | `backend/storage/evidence/` | 30 days | Nightly cron worker |
| Audit Trail Records | Relational Database | 90 days | Soft/Hard archive |
| Compliance Documents | `backend/storage/documents/` | Until user deletion | Cascade index removal |

---

## 3. Right to Erasure (Document & Evidence Deletion)

When an authorized administrator deletes a compliance document:
1. The physical file is removed from disk.
2. All corresponding document chunks are deleted from the relational database.
3. Vector embeddings associated with those chunks are removed from the vector index.
4. An immutable audit log entry is recorded noting who initiated the deletion.
