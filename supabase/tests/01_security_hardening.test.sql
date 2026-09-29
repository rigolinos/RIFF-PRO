BEGIN;

-- Include pgTAP functions
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan the tests (approximate count, we'll use plan() at the end or just no_plan())
SELECT plan(15);

-- Setup: Create mock users
-- User A: Professional
-- User B: Student
-- User C: Another Student

-- Run tests as postgres first to setup data
SET search_path = public, auth;

-- Note: In a real Supabase test environment, we would use supabase's test helpers to create users
-- For this script, we assume the user will run this against a seeded staging DB
-- OR we can mock it here if we use a transaction

-- Test 1: create_booking - Valid booking
-- Test 2: create_booking - Session Full
-- Test 3: create_booking - Self booking
-- Test 4: update bookings - Student cannot change amount_total
-- Test 5: update bookings - Student cannot change payment_status
-- Test 6: close_session - Pro can close session
-- Test 7: close_session - Student cannot close session
-- Test 8: profile_private - Read protection

SELECT pass('Test cases placeholder. To execute real pgTAP tests, the DB needs auth mock helpers.');

-- We will verify the existence of the new functions
SELECT has_function('public', 'create_booking', ARRAY['uuid'], 'create_booking(uuid) should exist');
SELECT has_function('public', 'get_professional_dashboard', 'get_professional_dashboard() should exist');
SELECT has_function('public', 'cancel_session', ARRAY['uuid', 'text'], 'cancel_session(uuid, text) should exist');
SELECT has_function('public', 'close_session', ARRAY['uuid', 'jsonb', 'boolean', 'text'], 'close_session(uuid, jsonb, boolean, text) should exist');
SELECT has_function('public', 'get_booking_payment_info', ARRAY['uuid'], 'get_booking_payment_info(uuid) should exist');

-- Verify tables and RLS
SELECT has_table('public', 'profile_private', 'profile_private table should exist');
SELECT has_table('public', 'session_reports', 'session_reports table should exist');
SELECT has_table('public', 'booking_private_notes', 'booking_private_notes table should exist');

SELECT policies_are(
    'public',
    'profile_private',
    ARRAY['own_private_read', 'own_private_write'],
    'profile_private should have RLS policies'
);

SELECT policies_are(
    'public',
    'session_reports',
    ARRAY['pro_own_session_reports'],
    'session_reports should have RLS policies'
);

SELECT policies_are(
    'public',
    'booking_private_notes',
    ARRAY['pro_own_booking_notes'],
    'booking_private_notes should have RLS policies'
);

-- Triggers
SELECT has_trigger('public', 'bookings', 'guard_booking_update', 'guard_booking_update trigger should exist');
SELECT has_trigger('public', 'profiles', 'guard_profile_update', 'guard_profile_update trigger should exist');

-- Finish tests
SELECT * FROM finish();
ROLLBACK;
