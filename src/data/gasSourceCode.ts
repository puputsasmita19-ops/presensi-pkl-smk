export interface SourceFileItem {
  filename: string;
  language: string;
  title: string;
  description: string;
  code: string;
}

export const GAS_CODE_GS = `/**
 * ============================================================================
 * SISTEM PRESENSI & JURNAL PKL SMK BERBASIS GOOGLE APPS SCRIPT & FIREBASE
 * Backend: Google Apps Script (REST API client via UrlFetchApp)
 * Database: Firebase Realtime Database (RDBMS Foreign-Key Concept)
 * Integrasi: Fonnte WhatsApp Gateway & Geolocation Radius Validator
 * ============================================================================
 */

// KONFIGURASI FIREBASE & FONNTE
var FIREBASE_CONFIG = {
  // Ganti dengan URL Realtime Database Anda (akhiri tanpa slash)
  DATABASE_URL: "https://presensi-pkl-smk-default-rtdb.asia-southeast1.firebasedatabase.app",
  // Database Secret / Auth Token dari Firebase Project Settings > Service Accounts > Database Secrets
  DATABASE_SECRET: "YOUR_FIREBASE_DATABASE_SECRET_KEY"
};

var FONNTE_CONFIG = {
  API_URL: "https://api.fonnte.com/send",
  API_TOKEN: "YOUR_FONNTE_API_TOKEN" // Dapatkan token dari fonnte.com
};

/**
 * Entry point Web App GAS (Render UI)
 * Seluruh komponen tampilan (HTML, CSS, dan JS) telah terintegrasi langsung
 * di dalam satu file Index.html sehingga siap dieksekusi tanpa file include terpisah.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Presensi PKL SMK - Sistem Absensi & Jurnal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk include file modular (opsional jika menggunakan file terpisah)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ============================================================================
 * HELPER KOMUNIKASI REST API FIREBASE MENGGUNAKAN UrlFetchApp
 * ============================================================================
 */
function firebaseFetch(path, method, payload) {
  var url = FIREBASE_CONFIG.DATABASE_URL + "/" + path + ".json?auth=" + FIREBASE_CONFIG.DATABASE_SECRET;
  
  var options = {
    method: method || 'get',
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  
  if (payload && (method === 'post' || method === 'put' || method === 'patch')) {
    options.payload = JSON.stringify(payload);
  }
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      return responseText ? JSON.parse(responseText) : {};
    } else {
      Logger.log("Firebase Error [" + responseCode + "]: " + responseText);
      throw new Error("Firebase Request Failed: " + responseText);
    }
  } catch (error) {
    Logger.log("UrlFetchApp Exception: " + error.toString());
    throw error;
  }
}

/**
 * ============================================================================
 * 1. SISTEM AUTENTIKASI MULTI-ROLE (Admin, Guru Pembimbing, Siswa)
 * ============================================================================
 */
function loginUser(username, password) {
  try {
    // Ambil daftar users dari Firebase path /Users
    var users = firebaseFetch("Users", "get");
    if (!users) {
      return { success: false, message: "Database User belum diinisialisasi" };
    }

    var authenticatedUser = null;
    for (var key in users) {
      var u = users[key];
      // Catatan: Pada produksi gunakan hashing (SHA-256 / bcrypt)
      if (u.username === username && u.password_hash === password) {
        authenticatedUser = u;
        break;
      }
    }

    if (!authenticatedUser) {
      return { success: false, message: "Username atau password salah!" };
    }

    // Generate Session Token sederhana berbasis timestamp & random hash
    var sessionToken = Utilities.base64Encode(
      authenticatedUser.id_user + ":" + new Date().getTime() + ":" + Math.random()
    );

    // Ambil data profil terkait berdasarkan role
    var profilData = null;
    if (authenticatedUser.role === 'Siswa') {
      var allSiswa = firebaseFetch("Siswa", "get") || {};
      for (var sKey in allSiswa) {
        if (allSiswa[sKey].id_user === authenticatedUser.id_user) {
          profilData = allSiswa[sKey];
          // Ambil juga info DUDI penempatan
          if (profilData.id_dudi) {
            profilData.dudi = firebaseFetch("DUDI/" + profilData.id_dudi, "get");
          }
          break;
        }
      }
    } else if (authenticatedUser.role === 'Guru Pembimbing') {
      var allGuru = firebaseFetch("GuruPembimbing", "get") || {};
      for (var gKey in allGuru) {
        if (allGuru[gKey].id_user === authenticatedUser.id_user) {
          profilData = allGuru[gKey];
          break;
        }
      }
    }

    return {
      success: true,
      token: sessionToken,
      user: {
        id_user: authenticatedUser.id_user,
        username: authenticatedUser.username,
        role: authenticatedUser.role,
        nama_lengkap: authenticatedUser.nama_lengkap,
        profil: profilData
      }
    };
  } catch (err) {
    return { success: false, message: "Error sistem: " + err.toString() };
  }
}

/**
 * ============================================================================
 * 2. HITUNG JARAK GEOLOCATION HAVERSINE (Validasi Radius Server-Side)
 * ============================================================================
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  var R = 6371e3; // Radius bumi dalam meter
  var rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad;
  var dLon = (lon2 - lon1) * rad;
  
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}

/**
 * ============================================================================
 * 3. PRESENSI CERDAS (Absen Masuk & Pulang dengan Geofencing & Selfie)
 * ============================================================================
 */
function submitPresensi(dataPresensi) {
  try {
    // Validasi data masukan
    if (!dataPresensi.id_siswa || !dataPresensi.status) {
      return { success: false, message: "Data presensi tidak lengkap." };
    }

    // Ambil data Siswa & DUDI
    var siswa = firebaseFetch("Siswa/" + dataPresensi.id_siswa, "get");
    if (!siswa) {
      return { success: false, message: "Data siswa tidak ditemukan di sistem." };
    }

    var dudi = firebaseFetch("DUDI/" + siswa.id_dudi, "get");
    if (!dudi) {
      return { success: false, message: "Data instansi DUDI siswa belum ditentukan." };
    }

    var now = new Date();
    var tanggalStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var jamStr = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");

    var jarakMeter = 0;
    var dalamRadius = true;

    // Jika Hadir, lakukan validasi radius koordinat GPS
    if (dataPresensi.status === 'Hadir') {
      if (!dataPresensi.latitude || !dataPresensi.longitude) {
        return { success: false, message: "Koordinat GPS perangkat wajib diaktifkan saat Hadir." };
      }

      jarakMeter = calculateDistanceMeters(
        parseFloat(dataPresensi.latitude),
        parseFloat(dataPresensi.longitude),
        parseFloat(dudi.koordinat_lokasi.latitude),
        parseFloat(dudi.koordinat_lokasi.longitude)
      );

      var radiusBatas = dudi.radius_meter || 100;
      dalamRadius = jarakMeter <= radiusBatas;

      if (!dalamRadius) {
        return {
          success: false,
          message: "Absensi gagal! Jarak Anda (" + jarakMeter + " m) melebihi batas toleransi kantor (" + radiusBatas + " m)."
        };
      }
    }

    // ID Presensi unik berbasis tanggal & ID Siswa
    var idPresensi = "PRS-" + tanggalStr.replace(/-/g, "") + "-" + dataPresensi.id_siswa;

    // Cek apakah sudah absen hari ini
    var existingPresensi = firebaseFetch("Presensi/" + idPresensi, "get");

    var recordPresensi;
    if (existingPresensi && existingPresensi.jam_masuk) {
      // Siswa sedang Absen Pulang
      recordPresensi = existingPresensi;
      recordPresensi.jam_pulang = jamStr;
      recordPresensi.koordinat_pulang = {
        latitude: dataPresensi.latitude || 0,
        longitude: dataPresensi.longitude || 0,
        jarak_meter: jarakMeter
      };
      firebaseFetch("Presensi/" + idPresensi, "put", recordPresensi);
    } else {
      // Siswa Absen Masuk baru
      recordPresensi = {
        id_presensi: idPresensi,
        id_siswa: dataPresensi.id_siswa,
        tanggal: tanggalStr,
        jam_masuk: dataPresensi.status === 'Hadir' ? jamStr : '-',
        jam_pulang: null,
        status: dataPresensi.status, // Hadir, Sakit, Izin, Alpa
        foto_selfie: dataPresensi.foto_selfie || "",
        koordinat_absen: {
          latitude: dataPresensi.latitude || 0,
          longitude: dataPresensi.longitude || 0,
          jarak_meter: jarakMeter,
          dalam_radius: dalamRadius
        },
        keterangan: dataPresensi.keterangan || ""
      };
      firebaseFetch("Presensi/" + idPresensi, "put", recordPresensi);
    }

    // Kirim notifikasi WhatsApp via Fonnte otomatis (terutama jika Sakit/Izin/Alpa)
    if (dataPresensi.status !== 'Hadir' && siswa.nomor_wa_ortu) {
      var pesanWA = "*NOTIFIKASI KETIDAKHADIRAN PKL SMK*\\n\\n" +
        "Yth. Wali Murid dari *\" + siswa.nama_lengkap + \"*,\\n" +
        "Siswa tercatat: *" + dataPresensi.status.toUpperCase() + "* pada " + tanggalStr + ".\\n" +
        "DUDI: " + dudi.nama_instansi + "\\n" +
        "Keterangan: " + (dataPresensi.keterangan || "-") + "\\n\\n" +
        "_Pesan otomatis dari Sistem Presensi PKL SMK_";
      kirimWhatsAppFonnte(siswa.nomor_wa_ortu, pesanWA);
    }

    return {
      success: true,
      message: existingPresensi ? "Presensi Pulang berhasil dicatat." : "Presensi Masuk berhasil dicatat.",
      data: recordPresensi
    };
  } catch (error) {
    return { success: false, message: "Gagal menyimpan presensi: " + error.toString() };
  }
}

/**
 * ============================================================================
 * 4. JURNAL KEGIATAN PKL (Siswa Create, Guru Validasi)
 * ============================================================================
 */
function simpanJurnalSiswa(dataJurnal) {
  try {
    var now = new Date();
    var tanggalStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var idJurnal = "JRN-" + tanggalStr.replace(/-/g, "") + "-" + dataJurnal.id_siswa;

    var record = {
      id_jurnal: idJurnal,
      id_siswa: dataJurnal.id_siswa,
      tanggal: dataJurnal.tanggal || tanggalStr,
      deskripsi_kegiatan: dataJurnal.deskripsi_kegiatan,
      kendala: dataJurnal.kendala || "-",
      solusi: dataJurnal.solusi || "-",
      status_validasi_guru: "Menunggu",
      catatan_guru: "",
      validated_at: null
    };

    firebaseFetch("JurnalHarian/" + idJurnal, "put", record);
    return { success: true, message: "Jurnal kegiatan harian berhasil disimpan.", data: record };
  } catch (e) {
    return { success: false, message: "Gagal simpan jurnal: " + e.toString() };
  }
}

function validasiJurnalGuru(idJurnal, statusPersetujuan, catatanGuru) {
  try {
    var jurnal = firebaseFetch("JurnalHarian/" + idJurnal, "get");
    if (!jurnal) {
      return { success: false, message: "Data jurnal tidak ditemukan." };
    }

    jurnal.status_validasi_guru = statusPersetujuan; // "Disetujui" atau "Perlu Revisi"
    jurnal.catatan_guru = catatanGuru || "";
    jurnal.validated_at = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    firebaseFetch("JurnalHarian/" + idJurnal, "put", jurnal);
    return { success: true, message: "Status jurnal berhasil diperbarui.", data: jurnal };
  } catch (e) {
    return { success: false, message: "Gagal validasi jurnal: " + e.toString() };
  }
}

/**
 * ============================================================================
 * 5. INTEGRASI FONNTE API (WhatsApp Gateway)
 * ============================================================================
 */
function kirimWhatsAppFonnte(targetPhone, message) {
  if (!FONNTE_CONFIG.API_TOKEN || FONNTE_CONFIG.API_TOKEN === "YOUR_FONNTE_API_TOKEN") {
    Logger.log("Fonnte Token belum diisi. Pesan tidak dikirim.");
    return { status: false, reason: "API Token belum diatur" };
  }

  var payload = {
    target: targetPhone,
    message: message,
    countryCode: "62"
  };

  var options = {
    method: "post",
    headers: {
      "Authorization": FONNTE_CONFIG.API_TOKEN
    },
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(FONNTE_CONFIG.API_URL, options);
    return JSON.parse(response.getContentText());
  } catch (err) {
    Logger.log("Fonnte Send Error: " + err.toString());
    return { status: false, error: err.toString() };
  }
}

/**
 * ============================================================================
 * 6. OPERASI CRUD MASTER DATA (Khusus Admin)
 * ============================================================================
 */
function getMasterData(entityName) {
  var data = firebaseFetch(entityName, "get");
  return { success: true, data: data || {} };
}

function saveMasterData(entityName, id, objectData) {
  try {
    firebaseFetch(entityName + "/" + id, "put", objectData);
    return { success: true, message: "Data " + entityName + " berhasil disimpan." };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function deleteMasterData(entityName, id) {
  try {
    firebaseFetch(entityName + "/" + id, "delete");
    return { success: true, message: "Data " + entityName + " berhasil dihapus." };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
`;

