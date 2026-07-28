const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n || 0)));

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

const LIVING_COST = {
  1: { adult: 6000000, child: 3000000 },
  2: { adult: 4000000, child: 2000000 },
  3: { adult: 3000000, child: 1500000 },
};

function num(id) {
  const el = document.getElementById(id);
  return parseFloat(el.value) || 0;
}

function bool(id) {
  return document.getElementById(id).checked;
}

function scoreIncome(totalIncome, benchmark) {
  if (benchmark <= 0) return { score: 100, ratio: null };
  const ratio = totalIncome / benchmark;
  let score;
  if (ratio < 1.0) score = lerp(0, 40, ratio / 1.0);
  else if (ratio < 1.5) score = lerp(40, 75, (ratio - 1.0) / 0.5);
  else if (ratio < 2.0) score = lerp(75, 95, (ratio - 1.5) / 0.5);
  else score = lerp(95, 100, (ratio - 2.0) / 1.0);
  return { score: clamp(score, 0, 100), ratio };
}

function scoreDebt(debtInstallments, housingCost, totalIncome) {
  if (totalIncome <= 0) return { score: 0, ratio: null };
  const ratio = (debtInstallments + housingCost) / totalIncome;
  let score;
  if (ratio <= 0.2) score = 100;
  else if (ratio <= 0.35) score = lerp(100, 60, (ratio - 0.2) / 0.15);
  else if (ratio <= 0.5) score = lerp(60, 20, (ratio - 0.35) / 0.15);
  else score = clamp(20 - (ratio - 0.5) * 100, 0, 20);
  return { score: clamp(score, 0, 100), ratio };
}

function scoreEmergency(emergencyFund, monthlyExpenses, dependents) {
  if (monthlyExpenses <= 0) return { score: 100, months: null, target: null };
  const months = emergencyFund / monthlyExpenses;
  const target = clamp(6 + dependents, 6, 12);
  const coverage = months / target;
  return { score: clamp(coverage * 100, 0, 100), months, target };
}

function scoreSavings(monthlySavingsInvestment, totalIncome) {
  if (totalIncome <= 0) return { score: 0, rate: null };
  const rate = monthlySavingsInvestment / totalIncome;
  let score;
  if (rate < 0.05) score = lerp(0, 20, rate / 0.05);
  else if (rate < 0.1) score = lerp(20, 50, (rate - 0.05) / 0.05);
  else if (rate < 0.2) score = lerp(50, 85, (rate - 0.1) / 0.1);
  else score = lerp(85, 100, (rate - 0.2) / 0.1);
  return { score: clamp(score, 0, 100), rate };
}

function scoreProtection(hasHealth, hasLife, lifeCoverage, totalIncome) {
  let score = 0;
  if (hasHealth) score += 40;
  if (hasLife) score += 30;
  const idealCoverage = totalIncome * 12 * 5;
  let adequacy = 0;
  if (hasLife && idealCoverage > 0) {
    adequacy = clamp(lifeCoverage / idealCoverage, 0, 1) * 30;
  }
  score += adequacy;
  return { score: clamp(score, 0, 100), idealCoverage };
}

function scoreWedding(weddingCostEstimate, weddingFundsAvailable, fundedByDebt) {
  if (weddingCostEstimate <= 0) return { score: 100, fundedRatio: null };
  const fundedRatio = clamp(weddingFundsAvailable / weddingCostEstimate, 0, 1);
  let score = fundedRatio * 100;
  if (fundedByDebt) score = Math.max(0, score - 30);
  return { score: clamp(score, 0, 100), fundedRatio };
}

function getColor(score) {
  if (score >= 75) return "#1f9d55";
  if (score >= 50) return "#d98c1f";
  return "#c0392b";
}

