const EXAMPLES = [
  {
    label: "Email kerja",
    role: "asisten profesional yang ahli menulis email bisnis",
    task: "Tuliskan email untuk meminta perpanjangan deadline proyek ke atasan",
    context: "Proyek terlambat karena vendor telat kirim bahan, saya butuh tambahan 3 hari, hubungan dengan atasan baik dan komunikatif",
    format: "Email formal dalam Bahasa Indonesia, maksimal 150 kata, sertakan subjek email"
  },
  {
    label: "Caption medsos",
    role: "social media specialist untuk brand fashion lokal",
    task: "Buatkan 5 variasi caption Instagram untuk promo diskon 20% koleksi baju lebaran",
    context: "Target audiens perempuan usia 20-35 tahun, gaya bahasa santai dan ceria, nama brand 'Kalyca'",
    format: "5 caption dalam list bernomor, masing-masing maksimal 3 kalimat, sertakan 3 hashtag relevan per caption"
  },
  {
    label: "Belajar konsep baru",
    role: "tutor yang sabar dan ahli menjelaskan konsep rumit dengan sederhana",
    task: "Jelaskan konsep bunga majemuk (compound interest) untuk pemula",
    context: "Saya baru belajar keuangan pribadi, tidak punya latar belakang matematika atau ekonomi",
    format: "Penjelasan pakai analogi sehari-hari, maksimal 200 kata, tutup dengan 1 contoh perhitungan sederhana"
  },
  {
    label: "Debug kode",
    role: "software engineer senior yang ahli Python",
    task: "Cari tahu kenapa kode berikut error dan perbaiki: [tempel kode di sini]",
    context: "Error muncul saat menjalankan fungsi, saya masih pemula belajar Python",
    format: "Jelaskan penyebab error dalam 1-2 kalimat, lalu berikan kode yang sudah diperbaiki dalam code block"
  },
  {
    label: "Rencana makan",
    role: "personal trainer dan ahli gizi bersertifikat",
    task: "Buatkan rencana menu makan sehat selama 3 hari untuk menurunkan berat badan",
    context: "Saya kerja kantoran, jarang sempat masak ribet, tidak alergi apapun, budget terbatas",
    format: "Tabel per hari (sarapan, makan siang, makan malam, snack), sertakan estimasi kalori total per hari"
  }
];

const FILLER_PATTERNS = [
  /^tolong\s+/i,
  /^mohon\s+/i,
  /^bisakah (kamu|anda)\s+/i,
  /^apakah (kamu|anda) bisa\s+/i,
  /^saya (ingin|mau)\s+/i,
  /^bantu(kan)? saya (untuk\s+)?/i,
  /^coba\s+/i,
  /^silakan\s+/i,
  /^silahkan\s+/i,
  /\bkalau bisa\b/gi,
  /\bkira-kira\b/gi,
  /\bsekiranya\b/gi,
  /\bplease\b/gi
];

const CONCISE_NOTE = "Jawab secara ringkas, padat, dan langsung ke inti. Hindari kalimat pembuka/penutup basa-basi.";

const roleInput = document.getElementById("roleInput");
const taskInput = document.getElementById("taskInput");
const contextInput = document.getElementById("contextInput");
const formatInput = document.getElementById("formatInput");
const compressToggle = document.getElementById("compressToggle");
const conciseToggle = document.getElementById("conciseToggle");
const output = document.getElementById("output");
const charCount = document.getElementById("charCount");
const tokenCount = document.getElementById("tokenCount");
const copyBtn = document.getElementById("copyBtn");
const copyStatus = document.getElementById("copyStatus");
const resetBtn = document.getElementById("resetBtn");
const exampleChips = document.getElementById("exampleChips");

function compress(text) {
  let t = text.trim();
  FILLER_PATTERNS.forEach((pattern) => {
    t = t.replace(pattern, "");
  });
  return t.replace(/\s+/g, " ").trim();
}

function fieldValue(rawValue) {
  const trimmed = rawValue.trim();
  return compressToggle.checked ? compress(trimmed) : trimmed;
}

function buildPrompt() {
  const role = fieldValue(roleInput.value);
  const task = fieldValue(taskInput.value);
  const context = fieldValue(contextInput.value);
  const format = fieldValue(formatInput.value);

  const lines = [];
  lines.push(`PERAN: ${role || "(belum diisi)"}`);
  lines.push("");
  lines.push(`TUGAS: ${task || "(belum diisi)"}`);
  lines.push("");
  lines.push(`KONTEKS: ${context || "(belum diisi)"}`);
  lines.push("");
  lines.push(`FORMAT OUTPUT: ${format || "(belum diisi)"}`);

  if (conciseToggle.checked) {
    lines.push("");
    lines.push(`CATATAN: ${CONCISE_NOTE}`);
  }

  return lines.join("\n");
}

function estimateTokens(text) {
  return Math.max(0, Math.ceil(text.length / 4));
}

function render() {
  const prompt = buildPrompt();
  output.textContent = prompt;
  charCount.textContent = `${prompt.length} karakter`;
  tokenCount.textContent = `≈${estimateTokens(prompt)} token`;
}

[roleInput, taskInput, contextInput, formatInput].forEach((el) => {
  el.addEventListener("input", render);
});
compressToggle.addEventListener("change", render);
conciseToggle.addEventListener("change", render);

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    copyStatus.textContent = "Tersalin!";
  } catch (err) {
    copyStatus.textContent = "Gagal menyalin, silakan salin manual.";
  }
  setTimeout(() => { copyStatus.textContent = ""; }, 2000);
});

resetBtn.addEventListener("click", () => {
  roleInput.value = "";
  taskInput.value = "";
  contextInput.value = "";
  formatInput.value = "";
  render();
});

EXAMPLES.forEach((example) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = example.label;
  chip.addEventListener("click", () => {
    roleInput.value = example.role;
    taskInput.value = example.task;
    contextInput.value = example.context;
    formatInput.value = example.format;
    render();
  });
  exampleChips.appendChild(chip);
});

render();