export const GAS_JS_MAIN_HTML = `<script>
/**
 * ============================================================================
 * FRONTEND JAVASCRIPT: GEOLOCATION, CAMERA WEBCAM, CRUD & PDF CONTROLLER
 * ============================================================================
 */

// State Global Frontend
var currentUser = {
  id_user: "USR-SISWA-01",
  role: "Siswa",
  nama_lengkap: "Reza Pratama Putra",
  id_siswa: "SIS-001",
  id_dudi: "DUD-002",
  dudi_name: "PT Telkom Akses Surabaya"
};

var currentCoords = { latitude: null, longitude: null };
var targetDudiLocation = { latitude: -7.2885, longitude: 112.6952, radius: 100 };
var selectedStatus = 'Hadir';
var cameraStream = null;
var capturedPhotoBase64 = null;

// Mock Data Jurnal & Master untuk interaksi lokal
var mockJournals = [
  { tanggal: "2026-09-09", deskripsi: "Instalasi dan crimping kabel UTP Cat 6 di lantai 2", kendala: "Konektor RJ45 sempat longgar", status: "Disetujui" },
  { tanggal: "2026-09-08", deskripsi: "Konfigurasi MikroTik router & manajemen bandwidth hotspot", kendala: "Tidak ada", status: "Disetujui" }
];

var mockDudiList = [
  { id: "DUD-001", nama: "PT Telkom Akses Surabaya", alamat: "Jl. Ketintang No. 156, Surabaya", radius: 100 },
  { id: "DUD-002", nama: "PT PAL Indonesia", alamat: "Ujung, Semampir, Surabaya", radius: 150 },
  { id: "DUD-003", nama: "PT Petrokimia Gresik", alamat: "Jl. Jend. A. Yani, Gresik", radius: 200 }
];

var mockSiswaList = [
  { nis: "210401", nama: "Reza Pratama Putra", kelas: "XII TKJ 1", dudi: "PT Telkom Akses" },
  { nis: "210402", nama: "Siti Nurhaliza", kelas: "XII RPL 2", dudi: "PT PAL Indonesia" },
  { nis: "210403", nama: "Budi Santoso", kelas: "XII TKJ 1", dudi: "PT Petrokimia Gresik" }
];

var mockGuruList = [
  { nip: "198002152005011003", nama: "Drs. Hendro Wibowo, M.Kom", bidang: "Teknik Jaringan" },
  { nip: "198406122008042001", nama: "Rina Astuti, S.T", bidang: "Rekayasa Perangkat Lunak" }
];

// Inisialisasi saat window load
window.addEventListener('DOMContentLoaded', function() {
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
  initUserSession();
  initClock();
  initPWA();
  refreshGPSLocation();
  renderJournalList();
  renderMasterTables();
  renderReportSummary();
});

/**
 * 1. Jam Digital Real-time
 */
function initClock() {
  function updateTime() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    var badge = document.getElementById('liveTimeBadge');
    if (badge) badge.innerText = h + ':' + m + ':' + s + ' WIB';
  }
  updateTime();
  setInterval(updateTime, 1000);
}

/**
 * 2. Inisialisasi Profil & Role Pengguna
 */
function initUserSession() {
  var nameEl = document.getElementById('userNameLabel');
  var roleEl = document.getElementById('userRoleLabel');
  var badgeEl = document.getElementById('userRoleBadge');
  var avatarEl = document.getElementById('userAvatar');
  var navMaster = document.getElementById('navMasterAdmin');

  if (nameEl) nameEl.innerText = currentUser.nama_lengkap;
  if (roleEl) roleEl.innerText = "Role: " + currentUser.role + " (" + (currentUser.role === 'Siswa' ? 'Teknik Komputer & Jaringan' : 'Staff') + ")";
  if (badgeEl) badgeEl.innerText = currentUser.role;
  if (avatarEl) avatarEl.innerText = currentUser.nama_lengkap.charAt(0);

  if (navMaster) {
    navMaster.style.display = (currentUser.role === 'Admin') ? 'flex' : 'none';
  }
}

function switchRole(newRole) {
  currentUser.role = newRole;
  if (newRole === 'Guru') {
    currentUser.nama_lengkap = "Drs. Hendro Wibowo, M.Kom";
  } else if (newRole === 'Admin') {
    currentUser.nama_lengkap = "Administrator Sekolah";
  } else {
    currentUser.nama_lengkap = "Reza Pratama Putra";
  }
  initUserSession();
}

function logout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem Presensi PKL?")) {
    alert("Sesi telah ditutup. Untuk masuk kembali silakan refresh halaman.");
  }
}

/**
 * 3. Navigasi Tab
 */
function switchTab(tabId, btnEl) {
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) {
    contents[i].classList.remove('active');
  }

  var tabs = document.querySelectorAll('.tab-item');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.remove('active');
  }

  var activeContent = document.getElementById(tabId);
  if (activeContent) activeContent.classList.add('active');

  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    var btn = document.querySelector('[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

/**
 * 4. Status Toggle (Hadir / Sakit / Izin / Alpa)
 */
function setStatusToggle(status) {
  selectedStatus = status;
  var buttons = document.querySelectorAll('.btn-toggle');
  buttons.forEach(function(btn) {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  var cameraSec = document.getElementById('cameraSection');
  var gpsSec = document.getElementById('gpsStatusCard');

  if (status === 'Hadir') {
    if (cameraSec) cameraSec.style.display = 'block';
    if (gpsSec) gpsSec.style.display = 'block';
  } else {
    if (cameraSec) cameraSec.style.display = 'none';
    if (gpsSec) gpsSec.style.display = 'none';
    stopCamera();
  }
}

/**
 * 5. Geolocation API & Jarak Haversine
 */
function refreshGPSLocation() {
  var distLabel = document.getElementById('gpsDistanceLabel');
  var indicator = document.getElementById('gpsIndicator');
  var coordLabel = document.getElementById('gpsCoordLabel');

  if (!navigator.geolocation) {
    if (distLabel) distLabel.innerText = "GPS tidak didukung oleh browser Anda";
    return;
  }

  if (distLabel) distLabel.innerText = "Mencari sinyal GPS akurat...";
  if (indicator) indicator.className = "gps-indicator loading";

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      currentCoords.latitude = pos.coords.latitude;
      currentCoords.longitude = pos.coords.longitude;

      if (coordLabel) {
        coordLabel.innerText = "Lat: " + currentCoords.latitude.toFixed(6) + " | Lon: " + currentCoords.longitude.toFixed(6);
      }

      var meters = calculateDistanceHaversine(
        currentCoords.latitude,
        currentCoords.longitude,
        targetDudiLocation.latitude,
        targetDudiLocation.longitude
      );

      var radiusLimit = targetDudiLocation.radius || 100;

      if (distLabel) {
        if (meters <= radiusLimit) {
          distLabel.innerHTML = "<span style='color:#059669;'>Jarak: " + meters + " meter (Dalam Radius Aman)</span>";
          if (indicator) indicator.className = "gps-indicator success";
        } else {
          distLabel.innerHTML = "<span style='color:#dc2626;'>Jarak: " + meters + " meter (Di Luar Radius DUDI - Maks " + radiusLimit + "m)</span>";
          if (indicator) indicator.className = "gps-indicator danger";
        }
      }
    },
    function(err) {
      if (distLabel) distLabel.innerText = "Izin lokasi tidak aktif (" + err.message + ")";
      if (indicator) indicator.className = "gps-indicator danger";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var toRad = function(x) { return x * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 6. Kamera Selfie (WebRTC & Canvas)
 */
async function startCamera() {
  var video = document.getElementById('webcamVideo');
  var placeholder = document.getElementById('cameraPlaceholder');
  var preview = document.getElementById('photoPreview');
  var btnStart = document.getElementById('btnStartCamera');
  var btnCapture = document.getElementById('btnCapturePhoto');
  var btnRetake = document.getElementById('btnRetakePhoto');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false
    });
    if (video) {
      video.srcObject = cameraStream;
      video.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (preview) preview.style.display = 'none';

    if (btnStart) btnStart.style.display = 'none';
    if (btnCapture) btnCapture.style.display = 'inline-flex';
    if (btnRetake) btnRetake.style.display = 'none';
  } catch (err) {
    alert("Kamera tidak dapat diakses: " + err.message + "\\nPastikan Anda memberikan izin akses kamera.");
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function(track) { track.stop(); });
    cameraStream = null;
  }
}

function takeSnapshot() {
  var video = document.getElementById('webcamVideo');
  var canvas = document.getElementById('photoCanvas');
  var preview = document.getElementById('photoPreview');
  var btnCapture = document.getElementById('btnCapturePhoto');
  var btnRetake = document.getElementById('btnRetakePhoto');

  if (!video || !canvas || !preview) return;

  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 480;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.82);
  preview.src = capturedPhotoBase64;
  preview.style.display = 'block';
  video.style.display = 'none';

  stopCamera();
  if (btnCapture) btnCapture.style.display = 'none';
  if (btnRetake) btnRetake.style.display = 'inline-flex';
}

function retakePhoto() {
  capturedPhotoBase64 = null;
  startCamera();
}

/**
 * 7. Submit Presensi (Apps Script Backend)
 */
function submitAttendance() {
  var keterangan = document.getElementById('inputKeterangan').value;
  var btn = document.getElementById('btnSubmitPresensi');

  if (selectedStatus === 'Hadir' && !capturedPhotoBase64) {
    alert("Harap ambil foto selfie bukti kehadiran terlebih dahulu!");
    return;
  }

  var payload = {
    id_siswa: currentUser.id_siswa,
    status: selectedStatus,
    latitude: currentCoords.latitude,
    longitude: currentCoords.longitude,
    foto_selfie: capturedPhotoBase64,
    keterangan: keterangan
  };

  btn.disabled = true;
  btn.innerText = "Mengirim Presensi ke Database...";

  if (typeof google !== 'undefined' && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(function(response) {
        btn.disabled = false;
        btn.innerText = "Kirim Presensi Sekarang";
        if (response && response.success) {
          alert("Presensi Berhasil Dicatat! (" + selectedStatus + ")");
          document.getElementById('inputKeterangan').value = "";
        } else {
          alert("Respon: " + (response ? response.message : "Berhasil disimpan"));
        }
      })
      .withFailureHandler(function(err) {
        btn.disabled = false;
        btn.innerText = "Kirim Presensi Sekarang";
        alert("Gagal terhubung ke GAS: " + err);
      })
      .submitPresensi(payload);
  } else {
    setTimeout(function() {
      btn.disabled = false;
      btn.innerText = "Kirim Presensi Sekarang";
      alert("Presensi Berhasil Dicatat! Status: " + selectedStatus + "\\nData telah disinkronkan.");
      document.getElementById('inputKeterangan').value = "";
    }, 800);
  }
}

/**
 * 8. Jurnal Harian Handler
 */
function submitDailyJournal() {
  var desc = document.getElementById('journalDescription').value;
  var issue = document.getElementById('journalIssue').value;
  var sol = document.getElementById('journalSolution').value;

  if (!desc) {
    alert("Deskripsi kegiatan wajib diisi!");
    return;
  }

  var today = new Date().toISOString().split('T')[0];
  mockJournals.unshift({
    tanggal: today,
    deskripsi: desc,
    kendala: issue || "Tidak ada",
    status: "Menunggu Validasi"
  });

  document.getElementById('formJurnal').reset();
  renderJournalList();
  alert("Jurnal kegiatan hari ini berhasil disimpan dan diteruskan ke Guru Pembimbing!");
}

function renderJournalList() {
  var container = document.getElementById('journalListContainer');
  if (!container) return;

  var html = "";
  mockJournals.forEach(function(item) {
    html += '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:10px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
        '<strong style="font-size:12px; color:#0f172a;">' + item.tanggal + '</strong>' +
        '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; background:' + (item.status === 'Disetujui' ? '#dcfce7; color:#166534' : '#fef3c7; color:#92400e') + '">' + item.status + '</span>' +
      '</div>' +
      '<p style="font-size:12px; color:#334155; margin-bottom:4px;">' + item.deskripsi + '</p>' +
      '<p style="font-size:11px; color:#64748b;"><em>Kendala: ' + item.kendala + '</em></p>' +
    '</div>';
  });
  container.innerHTML = html;
}

/**
 * 9. Master Data Admin Handler
 */
function showMasterSub(panelId, btnEl) {
  var panels = document.querySelectorAll('.subtab-panel');
  for (var i = 0; i < panels.length; i++) {
    panels[i].style.display = 'none';
  }
  var btns = document.querySelectorAll('.btn-subtab');
  for (var j = 0; j < btns.length; j++) {
    btns[j].classList.remove('active');
  }

  var activePanel = document.getElementById(panelId);
  if (activePanel) activePanel.style.display = 'block';
  if (btnEl) {
    btnEl.classList.add('active');
  } else if (typeof event !== 'undefined' && event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
}

function renderMasterTables() {
  var dudiEl = document.getElementById('dudiTableContainer');
  if (dudiEl) {
    var hDudi = '<table><thead><tr><th>Kode</th><th>Nama DUDI</th><th>Alamat</th><th>Radius</th></tr></thead><tbody>';
    mockDudiList.forEach(function(d) {
      hDudi += '<tr><td><strong>' + d.id + '</strong></td><td>' + d.nama + '</td><td>' + d.alamat + '</td><td>' + d.radius + 'm</td></tr>';
    });
    hDudi += '</tbody></table>';
    dudiEl.innerHTML = hDudi;
  }

  var siswaEl = document.getElementById('siswaTableContainer');
  if (siswaEl) {
    var hSiswa = '<table><thead><tr><th>NIS</th><th>Nama Siswa</th><th>Kelas</th><th>Penempatan DUDI</th></tr></thead><tbody>';
    mockSiswaList.forEach(function(s) {
      hSiswa += '<tr><td>' + s.nis + '</td><td><strong>' + s.nama + '</strong></td><td>' + s.kelas + '</td><td>' + s.dudi + '</td></tr>';
    });
    hSiswa += '</tbody></table>';
    siswaEl.innerHTML = hSiswa;
  }

  var guruEl = document.getElementById('guruTableContainer');
  if (guruEl) {
    var hGuru = '<table><thead><tr><th>NIP</th><th>Nama Pembimbing</th><th>Bidang Keahlian</th></tr></thead><tbody>';
    mockGuruList.forEach(function(g) {
      hGuru += '<tr><td>' + g.nip + '</td><td><strong>' + g.nama + '</strong></td><td>' + g.bidang + '</td></tr>';
    });
    hGuru += '</tbody></table>';
    guruEl.innerHTML = hGuru;
  }
}

function openModalAddDudi() {
  var nama = prompt("Masukkan Nama Perusahaan DUDI Mitra:");
  if (nama) {
    var alamat = prompt("Masukkan Alamat Kantor DUDI:");
    var radius = prompt("Batas Radius Presensi (meter):", "100");
    mockDudiList.push({
      id: "DUD-00" + (mockDudiList.length + 1),
      nama: nama,
      alamat: alamat || "Surabaya",
      radius: parseInt(radius) || 100
    });
    renderMasterTables();
    alert("Data DUDI berhasil ditambahkan!");
  }
}

function openModalAddSiswa() {
  var nama = prompt("Nama Siswa PKL:");
  if (nama) {
    var nis = prompt("Nomor Induk Siswa (NIS):", "21040" + (mockSiswaList.length + 1));
    var kelas = prompt("Kelas / Jurusan:", "XII TKJ 1");
    mockSiswaList.push({ nis: nis, nama: nama, kelas: kelas, dudi: "PT Telkom Akses" });
    renderMasterTables();
    alert("Siswa berhasil ditambahkan!");
  }
}

function openModalAddGuru() {
  var nama = prompt("Nama Guru Pembimbing:");
  if (nama) {
    var nip = prompt("NIP Guru:", "19850000201001100" + (mockGuruList.length + 1));
    var bidang = prompt("Bidang Keahlian:", "Teknik Komputer & Jaringan");
    mockGuruList.push({ nip: nip, nama: nama, bidang: bidang });
    renderMasterTables();
    alert("Guru Pembimbing berhasil ditambahkan!");
  }
}

/**
 * 10. Laporan & Export PDF (jsPDF)
 */
function renderReportSummary() {
  var sumEl = document.getElementById('reportSummaryContainer');
  if (!sumEl) return;
  sumEl.innerHTML = 
    '<div class="summary-card" style="background:#ecfdf5; border:1px solid #a7f3d0;"><div style="font-size:20px; font-weight:800; color:#065f46;">24</div><div style="font-size:11px; font-weight:700; color:#047857;">Hadir</div></div>' +
    '<div class="summary-card" style="background:#fffbeb; border:1px solid #fde68a;"><div style="font-size:20px; font-weight:800; color:#92400e;">1</div><div style="font-size:11px; font-weight:700; color:#b45309;">Sakit</div></div>' +
    '<div class="summary-card" style="background:#f0f9ff; border:1px solid #bae6fd;"><div style="font-size:20px; font-weight:800; color:#075985;">1</div><div style="font-size:11px; font-weight:700; color:#0284c7;">Izin</div></div>' +
    '<div class="summary-card" style="background:#fff1f2; border:1px solid #fecdd3;"><div style="font-size:20px; font-weight:800; color:#9f1239;">0</div><div style="font-size:11px; font-weight:700; color:#be123c;">Alpa</div></div>';

  var repTable = document.getElementById('reportTableContainer');
  if (repTable) {
    repTable.innerHTML = '<table><thead><tr><th>Tgl</th><th>Nama Siswa</th><th>Status</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Jarak</th></tr></thead><tbody>' +
      '<tr><td>09/09/2026</td><td><strong>Reza Pratama</strong></td><td><span style="color:#059669; font-weight:700;">Hadir</span></td><td>07:55:12</td><td>16:32:10</td><td>24m</td></tr>' +
      '<tr><td>08/09/2026</td><td><strong>Reza Pratama</strong></td><td><span style="color:#059669; font-weight:700;">Hadir</span></td><td>08:02:40</td><td>16:30:00</td><td>32m</td></tr>' +
      '<tr><td>07/09/2026</td><td><strong>Reza Pratama</strong></td><td><span style="color:#0284c7; font-weight:700;">Izin</span></td><td>-</td><td>-</td><td>-</td></tr>' +
      '</tbody></table>';
  }
}

function exportReportToPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Library jsPDF sedang dimuat, silakan coba 2 detik lagi.");
    return;
  }
  const { jsPDF } = window.jspdf;
  var doc = new jsPDF('p', 'mm', 'a4');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("SMK NEGERI 1 TEKNOLOGI & VOKASI", 105, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Laporan Rekapitulasi Presensi Praktik Kerja Lapangan (PKL) - September 2026", 105, 24, { align: "center" });
  doc.line(14, 28, 196, 28);

  doc.autoTable({
    startY: 34,
    head: [['No', 'Tanggal', 'Nama Siswa', 'Status', 'Masuk', 'Pulang', 'Validasi GPS']],
    body: [
      ['1', '2026-09-09', 'Reza Pratama Putra', 'Hadir', '07:55:12', '16:32:00', '24 meter (Valid)'],
      ['2', '2026-09-08', 'Reza Pratama Putra', 'Hadir', '08:02:40', '16:30:00', '32 meter (Valid)'],
      ['3', '2026-09-07', 'Reza Pratama Putra', 'Izin', '-', '-', 'Surat Dokter']
    ],
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save("Laporan_Presensi_PKL_Reza.pdf");
}

function initPWA() {
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    var btn = document.getElementById('btnPwaInstall');
    if (btn) btn.style.display = 'inline-block';
  });
}
</script>
`;

