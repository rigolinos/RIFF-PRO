import { createContext, useContext } from 'react';

/**
 * Qual app está rodando: define quais documentos legais cada pessoa precisa
 * aceitar. O Riff Pro usa o padrão ('pro'); o Riff Clubes envolve o app com
 * <LegalProductContext.Provider value="clubes">.
 */
export type LegalProduct = 'pro' | 'clubes';

export const LegalProductContext = createContext<LegalProduct>('pro');

export const useLegalProduct = () => useContext(LegalProductContext);