function categoryFor(total) {
  if (total <= 40)
    return {
      label: "Belum Mapan",
      desc: "Ada beberapa pilar finansial yang masih perlu dibenahi sebelum melangkah ke pernikahan. Bukan berarti tidak bisa menikah, tapi risiko finansialnya cukup tinggi kalau dipaksakan sekarang.",
    };
  if (total <= 60)
    return {
      label: "Dalam Proses Menuju Mapan",
      desc: "Fondasi finansialmu sudah mulai terbentuk, tapi masih ada beberapa area penting yang perlu diperkuat sebelum benar-benar siap.",
    };
  if (total <= 80)
    return {
      label: "Cukup Mapan",
      desc: "Secara umum kondisi finansialmu cukup sehat. Perkuat sisa area yang masih lemah agar lebih tahan terhadap kejutan finansial di awal pernikahan.",
    };
  return {
    label: "Mapan",
    desc: "Kondisi finansialmu solid di semua pilar utama. Kamu berada di posisi yang baik untuk mengambil keputusan menikah dari sisi finansial.",
  };
}

function buildRecommendations(ctx) {
  const recos = [];

  if (ctx.income.ratio !== null && ctx.income.ratio < 1.5) {
    const targetIncome = ctx.benchmark * 1.5;
    const gap = targetIncome - ctx.totalIncome;
    recos.push(
      `Penghasilan gabungan (${rupiah(ctx.totalIncome)}) masih di bawah 1,5x estimasi biaya hidup layak untuk keluargamu (${rupiah(
        ctx.benchmark
      )}). Idealnya ada buffer sekitar ${rupiah(gap)} lagi per bulan, lewat kenaikan penghasilan, penghasilan tambahan, atau menggabungkan penghasilan pasangan.`
    );
  }

  if (ctx.debt.ratio !== null && ctx.debt.ratio > 0.35) {
    const maxSafeDebt = ctx.totalIncome * 0.35;
    const excess = ctx.debtInstallments + ctx.housingCost - maxSafeDebt;
    recos.push(
      `Total cicilan (utang konsumtif + KPR/sewa) mencapai ${(ctx.debt.ratio * 100).toFixed(
        0
      )}% dari penghasilan, melebihi batas aman 35%. Coba kurangi sekitar ${rupiah(
        excess
      )} per bulan, misalnya dengan melunasi utang berbunga tinggi lebih dulu sebelum menikah.`
    );
  } else if (ctx.debt.ratio !== null && ctx.debt.ratio > 0.2) {
    recos.push(
      `Rasio cicilan kalian (${(ctx.debt.ratio * 100).toFixed(
        0
      )}%) masih dalam batas aman, tapi di atas ambang ideal 20%. Prioritaskan pelunasan utang konsumtif sebelum menambah cicilan baru.`
    );
  }

  if (ctx.emergency.target !== null && ctx.emergency.months < ctx.emergency.target) {
    const shortfall = ctx.emergency.target * ctx.monthlyExpenses - ctx.emergencyFund;
    recos.push(
      `Dana darurat saat ini setara ${ctx.emergency.months.toFixed(1)} bulan pengeluaran, sementara target untuk keluarga dengan ${
        ctx.dependents
      } rencana anak adalah ${ctx.emergency.target} bulan. Kalian masih perlu menambah sekitar ${rupiah(
        shortfall
      )} sebagai dana darurat bersama.`
    );
  }

  if (ctx.savings.rate !== null && ctx.savings.rate < 0.2) {
    const targetSavings = ctx.totalIncome * 0.2;
    const gap = targetSavings - ctx.monthlySavingsInvestment;
    recos.push(
      `Kalian menabung/investasi sekitar ${(ctx.savings.rate * 100).toFixed(
        0
      )}% dari penghasilan. Untuk menuju target ideal 20%, coba naikkan alokasi bulanan sekitar ${rupiah(gap)} lagi.`
    );
  }

  if (!ctx.hasHealthInsurance) {
    recos.push(
      "Belum ada asuransi kesehatan aktif. Pastikan kalian berdua memiliki BPJS Kesehatan minimal, idealnya ditambah asuransi swasta, sebelum menikah agar biaya kesehatan tak jadi guncangan finansial mendadak."
    );
  }
  if (!ctx.hasLifeInsurance) {
    recos.push(
      "Belum ada asuransi jiwa. Jika salah satu dari kalian menjadi pencari nafkah utama, pertimbangkan asuransi jiwa dengan uang pertanggungan sekitar 5x penghasilan tahunan untuk melindungi keluarga dari risiko terburuk."
    );
  } else if (ctx.protection.idealCoverage > 0) {
    recos.push(
      `Uang pertanggungan asuransi jiwa idealnya sekitar ${rupiah(
        ctx.protection.idealCoverage
      )} (5x penghasilan tahunan gabungan). Sesuaikan polis jika nilainya masih di bawah itu.`
    );
  }

  if (ctx.wedding.fundedRatio !== null && ctx.wedding.fundedRatio < 1) {
    const shortfall = ctx.weddingCostEstimate - ctx.weddingFundsAvailable;
    if (ctx.weddingFundedByDebt) {
      recos.push(
        `Rencana menutup kekurangan biaya pernikahan sebesar ${rupiah(
          shortfall
        )} dengan utang cukup berisiko sebagai awal rumah tangga. Pertimbangkan menyesuaikan skala pernikahan atau menunda tanggal untuk menabung lebih dulu, alih-alih memulai pernikahan dengan beban utang.`
      );
    } else {
      recos.push(
        `Dana pernikahan baru terkumpul ${(ctx.wedding.fundedRatio * 100).toFixed(
          0
        )}% dari estimasi biaya. Masih ada kekurangan ${rupiah(shortfall)} yang perlu ditabung sebelum hari-H.`
      );
    }
  }

  if (recos.length === 0) {
    recos.push(
      "Semua pilar utama sudah dalam kondisi sehat. Pertahankan kebiasaan ini dan tinjau ulang secara berkala, terutama setelah menikah karena kebutuhan rumah tangga bisa berubah."
    );
  }

  return recos;
}