export const GAS_CSS_MAIN_HTML = `<style>
/**
 * ============================================================================
 * STYLING UTAMA TERPADU: SOFT PASTEL & DARK SLATE (#0f172a / #1e293b)
 * Mobile-First Responsive, Touch Targets Min 44px, Zero Unstyled Elements
 * ============================================================================
 */

:root {
  --slate-900: #0f172a;
  --slate-800: #1e293b;
  --slate-700: #334155;
  --slate-600: #475569;
  --slate-500: #64748b;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-200: #e2e8f0;
  --slate-100: #f1f5f9;
  --slate-50:  #f8fafc;
  
  --emerald-500: #10b981;
  --emerald-50:  #ecfdf5;
  --sky-500:     #0284c7;
  --sky-50:      #f0f9ff;
  --amber-500:   #f59e0b;
  --amber-50:    #fffbeb;
  --rose-500:    #f43f5e;
  --rose-50:     #fff1f2;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

body {
  background-color: #f8fafc;
  color: var(--slate-800);
  line-height: 1.5;
  padding-bottom: 40px;
}

/* Header */
.app-header {
  background-color: var(--slate-900);
  color: white;
  padding: 12px 18px;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid #1e293b;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.header-container {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-badge {
  background: #38bdf8;
  color: var(--slate-900);
  font-weight: 800;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 11px;
  color: #94a3b8;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-logout {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #f1f5f9;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-pwa {
  background: #38bdf8;
  color: var(--slate-900);
  font-weight: 700;
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
}

/* Container */
.main-container {
  max-width: 680px;
  margin: 16px auto;
  padding: 0 14px;
}

/* Profile Card */
.profile-card {
  background: white;
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid var(--slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 42px;
  height: 42px;
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 800;
  font-size: 17px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #bae6fd;
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--slate-900);
}

.user-desc {
  font-size: 11px;
  color: var(--slate-500);
  margin-top: 1px;
}

.role-selector select {
  background: #f8fafc;
  border: 1px solid var(--slate-300);
  color: var(--slate-800);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
}

/* Tabs */
.tab-bar {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  margin-bottom: 16px;
  gap: 4px;
  border: 1px solid var(--slate-200);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  min-height: 48px;
  border: none;
  background: transparent;
  color: var(--slate-500);
  border-radius: 10px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  gap: 4px;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: var(--slate-900);
}

.tab-item.active {
  background: white;
  color: var(--slate-900);
  font-weight: 700;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.tab-content { display: none; }
.tab-content.active { display: block; }

/* Main Card */
.card {
  background: white;
  border-radius: 18px;
  padding: 20px;
  border: 1px solid var(--slate-200);
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--slate-900);
}

.card-desc {
  font-size: 12px;
  color: var(--slate-500);
  margin-bottom: 16px;
  line-height: 1.5;
}

.badge-pulse {
  display: inline-flex;
  align-items: center;
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  padding: 3px 10px;
  border-radius: 9999px;
}

/* Status Toggle Buttons */
.status-toggles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.btn-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 8px 4px;
  border-radius: 12px;
  border: 2px solid var(--slate-200);
  background: white;
  color: var(--slate-600);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.btn-toggle:hover {
  border-color: var(--slate-300);
  background: #f8fafc;
}

.btn-toggle[data-status="Hadir"].active {
  border-color: #10b981;
  background: #ecfdf5;
  color: #065f46;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.btn-toggle[data-status="Sakit"].active {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #92400e;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.btn-toggle[data-status="Izin"].active {
  border-color: #0284c7;
  background: #f0f9ff;
  color: #075985;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15);
}

.btn-toggle[data-status="Alpa"].active {
  border-color: #f43f5e;
  background: #fff1f2;
  color: #9f1239;
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.15);
}

/* Camera Box */
.camera-box {
  background: #f8fafc;
  border: 1.5px dashed var(--slate-300);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
}

.camera-viewport {
  position: relative;
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1/1;
  margin: 0 auto 12px;
  background: #0f172a;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

#webcamVideo, #photoPreview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.camera-placeholder {
  color: #94a3b8;
  font-size: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.camera-placeholder svg, .icon-camera-lg {
  width: 44px;
  height: 44px;
  color: #64748b;
}

.camera-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

/* GPS Status Card */
.gps-status-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.gps-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.gps-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0284c7;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
}

.gps-indicator.success {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

.gps-indicator.danger {
  background: #f43f5e;
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.25);
}

.gps-indicator.loading {
  background: #f59e0b;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

#gpsDistanceLabel {
  font-size: 13px;
  font-weight: 700;
  color: #075985;
}

.text-sub {
  font-size: 11px;
  color: #0284c7;
  margin-top: 1px;
}

.coord-detail {
  font-size: 11px;
  font-family: monospace;
  color: var(--slate-500);
  background: white;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-block;
  margin-top: 4px;
  border: 1px solid #e0f2fe;
}

/* Forms */
.form-group {
  margin-bottom: 14px;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--slate-700);
  margin-bottom: 6px;
}

.form-group textarea,
.form-group input,
.form-group select {
  width: 100%;
  border: 1.5px solid var(--slate-300);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--slate-900);
  background: white;
  outline: none;
  transition: all 0.15s ease;
}

.form-group textarea:focus,
.form-group input:focus,
.form-group select:focus {
  border-color: var(--slate-900);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 6px;
}

.btn-primary { background: var(--slate-900); color: white; }
.btn-primary:hover { background: var(--slate-800); }

.btn-secondary { background: #0284c7; color: white; }
.btn-secondary:hover { background: #0369a1; }

.btn-warning { background: #d97706; color: white; }
.btn-warning:hover { background: #b45309; }

.btn-sm { min-height: 32px; padding: 6px 12px; font-size: 11px; }
.w-full { width: 100%; }

.btn-submit {
  width: 100%;
  min-height: 48px;
  background: var(--slate-900);
  color: #38bdf8;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.btn-submit:hover {
  background: var(--slate-800);
  color: #7dd3fc;
}

.btn-submit:active {
  transform: scale(0.99);
}

/* Tables */
.table-responsive {
  overflow-x: auto;
  border: 1px solid var(--slate-200);
  border-radius: 12px;
  margin-top: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

th {
  background: #f8fafc;
  color: var(--slate-600);
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 1px solid var(--slate-200);
  font-size: 11px;
  text-transform: uppercase;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: var(--slate-700);
}

tr:hover {
  background: #f8fafc;
}

/* Master Sub Tabs */
.master-sub-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--slate-200);
  padding-bottom: 8px;
}

.btn-subtab {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--slate-500);
  cursor: pointer;
}

.btn-subtab.active {
  background: var(--slate-900);
  color: white;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-header h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--slate-900);
}

/* Summary Grid */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.summary-card {
  padding: 12px 8px;
  border-radius: 12px;
  text-align: center;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.divider {
  border: none;
  border-top: 1px solid var(--slate-200);
  margin: 18px 0;
}

.sub-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--slate-900);
  margin-bottom: 10px;
}
</style>
`;

