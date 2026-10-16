export function buildWhatsAppUrl(params: {
  phone: string;
  studentName: string;
  proName?: string;
  sessionTitle: string;
  sessionTime: string;
}) {
  // Limpa tudo que não for número no telefone
  const cleanPhone = params.phone.replace(/\D/g, '');
  
  // Adiciona o DDI do Brasil se não tiver
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const greeting = params.proName ? `Fala ${params.proName}!` : 'Fala!';
  const message = `${greeting} Acabei de reservar minha vaga na atividade de *${params.sessionTitle}* das *${params.sessionTime}*. Segue o comprovante do Pix! 🏋️✅`;
  
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${finalPhone}?text=${encoded}`;
}

/** Celular em formato internacional para o wa.me (DDI 55 do Brasil se faltar) */
export const waPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

/** Aviso de "já fiz o Pix" para quem organiza, com o que ele precisa para achar o pagamento */
export function paymentNoticeUrl(p: { phone: string; studentName: string; proName?: string | null; title: string; when: string; amount: string }) {
  const greeting = p.proName ? `Oi, ${p.proName}!` : 'Oi!';
  const message = `${greeting} Aqui é ${p.studentName}. Fiz o Pix de ${p.amount} da minha reserva em "${p.title}" (${p.when}). Segue o comprovante.`;
  return `https://wa.me/${waPhone(p.phone)}?text=${encodeURIComponent(message)}`;
}
