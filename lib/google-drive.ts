/**
 * lib/google-drive.ts
 * Google Drive helper — OAuth 2.0 + upload via REST API (pas de dépendance npm)
 */

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API        = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

function clientId()     { return process.env.GOOGLE_OAUTH_CLIENT_ID!; }
function clientSecret() { return process.env.GOOGLE_OAUTH_CLIENT_SECRET!; }
function redirectUri()  {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/drive/callback`;
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

/** URL de consentement Google — ouvrir dans le navigateur de l'avocat */
export function getAuthUrl(uid: string): string {
  const params = new URLSearchParams({
    client_id:     clientId(),
    redirect_uri:  redirectUri(),
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/drive.file',
    access_type:   'offline',
    prompt:        'consent',
    state:         uid,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Échange le code OAuth contre des tokens et les stocke dans Firestore */
export async function exchangeCode(code: string, uid: string): Promise<void> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId(),
      client_secret: clientSecret(),
      redirect_uri:  redirectUri(),
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échange OAuth échoué : ${err}`);
  }
  const data = await res.json();
  await adminDb.collection('userDriveTokens').doc(uid).set({
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? null,
    expiry_date:   Date.now() + (data.expires_in ?? 3600) * 1000,
    scope:         data.scope,
    connectedAt:   FieldValue.serverTimestamp(),
  });
}

/** Retourne un access_token valide, en rafraîchissant si nécessaire */
export async function getAccessToken(uid: string): Promise<string> {
  const doc = await adminDb.collection('userDriveTokens').doc(uid).get();
  if (!doc.exists) throw new Error('Drive non connecté pour cet utilisateur');

  const tokens = doc.data()!;

  // Rafraîchir si expiré dans moins de 5 minutes
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    if (!tokens.refresh_token) throw new Error('Refresh token manquant — reconnectez Drive');
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId(),
        client_secret: clientSecret(),
        refresh_token: tokens.refresh_token,
        grant_type:    'refresh_token',
      }),
    });
    if (!res.ok) throw new Error('Rafraîchissement du token échoué');
    const data = await res.json();
    const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    await adminDb.collection('userDriveTokens').doc(uid).update({
      access_token: data.access_token,
      expiry_date:  newExpiry,
    });
    return data.access_token as string;
  }

  return tokens.access_token as string;
}

/** Vérifie si Drive est connecté pour un avocat */
export async function isDriveConnected(uid: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection('userDriveTokens').doc(uid).get();
    return doc.exists && !!doc.data()?.refresh_token;
  } catch {
    return false;
  }
}

/** Déconnecte Drive (supprime les tokens) */
export async function disconnectDrive(uid: string): Promise<void> {
  await adminDb.collection('userDriveTokens').doc(uid).delete();
}

// ─── Dossiers Drive ────────────────────────────────────────────────────────────

/**
 * Trouve ou crée un dossier dans Drive.
 * parentId = null → racine de Mon Drive
 */
export async function getOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`;

  const listRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const listData = await listRes.json();

  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id as string;
  }

  // Créer le dossier
  const body: any = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];

  const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const created = await createRes.json();
  return created.id as string;
}

// ─── Upload ────────────────────────────────────────────────────────────────────

export interface DriveUploadResult {
  fileId:      string;
  webViewLink: string;
}

/**
 * Upload multipart vers Drive dans un dossier donné.
 * Retourne le fileId et le lien webView.
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<DriveUploadResult> {
  // Métadonnées
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  // Boundary multipart
  const boundary = `----DriveBoundary${Date.now()}`;
  const metaPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
  ].join('\r\n');
  const filePart = `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closing  = `\r\n--${boundary}--`;

  const metaBuffer  = Buffer.from(metaPart, 'utf-8');
  const filePartBuf = Buffer.from(filePart, 'utf-8');
  const closingBuf  = Buffer.from(closing, 'utf-8');
  const body        = Buffer.concat([metaBuffer, filePartBuf, buffer, closingBuf]);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    },
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload Drive échoué (${uploadRes.status}) : ${errText}`);
  }

  const data = await uploadRes.json();
  return {
    fileId:      data.id as string,
    webViewLink: data.webViewLink as string,
  };
}

// ─── Util ──────────────────────────────────────────────────────────────────────

/**
 * Prépare la structure de dossiers Cabinet Juridique / {dossierRef} dans Drive
 * et retourne l'ID du sous-dossier dossier.
 */
export async function getOrCreateDossierFolder(
  uid: string,
  dossierRef: string,
  dossierId: string,
): Promise<string> {
  const accessToken = await getAccessToken(uid);

  // 1. Dossier racine "Cabinet Juridique"
  const rootFolderId = await getOrCreateFolder(accessToken, 'Cabinet Juridique');

  // 2. Sous-dossier par dossier (on mémorise l'ID dans Firestore pour éviter de recréer)
  const dossierDoc = await adminDb.collection('dossiers').doc(dossierId).get();
  const cachedFolderId = dossierDoc.data()?.driveFolderId;
  if (cachedFolderId) return cachedFolderId as string;

  const safeName = `${dossierRef}`.replace(/[^\w\s\-]/g, '').trim().slice(0, 80);
  const folderId = await getOrCreateFolder(accessToken, safeName, rootFolderId);

  // Mémoriser pour la prochaine fois
  await adminDb.collection('dossiers').doc(dossierId).update({ driveFolderId: folderId });

  return folderId;
}
