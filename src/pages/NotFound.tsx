import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-emerald-500 mb-4">404</p>
      <p className="text-foreground text-lg font-medium mb-2">Página não encontrada</p>
      <p className="text-muted-foreground text-sm mb-8">Essa página não existe ou foi removida.</p>
      <button
        onClick={() => navigate('/')}
        className="h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all active:scale-[0.98] glow-emerald"
      >
        Voltar ao início
      </button>
    </div>
  );
};

export default NotFound;
