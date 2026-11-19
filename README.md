# SAONA Workspace

A local web app for the SAONA team: tasks, projects, calendar, prospects, campaigns, CRM, pre-diagnostics, the knowledge base and the academy.

- **No dependencies, no server**: HTML, CSS and plain JavaScript.
- **Data stays in the browser** (`localStorage`). Nothing is sent over the network.
- **Backup format**: `{ "app": "SAONA WORKSPACE", "version": 1, "exportedAt": …, "data": { … } }`. Importing and then exporting gives back the same `data` object, including any keys the app does not recognise.

## Running it

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On first launch, go to **Data → Import a backup** and choose `SAONA_WORKSPACE_sauvegarde.json`.

## Modules

| Module | Collection(s) |
|---|---|
| Dashboard | summary view across all collections |
| Tasks, Projects, Calendar, Prospects, Campaigns | `tasks`, `projects`, `events`, `prospects`, `campaigns` |
| Knowledge base | `knowledge` |
| Academy | `lessons`, `academyProfiles` |
| Pre-diagnostics + Pilot | `preDiagnostics`, `saonaPilots` |
| CRM | `organizations`, `crmContacts`, `strategicProjects`, `crmAnalyses`, `crmProposals`, `crmEvents` (log) |

## CRM flow

1. A pre-diagnostic (enjeu, frein, public, action, données, priorité) → **Create the CRM project**.
2. **Generate a summary**: a local rules engine, **not AI**, that separates declared facts, hypotheses to check and missing information. The hypotheses follow the knowledge-base grid: Parrainage / Ambassadeur / Opération.
3. **Approve** the summary (initials + comment), which is logged.
4. **Create a proposal**: an internal draft for the diagnostic (default amount 690 € HT, editable), with a tracked status.

Every step is written to the organisation's log (`crmEvents`).

## Known limits

- The labels for the 12 pilot steps (`base`, `law`, `journey`…) are working titles inferred from the keys in the backup file. Rename them in `PILOT_STEPS` (`js/app.js`).
- The `diagnostics`, `quizResults`, `academyResults` and `crmDeliverables` collections are kept on import and export, but they do not have screens yet.
- With no server, the data lives in a single browser only. Export regularly.
