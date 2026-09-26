INSERT INTO categories (name, slug, emoji, icon, sort_order) VALUES
  -- Fitness & Treino
  ('Funcional', 'funcional', '🏋️', 'dumbbell', 1),
  ('Musculação', 'musculacao', '💪', 'biceps-flexed', 2),
  ('CrossFit', 'crossfit', '🔥', 'flame', 3),
  ('HIIT', 'hiit', '⚡', 'zap', 4),
  ('Calistenia', 'calistenia', '🤸', 'person-standing', 5),
  
  -- Bem-Estar & Corpo-Mente
  ('Yoga', 'yoga', '🧘', 'heart', 10),
  ('Pilates', 'pilates', '🧘‍♀️', 'stretch-horizontal', 11),
  ('Meditação', 'meditacao', '🧠', 'brain', 12),
  ('Alongamento', 'alongamento', '🤸‍♀️', 'move', 13),
  
  -- Esportes de Praia/Ar Livre
  ('Beach Tennis', 'beach-tennis', '🎾', 'trophy', 20),
  ('Futevôlei', 'futevolei', '🏐', 'circle-dot', 21),
  ('Vôlei de Praia', 'volei-praia', '🏐', 'circle', 22),
  ('Surf', 'surf', '🏄', 'waves', 23),
  ('Stand Up Paddle', 'sup', '🏄‍♀️', 'sailboat', 24),
  
  -- Esportes Tradicionais
  ('Futebol', 'futebol', '⚽', 'circle-dot', 30),
  ('Tênis', 'tenis', '🎾', 'trophy', 31),
  ('Corrida', 'corrida', '🏃', 'footprints', 32),
  ('Natação', 'natacao', '🏊', 'waves', 33),
  ('Ciclismo', 'ciclismo', '🚴', 'bike', 34),
  
  -- Lutas & Artes Marciais
  ('Boxe', 'boxe', '🥊', 'swords', 40),
  ('Muay Thai', 'muay-thai', '🥋', 'shield', 41),
  ('Jiu-Jitsu', 'jiu-jitsu', '🥋', 'shield-check', 42),
  
  -- Reabilitação & Saúde
  ('Fisioterapia Esportiva', 'fisioterapia-esportiva', '🏥', 'stethoscope', 50),
  ('Reabilitação Postural', 'reabilitacao-postural', '🦴', 'bone', 51),
  ('RPG', 'rpg-fisio', '💆', 'hand', 52)
ON CONFLICT (slug) DO NOTHING;
