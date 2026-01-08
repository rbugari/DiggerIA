# Release Notes - DiggerAI v3.2

**Date:** January 8, 2026
**Theme:** "Hierarchical Intelligence & Impact Analysis"

## 🌟 Highlights

DiggerAI v3.2 brings a revolutionary way to visualize and analyze complex data ecosystems. This release focuses on making deep technical logic accessible to all stakeholders through hierarchical organization and automated impact tracing.

### 1. Hierarchical Visualization (Containers)
- **Structural Encapsulation**: Complex file formats like SSIS (.dtsx) are no longer rendered as a flat list of nodes. They are now encapsulated in containers that represent the package itself.
- **Deep Nesting**: The graph layout now respects parent-child relationships, grouping tasks and data flows inside their respective packages.

### 2. Visual Impact Analysis (Blast Radius)
- **Impact Mode**: A new interactive mode that allows you to click any node and instantly visualize its downstream consequences.
- **Automated Highlighting**: Affected assets and connections are highlighted and animated, while unrelated nodes are dimmed, providing clear focus on the "blast radius" of a change.

### 3. Persona-Based Perspectives
- **Architect View**: A high-level, business-oriented view that hides technical transformations and noise to show a clean map of data assets.
- **Engineer View**: A deep-dive technical view for auditing logic and debugging individual transformations.

### 4. Professional Reporting
- **PDF Export**: Generate a comprehensive, multi-page PDF report including executive summaries, component distributions, and an asset inventory with deep metadata.
- **Unicode Resilience**: The reporting engine is now robust against special characters and Spanish accents, ensuring stable exports for international projects.

## 🛠 Technical Improvements
- **Hierarchy Engine**: Updated `CatalogService` and `GraphService` to support a native `parent_asset_id` column in Supabase for true 1:N relationships.
- **Safe-String Utility**: Implemented a global utility in the report service to handle non-latin-1 characters via character replacement.
- **Refined Filter Logic**: Enhanced the perspective engine to aggressively filter process-oriented nodes in the Architect view.

## 🐛 Bug Fixes
- Fixed `NameError` in the backend base extractor that could cause transient crashes.
- Resolved an issue with duplicate `ReactFlow` blocks in the frontend that caused layout instability.
- Fixed character encoding crashes in the PDF generation service.

## 🔜 What's Next (v3.3)
- Real-time WebSocket progress bar for analysis.
- Column-level lineage tracing.
- Docker integration for easy deployment.
