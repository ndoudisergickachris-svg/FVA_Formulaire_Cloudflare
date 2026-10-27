
CREATE TABLE IF NOT EXISTS company_preinscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  selected_modules TEXT NOT NULL,
  business_services TEXT,
  custom_need TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_company_preinscriptions_created_at
ON company_preinscriptions(created_at);
