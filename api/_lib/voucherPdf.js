import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const NAVY = '#0B1B2B';
const SNOW = '#F2F9FE';
const RED = '#E8402C';
const SUN = '#FFC53D';
const TEXT = '#16293B';
const SOFT = '#4A6075';

const euros = (cents) => `${Math.round(cents / 100)} €`;

// Génère le PDF du bon cadeau (format carte A5 paysage) et renvoie un Buffer.
export async function buildVoucherPdf({ code, flightName, recipientName, message, amount, verifyUrl }) {
  const qrPng = await QRCode.toBuffer(verifyUrl, {
    margin: 1,
    width: 320,
    color: { dark: NAVY, light: '#FFFFFF' },
  });

  const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 0 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  const W = doc.page.width;
  const H = doc.page.height;
  const PAD = 34;

  // Fond
  doc.rect(0, 0, W, H).fill(SNOW);

  // Bandeau d'en-tête
  doc.rect(0, 0, W, 64).fill(NAVY);
  doc.fill('#FFFFFF').font('Helvetica-BoldOblique').fontSize(19).text('TIGNES PARAPENTE', PAD, 22);
  doc.fill(SUN).font('Helvetica-Bold').fontSize(11)
    .text('BON CADEAU', W - 180, 26, { width: 180 - PAD, align: 'right' });

  // Liseré rouge sous l'en-tête
  doc.rect(0, 64, W, 5).fill(RED);

  // Corps
  let y = 92;
  doc.fill(SOFT).font('Helvetica').fontSize(10).text('Bon pour un baptême de parapente biplace', PAD, y);
  y += 18;
  doc.fill(NAVY).font('Helvetica-Bold').fontSize(26).text(flightName, PAD, y, { width: W - 200 });
  y += 40;

  if (recipientName) {
    doc.fill(TEXT).font('Helvetica-Bold').fontSize(13).text('Pour : ', PAD, y, { continued: true })
      .font('Helvetica').text(recipientName);
    y += 22;
  }
  if (message) {
    doc.fill(SOFT).font('Helvetica-Oblique').fontSize(11)
      .text(`« ${message} »`, PAD, y, { width: W - 210 });
    y = doc.y + 8;
  }

  // Valeur + code (en bas à gauche)
  doc.fill(TEXT).font('Helvetica').fontSize(11).text(`Valeur : ${euros(amount)}`, PAD, H - 96);
  doc.fill(RED).font('Helvetica-Bold').fontSize(17).text(code, PAD, H - 78);
  doc.fill(SOFT).font('Helvetica').fontSize(8)
    .text(
      "Présentez ce bon (QR code) le jour du vol. Valable selon conditions météo. " +
      "Réservation : +33 6 60 99 68 08 — tignes-parapente.com",
      PAD, H - 52, { width: W - 200 }
    );

  // QR code (en bas à droite)
  const qrSize = 116;
  doc.image(qrPng, W - PAD - qrSize, H - PAD - qrSize, { width: qrSize });
  doc.fill(SOFT).font('Helvetica').fontSize(7)
    .text('Scannez pour vérifier', W - PAD - qrSize, H - PAD + 2, { width: qrSize, align: 'center' });

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
