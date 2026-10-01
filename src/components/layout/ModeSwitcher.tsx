import { useState } from "react";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useProfile } from "@/hooks/useProfile";
import { ChevronDown, UserPlus } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useNavigate } from "react-router-dom";

export function ModeSwitcher() {
  const { viewMode, setViewMode } = useViewMode();
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!profile) return null;

  const firstName = profile.full_name?.split(" ")[0] || "Usuário";
  const isCompletePro = profile.role === "professional";

  const handleSelect = (mode: "professional" | "student") => {
    setViewMode(mode);
    setIsOpen(false);
    navigate(mode === "professional" ? "/dashboard" : "/feed");
  };

  const handleBecomePro = () => {
    setIsOpen(false);
    navigate("/onboarding/pro");
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
          <span className="type-subtitle truncate">{firstName}</span>
          <ChevronDown className="w-4 h-4 text-ink-muted" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-bg border-line">
        <DrawerHeader className="text-left border-b border-line pb-4">
          <DrawerTitle className="type-title">Alternar perfil</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2">
          {isCompletePro ? (
            <button
              onClick={() => handleSelect("professional")}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                viewMode === "professional" ? "bg-brand/10 border-brand text-brand-ink" : "bg-surface border-line text-ink"
              }`}
            >
              <div className="text-left">
                <p className="font-semibold">Organizar</p>
                <p className="text-sm opacity-70">Gerenciar minhas atividades</p>
              </div>
              {viewMode === "professional" && <div className="w-2 h-2 rounded-full bg-brand" />}
            </button>
          ) : (
            <button
              onClick={handleBecomePro}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-line bg-surface text-ink hover:border-brand/50 transition-all"
            >
              <UserPlus className="w-5 h-5 text-brand" />
              <div className="text-left">
                <p className="font-semibold text-brand">Quero organizar</p>
                <p className="text-sm text-ink-muted">Crie suas próprias atividades</p>
              </div>
            </button>
          )}

          <button
            onClick={() => handleSelect("student")}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
              viewMode === "student" ? "bg-brand/10 border-brand text-brand-ink" : "bg-surface border-line text-ink"
            }`}
          >
            <div className="text-left">
              <p className="font-semibold">Participar</p>
              <p className="text-sm opacity-70">Explorar e agendar</p>
            </div>
            {viewMode === "student" && <div className="w-2 h-2 rounded-full bg-brand" />}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
