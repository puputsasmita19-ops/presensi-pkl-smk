/**
 * Layanan integrasi Google Drive menggunakan Google Apps Script Web App (GAS Webhook).
 * 
 * Keunggulan metode ini dibanding OAuth Client ID:
 * 1. Tanpa konfigurasi OAuth Screen, Test Users, atau proses verifikasi Google.
 * 2. Tanpa error "Akses diblokir / unverified app".
 * 3. File otomatis tersimpan langsung di folder Google Drive akun pemilik Apps Script.
 * 4. Siap menerima foto presensi dan file cadangan JSON data PKL secara langsung.
 */

export interface WebhookUploadResult {
  status: 'success' | 'error';
  fileId?: string;
  url?: string;
  name?: string;
  message?: string;
}

const STORAGE_KEY_GAS_URL = 'pkl_gas_drive_webhook_url';
const STORAGE_KEY_GAS_FOLDER = 'pkl_gas_drive_folder_id';

export const getSavedGasWebhookUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_GAS_URL) || '';
};

export const setSavedGasWebhookUrl = (url: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_GAS_URL, url.trim());
};

export const getSavedGasFolderId = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_GAS_FOLDER) || '';
};

export const setSavedGasFolderId = (folderId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_GAS_FOLDER, folderId.trim());
};

/**
 * Kirim file (Base64 data / JSON text) ke Google Apps Script Webhook
 */
export const uploadViaGasWebhook = async (
  fileName: string,
  content: string,
  mimeType: string,
  webhookUrl?: string,
  folderId?: string
): Promise<WebhookUploadResult> => {
  const targetUrl = (webhookUrl || getSavedGasWebhookUrl()).trim();
  if (!targetUrl) {
    throw new Error('URL Web App Google Apps Script belum diisi.');
  }

  const targetFolder = (folderId || getSavedGasFolderId()).trim();

  // Payload yang dikirim ke Google Apps Script doPost(e)
  const payload = {
    action: 'upload',
    fileName: fileName,
    mimeType: mimeType,
    content: content,
    folderId: targetFolder || undefined,
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    // Google Apps Script doPost CORS paling stabil menerima text/plain yang diparse JSON
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Koneksi ke Google Apps Script gagal (${response.status}: ${response.statusText})`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Gagal mengunggah file ke Google Drive melalui Apps Script');
  }

  return result;
};

/**
 * Uji koneksi Webhook Google Apps Script
 */
export const testGasWebhookConnection = async (webhookUrl: string): Promise<boolean> => {
  try {
    const url = webhookUrl.trim();
    if (!url) return false;

    const response = await fetch(`${url}?action=ping`, {
      method: 'GET',
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return data && (data.status === 'ok' || data.status === 'success');
  } catch (err) {
    console.warn('Webhook ping error:', err);
    return false;
  }
};

/**
 * Script Google Apps Script yang bisa langsung di-copy paste oleh pengguna ke script.google.com
 */
export const GAS_DRIVE_WEBHOOK_CODE = `/**
 * ============================================================================
 * WEB APP GOOGLE APPS SCRIPT: PENYIMPANAN OTOMATIS GOOGLE DRIVE PKL
 * Deploy sebagai: Web App (Execute as: Me, Who has access: Anyone)
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", message: "Google Drive PKL Webhook Aktif!" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    var fileName = data.fileName || ("Upload_PKL_" + new Date().getTime());
    var mimeType = data.mimeType || "application/json";
    var content = data.content || "";
    var targetFolderId = data.folderId;

    var folder;
    if (targetFolderId && targetFolderId.trim() !== "") {
      folder = DriveApp.getFolderById(targetFolderId.trim());
    } else {
      // Buat atau gunakan folder default "Presensi & Jurnal PKL SMK"
      var folderName = "Presensi & Jurnal PKL SMK";
      var folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
    }

    var file;
    // Cek apakah konten berupa base64 (misalnya foto selfie)
    if (content.indexOf("data:") === 0 || mimeType.indexOf("image/") === 0) {
      var base64Data = content;
      if (content.indexOf("base64,") !== -1) {
        base64Data = content.split("base64,")[1];
      }
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      file = folder.createFile(blob);
    } else {
      // File teks atau JSON biasa
      file = folder.createFile(fileName, content, mimeType);
    }

    // Izinkan file diakses/dilihat
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        fileId: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        downloadUrl: file.getDownloadUrl(),
        message: "File berhasil disimpan di Google Drive!"
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