export const GAS_INDEX_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Presensi PKL SMK</title>
  
  <!-- Meta Tag PWA Lengkap -->
  <meta name="theme-color" content="#0f172a">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="PresensiPKL">
  
  <!-- Font Google Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Library jsPDF & AutoTable untuk Export Laporan PDF -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- ========================================================================= -->
  <!-- 1. STYLING (CSS) SOFT PASTEL & DARK SLATE TERPADU                         -->
  <!-- ========================================================================= -->
` + GAS_CSS_MAIN_HTML + `
</head>
<body class="bg-pastel-cream text-dark-slate">

  <!-- App Header & Navigation Bar -->
  <header class="app-header">
    <div class="header-container">
      <div class="brand">
        <div class="brand-badge">PKL</div>
        <div>
          <h1 class="brand-title">Presensi PKL SMK</h1>
          <p class="brand-subtitle" id="userRoleBadge">Memuat...</p>
        </div>
      </div>
      <div class="user-actions">
        <button id="btnPwaInstall" class="btn-pwa" style="display: none;">Pasang Aplikasi</button>
        <button id="btnLogout" class="btn-logout" onclick="logout()">Keluar</button>
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="main-container">
    
    <!-- Role Switcher & Profile Bar -->
    <div class="profile-card">
      <div class="profile-info">
        <div class="avatar" id="userAvatar">R</div>
        <div>
          <h2 class="user-name" id="userNameLabel">Reza Pratama Putra</h2>
          <p class="user-desc" id="userRoleLabel">Role: Siswa PKL (Teknik Komputer & Jaringan)</p>
        </div>
      </div>
      <div class="role-selector">
        <select id="roleSwitchSelect" onchange="switchRole(this.value)">
          <option value="Siswa">Mode: Siswa PKL</option>
          <option value="Guru">Mode: Guru Pembimbing</option>
          <option value="Admin">Mode: Administrator</option>
        </select>
      </div>
    </div>

    <!-- Navigation Tabs (Touch Friendly min 44px) -->
    <nav class="tab-bar">
      <button class="tab-item active" data-tab="tabPresensi" onclick="switchTab('tabPresensi', this)">
        <i data-lucide="map-pin"></i>
        <span>Presensi</span>
      </button>
      <button class="tab-item" data-tab="tabJurnal" onclick="switchTab('tabJurnal', this)">
        <i data-lucide="book-open"></i>
        <span>Jurnal Harian</span>
      </button>
      <button class="tab-item" id="navMasterAdmin" data-tab="tabMaster" onclick="switchTab('tabMaster', this)">
        <i data-lucide="database"></i>
        <span>Master Data</span>
      </button>
      <button class="tab-item" data-tab="tabLaporan" onclick="switchTab('tabLaporan', this)">
        <i data-lucide="file-text"></i>
        <span>Laporan PDF</span>
      </button>
    </nav>

    <!-- Tab 1: Presensi Smart GPS & Kamera Selfie -->
    <section id="tabPresensi" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Presensi Kehadiran PKL</h3>
          <span class="badge badge-pulse" id="liveTimeBadge">07:55:12 WIB</span>
        </div>
        <p class="card-desc">Validasi kehadiran dengan selfie wajah dan radius GPS lokasi kantor DUDI mitra.</p>

        <!-- Status Toggle Buttons (Hadir, Sakit, Izin, Alpa) -->
        <div class="status-toggles">
          <button class="btn-toggle active" data-status="Hadir" onclick="setStatusToggle('Hadir')">
            Hadir
          </button>
          <button class="btn-toggle" data-status="Sakit" onclick="setStatusToggle('Sakit')">
            Sakit
          </button>
          <button class="btn-toggle" data-status="Izin" onclick="setStatusToggle('Izin')">
            Izin
          </button>
          <button class="btn-toggle" data-status="Alpa" onclick="setStatusToggle('Alpa')">
            Alpa
          </button>
        </div>

        <!-- Camera Section (Hanya saat Hadir) -->
        <div id="cameraSection" class="camera-box">
          <div class="camera-viewport">
            <video id="webcamVideo" autoplay playsinline style="display:none;"></video>
            <canvas id="photoCanvas" style="display:none;"></canvas>
            <img id="photoPreview" alt="Hasil Foto Selfie" style="display:none;" />
            <div id="cameraPlaceholder" class="camera-placeholder">
              <i data-lucide="camera" class="icon-camera-lg"></i>
              <p>Tekan tombol di bawah untuk menyalakan kamera</p>
            </div>
          </div>
          <div class="camera-controls">
            <button id="btnStartCamera" class="btn btn-secondary" onclick="startCamera()">
              Buka Kamera Depan
            </button>
            <button id="btnCapturePhoto" class="btn btn-primary" style="display:none;" onclick="takeSnapshot()">
              Ambil Foto Selfie
            </button>
            <button id="btnRetakePhoto" class="btn btn-warning" style="display:none;" onclick="retakePhoto()">
              Ulangi Foto
            </button>
          </div>
        </div>

        <!-- Geolocation Validation Status -->
        <div class="gps-status-card" id="gpsStatusCard">
          <div class="gps-info">
            <div class="gps-indicator loading" id="gpsIndicator"></div>
            <div>
              <strong id="gpsDistanceLabel">Menghitung jarak ke lokasi DUDI...</strong>
              <p id="gpsDudiLabel" class="text-sub">Target: PT Telkom Akses Surabaya (Radius: 100m)</p>
            </div>
          </div>
          <p id="gpsCoordLabel" class="coord-detail">Lat: - | Lon: -</p>
        </div>

        <!-- Input Keterangan (Opsional jika Hadir, Wajib jika Izin/Sakit) -->
        <div class="form-group" id="keteranganSection">
          <label for="inputKeterangan">Keterangan Tambahan / Alasan:</label>
          <textarea id="inputKeterangan" rows="2" placeholder="Tuliskan keterangan jika izin/sakit..."></textarea>
        </div>

        <!-- Submit Button -->
        <button id="btnSubmitPresensi" class="btn btn-submit" onclick="submitAttendance()">
          Kirim Presensi Sekarang
        </button>
      </div>
    </section>

    <!-- Tab 2: Jurnal Harian PKL -->
    <section id="tabJurnal" class="tab-content">
      <div class="card">
        <h3 class="card-title">Jurnal Kegiatan Harian (Logbook)</h3>
        <p class="card-desc">Catat aktivitas harian praktik kerja untuk divalidasi oleh Guru Pembimbing.</p>
        
        <form id="formJurnal" onsubmit="event.preventDefault(); submitDailyJournal();">
          <div class="form-group">
            <label>Deskripsi Kegiatan / Pekerjaan Hari Ini:</label>
            <textarea id="journalDescription" rows="3" required placeholder="Contoh: Merakit jaringan LAN dan konfigurasi IP address..."></textarea>
          </div>
          <div class="form-group">
            <label>Kendala yang Dihadapi:</label>
            <input type="text" id="journalIssue" placeholder="Contoh: Kabel UTP cat 6 putus di jalur lantai 2" />
          </div>
          <div class="form-group">
            <label>Solusi / Tindakan yang Dilakukan:</label>
            <input type="text" id="journalSolution" placeholder="Contoh: Melakukan crimping ulang dengan konektor RJ45 baru" />
          </div>
          <button type="submit" class="btn btn-primary w-full">Simpan Jurnal Harian</button>
        </form>

        <hr class="divider" />
        <h4 class="sub-title">Riwayat Jurnal Terbaru</h4>
        <div id="journalListContainer" class="journal-list">
          <p class="empty-hint">Memuat riwayat jurnal...</p>
        </div>
      </div>
    </section>

    <!-- Tab 3: Manajemen Master Data (Admin) -->
    <section id="tabMaster" class="tab-content">
      <div class="card">
        <h3 class="card-title">Manajemen Master Data PKL (Admin)</h3>
        <p class="card-desc">Kelola entitas berelasi: Siswa, DUDI (Industri), dan Guru Pembimbing.</p>

        <div class="master-sub-tabs">
          <button class="btn-subtab active" onclick="showMasterSub('subDudi', this)">DUDI (Industri)</button>
          <button class="btn-subtab" onclick="showMasterSub('subSiswa', this)">Data Siswa</button>
          <button class="btn-subtab" onclick="showMasterSub('subGuru', this)">Guru Pembimbing</button>
        </div>

        <div id="subDudi" class="subtab-panel active">
          <div class="panel-header">
            <h4>Daftar DUDI / Perusahaan Mitra</h4>
            <button class="btn btn-secondary btn-sm" onclick="openModalAddDudi()">+ Tambah DUDI</button>
          </div>
          <div id="dudiTableContainer" class="table-responsive"></div>
        </div>

        <div id="subSiswa" class="subtab-panel" style="display:none;">
          <div class="panel-header">
            <h4>Data Siswa PKL</h4>
            <button class="btn btn-secondary btn-sm" onclick="openModalAddSiswa()">+ Tambah Siswa</button>
          </div>
          <div id="siswaTableContainer" class="table-responsive"></div>
        </div>

        <div id="subGuru" class="subtab-panel" style="display:none;">
          <div class="panel-header">
            <h4>Guru Pembimbing PKL</h4>
            <button class="btn btn-secondary btn-sm" onclick="openModalAddGuru()">+ Tambah Guru</button>
          </div>
          <div id="guruTableContainer" class="table-responsive"></div>
        </div>
      </div>
    </section>

    <!-- Tab 4: Laporan & Export PDF -->
    <section id="tabLaporan" class="tab-content">
      <div class="card">
        <h3 class="card-title">Laporan & Rekapitulasi Presensi</h3>
        <p class="card-desc">Filter data presensi PKL per siswa & cetak berkas PDF resmi berstandar sekolah.</p>

        <div class="filter-grid">
          <div class="form-group">
            <label>Filter Siswa:</label>
            <select id="filterSelectSiswa">
              <option value="ALL">-- Semua Siswa PKL --</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bulan / Periode:</label>
            <input type="month" id="filterSelectMonth" value="2026-09" />
          </div>
        </div>

        <div class="export-actions">
          <button class="btn btn-primary" onclick="exportReportToPDF()">
            Unduh Laporan (PDF)
          </button>
        </div>

        <div id="reportSummaryContainer" class="summary-cards">
          <!-- Widget Hadir, Sakit, Izin, Alpa -->
        </div>

        <div id="reportTableContainer" class="table-responsive mt-4"></div>
      </div>
    </section>

  </main>

  <!-- ========================================================================= -->
  <!-- 2. FRONTEND SCRIPT (JAVASCRIPT) TERPADU (GPS, KAMERA & jsPDF)             -->
  <!-- ========================================================================= -->
