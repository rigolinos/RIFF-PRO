/** Código curto da reserva, para a pessoa dizer ou mostrar na chegada (ex.: "#3F9A2C") */
export const bookingCode = (bookingId: string) => `#${bookingId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

/** Como o organizador acha a pessoa na lista: o nome e o código da reserva */
export const TICKET_HINT = 'Na chegada, diga seu nome a quem organiza: ele confirma a presença na lista de inscritos.';
