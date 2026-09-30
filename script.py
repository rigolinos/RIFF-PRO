import re

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 2. SessionForm.tsx
patch('src/components/forms/SessionForm.tsx', [
    ("import { useForm", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport type { SessionWithJoins } from '@/types/session';\nimport { useForm"),
    ("initialData?: any;", "initialData?: SessionWithJoins;"),
    ("onSubmit: (data: any)", "onSubmit: (data: TablesInsert<'sessions'>)"),
    ("const handleTemplateClick = (temp: any)", "const handleTemplateClick = (temp: { title: string; description: string })"),
    ("const onFinalSubmit = async (data: any)", "const onFinalSubmit = async (data: TablesInsert<'sessions'>)"),
    ("const ScrollArea = ({ children, className }: any)", "const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string })")
])

# 3. useProfile.ts
# For useProfile.ts, replace updates: any with TablesUpdate<'profiles'>.
patch('src/hooks/useProfile.ts', [
    ("import { useQuery", "import type { TablesUpdate } from '@/integrations/supabase/types';\nimport { useQuery"),
    ("mutationFn: async (updates: any)", "mutationFn: async (updates: TablesUpdate<'profiles'>)"),
    ("const privateUpdates: any =", "const privateUpdates: Record<string, unknown> =")
])

# 4. CreateSession.tsx
patch('src/pages/CreateSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)")
])

# 5. DashboardPro.tsx
patch('src/pages/DashboardPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("(data?.metrics as any)", "(data?.metrics as Record<string, unknown>)"),
    ("todaySessions.map((session: any)", "todaySessions.map((session: SessionWithJoins)")
])

# 6. Earnings.tsx
patch('src/pages/Earnings.tsx', [
    ("transactions?.forEach((t: any)", "transactions?.forEach((t: Record<string, unknown>)"),
    ("transactions.map((t: any)", "transactions.map((t: Record<string, unknown>)")
])

# 7. EditSession.tsx
patch('src/pages/EditSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)")
])

# 8. Feed.tsx
patch('src/pages/Feed.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("sessions: any[]", "sessions: SessionWithJoins[]"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)")
])

# 9. MyBookings.tsx
patch('src/pages/MyBookings.tsx', [
    ("useState<any>(null)", "useState<any>(null)"), # Wait, I'll need a Booking type
    ("const up: any[] =", "const up: any[] ="),
    ("const hist: any[] =", "const hist: any[] ="),
    ("handleWhatsApp = async (booking: any)", "handleWhatsApp = async (booking: any)"),
    ("handleOpenMap = (booking: any)", "handleOpenMap = (booking: any)"),
    ("handleCancel = async (booking: any)", "handleCancel = async (booking: any)"),
    ("renderBookingCard = (booking: any,", "renderBookingCard = (booking: any,")
])

# 10. MySessionsPro.tsx
patch('src/pages/MySessionsPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("_openAttendanceSheet = (session: any)", "_openAttendanceSheet = (session: SessionWithJoins)"),
    ("session.bookings?.filter((b: any)", "session.bookings?.filter((b: NonNullable<SessionWithJoins['bookings']>[0])"),
    ("activeBookings.forEach((b: any)", "activeBookings.forEach((b: NonNullable<SessionWithJoins['bookings']>[0])"),
    ("handleCancelSession = async (session: any)", "handleCancelSession = async (session: SessionWithJoins)"),
    ("handleCloseRegistrations = async (session: any)", "handleCloseRegistrations = async (session: SessionWithJoins)"),
    ("handleDuplicateSession = async (session: any)", "handleDuplicateSession = async (session: SessionWithJoins)"),
    ("isPast = (s: any)", "isPast = (s: SessionWithJoins)"),
    ("isCancelled = (s: any)", "isCancelled = (s: SessionWithJoins)"),
    ("isCompleted = (s: any)", "isCompleted = (s: SessionWithJoins)"),
    ("selectedSession?.bookings?.filter((b: any)", "selectedSession?.bookings?.filter((b: NonNullable<SessionWithJoins['bookings']>[0])"),
    ("filter((b: any)", "filter((b: NonNullable<SessionWithJoins['bookings']>[0])"),
    ("map((booking: any)", "map((booking: NonNullable<SessionWithJoins['bookings']>[0])")
])

# 11. ProfessionalProfile.tsx
patch('src/pages/ProfessionalProfile.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)"),
    ("sessions.find((s: any)", "sessions.find((s: SessionWithJoins)"),
    ("sessions.map((session: any)", "sessions.map((session: SessionWithJoins)"),
    ("reviews.map((review: any)", "reviews.map((review: Record<string, unknown>)")
])

# 12. ProfileEdit.tsx
patch('src/pages/ProfileEdit.tsx', [
    ("onSubmit = async (data: any)", "onSubmit = async (data: Record<string, unknown>)")
])

# 13. SessionAttendance.tsx
patch('src/pages/SessionAttendance.tsx', [
    ("const initial: any =", "const initial: Record<string, boolean> ="),
    ("session.bookings.forEach((b: any)", "session.bookings.forEach((b: Record<string, unknown>)"),
    ("session.bookings?.filter((b: any)", "session.bookings?.filter((b: Record<string, unknown>)"),
    ("activeBookings.map((booking: any)", "activeBookings.map((booking: Record<string, unknown>)")
])