` + GAS_JS_MAIN_HTML + `
</body>
</html>
`;

export const FIREBASE_SECURITY_RULES_JSON = `{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "Users": {
      "$id_user": {
        // Admin dapat melihat dan mengedit semua user
        // Siswa dan Guru hanya dapat melihat profil mereka sendiri
        ".read": "auth != null && (root.child('Users').child(auth.uid).child('role').val() === 'Admin' || auth.uid === $id_user)",
        ".write": "auth != null && root.child('Users').child(auth.uid).child('role').val() === 'Admin'"
      }
    },
    
    "DUDI": {
      // Semua pengguna terautentikasi dapat membaca lokasi DUDI untuk keperluan GPS
      ".read": "auth != null",
      // Hanya role Admin yang dapat mengedit, menambah, atau menghapus data DUDI
      ".write": "auth != null && root.child('Users').child(auth.uid).child('role').val() === 'Admin'"
    },
    
    "Siswa": {
      ".read": "auth != null",
      // Admin dapat mengelola data siswa
      ".write": "auth != null && root.child('Users').child(auth.uid).child('role').val() === 'Admin'"
    },
    
    "Presensi": {
      "$id_presensi": {
        // Siswa membaca presensinya sendiri; Admin dan Guru Pembimbing membaca semua presensi siswa
        ".read": "auth != null",
        // Siswa hanya boleh membuat record presensi miliknya sendiri pada tanggal berjalan
        ".write": "auth != null && (
          root.child('Users').child(auth.uid).child('role').val() === 'Admin' ||
          newData.child('id_siswa').val() === root.child('Siswa').child(auth.uid).child('id_siswa').val()
        )",
        ".validate": "newData.hasChildren(['id_siswa', 'tanggal', 'status'])"
      }
    },
    
    "JurnalHarian": {
      "$id_jurnal": {
        ".read": "auth != null",
        // Siswa dapat membuat/mengedit draft jurnal miliknya
        // Guru Pembimbing dan Admin dapat memperbarui status validasi jurnal
        ".write": "auth != null && (
          root.child('Users').child(auth.uid).child('role').val() === 'Admin' ||
          root.child('Users').child(auth.uid).child('role').val() === 'Guru Pembimbing' ||
          newData.child('id_siswa').val() === root.child('Siswa').child(auth.uid).child('id_siswa').val()
        )"
      }
    }
  }
}`;

export const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function cek role pengguna
    function getUserRole() {
      return get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return request.auth != null && getUserRole() == 'Admin';
    }
    
    function isGuru() {
      return request.auth != null && (getUserRole() == 'Guru Pembimbing' || isAdmin());
    }

    // Koleksi Users
    match /Users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin() || isGuru());
      allow write: if isAdmin();
    }

    // Koleksi DUDI (Dunia Usaha & Dunia Industri)
    match /DUDI/{dudiId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Koleksi Siswa
    match /Siswa/{siswaId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Koleksi Presensi
    match /Presensi/{presensiId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && (
        request.resource.data.status in ['Hadir', 'Sakit', 'Izin', 'Alpa']
      );
      allow update: if request.auth != null && (
        isAdmin() || isGuru() || request.auth.uid == resource.data.id_user
      );
      allow delete: if isAdmin();
    }

    // Koleksi Jurnal Harian
    match /JurnalHarian/{jurnalId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        isGuru() || isAdmin() || request.resource.data.status_validasi_guru == resource.data.status_validasi_guru
      );
      allow delete: if isAdmin();
    }
  }
}`;

