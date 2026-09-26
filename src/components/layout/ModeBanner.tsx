import { useViewMode } from '@/contexts/ViewModeContext';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ModeBanner = () => {
  const { viewMode, actualRole, setViewMode } = useViewMode();
  const navigate = useNavigate();

  if (actualRole !== 'professional' || viewMode !== 'student') {
    return null;
  }

  const handleSwitchBack = () => {
    setViewMode('professional');
    navigate('/dashboard');
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-slate-950 px-4 py-2 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
          <Briefcase className="w-4 h-4" />
          <span>Você está no Modo Aluno</span>
        </div>
        
        <button 
          onClick={handleSwitchBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-full transition-colors"
        >
          Voltar ao Dashboard <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
