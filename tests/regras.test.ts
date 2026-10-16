// Regras do front que espelham regras do banco ou protegem o caminho do usuário.
// Rodar: npm test
import { describe, expect, it } from 'vitest';
import { isAdult, maskPhone, maskTaxId, taxIdKind } from '@riff/core/lib/taxId';
import { passwordProblem } from '@riff/core/lib/password';
import { safeRedirect } from '@riff/core/auth/redirect';
import { activityPhase } from '@riff/core/lib/activityTime';
import { plainText, sportExactMatch, sportMatches } from '@riff/core/lib/sportSearch';
import { googleMapsUrl, hasCoordinates, wazeUrl } from '@riff/core/lib/geo';
import { moderationError, REPORT_REASONS } from '@riff/core/lib/moderation';
import { activityInvite } from '@/lib/share';
import { googleCalendarUrl } from '@riff/core/lib/calendar';
import { paymentNoticeUrl, waPhone } from '@/lib/whatsapp';
import { bookingCode } from '@/lib/ticket';
import { formatInviteCode, inviteLink, isInviteCode, normalizeInviteCode } from '../apps/clubes/src/lib/invite';

describe('convite do Clubes por link', () => {
  it('aceita o código com ou sem hífen, em minúsculas ou com espaços', () => {
    expect(normalizeInviteCode('abcd1234')).toBe('ABCD-1234');
    expect(normalizeInviteCode(' ab cd-12 34 ')).toBe('ABCD-1234');
    expect(isInviteCode('abcd-1234')).toBe(true);
    expect(isInviteCode('abc-123')).toBe(false);
    expect(formatInviteCode('ABCD1234')).toBe('ABCD-1234');
  });
  it('link do convite com o código no formato certo', () => {
    expect(inviteLink('abcd1234', 'https://riff-pro-clubes.vercel.app')).toBe('https://riff-pro-clubes.vercel.app/convite/ABCD-1234');
  });
});

describe('código da reserva no ingresso', () => {
  it('6 caracteres do id, em maiúsculas, com #', () => {
    expect(bookingCode('3f9a2c10-77aa-4b1c-9d2e-000000000001')).toBe('#3F9A2C');
  });
});

describe('aviso de Pix no WhatsApp', () => {
  it('celular com DDI do Brasil, sem duplicar', () => {
    expect(waPhone('(51) 99999-8888')).toBe('5551999998888');
    expect(waPhone('+55 51 99999-8888')).toBe('5551999998888');
  });
  it('mensagem com valor, atividade e dia, para quem organiza achar o pagamento', () => {
    const url = new URL(paymentNoticeUrl({ phone: '51999998888', studentName: 'Ana', proName: 'Bruno', title: 'Treino', when: 'sáb, 17 de out às 08:00', amount: 'R$ 30,00' }));
    expect(url.pathname).toBe('/5551999998888');
    expect(url.searchParams.get('text')).toBe('Oi, Bruno! Aqui é Ana. Fiz o Pix de R$ 30,00 da minha reserva em "Treino" (sáb, 17 de out às 08:00). Segue o comprovante.');
  });
});

describe('adicionar ao Google Agenda', () => {
  it('leva dia, horário de início e fim no fuso de Brasília', () => {
    const url = new URL(googleCalendarUrl({ title: 'Treino', date: '2026-10-13', start_time: '18:00:00', duration_minutes: 90, location: 'Orla' }));
    expect(url.searchParams.get('dates')).toBe('20261013T180000/20261013T193000');
    expect(url.searchParams.get('ctz')).toBe('America/Sao_Paulo');
    expect(url.searchParams.get('text')).toBe('Treino');
    expect(url.searchParams.get('location')).toBe('Orla');
  });
  it('atividade que vira a meia-noite e duração padrão de 60 min', () => {
    expect(new URL(googleCalendarUrl({ title: 'X', date: '2026-10-13', start_time: '23:30', duration_minutes: 60 })).searchParams.get('dates')).toBe(
      '20261013T233000/20261014T003000',
    );
    expect(new URL(googleCalendarUrl({ title: 'X', date: '2026-10-13', start_time: '08:00' })).searchParams.get('dates')).toBe('20261013T080000/20261013T090000');
  });
});