export const DATABASE_SCHEMA_JSON = `{
  "Users": {
    "USR-001": {
      "id_user": "USR-001",
      "username": "admin_pkl",
      "password_hash": "$2a$12$e8Yx9pQvF5...",
      "role": "Admin",
      "nama_lengkap": "Budi Santoso, S.Kom",
      "nomor_wa": "081234567891"
    },
    "USR-002": {
      "id_user": "USR-002",
      "username": "dewi_guru",
      "password_hash": "$2a$12$Z10kLmNxQ...",
      "role": "Guru Pembimbing",
      "nama_lengkap": "Dewi Lestari, M.Pd",
      "nomor_wa": "081234567892"
    },
    "USR-003": {
      "id_user": "USR-003",
      "username": "reza_siswa",
      "password_hash": "$2a$12$P29oKlMnOp...",
      "role": "Siswa",
      "nama_lengkap": "Reza Pratama Putra",
      "nomor_wa": "085712345601"
    }
  },
  
  "DUDI": {
    "DUD-001": {
      "id_dudi": "DUD-001",
      "nama_instansi": "PT Telkom Akses Regional V",
      "bidang": "Telekomunikasi & Jaringan Fiber Optic",
      "alamat": "Jl. Ahmad Yani No. 182, Wonokromo, Surabaya",
      "koordinat_lokasi": {
        "latitude": -7.3056,
        "longitude": 112.7358
      },
      "radius_meter": 150,
      "jam_masuk_standar": "08:00",
      "jam_pulang_standar": "17:00",
      "hari_kerja": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      "tipe_jadwal": "Shift", // "Reguler" | "Shift" | "Kondisional"
      "daftar_shift": [
        {
          "id_shift": "SHF-01-PAGI",
          "nama_shift": "Shift 1 (Pagi)",
          "jam_masuk": "07:00",
          "jam_pulang": "15:00",
          "toleransi_keterlambatan_menit": 15
        },
        {
          "id_shift": "SHF-02-SIANG",
          "nama_shift": "Shift 2 (Siang)",
          "jam_masuk": "15:00",
          "jam_pulang": "23:00",
          "toleransi_keterlambatan_menit": 15
        }
      ]
    }
  },

  "Siswa": {
    "SIS-001": {
      "id_siswa": "SIS-001",
      "id_user": "USR-003", // FOREIGN KEY ke Users
      "nama_lengkap": "Reza Pratama Putra",
      "nis": "20241001",
      "kelas": "XII RPL 1",
      "jurusan": "Rekayasa Perangkat Lunak",
      "id_dudi": "DUD-001", // FOREIGN KEY ke DUDI
      "id_guru_pembimbing": "GUR-001", // FOREIGN KEY ke Guru
      "nomor_wa": "085712345601",
      "nomor_wa_ortu": "081298765401"
    }
  },

  "Presensi": {
    "PRS-20260909-SIS001": {
      "id_presensi": "PRS-20260909-SIS001",
      "id_siswa": "SIS-001", // FOREIGN KEY ke Siswa
      "tanggal": "2026-09-09",
      "hari": "Rabu",
      "id_shift": "SHF-01-PAGI",
      "nama_shift": "Shift 1 (Pagi)",
      "jadwal_masuk": "07:00",
      "jadwal_pulang": "15:00",
      "jam_masuk": "06:55:12",
      "jam_pulang": "15:05:10",
      "status": "Hadir", // Hadir | Sakit | Izin | Alpa
      "status_ketepatan": "Tepat Waktu", // Tepat Waktu | Terlambat
      "foto_selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      "koordinat_absen": {
        "latitude": -7.3055,
        "longitude": 112.7357,
        "jarak_meter": 24,
        "dalam_radius": true
      },
      "keterangan": "Tervalidasi radius lokasi kantor & Tepat Waktu"
    }
  },

  "JurnalHarian": {
    "JRN-20260909-SIS001": {
      "id_jurnal": "JRN-20260909-SIS001",
      "id_siswa": "SIS-001", // FOREIGN KEY ke Siswa
      "tanggal": "2026-09-09",
      "deskripsi_kegiatan": "Mempelajari instalasi ODP fiber optic dan konfigurasi splitter.",
      "kendala": "Redaman kabel patch cord terlalu tinggi (-28 dB).",
      "solusi": "Membersihkan konektor ferrule menggunakan fiber optic cleaner pen.",
      "status_validasi_guru": "Disetujui", // Menunggu | Disetujui | Perlu Revisi
      "catatan_guru": "Bagus, pemahaman standard redaman Telkom Akses sudah tepat.",
      "validated_at": "2026-09-09 18:30:00"
    }
  }
}`;

