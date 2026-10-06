const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** R$ 25,00 */
export const formatBRL = (value: number | string | null | undefined) => BRL.format(Number(value ?? 0));
