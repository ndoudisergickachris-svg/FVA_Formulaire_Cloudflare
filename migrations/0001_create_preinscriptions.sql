CREATE TABLE IF NOT EXISTS preinscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_dossier TEXT NOT NULL,
  nom_complet TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT,
  formation TEXT NOT NULL,
  entreprise TEXT,
  fonction TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_preinscriptions_created_at ON preinscriptions(created_at);