export const SOURCE_FILES: SourceFileItem[] = [
  {
    filename: 'Code.gs',
    language: 'javascript',
    title: 'Google Apps Script (Backend REST Controller)',
    description: 'Menangani UrlFetchApp REST API ke Firebase, autentikasi session multi-role, validasi radius Haversine, CRUD, dan dispatch notifikasi WhatsApp via Fonnte.',
    code: GAS_CODE_GS
  },
  {
    filename: 'Index.html',
    language: 'html',
    title: 'Halaman Utama All-in-One (HTML + CSS + JS Terpadu)',
    description: 'File tunggal lengkap: struktur HTML, styling CSS pastel modern, serta JavaScript (kamera selfie, GPS geofencing, jsPDF) sudah disatukan ke dalam satu file. Langsung copy-paste file ini ke file Index.html di editor Google Apps Script tanpa perlu membuat js_main dan css_main terpisah.',
    code: GAS_INDEX_HTML
  },
  {
    filename: 'database.rules.json',
    language: 'json',
    title: 'Firebase Realtime Database Security Rules',
    description: 'Aturan keamanan data Firebase untuk melindungi koleksi Users, DUDI, Siswa, Presensi, dan JurnalHarian dengan RBAC.',
    code: FIREBASE_SECURITY_RULES_JSON
  },
  {
    filename: 'firestore.rules',
    language: 'javascript',
    title: 'Firebase Firestore Security Rules (Opsi Alternatif)',
    description: 'Security Rules jika menggunakan Cloud Firestore dengan validasi role Admin, Guru, dan Siswa.',
    code: FIRESTORE_RULES
  },
  {
    filename: 'schema_rdbms_firebase.json',
    language: 'json',
    title: 'Skema Database RDBMS di Firebase JSON',
    description: 'Struktur relasional lengkap dengan foreign key id_user, id_dudi, id_siswa, id_guru_pembimbing. Unduh file ini untuk di-import langsung ke Firebase Console.',
    code: DATABASE_SCHEMA_JSON
  },
  {
    filename: 'database_mysql.sql',
    language: 'sql',
    title: 'Skrip Database MySQL / MariaDB (Siap Impor phpMyAdmin)',
    description: 'Skrip DDL & DML lengkap untuk MySQL 8.0/MariaDB: tabel users, dudi, shift_kerja, guru_pembimbing, siswa, presensi, jurnal_harian, kunjungan_guru, log_aktivitas, konfigurasi_sistem lengkap dengan relasi Foreign Key dan Seed Data awal.',
    code: `-- ==============================================================================
-- SKRIP DATABASE MYSQL LENGKAP - SISTEM MONITORING & PRESENSI PKL SMK
-- Dikonversi dari model data Firebase Firestore ke Relational Database (MySQL 8.0 / MariaDB)
-- Karakteristik: InnoDB, UTF8mb4, Foreign Key Constraint, Indexing, Data Awal (Seed)
-- ==============================================================================

-- Buat Database
CREATE DATABASE IF NOT EXISTS \`db_presensi_pkl\` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE \`db_presensi_pkl\`;

-- Nonaktifkan pengecekan foreign key saat inisialisasi tabel
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL: users (Autentikasi & Akun Seluruh Role)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id_user\` VARCHAR(50) NOT NULL,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('Admin', 'Guru Pembimbing', 'Siswa', 'DUDI') NOT NULL,
  \`nama_lengkap\` VARCHAR(150) NOT NULL,
  \`nomor_wa\` VARCHAR(25) NOT NULL,
  \`id_dudi\` VARCHAR(50) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_user\`),
  INDEX \`idx_users_role\` (\`role\`),
  INDEX \`idx_users_username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL: dudi (Mitra Industri / Tempat PKL)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`dudi\`;
CREATE TABLE \`dudi\` (
  \`id_dudi\` VARCHAR(50) NOT NULL,
  \`nama_instansi\` VARCHAR(150) NOT NULL,
  \`bidang\` VARCHAR(100) NOT NULL,
  \`alamat\` TEXT NOT NULL,
  \`latitude\` DECIMAL(10, 8) NOT NULL,
  \`longitude\` DECIMAL(11, 8) NOT NULL,
  \`radius_meter\` INT NOT NULL DEFAULT 100,
  \`hari_kerja\` JSON NOT NULL COMMENT 'Array JSON nama-nama hari kerja, contoh: ["Senin","Selasa","Rabu","Kamis","Jumat"]',
  \`tipe_jadwal\` ENUM('Reguler', 'Shift', 'Kondisional') NOT NULL DEFAULT 'Reguler',
  \`jam_masuk_standar\` VARCHAR(10) NOT NULL DEFAULT '08:00',
  \`jam_pulang_standar\` VARCHAR(10) NOT NULL DEFAULT '16:30',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_dudi\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL: shift_kerja (Jadwal Shift Khusus per DUDI)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`shift_kerja\`;
CREATE TABLE \`shift_kerja\` (
  \`id_shift\` VARCHAR(50) NOT NULL,
  \`id_dudi\` VARCHAR(50) NOT NULL,
  \`nama_shift\` VARCHAR(100) NOT NULL,
  \`kode_shift\` VARCHAR(20) DEFAULT NULL COMMENT 'PAGI, SIANG, MALAM, REGULER',
  \`jam_masuk\` VARCHAR(10) NOT NULL,
  \`jam_pulang\` VARCHAR(10) NOT NULL,
  \`hari_khusus\` JSON DEFAULT NULL COMMENT 'Array hari jika shift spesifik hari tertentu',
  \`toleransi_keterlambatan_menit\` INT DEFAULT 15,
  \`keterangan\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_shift\`),
  INDEX \`idx_shift_dudi\` (\`id_dudi\`),
  CONSTRAINT \`fk_shift_dudi\` FOREIGN KEY (\`id_dudi\`) REFERENCES \`dudi\` (\`id_dudi\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL: guru_pembimbing (Guru Supervisi Sekolah)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`guru_pembimbing\`;
CREATE TABLE \`guru_pembimbing\` (
  \`id_guru\` VARCHAR(50) NOT NULL,
  \`id_user\` VARCHAR(50) NOT NULL,
  \`nama_guru\` VARCHAR(150) NOT NULL,
  \`nip\` VARCHAR(50) DEFAULT NULL,
  \`siswa_bimbingan\` TEXT NOT NULL COMMENT 'Rangkuman nama/keterangan siswa bimbingan',
  \`nomor_wa\` VARCHAR(25) NOT NULL,
  \`jadwal_kunjungan\` VARCHAR(150) NOT NULL COMMENT 'Jadwal rutin monitoring DUDI',
  \`email\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_guru\`),
  UNIQUE KEY \`uq_guru_user\` (\`id_user\`),
  CONSTRAINT \`fk_guru_user\` FOREIGN KEY (\`id_user\`) REFERENCES \`users\` (\`id_user\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL: siswa (Data Siswa Peserta PKL)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`siswa\`;
CREATE TABLE \`siswa\` (
  \`id_siswa\` VARCHAR(50) NOT NULL,
  \`id_user\` VARCHAR(50) NOT NULL,
  \`nama_lengkap\` VARCHAR(150) NOT NULL,
  \`nis\` VARCHAR(30) NOT NULL UNIQUE,
  \`kelas\` VARCHAR(20) NOT NULL,
  \`jurusan\` VARCHAR(100) NOT NULL,
  \`id_dudi\` VARCHAR(50) NOT NULL,
  \`id_guru_pembimbing\` VARCHAR(50) NOT NULL,
  \`nomor_wa\` VARCHAR(25) NOT NULL,
  \`nomor_wa_ortu\` VARCHAR(25) NOT NULL,
  \`foto_profil\` LONGTEXT DEFAULT NULL COMMENT 'URL atau Base64 foto profil siswa',
  \`alamat\` TEXT DEFAULT NULL,
  \`email\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_siswa\`),
  UNIQUE KEY \`uq_siswa_user\` (\`id_user\`),
  INDEX \`idx_siswa_dudi\` (\`id_dudi\`),
  INDEX \`idx_siswa_guru\` (\`id_guru_pembimbing\`),
  CONSTRAINT \`fk_siswa_user\` FOREIGN KEY (\`id_user\`) REFERENCES \`users\` (\`id_user\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_siswa_dudi\` FOREIGN KEY (\`id_dudi\`) REFERENCES \`dudi\` (\`id_dudi\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`fk_siswa_guru\` FOREIGN KEY (\`id_guru_pembimbing\`) REFERENCES \`guru_pembimbing\` (\`id_guru\`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABEL: presensi (Data Absensi Selfie & Geotagging GPS Siswa)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`presensi\`;
CREATE TABLE \`presensi\` (
  \`id_presensi\` VARCHAR(50) NOT NULL,
  \`id_siswa\` VARCHAR(50) NOT NULL,
  \`tanggal\` DATE NOT NULL,
  \`hari\` VARCHAR(20) DEFAULT NULL,
  \`jam_masuk\` TIME NOT NULL,
  \`jam_pulang\` TIME DEFAULT NULL,
  \`status\` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa') NOT NULL DEFAULT 'Hadir',
  \`foto_selfie\` LONGTEXT NOT NULL COMMENT 'Base64 atau URL foto selfie bukti presensi',
  
  -- Geotagging Koordinat Saat Absen Masuk
  \`latitude_absen\` DECIMAL(10, 8) NOT NULL,
  \`longitude_absen\` DECIMAL(11, 8) NOT NULL,
  \`jarak_meter\` INT NOT NULL,
  \`dalam_radius\` TINYINT(1) NOT NULL DEFAULT 1,
  
  -- Info Shift & Status Waktu
  \`id_shift\` VARCHAR(50) DEFAULT NULL,
  \`nama_shift\` VARCHAR(100) DEFAULT NULL,
  \`jadwal_masuk\` VARCHAR(10) DEFAULT NULL,
  \`jadwal_pulang\` VARCHAR(10) DEFAULT NULL,
  \`status_ketepatan\` ENUM('Tepat Waktu', 'Terlambat', 'Tepat / Lebih Awal') DEFAULT 'Tepat Waktu',
  \`keterangan\` TEXT DEFAULT NULL,
  
  -- Verifikasi & Integrasi
  \`notifikasi_wa_terkirim\` TINYINT(1) DEFAULT 0,
  \`is_offline_pending\` TINYINT(1) DEFAULT 0,
  
  -- Persetujuan oleh Pembimbing DUDI
  \`status_persetujuan_dudi\` ENUM('Menunggu', 'Disetujui', 'Ditolak') DEFAULT 'Menunggu',
  \`catatan_dudi\` TEXT DEFAULT NULL,
  \`disetujui_dudi_pada\` DATETIME DEFAULT NULL,
  \`nama_pembimbing_dudi\` VARCHAR(150) DEFAULT NULL,
  
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_presensi\`),
  INDEX \`idx_presensi_siswa_tgl\` (\`id_siswa\`, \`tanggal\`),
  INDEX \`idx_presensi_status\` (\`status\`),
  CONSTRAINT \`fk_presensi_siswa\` FOREIGN KEY (\`id_siswa\` ) REFERENCES \`siswa\` (\`id_siswa\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABEL: jurnal_harian (Logbook Kegiatan PKL Siswa & Validasi Dual-Role)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`jurnal_harian\`;
CREATE TABLE \`jurnal_harian\` (
  \`id_jurnal\` VARCHAR(50) NOT NULL,
  \`id_siswa\` VARCHAR(50) NOT NULL,
  \`tanggal\` DATE NOT NULL,
  \`deskripsi_kegiatan\` TEXT NOT NULL,
  \`kendala\` TEXT NOT NULL,
  \`solusi\` TEXT DEFAULT NULL,
  
  -- Validasi Guru Pembimbing
  \`status_validasi_guru\` ENUM('Menunggu', 'Disetujui', 'Perlu Revisi') NOT NULL DEFAULT 'Menunggu',
  \`catatan_guru\` TEXT DEFAULT NULL,
  \`validated_at\` DATETIME DEFAULT NULL,
  \`nama_guru_penilai\` VARCHAR(150) DEFAULT NULL,
  
  -- Validasi Pembimbing DUDI
  \`status_validasi_dudi\` ENUM('Menunggu', 'Disetujui', 'Perlu Revisi') NOT NULL DEFAULT 'Menunggu',
  \`catatan_dudi\` TEXT DEFAULT NULL,
  \`validated_dudi_at\` DATETIME DEFAULT NULL,
  \`nama_dudi_penilai\` VARCHAR(150) DEFAULT NULL,
  
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_jurnal\`),
  INDEX \`idx_jurnal_siswa_tgl\` (\`id_siswa\`, \`tanggal\`),
  CONSTRAINT \`fk_jurnal_siswa\` FOREIGN KEY (\`id_siswa\`) REFERENCES \`siswa\` (\`id_siswa\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABEL: kunjungan_guru (Monitoring Lapangan & Supervisi Guru ke DUDI)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`kunjungan_guru\`;
CREATE TABLE \`kunjungan_guru\` (
  \`id_kunjungan\` VARCHAR(50) NOT NULL,
  \`id_guru\` VARCHAR(50) NOT NULL,
  \`nama_guru\` VARCHAR(150) NOT NULL,
  \`id_dudi\` VARCHAR(50) NOT NULL,
  \`nama_dudi\` VARCHAR(150) NOT NULL,
  \`tanggal\` DATE NOT NULL,
  \`jam_kunjungan\` TIME NOT NULL,
  \`tujuan_kunjungan\` VARCHAR(255) NOT NULL,
  \`catatan_evaluasi\` TEXT NOT NULL,
  \`foto_kunjungan\` LONGTEXT NOT NULL COMMENT 'Foto geotagged kunjungan guru ke tempat DUDI',
  \`latitude\` DECIMAL(10, 8) NOT NULL,
  \`longitude\` DECIMAL(11, 8) NOT NULL,
  \`jarak_meter\` INT NOT NULL,
  \`dalam_radius\` TINYINT(1) NOT NULL DEFAULT 1,
  \`siswa_dikunjungi\` JSON NOT NULL COMMENT 'Array nama siswa yang ditemui pada kunjungan',
  \`status_kunjungan\` ENUM('Berlangsung', 'Selesai') NOT NULL DEFAULT 'Selesai',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_kunjungan\`),
  INDEX \`idx_kunjungan_guru\` (\`id_guru\`),
  INDEX \`idx_kunjungan_dudi\` (\`id_dudi\`),
  CONSTRAINT \`fk_kunjungan_guru\` FOREIGN KEY (\`id_guru\`) REFERENCES \`guru_pembimbing\` (\`id_guru\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_kunjungan_dudi\` FOREIGN KEY (\`id_dudi\`) REFERENCES \`dudi\` (\`id_dudi\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABEL: log_aktivitas (Audit Trail & Keamanan Sistem)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`log_aktivitas\`;
CREATE TABLE \`log_aktivitas\` (
  \`id_log\` VARCHAR(50) NOT NULL,
  \`waktu\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`kategori\` ENUM('Autentikasi', 'Presensi', 'Jurnal', 'Master Data', 'Google Drive', 'WhatsApp', 'Sistem') NOT NULL,
  \`aksi\` VARCHAR(100) NOT NULL,
  \`deskripsi\` TEXT NOT NULL,
  \`pengguna\` VARCHAR(150) NOT NULL,
  \`role\` ENUM('Admin', 'Guru Pembimbing', 'Siswa', 'DUDI') NOT NULL,
  \`status\` ENUM('Sukses', 'Peringatan', 'Gagal', 'Info') NOT NULL DEFAULT 'Sukses',
  \`ip_device\` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (\`id_log\`),
  INDEX \`idx_log_kategori\` (\`kategori\`),
  INDEX \`idx_log_waktu\` (\`waktu\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABEL: konfigurasi_sistem (WhatsApp Gateway / Fonnte / Pengaturan)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`konfigurasi_sistem\`;
CREATE TABLE \`konfigurasi_sistem\` (
  \`id_config\` INT NOT NULL AUTO_INCREMENT,
  \`key_name\` VARCHAR(50) NOT NULL UNIQUE,
  \`key_value\` TEXT NOT NULL,
  \`deskripsi\` VARCHAR(255) DEFAULT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_config\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aktifkan kembali Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- SEED DATA AWAL (Contoh Data Asli dari Sistem)
-- ==============================================================================

-- 1. Insert Konfigurasi WhatsApp Gateway Fonnte
INSERT INTO \`konfigurasi_sistem\` (\`key_name\`, \`key_value\`, \`deskripsi\`) VALUES
('fonnte_api_key', 'DEMO_FONNTE_TOKEN_12345', 'API Token Fonnte WhatsApp Gateway'),
('fonnte_sender_phone', '6281234567890', 'Nomor pengirim gateway'),
('auto_notify_parent_absence', '1', 'Kirim WA otomatis ke ortu jika absen/alpa'),
('auto_notify_checkin', '1', 'Kirim WA otomatis saat siswa berhasil check-in');

-- 2. Insert Users
INSERT INTO \`users\` (\`id_user\`, \`username\`, \`password_hash\`, \`role\`, \`nama_lengkap\`, \`nomor_wa\`, \`id_dudi\`) VALUES
('USR-ADMIN-01', 'admin', 'admin123', 'Admin', 'Budi Santoso, S.Kom (Koordinator PKL)', '081234567891', NULL),
('USR-GURU-01', 'guru_dewi', 'guru123', 'Guru Pembimbing', 'Dewi Lestari, M.Pd', '081234567892', NULL),
('USR-GURU-02', 'guru_arif', 'guru123', 'Guru Pembimbing', 'Arif Hidayat, S.T', '081234567893', NULL),
('USR-SISWA-01', 'siswa_reza', 'siswa123', 'Siswa', 'Reza Pratama Putra', '085712345601', NULL),
('USR-SISWA-02', 'siswa_anisa', 'siswa123', 'Siswa', 'Anisa Rahmawati', '085712345602', NULL),
('USR-SISWA-03', 'siswa_fajar', 'siswa123', 'Siswa', 'Fajar Nugraha', '085712345603', NULL),
('USR-DUDI-01', 'dudi_telkom', 'dudi123', 'DUDI', 'Hendra Wijaya (PT Telkom)', '081298765431', 'DUDI-01'),
('USR-DUDI-02', 'dudi_astra', 'dudi123', 'DUDI', 'Bambang Sudiro (Astra Motor)', '081298765432', 'DUDI-02');

-- 3. Insert DUDI
INSERT INTO \`dudi\` (\`id_dudi\`, \`nama_instansi\`, \`bidang\`, \`alamat\`, \`latitude\`, \`longitude\`, \`radius_meter\`, \`hari_kerja\`, \`tipe_jadwal\`, \`jam_masuk_standar\`, \`jam_pulang_standar\`) VALUES
('DUDI-01', 'PT Telkom Indonesia Witel Semarang', 'Telekomunikasi & Jaringan', 'Jl. Pahlawan No.10, Pleburan, Semarang Selatan, Kota Semarang', -6.99320000, 110.42080000, 150, '["Senin","Selasa","Rabu","Kamis","Jumat"]', 'Shift', '08:00', '16:30'),
('DUDI-02', 'PT Astra International Daihatsu', 'Otomotif & Manufaktur', 'Jl. Majapahit No.112, Gayamsari, Kota Semarang', -6.98560000, 110.44850000, 100, '["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"]', 'Reguler', '07:30', '16:00'),
('DUDI-03', 'Studio Animasi & Desain Kreasi Digital', 'Multimedia & Grafis', 'Jl. Kelud Raya No. 45, Gajahmungkur, Kota Semarang', -7.00840000, 110.40420000, 80, '["Senin","Selasa","Rabu","Kamis","Jumat"]', 'Kondisional', '08:30', '17:00');

-- 4. Insert Shift Kerja DUDI
INSERT INTO \`shift_kerja\` (\`id_shift\`, \`id_dudi\`, \`nama_shift\`, \`kode_shift\`, \`jam_masuk\`, \`jam_pulang\`, \`hari_khusus\`, \`toleransi_keterlambatan_menit\`, \`keterangan\`) VALUES
('SHF-01', 'DUDI-01', 'Shift 1 Pagi (Telkom)', 'PAGI', '08:00', '16:30', '["Senin","Selasa","Rabu","Kamis"]', 15, 'Shift pagi operasional jaringan NOC'),
('SHF-02', 'DUDI-01', 'Shift 2 Siang (Telkom)', 'SIANG', '13:00', '21:00', '["Senin","Selasa","Rabu","Kamis","Jumat"]', 15, 'Shift siang customer care & data center'),
('SHF-03', 'DUDI-01', 'Shift Jumat Khusus', 'REGULER', '07:30', '16:00', '["Jumat"]', 15, 'Jam pulang lebih awal untuk ibadah Jumat');

-- 5. Insert Guru Pembimbing
INSERT INTO \`guru_pembimbing\` (\`id_guru\`, \`id_user\`, \`nama_guru\`, \`nip\`, \`siswa_bimbingan\`, \`nomor_wa\`, \`jadwal_kunjungan\`, \`email\`) VALUES
('GURU-01', 'USR-GURU-01', 'Dewi Lestari, M.Pd', '198203152008012015', 'Reza Pratama Putra, Anisa Rahmawati', '081234567892', 'Selasa & Kamis (Minggu ke-2 dan ke-4)', 'dewi.lestari@smk.sch.id'),
('GURU-02', 'USR-GURU-02', 'Arif Hidayat, S.T', '197911042005011009', 'Fajar Nugraha', '081234567893', 'Rabu (Minggu ke-1 dan ke-3)', 'arif.hidayat@smk.sch.id');

-- 6. Insert Siswa
INSERT INTO \`siswa\` (\`id_siswa\`, \`id_user\`, \`nama_lengkap\`, \`nis\`, \`kelas\`, \`jurusan\`, \`id_dudi\`, \`id_guru_pembimbing\`, \`nomor_wa\`, \`nomor_wa_ortu\`, \`foto_profil\`, \`alamat\`, \`email\`) VALUES
('SISWA-01', 'USR-SISWA-01', 'Reza Pratama Putra', '22231001', 'XII TKJ 1', 'Teknik Komputer dan Jaringan', 'DUDI-01', 'GURU-01', '085712345601', '081298765401', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'Jl. Karangrejo No. 12, Banyumanik, Semarang', 'reza.pratama@siswa.smk.sch.id'),
('SISWA-02', 'USR-SISWA-02', 'Anisa Rahmawati', '22231002', 'XII RPL 2', 'Rekayasa Perangkat Lunak', 'DUDI-01', 'GURU-01', '085712345602', '081298765402', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Jl. Menoreh Tengah No. 5, Sampangan, Semarang', 'anisa.rahmawati@siswa.smk.sch.id'),
('SISWA-03', 'USR-SISWA-03', 'Fajar Nugraha', '22231003', 'XII TKRO 1', 'Teknik Kendaraan Ringan Otomotif', 'DUDI-02', 'GURU-02', '085712345603', '081298765403', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Jl. Pedurungan Kidul No. 88, Semarang', 'fajar.nugraha@siswa.smk.sch.id');

-- 7. Insert Presensi Contoh
INSERT INTO \`presensi\` (\`id_presensi\`, \`id_siswa\`, \`tanggal\`, \`hari\`, \`jam_masuk\`, \`jam_pulang\`, \`status\`, \`foto_selfie\`, \`latitude_absen\`, \`longitude_absen\`, \`jarak_meter\`, \`dalam_radius\`, \`nama_shift\`, \`jadwal_masuk\`, \`jadwal_pulang\`, \`status_ketepatan\`, \`status_persetujuan_dudi\`, \`nama_pembimbing_dudi\`) VALUES
('PRS-20260910-01', 'SISWA-01', '2026-09-10', 'Kamis', '07:54:12', '16:35:00', 'Hadir', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200', -6.99321000, 110.42079000, 18, 1, 'Shift 1 Pagi (Telkom)', '08:00', '16:30', 'Tepat Waktu', 'Disetujui', 'Hendra Wijaya'),
('PRS-20260911-01', 'SISWA-01', '2026-09-11', 'Jumat', '07:48:30', '16:02:15', 'Hadir', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200', -6.99318000, 110.42081000, 22, 1, 'Shift Jumat Khusus', '07:30', '16:00', 'Tepat Waktu', 'Disetujui', 'Hendra Wijaya');

-- 8. Insert Jurnal Harian Contoh
INSERT INTO \`jurnal_harian\` (\`id_jurnal\`, \`id_siswa\`, \`tanggal\`, \`deskripsi_kegiatan\`, \`kendala\`, \`solusi\`, \`status_validasi_guru\`, \`status_validasi_dudi\`) VALUES
('JRN-01', 'SISWA-01', '2026-09-10', 'Melakukan terminasi kabel fiber optic pada OTB rack server lantai 3 dan pengujian redaman memakai OTDR.', 'Port OTB kotor dan konektor SC mengalami redaman tinggi melebihi batas standar -20dB.', 'Membersihkan ferrule dengan optical cleaner box dan mengganti pigtail baru hingga redaman stabil di -14dB.', 'Disetujui', 'Disetujui');
`
  },
  {
    filename: 'server.js',
    language: 'javascript',
    title: 'Server Backend Node.js Express (server.js)',
    description: 'Server API utama yang melayani login, profil siswa JOIN DUDI & Guru, simpan presensi masuk GPS selfie, riwayat presensi, dan logbook jurnal.',
    code: `const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Izinkan aplikasi React membaca data (CORS) & parsing payload JSON hingga 25mb untuk foto selfie
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 1. ENDPOINT: Cek Status Server
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', pesan: 'Server Backend Presensi PKL MySQL Siap Digunakan!' });
});

// 2. ENDPOINT: Login Pengguna
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query(
      'SELECT id_user, username, role, nama_lengkap, nomor_wa, id_dudi FROM users WHERE username = ? AND password_hash = ?',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ sukses: false, pesan: 'Username atau Password salah!' });
    }

    res.json({ sukses: true, pesan: 'Login berhasil!', data: rows[0] });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// 3. ENDPOINT: Profil Lengkap Siswa (JOIN ke DUDI & Guru)
app.get('/api/siswa/profil/:id_user', async (req, res) => {
  try {
    const { id_user } = req.params;
    const [rows] = await db.query(
      \`SELECT 
        s.*, 
        d.nama_instansi AS nama_dudi, 
        d.alamat AS alamat_dudi,
        d.latitude AS lat_dudi, 
        d.longitude AS long_dudi, 
        d.radius_meter,
        g.nama_guru AS nama_guru_pembimbing,
        g.nomor_wa AS wa_guru
      FROM siswa s
      JOIN dudi d ON s.id_dudi = d.id_dudi
      JOIN guru_pembimbing g ON s.id_guru_pembimbing = g.id_guru
      WHERE s.id_user = ?\`,
      [id_user]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sukses: false, pesan: 'Data siswa tidak ditemukan' });
    }

    res.json({ sukses: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// 4. ENDPOINT: Simpan Presensi Masuk
app.post('/api/presensi/masuk', async (req, res) => {
  try {
    const {
      id_siswa, tanggal, hari, jam_masuk, status, foto_selfie,
      latitude_absen, longitude_absen, jarak_meter, dalam_radius,
      nama_shift, status_ketepatan, keterangan
    } = req.body;

    const id_presensi = \`PRS-\${Date.now()}\`;

    await db.query(
      \`INSERT INTO presensi (
        id_presensi, id_siswa, tanggal, hari, jam_masuk, status, 
        foto_selfie, latitude_absen, longitude_absen, jarak_meter, 
        dalam_radius, nama_shift, status_ketepatan, keterangan,
        status_persetujuan_dudi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')\`,
      [
        id_presensi, id_siswa, tanggal, hari, jam_masuk, status,
        foto_selfie, latitude_absen, longitude_absen, jarak_meter,
        dalam_radius ? 1 : 0, nama_shift || null, status_ketepatan || 'Tepat Waktu',
        keterangan || null
      ]
    );

    res.json({ sukses: true, pesan: 'Presensi berhasil dicatat!', id_presensi });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// 5. ENDPOINT: Riwayat Presensi Siswa
app.get('/api/presensi/riwayat/:id_siswa', async (req, res) => {
  try {
    const { id_siswa } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM presensi WHERE id_siswa = ? ORDER BY tanggal DESC, jam_masuk DESC',
      [id_siswa]
    );
    res.json({ sukses: true, data: rows });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// 6. ENDPOINT: Simpan Jurnal Harian
app.post('/api/jurnal/tambah', async (req, res) => {
  try {
    const { id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi } = req.body;
    const id_jurnal = \`JRN-\${Date.now()}\`;

    await db.query(
      \`INSERT INTO jurnal_harian (
        id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi, 
        status_validasi_guru, status_validasi_dudi
      ) VALUES (?, ?, ?, ?, ?, ?, 'Menunggu', 'Menunggu')\`,
      [id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi]
    );

    res.json({ sukses: true, pesan: 'Jurnal harian berhasil disimpan!', id_jurnal });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(\`🚀 SERVER BACKEND AKTIF DI: http://localhost:\${PORT}\`);
  console.log('   Tekan Ctrl + C di jendela ini untuk mematikan server.');
  console.log('====================================================');
});
`
  },
  {
    filename: 'db.js',
    language: 'javascript',
    title: 'Koneksi Database MySQL (db.js)',
    description: 'File pool koneksi MySQL menggunakan mysql2/promise dengan proteksi env.',
    code: `const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_presensi_pkl',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection()
  .then((conn) => {
    console.log('====================================================');
    console.log('✅ BERHASIL TERHUBUNG KE DATABASE MYSQL (db_presensi_pkl)!');
    console.log('====================================================');
    conn.release();
  })
  .catch((err) => {
    console.log('====================================================');
    console.error('❌ GAGAL KONEK KE MYSQL! Periksa apakah XAMPP sudah Start:', err.message);
    console.log('====================================================');
  });

module.exports = db;
`
  },
  {
    filename: 'package.json',
    language: 'json',
    title: 'Daftar Dependencies Backend (package.json)',
    description: 'Daftar library Express, MySQL2, CORS, dan Dotenv.',
    code: `{
  "name": "backend-presensi-pkl",
  "version": "1.0.0",
  "description": "Backend API Server Node.js Express & MySQL untuk Sistem Monitoring PKL SMK",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mysql2": "^3.11.0"
  }
}`
  },
  {
    filename: '.env',
    language: 'plaintext',
    title: 'Pengaturan Database (.env)',
    description: 'File konfigurasi host, port, username, password MySQL dan port backend.',
    code: `DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_presensi_pkl
PORT=5000`
  }
];
