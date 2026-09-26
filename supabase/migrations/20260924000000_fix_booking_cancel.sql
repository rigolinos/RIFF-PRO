-- ============================================
-- FIX: Booking Cancelation Capacity Leak
-- ============================================

-- 1. Create the function to restore session capacity
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the booking transitioned to a cancelled state
    IF (NEW.status IN ('cancelled_by_student', 'cancelled_by_pro') 
        AND OLD.status NOT IN ('cancelled_by_student', 'cancelled_by_pro')) THEN
        
        -- Atomically decrement participants and restore 'active' status if it was 'full'
        UPDATE public.sessions
        SET 
            current_participants = GREATEST(0, current_participants - 1),
            status = CASE 
                        WHEN status = 'full' AND GREATEST(0, current_participants - 1) < max_participants 
                        THEN 'active' 
                        ELSE status 
                     END
        WHERE id = NEW.session_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the bookings table
DROP TRIGGER IF EXISTS on_booking_cancelled ON public.bookings;

CREATE TRIGGER on_booking_cancelled
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_cancellation();
