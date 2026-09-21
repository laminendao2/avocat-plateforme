import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'avocat.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'avocat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    type_personne TEXT NOT NULL DEFAULT 'physique',
    nom TEXT NOT NULL,
    prenom TEXT,
    raison_sociale TEXT,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    nif TEXT,
    rccm TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dossiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    categorie TEXT NOT NULL,
    objet TEXT NOT NULL,
    description TEXT,
    statut TEXT DEFAULT 'en_cours',
    priorite TEXT DEFAULT 'normale',
    avocat_id INTEGER,
    date_ouverture DATE DEFAULT CURRENT_DATE,
    date_echeance DATE,
    date_cloture DATE,
    honoraires_convenus REAL,
    honoraires_payes REAL DEFAULT 0,
    partie_adverse TEXT,
    conseil_adverse TEXT,
    juridiction TEXT,
    numero_role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (avocat_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    type TEXT,
    chemin TEXT NOT NULL,
    taille INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dossier_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    date_action DATE NOT NULL,
    prochain_acte TEXT,
    date_prochain_acte DATE,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME,
    type TEXT DEFAULT 'rdv',
    dossier_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;