document.getElementById("calc-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const incomeSelf = num("incomeSelf");
  const incomePartner = num("incomePartner");
  const combineFinance = bool("combineFinance");
  const cityTier = num("cityTier") || 1;
  const dependents = Math.max(0, Math.round(num("dependents")));

  const monthlyExpenses = num("monthlyExpenses");
  const housingCost = num("housingCost");
  const debtInstallments = num("debtInstallments");

  const emergencyFund = num("emergencyFund");
  const monthlySavingsInvestment = num("monthlySavingsInvestment");

  const hasHealthInsurance = bool("hasHealthInsurance");
  const hasLifeInsurance = bool("hasLifeInsurance");
  const lifeInsuranceCoverage = num("lifeInsuranceCoverage");

  const weddingCostEstimate = num("weddingCostEstimate");
  const weddingFundsAvailable = num("weddingFundsAvailable");
  const weddingFundedByDebt = bool("weddingFundedByDebt");

  const totalIncome = incomeSelf + (combineFinance ? incomePartner : 0);

  const costRef = LIVING_COST[cityTier];
  const benchmark = costRef.adult * 2 + costRef.child * dependents;

  const income = scoreIncome(totalIncome, benchmark);
  const debt = scoreDebt(debtInstallments, housingCost, totalIncome);
  const emergency = scoreEmergency(emergencyFund, monthlyExpenses, dependents);
  const savings = scoreSavings(monthlySavingsInvestment, totalIncome);
  const protection = scoreProtection(hasHealthInsurance, hasLifeInsurance, lifeInsuranceCoverage, totalIncome);
  const wedding = scoreWedding(weddingCostEstimate, weddingFundsAvailable, weddingFundedByDebt);

  const weights = {
    income: 0.25,
    debt: 0.15,
    emergency: 0.2,
    savings: 0.2,
    protection: 0.1,
    wedding: 0.1,
  };

  const total = Math.round(
    income.score * weights.income +
      debt.score * weights.debt +
      emergency.score * weights.emergency +
      savings.score * weights.savings +
      protection.score * weights.protection +
      wedding.score * weights.wedding
  );

  const category = categoryFor(total);

  // Render gauge
  const scoreColor = getColor(total);
  document.getElementById("gauge").style.background = `conic-gradient(${scoreColor} ${
    total * 3.6
  }deg, var(--border) 0deg)`;
  document.getElementById("scoreNumber").textContent = total;
  document.getElementById("scoreLabel").textContent = category.label;
  document.getElementById("scoreDesc").textContent = category.desc;

  // Render breakdown
  const pillars = [
    {
      name: "Kecukupan Penghasilan",
      score: income.score,
      detail:
        income.ratio === null
          ? "Tidak dapat dihitung."
          : `Penghasilan gabungan ${rupiah(totalIncome)} vs estimasi biaya hidup layak ${rupiah(
              benchmark
            )} (${income.ratio.toFixed(2)}x).`,
    },
    {
      name: "Keamanan Utang",
      score: debt.score,
      detail:
        debt.ratio === null
          ? "Tidak dapat dihitung."
          : `Total cicilan (utang + KPR/sewa) sebesar ${(debt.ratio * 100).toFixed(1)}% dari penghasilan.`,
    },
    {
      name: "Dana Darurat",
      score: emergency.score,
      detail:
        emergency.target === null
          ? "Tidak dapat dihitung."
          : `Setara ${emergency.months.toFixed(1)} bulan pengeluaran dari target ${emergency.target} bulan.`,
    },
    {
      name: "Tabungan & Investasi",
      score: savings.score,
      detail:
        savings.rate === null
          ? "Tidak dapat dihitung."
          : `${(savings.rate * 100).toFixed(1)}% dari penghasilan dialokasikan untuk menabung/investasi.`,
    },
    {
      name: "Proteksi Risiko",
      score: protection.score,
      detail: `Asuransi kesehatan: ${hasHealthInsurance ? "Ada" : "Belum ada"}. Asuransi jiwa: ${
        hasLifeInsurance ? "Ada" : "Belum ada"
      }.`,
    },
    {
      name: "Kesiapan Dana Pernikahan",
      score: wedding.score,
      detail:
        wedding.fundedRatio === null
          ? "Estimasi biaya pernikahan belum diisi."
          : `${(wedding.fundedRatio * 100).toFixed(0)}% dari estimasi biaya sudah tersedia${
              weddingFundedByDebt ? ", sebagian rencana ditutup dengan utang." : "."
            }`,
    },
  ];

  const breakdownEl = document.getElementById("breakdown");
  breakdownEl.innerHTML = pillars
    .map((p) => {
      const color = getColor(p.score);
      return `
        <div class="pillar">
          <div class="pillar-head">
            <strong>${p.name}</strong>
            <span class="score" style="color:${color}">${Math.round(p.score)}/100</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${p.score}%; background:${color}"></div>
          </div>
          <p class="pillar-detail">${p.detail}</p>
        </div>
      `;
    })
    .join("");

  // Render recommendations
  const recos = buildRecommendations({
    income,
    debt,
    emergency,
    savings,
    protection,
    wedding,
    totalIncome,
    benchmark,
    debtInstallments,
    housingCost,
    monthlyExpenses,
    emergencyFund,
    dependents,
    monthlySavingsInvestment,
    hasHealthInsurance,
    hasLifeInsurance,
    weddingCostEstimate,
    weddingFundsAvailable,
    weddingFundedByDebt,
  });

  document.getElementById("recoList").innerHTML = recos.map((r) => `<li>${r}</li>`).join("");

  const resultsEl = document.getElementById("results");
  resultsEl.classList.remove("hidden");
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
});
