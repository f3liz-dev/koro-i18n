# i18n Platform Specification Summary using koro-i18n

## 1. Core Vision
A lightweight, zero-maintenance, edge-first localization platform designed to be **fast**, **reliable**, and **free to operate**. It serves as a modern alternative to SaaS solutions (like Crowdin) for open-source projects.

## 2. Architecture & Technology Stack

### Backend: "Edge-First & Serverless"
*   **Infrastructure**: **Cloudflare Workers** (Global low-latency, 0ms cold start).
*   **Framework**: **Hono** (Ultra-lightweight web framework).
*   **Database**: **Cloudflare D1** (SQLite at the edge).
    *   *Why*: Zero maintenance, automatic backups, free tier includes millions of reads/month.
*   **Authorization**: **GitHub OAuth** & **OIDC**.
    *   *Why*: No internal user management to maintain. Relies on GitHub organizations/permissions.

### Frontend: "Rock-Solid & Fast"
*   **Library**: **Preact** (Fast, 3kB React alternative).
    *   *Why*: Extremely lightweight for fast loads, efficient DOM updates, and access to the vast React ecosystem.
*   **Styling**: **Vanilla CSS**.
    *   *Why*: No build-step complexity (Tailwind/Sass), max performance, future-proof.
*   **Delivery**: Hosted on **Cloudflare Pages**.

## 3. Workflow (Standard Push/Pull Model)

To reduce complexity and latency, the platform acts as the **Source of Record for Translations**, while the Codebase remains the **Source of Record for Keys**.

1.  **Push (Sync Keys)**:
    *   **Action**: `koro push` (CLI).
    *   **Mechanism**: **Smart Differential Sync**.
        *   **Local Diffing**: CLI compares local files against server state (via content hashes) to identify *only* changed keys.
        *   **Delta Upload**: Sends minimal JSON patches (add/remove/modify) instead of full files.
        *   **Limit Safe**: Splits large changes into parallel batches (e.g., 200 keys/req) to respect Worker CPU limits (10-50ms) and avoid timeouts.
    *   **Benefit**: "Zero-change" pushes are instant. Massive initial imports are broken down automatically.

2.  **Translate (The Platform)**:
    *   **Storage**: All translation data lives in **D1** (Edge SQL).
    *   **UI**: Volunteers use the interface to translate.
    *   **State**: Translations move from *Draft* -> *Approved*.

3.  **Pull (Retrieve)**:
    *   **Action**: `koro pull` (CLI) or `fetch` (Runtime).
    *   **Build-time**: Downloads approved translations as JSON files to the repo (for bundling).
    *   **Runtime (Optional)**: App can fetch latest translations directly from the Edge API for instant updates.

## 4. Key Demo Integration: f18n-central
The platform will demonstrate capability using **f18n-central** (Floorp Browser localization) as the dataset.

*   **Scale Test**: Handles thousands of keys across multiple sub-projects (`main`, `newtab`, `settings`).
*   **Real-world Structure**: Demonstrates handling of complex directory structures identified in `.koro-i18n.repo.config.toml`.
*   **Performance**: Proves fast loading/filtering of large key datasets using D1 indices.

## 5. Maintenance & Cost Strategy

| Dimension | Strategy | Result |
| :--- | :--- | :--- |
| **Maintenance** | Serverless Architecture + Preact's Simplicity | No server patching, small footprint. |
| **Speed** | Edge Computing (Code runs near user) | Global low latency (<50ms API response). |
| **Cost** | Cloudflare Free Tier (Workers/D1/Pages) | **$0.00/month** for substantial scale. |
