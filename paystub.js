// paystub.js

// Wait until the DOM is ready so we can grab the buttons safely
document.addEventListener("DOMContentLoaded", function () {
  const previewBtn = document.getElementById("previewBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  if (previewBtn) previewBtn.addEventListener("click", updatePreview);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadPDF);
});

// helper to round to 2 decimals
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// calculate all pay + deductions from the form
function calculateStub() {
  const hours = parseFloat(document.getElementById("hoursWorked").value) || 0;
  const rate = parseFloat(document.getElementById("hourlyRate").value) || 0;
  const otherEarnings = parseFloat(document.getElementById("otherEarnings").value) || 0;

  const gross = hours * rate + otherEarnings;

  const fedPct = (parseFloat(document.getElementById("fedTaxPct").value) || 0) / 100;
  const statePct = (parseFloat(document.getElementById("stateTaxPct").value) || 0) / 100;
  const ssPct = (parseFloat(document.getElementById("ssPct").value) || 0) / 100;
  const medicarePct = (parseFloat(document.getElementById("medicarePct").value) || 0) / 100;
  const otherDeduction = parseFloat(document.getElementById("otherDeduction").value) || 0;

  const fedAmt = gross * fedPct;
  const stateAmt = gross * statePct;
  const ssAmt = gross * ssPct;
  const medicareAmt = gross * medicarePct;

  const totalDeductions = fedAmt + stateAmt + ssAmt + medicareAmt + otherDeduction;
  const netPay = gross - totalDeductions;

  return {
    gross: round2(gross),
    fedAmt: round2(fedAmt),
    stateAmt: round2(stateAmt),
    ssAmt: round2(ssAmt),
    medicareAmt: round2(medicareAmt),
    otherDeduction: round2(otherDeduction),
    totalDeductions: round2(totalDeductions),
    netPay: round2(netPay)
  };
}

// update the on-page preview box
function updatePreview() {
  const calc = calculateStub();
  const preview = document.getElementById("preview");
  if (!preview) return;
  document.getElementById("p_gross").textContent = calc.gross.toFixed(2);
  document.getElementById("p_deductions").textContent = calc.totalDeductions.toFixed(2);
  document.getElementById("p_net").textContent = calc.netPay.toFixed(2);
  preview.classList.remove("hidden");
}

// main PDF generator
function downloadPDF() {
  // check local jsPDF is loaded
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Local jsPDF did not load. Make sure 'jspdf.umd.min.js' is in the same folder and the name matches.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // company (fixed)
  const companyName = document.getElementById("companyName").value;
  const companyAddress = document.getElementById("companyAddress").value;
  const companyPhone = document.getElementById("companyPhone").value;

  // employee (now includes PayPal)
  const employeeName = document.getElementById("employeeName").value;
  const employeeId = document.getElementById("employeeId").value;
  const employeeAddress = document.getElementById("employeeAddress").value;
  const employeePaypal = document.getElementById("employeePaypal") 
    ? document.getElementById("employeePaypal").value 
    : "";

  // pay details
  const payDate = document.getElementById("payDate").value;
  const payPeriod = document.getElementById("payPeriod").value;
  const payFrequency = document.getElementById("payFrequency").value;

  // calculated numbers
  const calc = calculateStub();

  // we try to add the logo first; if it fails (file://), we still make the PDF
  let y = 15;
  const img = new Image();
  img.onload = function () {
    const imgWidth = 60;
    const imgHeight = (img.height / img.width) * imgWidth;
    doc.addImage(img, "PNG", 75, y, imgWidth, imgHeight);
    buildPdfBody(doc, y + imgHeight + 5, {
      companyName,
      companyAddress,
      companyPhone,
      employeeName,
      employeeId,
      employeeAddress,
      employeePaypal,
      payDate,
      payPeriod,
      payFrequency,
      calc
    });
  };
  img.onerror = function () {
    // could not load paystub.png, continue without image
    buildPdfBody(doc, y, {
      companyName,
      companyAddress,
      companyPhone,
      employeeName,
      employeeId,
      employeeAddress,
      employeePaypal,
      payDate,
      payPeriod,
      payFrequency,
      calc
    });
  };
  img.src = "paystub.png"; // make sure this file exists alongside HTML on the host
}

// builds the actual paystub content in the PDF
function buildPdfBody(doc, startY, data) {
  let y = startY;
  const {
    companyName,
    companyAddress,
    companyPhone,
    employeeName,
    employeeId,
    employeeAddress,
    employeePaypal,
    payDate,
    payPeriod,
    payFrequency,
    calc
  } = data;

  doc.setFontSize(10);
  doc.text(`Company: ${companyName}`, 14, y); y += 5;
  doc.text(`Address: ${companyAddress}`, 14, y); y += 5;
  doc.text(`Phone: ${companyPhone}`, 14, y); y += 8;

  doc.text(`Employee: ${employeeName}`, 14, y); y += 5;
  if (employeeId) { doc.text(`Employee ID (Last 4 SSN): ${employeeId}`, 14, y); y += 5; }
  if (employeeAddress) { doc.text(`Address: ${employeeAddress}`, 14, y); y += 5; }
  if (employeePaypal) { doc.text(`PayPal: ${employeePaypal}`, 14, y); y += 7; } else { y += 2; }

  doc.text(`Pay Date: ${payDate}`, 14, y);
  doc.text(`Pay Period: ${payPeriod}`, 90, y);
  doc.text(`Frequency: ${payFrequency}`, 160, y);
  y += 10;

  // Earnings
  doc.setFontSize(11);
  doc.text("Earnings", 14, y); y += 5;
  doc.setFontSize(10);
  doc.text(`Gross Pay: $${calc.gross.toFixed(2)}`, 14, y); y += 7;

  // Deductions
  doc.setFontSize(11);
  doc.text("Deductions", 14, y); y += 5;
  doc.setFontSize(10);
  doc.text(`Federal: $${calc.fedAmt.toFixed(2)}`, 14, y); y += 5;
  doc.text(`State (MO): $${calc.stateAmt.toFixed(2)}`, 14, y); y += 5;
  doc.text(`Social Security: $${calc.ssAmt.toFixed(2)}`, 14, y); y += 5;
  doc.text(`Medicare: $${calc.medicareAmt.toFixed(2)}`, 14, y); y += 5;
  if (calc.otherDeduction > 0) {
    doc.text(`Other: $${calc.otherDeduction.toFixed(2)}`, 14, y); y += 5;
  }
  doc.text(`Total Deductions: $${calc.totalDeductions.toFixed(2)}`, 14, y); y += 7;

  // Net
  doc.setFontSize(12);
  doc.text(`NET PAY: $${calc.netPay.toFixed(2)}`, 14, y); y += 10;

  // footer
  doc.setFontSize(9);
  doc.text("Generated by IDEATE FORWARD CONSULTING LLC", 14, y);

  // download
  doc.save(`paystub-${employeeName || "employee"}.pdf`);
}
