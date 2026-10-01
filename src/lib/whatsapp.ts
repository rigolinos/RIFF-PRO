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
