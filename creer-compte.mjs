import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'avocat.db');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new Database(DB_PATH);

// Créer la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Paramètres du compte admin
const NOM = 'Maître Lamine';
const EMAIL = 'laminendao2@gmail.com';
const MOT_DE_PASSE = 'Admin2026!';

const hash = bcrypt.hashSync(MOT_DE_PASSE, 12);

try {
  // Supprimer l'ancien compte si existant
  db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
  db.prepare('INSERT INTO users (nom, email, password, role) VALUES (?, ?, ?, ?)').run(NOM, EMAIL, hash, 'admin');
  console.log('✅ Compte créé avec succès !');
  console.log('   Email    :', EMAIL);
  console.log('   Mot de passe :', MOT_DE_PASSE);
  console.log('');
  console.log('👉 Connectez-vous sur http://localhost:3000/login');
} catch (err) {
  console.error('❌ Erreur :', err.message);
}

db.close();
