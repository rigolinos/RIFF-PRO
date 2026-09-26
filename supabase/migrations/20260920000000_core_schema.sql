-- ============================================
-- 1. PROFILES (estende auth.users — dual role)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  state TEXT,                           
  
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('professional', 'student')),
  
  -- === Campos do Profissional ===
  professional_type TEXT
    CHECK (professional_type IN (
      'personal_trainer', 'physiotherapist', 'instructor',
      'coach', 'nutritionist', 'other'
    )),
  credential_type TEXT
    CHECK (credential_type IN ('CREF', 'CREFITO', 'CRM', 'CRN', null)),
  credential_number TEXT,
  credential_verified BOOLEAN DEFAULT false,
  specialties TEXT[],                   
  experience_years INTEGER,
  public_slug TEXT UNIQUE,              
  instagram_handle TEXT,                
  whatsapp_number TEXT,                 
  pix_key TEXT,                         
  pix_key_type TEXT                     
    CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random', null)),
  
  -- === Métricas ===
  rating_avg NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_sessions_given INTEGER DEFAULT 0,
  total_students_served INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  emoji TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. SESSIONS
-- ============================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL DEFAULT 'group'
    CHECK (session_type IN ('individual', 'group')),
  
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  
  location_name TEXT NOT NULL,
  location_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_type TEXT DEFAULT 'outdoor'
    CHECK (location_type IN ('park', 'beach', 'studio', 'gym', 
                              'condominium', 'online', 'outdoor', 'other')),
  
  max_participants INTEGER DEFAULT 1 CHECK (max_participants >= 1),
  current_participants INTEGER DEFAULT 0,
  price_per_slot NUMERIC(10,2) NOT NULL CHECK (price_per_slot >= 0),
  
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'full', 'cancelled', 'completed', 'draft')),
  
  cover_image_url TEXT,
  what_to_bring TEXT,
  skill_level TEXT DEFAULT 'all'
    CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all')),
  
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  parent_session_id UUID REFERENCES sessions(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. BOOKINGS
-- ============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES profiles(id) NOT NULL,
  
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled_by_student', 
                       'cancelled_by_pro', 'completed', 'no_show')),
  
  amount_total NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0,
  professional_payout NUMERIC(10,2),
  payment_method TEXT DEFAULT 'pix'
    CHECK (payment_method IN ('pix', 'credit_card', 'free')),
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'free')),
  payment_confirmed_at TIMESTAMPTZ,
  
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(session_id, student_id)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. REVIEWS
-- ============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  session_id UUID REFERENCES sessions(id) NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  professional_id UUID REFERENCES profiles(id) NOT NULL,
  
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('new_booking', 'booking_cancelled', 'review_received',
                     'session_reminder', 'session_full', 'payout_received',
                     'welcome', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. FAVORITES
-- ============================================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, professional_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_status_date ON sessions(status, date);
CREATE INDEX idx_sessions_category ON sessions(category_id);
CREATE INDEX idx_sessions_professional ON sessions(professional_id);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_professional ON bookings(professional_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ============================================
-- RPC / FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION create_booking(
  p_session_id UUID,
  p_student_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_student_profile_id UUID;
  v_session RECORD;
  v_booking_id UUID;
BEGIN
  SELECT id INTO v_student_profile_id FROM profiles WHERE user_id = p_student_user_id;
  IF v_student_profile_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Perfil não encontrado'); END IF;
  
  SELECT * INTO v_session FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Aula não encontrada'); END IF;
  IF v_session.status != 'active' THEN RETURN jsonb_build_object('success', false, 'message', 'Aula não está disponível'); END IF;
  IF v_session.current_participants >= v_session.max_participants THEN RETURN jsonb_build_object('success', false, 'message', 'Aula lotada'); END IF;
  IF EXISTS (SELECT 1 FROM bookings WHERE session_id = p_session_id AND student_id = v_student_profile_id AND status NOT IN ('cancelled_by_student', 'cancelled_by_pro')) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você já reservou esta aula');
  END IF;
  IF v_session.professional_id = v_student_profile_id THEN RETURN jsonb_build_object('success', false, 'message', 'Você não pode reservar sua própria aula'); END IF;
  
  INSERT INTO bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status) 
  VALUES (p_session_id, v_student_profile_id, v_session.professional_id, v_session.price_per_slot, v_session.price_per_slot, CASE WHEN v_session.price_per_slot = 0 THEN 'free' ELSE 'pending' END, 'pending')
  RETURNING id INTO v_booking_id;
  
  UPDATE sessions SET current_participants = current_participants + 1, status = CASE WHEN current_participants + 1 >= max_participants THEN 'full' ELSE 'active' END WHERE id = p_session_id;
  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id, 'message', 'Reserva confirmada!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_professional_dashboard(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE v_profile_id UUID; v_result JSONB;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  SELECT jsonb_build_object(
    'total_sessions', (SELECT COUNT(*) FROM sessions WHERE professional_id = v_profile_id),
    'active_sessions', (SELECT COUNT(*) FROM sessions WHERE professional_id = v_profile_id AND status = 'active'),
    'total_bookings', (SELECT COUNT(*) FROM bookings WHERE professional_id = v_profile_id AND status IN ('confirmed', 'pending')),
    'total_completed', (SELECT COUNT(*) FROM bookings WHERE professional_id = v_profile_id AND status = 'completed'),
    'total_revenue', (SELECT COALESCE(SUM(amount_total), 0) FROM bookings WHERE professional_id = v_profile_id AND payment_status = 'paid'),
    'avg_rating', (SELECT rating_avg FROM profiles WHERE id = v_profile_id),
    'unique_students', (SELECT COUNT(DISTINCT student_id) FROM bookings WHERE professional_id = v_profile_id AND status IN ('confirmed', 'completed'))
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_professional_rating(pro_id UUID)
RETURNS NUMERIC AS $$
DECLARE avg_rating NUMERIC;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating FROM reviews WHERE professional_id = pro_id;
  UPDATE profiles SET rating_avg = avg_rating, total_reviews = (SELECT COUNT(*) FROM reviews WHERE professional_id = pro_id) WHERE id = pro_id;
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS PARA AUTH.USERS -> PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executa após signup no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
