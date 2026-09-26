-- ==========================================
-- PROFILES RLS
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- SESSIONS RLS
-- ==========================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_sessions_read" ON sessions FOR SELECT USING (status IN ('active', 'full'));
CREATE POLICY "pro_own_sessions_read" ON sessions FOR SELECT USING (
  professional_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "pro_sessions_write" ON sessions FOR ALL USING (
  professional_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- BOOKINGS RLS
-- ==========================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_own_bookings" ON bookings FOR SELECT USING (
  student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "pro_session_bookings" ON bookings FOR SELECT USING (
  professional_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "student_create_booking" ON bookings FOR INSERT WITH CHECK (
  student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "student_cancel_booking" ON bookings FOR UPDATE USING (
  student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- REVIEWS RLS
-- ==========================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "student_create_review" ON reviews FOR INSERT WITH CHECK (
  reviewer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- NOTIFICATIONS RLS
-- ==========================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- FAVORITES RLS
-- ==========================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_favorites" ON favorites FOR ALL USING (
  student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- CATEGORIES RLS
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_categories_read" ON categories FOR SELECT USING (true);
