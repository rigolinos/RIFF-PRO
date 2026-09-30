import re

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

patch('src/pages/CreateSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)")
])

patch('src/pages/DashboardPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("(data?.metrics as any)", "(data?.metrics as Record<string, number | string>)"),
    ("todaySessions.map((session: any)", "todaySessions.map((session: SessionWithJoins)")
])

patch('src/pages/Earnings.tsx', [
    ("import { ArrowUpRight", "import type { Tables } from '@/integrations/supabase/types';\nimport { ArrowUpRight"),
    ("transactions?.forEach((t: any)", "transactions?.forEach((t: Tables<'wallet_transactions'>)"),
    ("transactions.map((t: any)", "transactions.map((t: Tables<'wallet_transactions'>)")
])

patch('src/pages/EditSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)")
])

patch('src/pages/Feed.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("sessions: any[]", "sessions: SessionWithJoins[]"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)")
])

patch('src/pages/MyBookings.tsx', [
    ("import { Badge }", "import type { BookingWithJoins } from '@/types/session';\nimport { Badge }"),
    ("useState<any>(null)", "useState<BookingWithJoins | null>(null)"),
    ("const up: any[] =", "const up: BookingWithJoins[] ="),
    ("const hist: any[] =", "const hist: BookingWithJoins[] ="),
    ("handleWhatsApp = async (booking: any)", "handleWhatsApp = async (booking: BookingWithJoins)"),
    ("handleOpenMap = (booking: any)", "handleOpenMap = (booking: BookingWithJoins)"),
    ("handleCancel = async (booking: any)", "handleCancel = async (booking: BookingWithJoins)"),
    ("renderBookingCard = (booking: any,", "renderBookingCard = (booking: BookingWithJoins,")
])

patch('src/pages/MySessionsPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins, BookingWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("_openAttendanceSheet = (session: any)", "_openAttendanceSheet = (session: SessionWithJoins)"),
    ("filter((b: any)", "filter((b: BookingWithJoins)"),
    ("forEach((b: any)", "forEach((b: BookingWithJoins)"),
    ("handleCancelSession = async (session: any)", "handleCancelSession = async (session: SessionWithJoins)"),
    ("handleCloseRegistrations = async (session: any)", "handleCloseRegistrations = async (session: SessionWithJoins)"),
    ("handleDuplicateSession = async (session: any)", "handleDuplicateSession = async (session: SessionWithJoins)"),
    ("isPast = (s: any)", "isPast = (s: SessionWithJoins)"),
    ("isCancelled = (s: any)", "isCancelled = (s: SessionWithJoins)"),
    ("isCompleted = (s: any)", "isCompleted = (s: SessionWithJoins)"),
    ("map((booking: any)", "map((booking: BookingWithJoins)")
])

patch('src/pages/ProfessionalProfile.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport type { Tables } from '@/integrations/supabase/types';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)"),
    ("sessions.find((s: any)", "sessions.find((s: SessionWithJoins)"),
    ("sessions.map((session: any)", "sessions.map((session: SessionWithJoins)"),
    ("reviews.map((review: any)", "reviews.map((review: Tables<'reviews'> & { student?: Tables<'profiles'> })")
])

patch('src/pages/ProfileEdit.tsx', [
    ("import { Camera", "import type { TablesUpdate } from '@/integrations/supabase/types';\nimport { Camera"),
    ("onSubmit = async (data: any)", "onSubmit = async (data: TablesUpdate<'profiles'>)")
])

patch('src/pages/SessionAttendance.tsx', [
    ("import { Badge }", "import type { BookingWithJoins } from '@/types/session';\nimport { Badge }"),
    ("const initial: any =", "const initial: Record<string, any> ="),
    ("forEach((b: any)", "forEach((b: BookingWithJoins)"),
    ("filter((b: any)", "filter((b: BookingWithJoins)"),
    ("map((booking: any)", "map((booking: BookingWithJoins)")
])

