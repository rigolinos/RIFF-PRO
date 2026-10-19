// Criar evento no Riff Clubes: o que falta em cada passo e o convite para o grupo.
import { describe, expect, it } from 'vitest';
import { emptyEvent, eventInvite, eventOrganizerPlays, eventStepMissing, firstEventMissing, type EventValues } from '../apps/clubes/src/lib/eventForm';

const NOW = '2026-10-16T10:00';
const full = (): EventValues => ({
  ...emptyEvent('match'),
  category_id: 'cat-1',
  date: '2026-10-17',
  time: '09:00',
  place: 'Quadra',
  minors_allowed: false,
  title: 'Jogo de Futsal · sábado de manhã',
});

describe('criar evento no Clubes', () => {
  it('morador começa em Jogo (90 min); instrutor em Aula (60 min)', () => {
    expect([emptyEvent('match').kind, emptyEvent('match').duration]).toEqual(['match', 90]);
    expect([emptyEvent('class').kind, emptyEvent('class').duration]).toEqual(['class', 60]);
  });
  it('tudo preenchido: nada falta', () => {
    expect(firstEventMissing(full(), NOW)).toBeNull();
  });
  it('menores é pergunta obrigatória: sem resposta, não segue', () => {
    expect(eventStepMissing('spots', { ...full(), minors_allowed: null }, NOW)).toBe('Responda se crianças e adolescentes podem participar.');
  });
  it('idade mínima de 0 a 17, só quando aceita menores', () => {
    expect(eventStepMissing('spots', { ...full(), minors_allowed: true, min_age: '18' }, NOW)).toBe('A idade mínima vai de 0 a 17 anos.');
    expect(eventStepMissing('spots', { ...full(), minors_allowed: true, min_age: '8' }, NOW)).toBeNull();
    expect(eventStepMissing('spots', { ...full(), minors_allowed: true, min_age: '' }, NOW)).toBeNull();
  });
  it('não marca no passado e aponta o primeiro passo incompleto', () => {
    expect(eventStepMissing('when', { ...full(), date: '2026-10-16', time: '08:00' }, NOW)).toBe('Esse horário já passou. Escolha outro.');
    expect(firstEventMissing({ ...full(), place: '  ' }, NOW)).toBe('where');
  });
  it('quem cria joga por padrão em jogo, não em aula', () => {
    expect(eventOrganizerPlays(full())).toBe(true);
    expect(eventOrganizerPlays({ ...full(), kind: 'class' })).toBe(false);
    expect(eventOrganizerPlays({ ...full(), organizer_plays: false })).toBe(false);
  });
  it('convite para o grupo do WhatsApp', () => {
    expect(eventInvite({ title: 'Racha', when: 'sábado, 17 de out às 09:00', place: 'Quadra', community: 'Condomínio Jardim', url: 'https://x/atividade/1' })).toBe(
      'Bora? "Racha" no Condomínio Jardim: sábado, 17 de out às 09:00, Quadra. Inscreva-se pelo Riff Clubes: https://x/atividade/1',
    );
  });
});
