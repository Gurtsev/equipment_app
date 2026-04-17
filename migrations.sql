-- Run once against equipment_db
-- Migration 001: extend existing tables

ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS department VARCHAR(100);

ALTER TABLE asset_logs
    ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS project_id  INTEGER;

-- Migration 002: projects

CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'Активный',
    started_at  DATE,
    ended_at    DATE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Migration 003: project ↔ asset assignments

CREATE TABLE IF NOT EXISTS project_assets (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER   NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id    INTEGER   NOT NULL REFERENCES assets(id)   ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_pa_project ON project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_pa_asset   ON project_assets(asset_id);
