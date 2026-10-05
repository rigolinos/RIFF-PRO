/** "+2 crianças": menores só entram na contagem, nunca pelo nome */
export const kidsLabel = (n: number) => (n ? `+${n} criança${n > 1 ? 's' : ''}` : '');
