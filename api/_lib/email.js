import { Resend } from 'resend';

const euros = (cents) => `${Math.round(cents / 100)} €`;

// Envoie le bon cadeau (PDF en pièce jointe) à l'acheteur,
// et une copie à l'entreprise si BUSINESS_EMAIL est défini.
export async function sendVoucherEmail({ to, recipientName, flightName, code, amount, pdf }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FROM_EMAIL || 'Tignes Parapente <onboarding@resend.dev>';
  const attachments = [{ filename: `bon-cadeau-${code}.pdf`, content: pdf.toString('base64') }];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#16293B">
      <div style="background:#0B1B2B;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0">
        <strong style="font-size:18px;font-style:italic;text-transform:uppercase">Tignes Parapente</strong>
      </div>
      <div style="border:1px solid #D7E9F5;border-top:0;border-radius:0 0 14px 14px;padding:24px">
        <h1 style="font-size:22px;margin:0 0 12px">Votre bon cadeau est prêt 🪂</h1>
        <p>Merci pour votre achat ! Voici votre bon cadeau pour un <strong>${flightName}</strong>${
          recipientName ? `, pour <strong>${recipientName}</strong>` : ''
        }.</p>
        <p style="background:#F2F9FE;border:1px dashed #BAE6FD;border-radius:10px;padding:14px;text-align:center">
          Numéro du bon : <strong style="color:#E8402C;font-size:18px">${code}</strong><br>
          <span style="color:#4A6075;font-size:13px">Valeur : ${euros(amount)}</span>
        </p>
        <p>Le bon (avec son QR code) est <strong>en pièce jointe</strong>, prêt à imprimer ou à transférer.</p>
        <p>Pour réserver le vol, il suffit d'appeler le <strong>+33 6 60 99 68 08</strong> avec ce numéro de bon.</p>
        <p style="color:#4A6075;font-size:13px;margin-top:24px">À très vite dans le ciel de Tignes !<br>L'équipe Tignes Parapente</p>
      </div>
    </div>`;

  // Email à l'acheteur (critique : une erreur ici est propagée pour être tracée).
  const sent = await resend.emails.send({
    from,
    to,
    subject: `Votre bon cadeau Tignes Parapente — ${flightName}`,
    html,
    attachments,
  });
  if (sent && sent.error) {
    throw new Error(sent.error.message || JSON.stringify(sent.error));
  }

  // Copie à l'entreprise (best-effort : ne bloque jamais le circuit).
  const biz = process.env.BUSINESS_EMAIL;
  if (biz) {
    try {
      await resend.emails.send({
        from,
        to: biz,
        subject: `Nouveau bon vendu — ${code} (${flightName})`,
        html: `<p>Nouveau bon cadeau vendu.</p>
               <ul>
                 <li>Code : <strong>${code}</strong></li>
                 <li>Vol : ${flightName}</li>
                 <li>Bénéficiaire : ${recipientName || '—'}</li>
                 <li>Acheteur : ${to}</li>
                 <li>Montant : ${euros(amount)}</li>
               </ul>`,
        attachments,
      });
    } catch (e) {
      console.error('Copie entreprise non envoyée:', e?.message || e);
    }
  }
}
