import re

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# For MyBookings.tsx
patch('src/pages/MyBookings.tsx', [
    ("import { useBookings }", "import { useBookings } from '@/hooks/useBookings';\ntype BookingWithJoins = NonNullable<ReturnType<typeof useBookings>['bookings']>[0];\n"),
    ("import { useBookings } from '@/hooks/useBookings';\ntype BookingWithJoins = NonNullable<ReturnType<typeof useBookings>['bookings']>[0];\n from '@/hooks/useBookings';", ""), # clean up
    ("useState<any>(null)", "useState<BookingWithJoins | null>(null)"),
    ("const up: any[] =", "const up: BookingWithJoins[] ="),
    ("const hist: any[] =", "const hist: BookingWithJoins[] ="),
    ("handleWhatsApp = async (booking: any)", "handleWhatsApp = async (booking: BookingWithJoins)"),
    ("handleOpenMap = (booking: any)", "handleOpenMap = (booking: BookingWithJoins)"),
    ("handleCancel = async (booking: any)", "handleCancel = async (booking: BookingWithJoins)"),
    ("renderBookingCard = (booking: any,", "renderBookingCard = (booking: BookingWithJoins,")
])

