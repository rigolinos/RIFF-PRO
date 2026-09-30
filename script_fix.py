import re

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# SessionCard
patch('src/components/cards/SessionCard.tsx', [
    ("import { CoverImage,", "import type { SessionWithJoins } from '@/types/session';\nimport { CoverImage,"),
    ("session: any;", "session: SessionWithJoins;"),
    ("(session: any) => void;", "(session: SessionWithJoins) => void;")
])

# SessionForm
patch('src/components/forms/SessionForm.tsx', [
    ("import { useForm", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport type { SessionWithJoins } from '@/types/session';\nimport { useForm"),
    ("initialData?: any;", "initialData?: SessionWithJoins;"),
    ("onSubmit: (data: any)", "onSubmit: (data: TablesInsert<'sessions'>)"),
    ("handleTemplateClick = (temp: any)", "handleTemplateClick = (temp: { title: string; description: string })"),
    ("onFinalSubmit = async (data: any)", "onFinalSubmit = async (data: TablesInsert<'sessions'>)"),
    ("({ children, className }: any)", "({ children, className }: { children: React.ReactNode; className?: string })")
])

# useProfile
patch('src/hooks/useProfile.ts', [
    ("import { useQuery", "import type { TablesUpdate } from '@/integrations/supabase/types';\nimport { useQuery"),
    ("mutationFn: async (updates: any)", "mutationFn: async (updates: TablesUpdate<'profiles'>)"),
    ("const privateUpdates: any =", "const privateUpdates: Record<string, unknown> =")
])

# DashboardPro
patch('src/pages/DashboardPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("(data?.metrics as any)", "(data?.metrics as Record<string, string | number>)"),
    ("todaySessions.map((session: any)", "(todaySessions as SessionWithJoins[]).map((session)")
])

# ProfessionalProfile
patch('src/pages/ProfessionalProfile.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)"),
    ("sessions.find((s: any)", "(sessions as SessionWithJoins[]).find((s)"),
    ("sessions.map((session: any)", "(sessions as SessionWithJoins[]).map((session)")
])

# EditSession
patch('src/pages/EditSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport type { SessionWithJoins } from '@/types/session';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)"),
    ("initialData={session}", "initialData={session as unknown as SessionWithJoins}") # Casting it just in case
])

# CreateSession
patch('src/pages/CreateSession.tsx', [
    ("import { SessionForm }", "import type { TablesInsert } from '@/integrations/supabase/types';\nimport { SessionForm }"),
    ("const handleSubmit = async (data: any)", "const handleSubmit = async (data: TablesInsert<'sessions'>)")
])

# Earnings
patch('src/pages/Earnings.tsx', [
    ("transactions?.forEach((t: any)", "transactions?.forEach((t: Record<string, unknown>)"),
    ("transactions.map((t: any)", "transactions.map((t: Record<string, unknown>)")
])

# Feed
patch('src/pages/Feed.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("sessions: any[]", "sessions: SessionWithJoins[]"),
    ("handleBookClick = (session: any)", "handleBookClick = (session: SessionWithJoins)")
])

# MyBookings
patch('src/pages/MyBookings.tsx', [
    ("useState<any>(null)", "useState<Record<string, unknown> | null>(null)"),
    ("const up: any[] =", "const up: Record<string, unknown>[] ="),
    ("const hist: any[] =", "const hist: Record<string, unknown>[] ="),
    ("handleWhatsApp = async (booking: any)", "handleWhatsApp = async (booking: Record<string, unknown>)"),
    ("handleOpenMap = (booking: any)", "handleOpenMap = (booking: Record<string, unknown>)"),
    ("handleCancel = async (booking: any)", "handleCancel = async (booking: Record<string, unknown>)"),
    ("renderBookingCard = (booking: any,", "renderBookingCard = (booking: Record<string, unknown>,")
])

# MySessionsPro
patch('src/pages/MySessionsPro.tsx', [
    ("import { SessionCard }", "import type { SessionWithJoins } from '@/types/session';\nimport { SessionCard }"),
    ("useState<any>(null)", "useState<SessionWithJoins | null>(null)"),
    ("_openAttendanceSheet = (session: any)", "_openAttendanceSheet = (session: SessionWithJoins)"),
    ("filter((b: any)", "filter((b: Record<string, unknown>)"),
    ("forEach((b: any)", "forEach((b: Record<string, unknown>)"),
    ("handleCancelSession = async (session: any)", "handleCancelSession = async (session: SessionWithJoins)"),
    ("handleCloseRegistrations = async (session: any)", "handleCloseRegistrations = async (session: SessionWithJoins)"),
    ("handleDuplicateSession = async (session: any)", "handleDuplicateSession = async (session: SessionWithJoins)"),
    ("isPast = (s: any)", "isPast = (s: SessionWithJoins)"),
    ("isCancelled = (s: any)", "isCancelled = (s: SessionWithJoins)"),
    ("isCompleted = (s: any)", "isCompleted = (s: SessionWithJoins)"),
    ("map((booking: any)", "map((booking: Record<string, unknown>)")
])

# ProfileEdit
patch('src/pages/ProfileEdit.tsx', [
    ("import { Camera", "import type { TablesUpdate } from '@/integrations/supabase/types';\nimport { Camera"),
    ("onSubmit = async (data: any)", "onSubmit = async (data: TablesUpdate<'profiles'>)")
])

# SessionAttendance
patch('src/pages/SessionAttendance.tsx', [
    ("const initial: any =", "const initial: Record<string, { present: boolean; paid: boolean; notes: string }> ="),
    ("forEach((b: any)", "forEach((b: Record<string, unknown>)"),
    ("filter((b: any)", "filter((b: Record<string, unknown>)"),
    ("map((booking: any)", "map((booking: Record<string, unknown>)")
])

import os

def fix_errors(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = re.sub(r'error: any\)', 'error: unknown)', content)
    content = re.sub(r'err: any\)', 'err: unknown)', content)
    content = re.sub(r'e: any\)', 'e: unknown)', content)
    content = content.replace("openAttendanceSheet = (session: any)", "openAttendanceSheet = (session: SessionWithJoins)")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            try:
                fix_errors(os.path.join(root, file))
            except:
                pass

