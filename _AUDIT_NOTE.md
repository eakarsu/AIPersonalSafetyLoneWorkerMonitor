# Audit Apply Note — AIPersonalSafetyLoneWorkerMonitor

Source: `_AUDIT/reports/batch_06.md` section 17.

## Original Recommendations
### Missing AI counterparts
- `/equipment-failure-predict`
- `/audit-readiness-score`
- `/burnout-predict`

### Missing non-AI
- Wearable device integration; emergency-services 911 dispatch; biometric monitoring; multi-language support

### Custom suggestions
- Agentic safety orchestration; CV incident detection; behavioral risk profiling; environmental hazard sensing (IoT); peer safety networks

## Implemented
Added three endpoints in `backend/src/routes/ai.js`:
- `POST /api/ai/equipment-failure-predict`
- `POST /api/ai/audit-readiness-score`
- `POST /api/ai/burnout-predict`

Reused `queryAI`, `parseAIJson`, `saveAiResult`, `authMiddleware`, `aiRateLimiter`, ESM style.

## Backlog
| Item | Tag |
|---|---|
| Wearable / smartwatch integration | NEEDS-CREDS |
| 911 / emergency dispatch integration | NEEDS-CREDS |
| Biometric (HR, SpO2) monitoring | NEEDS-CREDS |
| Multi-language support | NEEDS-PRODUCT-DECISION |
| CV incident detection (body cam stream) | NEEDS-PRODUCT-DECISION |
| IoT environmental sensor ingestion | NEEDS-CREDS |

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- Dedicated pages cover nearly every backend AI endpoint: `AIRiskAssessmentPage`, `AIIncidentAnalysisPage`, `AIAnomalyDetectionPage`, `AIEmergencyResponsePage`, `AIRouteSafetyPage`, `AICompliancePredictorPage`, `AIShiftOptimizerPage`, `AIHazardPredictionPage`, `AITrainingRecommenderPage`, `AISafetyReportPage`, `RiskAssessToolPage`, `SafetyBriefingPage`, plus `AIPredictivePage` covering the apply-pass-2 additions (equipment-failure-predict, audit-readiness-score, burnout-predict).
- Routes registered in `App.jsx`; nav entries present in `components/Sidebar.jsx`.
- API client adds Bearer token from `localStorage`.
- No files modified this pass.

## Apply pass 4 (mechanical backlog)

- **Action:** LEFT-AS-IS — pass 2 already added all 3 MECHANICAL items (equipment-failure-predict, audit-readiness-score, burnout-predict) and pass 3 confirmed the FE was already wired through `AIPredictivePage`. No remaining MECHANICAL items in the backlog.
- All deferred items remain credentials- or product-decision-blocked: wearable / smartwatch ingestion, 911 dispatch, biometric monitoring, multi-language, CV body-cam, IoT environmental sensors.
- No files modified this pass.
