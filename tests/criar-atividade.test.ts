// Assistente de criar atividade (Riff Pro): o que falta em cada passo, nome sugerido,
// repetir uma semana depois e o que vai para o banco.
import { describe, expect, it } from 'vitest';
import { dayPeriod, suggestActivityTitle } from '@riff/core/lib/activityTitle';
import { emptyValues, firstMissingStep, organizerPlays, stepMissing, toSessionInsert, valuesFromSession, type SessionValues } from '@/lib/sessionForm';
import type { Tables } from '@riff/core/supabase/types';

const NOW = '2026-10-16T10:00';
const full = (): SessionValues => ({
  ...emptyValues(),
  category_id: 'cat-1',
  date: '2026-10-17',
  start_time: '08:00',
  location_name: 'Parque da Redenção',
  title: 'Aula de Yoga · sábado de manhã',
});

describe('nome sugerido', () => {
  it('junta tipo, esporte, dia da semana e período', () => {
    expect(suggestActivityTitle({ kind: 'class', sport: 'Yoga', date: '2026-10-17', time: '08:00' })).toBe('Aula de Yoga · sábado de manhã');
    expect(suggestActivityTitle({ kind: 'match', sport: 'Futsal', date: '2026-10-15', time: '19:30' })).toBe('Jogo de Futsal · quinta-feira à noite');
    expect(suggestActivityTitle({ kind: 'event', sport: 'Corrida', date: '2026-10-18', time: '14:00' })).toBe('Corrida · domingo à tarde');
  });
  it('sem dia, só tipo e esporte; sem esporte, nada', () => {
    expect(suggestActivityTitle({ kind: 'tournament', sport: 'Vôlei' })).toBe('Campeonato de Vôlei');
    expect(suggestActivityTitle({ kind: 'class', sport: '  ' })).toBe('');
  });
  it('período do dia pelo horário de início', () => {
    expect(dayPeriod('11:59')).toBe('de manhã');
    expect(dayPeriod('12:00')).toBe('à tarde');
    expect(dayPeriod('18:00')).toBe('à noite');
  });
});

describe('o que falta em cada passo', () => {
  it('tudo preenchido: nada falta', () => {
    expect(firstMissingStep(full(), NOW)).toBeNull();
  });
  it('aponta o primeiro passo incompleto, na ordem do assistente', () => {
    expect(firstMissingStep({ ...full(), category_id: '' }, NOW)).toBe('sport');
    expect(firstMissingStep({ ...full(), start_time: '' }, NOW)).toBe('when');
    expect(firstMissingStep({ ...full(), location_name: '   ' }, NOW)).toBe('where');
    expect(firstMissingStep({ ...full(), title: '' }, NOW)).toBe('name');
  });
  it('não deixa marcar num horário que já passou (na edição, deixa)', () => {
    const past = { ...full(), date: '2026-10-16', start_time: '09:00' };
    expect(stepMissing('when', past, NOW)).toBe('Esse horário já passou. Escolha outro.');
    expect(stepMissing('when', past, NOW, { editing: true })).toBeNull();
  });
  it('vagas e preço', () => {
    expect(stepMissing('spots', { ...full(), max_participants: 0 }, NOW)).toBe('Informe quantas vagas a atividade tem.');
    expect(stepMissing('spots', { ...full(), price_per_slot: -1 }, NOW)).toBe('O preço não pode ser negativo.');
  });
});

describe('organizador que também joga', () => {
  it('padrão: joga em jogo e evento; não joga em aula e campeonato; a escolha da pessoa vale mais', () => {
    expect(organizerPlays({ ...full(), kind: 'match' })).toBe(true);
    expect(organizerPlays({ ...full(), kind: 'event' })).toBe(true);
    expect(organizerPlays({ ...full(), kind: 'class' })).toBe(false);
    expect(organizerPlays({ ...full(), kind: 'tournament' })).toBe(false);
    expect(organizerPlays({ ...full(), kind: 'match', organizer_plays: false })).toBe(false);
    expect(organizerPlays({ ...full(), kind: 'class', organizer_plays: true })).toBe(true);
  });
  it('não vai para a tabela de atividades (é uma reserva do organizador)', () => {
    expect('organizer_plays' in toSessionInsert({ ...full(), organizer_plays: true }, { editing: false, hadSportOther: false })).toBe(false);
  });
});

describe('repetir e salvar', () => {
  const session = {
    id: 's1', kind: 'match', category_id: 'cat-2', sport_other: 'Padbol', title: 'Racha', description: null, what_to_bring: 'Chuteira',
    cover_image_url: 'https://x/foto.jpg', date: '2026-10-29', start_time: '19:00:00', duration_minutes: 90, location_name: 'Arena',
    location_address: 'Rua A, 1', latitude: -30.03, longitude: -51.2, meeting_point: 'Portão 2', city: 'Porto Alegre', venue_id: 'v1',
    max_participants: 14, price_per_slot: 25, session_type: 'group', skill_level: null,
  } as unknown as Tables<'sessions'>;

  it('repetir: tudo igual, uma semana depois (virando o mês)', () => {
    const v = valuesFromSession(session, { nextWeek: true });
    expect(v.date).toBe('2026-11-05');
    expect(v.start_time).toBe('19:00');
    expect([v.latitude, v.longitude, v.meeting_point, v.what_to_bring, v.cover_image_url, v.sport_other, v.venue_id]).toEqual([
      -30.03, -51.2, 'Portão 2', 'Chuteira', 'https://x/foto.jpg', 'Padbol', 'v1',
    ]);
  });
  it('esporte livre só vai quando existe; na edição, limpa o que havia', () => {
    const v = { ...full(), sport_other: null };
    expect('sport_other' in toSessionInsert(v, { editing: false, hadSportOther: false })).toBe(false);
    expect(toSessionInsert(v, { editing: true, hadSportOther: true }).sport_other).toBeNull();
    expect(toSessionInsert({ ...v, sport_other: 'Padbol' }, { editing: false, hadSportOther: false }).sport_other).toBe('Padbol');
  });
  it('textos vazios vão como nulo e o nome sem espaços nas pontas', () => {
    const data = toSessionInsert({ ...full(), title: '  Treino  ', description: '  ', meeting_point: '' }, { editing: false, hadSportOther: false });
    expect([data.title, data.description, data.meeting_point]).toEqual(['Treino', null, null]);
  });
});