describe('CPF e CNPJ (porta de organizador)', () => {
  it('aceita CPF e CNPJ válidos, com ou sem máscara', () => {
    expect(taxIdKind('529.982.247-25')).toBe('cpf');
    expect(taxIdKind('52998224725')).toBe('cpf');
    expect(taxIdKind('11.222.333/0001-81')).toBe('cnpj');
  });
  it('recusa dígito verificador errado, números repetidos e tamanho errado', () => {
    expect(taxIdKind('529.982.247-26')).toBeNull();
    expect(taxIdKind('111.111.111-11')).toBeNull();
    expect(taxIdKind('11.222.333/0001-80')).toBeNull();
    expect(taxIdKind('1234')).toBeNull();
    expect(taxIdKind('')).toBeNull();
  });
  it('máscaras enquanto digita', () => {
    expect(maskTaxId('52998224725')).toBe('529.982.247-25');
    expect(maskTaxId('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskPhone('51999998888')).toBe('(51) 99999-8888');
    expect(maskPhone('5133334444')).toBe('(51) 3333-4444');
  });
  it('18 anos: vale no dia do aniversário, não na véspera', () => {
    expect(isAdult('2008-10-10', '2026-10-10')).toBe(true);
    expect(isAdult('2008-10-11', '2026-10-10')).toBe(false);
    expect(isAdult('1899-01-01', '2026-10-10')).toBe(false);
    expect(isAdult('10/10/2000', '2026-10-10')).toBe(false);
  });
});

describe('senha', () => {
  it('8 caracteres, com letra e número', () => {
    expect(passwordProblem('abc123')).toBe('Faltam 2 caracteres');
    expect(passwordProblem('abcdefgh')).toBe('Inclua pelo menos um número');
    expect(passwordProblem('12345678')).toBe('Inclua pelo menos uma letra');
    expect(passwordProblem('abcd1234')).toBeNull();
  });
});

describe('voltar depois do login', () => {
  it('só aceita tela do próprio app', () => {
    expect(safeRedirect('/session/abc', '/feed')).toBe('/session/abc');
    expect(safeRedirect('//evil.example', '/feed')).toBe('/feed');
    expect(safeRedirect('https://evil.example', '/feed')).toBe('/feed');
    expect(safeRedirect(null, '/feed')).toBe('/feed');
  });
});

describe('situação da atividade (mesma regra do create_booking)', () => {
  const a = { date: '2026-10-13', start_time: '18:00:00', duration_minutes: 60, status: 'active' };
  it('aberta antes do início, acontecendo durante, encerrada depois', () => {
    expect(activityPhase(a, '2026-10-13T17:59')).toBe('open');
    expect(activityPhase(a, '2026-10-13T18:00')).toBe('live');
    expect(activityPhase(a, '2026-10-13T18:59')).toBe('live');
    expect(activityPhase(a, '2026-10-13T19:00')).toBe('ended');
  });
  it('lotada continua aberta; cancelada e concluída não', () => {
    expect(activityPhase({ ...a, status: 'full' }, '2026-10-13T10:00')).toBe('open');
    expect(activityPhase({ ...a, status: 'cancelled' }, '2026-10-13T10:00')).toBe('cancelled');
    expect(activityPhase({ ...a, status: 'completed' }, '2026-10-13T10:00')).toBe('ended');
  });
  it('atividade que vira a meia-noite e duração padrão de 60 min', () => {
    const late = { date: '2026-10-13', start_time: '23:30', duration_minutes: 90 };
    expect(activityPhase(late, '2026-10-14T00:30')).toBe('live');
    expect(activityPhase(late, '2026-10-14T01:00')).toBe('ended');
    expect(activityPhase({ date: '2026-10-13', start_time: '08:00', duration_minutes: null }, '2026-10-13T08:59')).toBe('live');
  });
});

describe('busca de esporte', () => {
  const tenis = { name: 'Tênis', slug: 'tenis' };
  const jiu = { name: 'Jiu-Jitsu', slug: 'jiu-jitsu' };
  it('acha por nome sem acento, apelido e grafia em inglês', () => {
    expect(plainText('  TÊNIS   de Mesa ')).toBe('tenis de mesa');
    expect(sportMatches(tenis, 'tennis')).toBe(true);
    expect(sportMatches(tenis, 'tenis')).toBe(true);
    expect(sportMatches(jiu, 'bjj')).toBe(true);
    expect(sportMatches(jiu, 'jiu jitsu')).toBe(true);
    expect(sportMatches(tenis, 'hoquei')).toBe(false);
    expect(sportMatches(tenis, '')).toBe(true);
  });
  it('apelido exato não vira esporte novo', () => {
    expect(sportExactMatch(tenis, 'Tennis')).toBe(true);
    expect(sportExactMatch(tenis, 'ten')).toBe(false);
    expect(sportExactMatch(tenis, '')).toBe(false);
  });
});

describe('como chegar', () => {
  it('usa a coordenada quando existe', () => {
    const p = { latitude: -30.03, longitude: '-51.23', name: 'Orla', address: 'Av. X' };
    expect(hasCoordinates(p)).toBe(true);
    expect(googleMapsUrl(p)).toBe('https://www.google.com/maps/dir/?api=1&destination=-30.03,-51.23');
    expect(wazeUrl(p)).toBe('https://waze.com/ul?ll=-30.03,-51.23&navigate=yes');
  });
  it('sem coordenada, usa o texto do endereço', () => {
    const p = { latitude: null, longitude: null, name: 'Orla do Guaíba', address: 'Av. X, 10' };
    expect(hasCoordinates(p)).toBe(false);
    expect(googleMapsUrl(p)).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Orla do Guaíba, Av. X, 10')}`);
    expect(wazeUrl(p)).toContain('q=Orla%20do%20Gua%C3%ADba');
  });
});

describe('convite da atividade', () => {
  const a = { id: 'x', title: 'Treino de Futevôlei', date: '2026-10-13', start_time: '18:00:00', location_name: 'Orla do Guaíba' };
  it('quem organiza convida', () => {
    expect(activityInvite(a, { isOwner: true })).toBe(
      'Estou organizando "Treino de Futevôlei" pela Riff Sports. Terça-feira, 13 de outubro, às 18:00, Orla do Guaíba. Quer participar?',
    );
  });
  it('quem participa chama os amigos, com o nome de quem organiza', () => {
    expect(activityInvite(a, { isOwner: false, organizerFirstName: 'Bruno' })).toBe(
      '"Treino de Futevôlei", com Bruno, pela Riff Sports. Terça-feira, 13 de outubro, às 18:00, Orla do Guaíba. Quer participar?',
    );
  });
  it('sem local, a frase continua certa', () => {
    expect(activityInvite({ ...a, location_name: null }, { isOwner: true })).toContain('Terça-feira, 13 de outubro, às 18:00. Quer');
  });
});

describe('denunciar e bloquear', () => {
  it('os motivos são os aceitos pelo banco (report_content)', () => {
    expect(REPORT_REASONS.map((r) => r.value).sort()).toEqual(['fraud', 'harassment', 'minor', 'offensive', 'other', 'safety', 'spam']);
  });
  it('traduz o erro do banco e usa a mensagem padrão no resto', () => {
    expect(moderationError({ message: 'too_many' }, 'padrão')).toBe('Você chegou ao limite por hoje. Tente de novo amanhã.');
    expect(moderationError(new Error('own_content'), 'padrão')).toBe('Este conteúdo é seu.');
    expect(moderationError({ message: 'network down' }, 'padrão')).toBe('padrão');
    expect(moderationError(null, 'padrão')).toBe('padrão');
  });
});
