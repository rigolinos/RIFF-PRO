/** XXXXXXXX → XXXX-XXXX (o join_organization aceita com ou sem hífen). */
export const formatInviteCode = (code: string) => {
  const raw = code.replace(/-/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : code;
};
