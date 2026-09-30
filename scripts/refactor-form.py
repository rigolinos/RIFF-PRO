import re
import os

with open('src/components/forms/SessionForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'import { COPY, KINDS, ActivityKind }' not in content:
    content = content.replace("import { useProfile } from '@/hooks/useProfile';", "import { useProfile } from '@/hooks/useProfile';\nimport { COPY, KINDS, ActivityKind } from '@/lib/copy';\nimport { GraduationCap, Trophy, CalendarDays } from 'lucide-react';")

# 2. Add kind to defaultValues
if "kind: initialData?.kind" not in content:
    content = content.replace("category_id: initialData?.category_id || '',", "kind: initialData?.kind || 'class',\n        category_id: initialData?.category_id || '',")

# 3. Adjust totalSteps
content = re.sub(r'const totalSteps = 3;', 'const totalSteps = 4;', content)

# 4. Shift steps
content = content.replace('step === 3', 'step === 4')
content = content.replace('step === 2', 'step === 3')
content = content.replace('step === 1', 'step === 2')
content = content.replace('STEP 3:', 'STEP 4:')
content = content.replace('STEP 2:', 'STEP 3:')
content = content.replace('STEP 1:', 'STEP 2:')

# 5. Insert Step 1
step1_code = """
              {/* STEP 1: O QUE VOCÊ VAI ORGANIZAR? */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="mb-4">
                    <h3 className="type-title mb-1">O que você vai organizar?</h3>
                    <p className="type-caption text-ink-muted">Escolha o que mais se parece com o seu caso. Dá para mudar depois.</p>
                  </div>
                  
                  <div className="grid gap-3">
                    {Object.entries(KINDS).map(([k, meta]) => {
                      const IconMap: any = { GraduationCap, Users, Trophy, CalendarDays, Sparkles };
                      const Icon = IconMap[meta.icon] || Sparkles;
                      const isSelected = formData.kind === k;
                      return (
                        <div 
                          key={k}
                          onClick={() => {
                             if (hasParticipants) return;
                             setValue('kind', k);
                             setStep(2);
                          }}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            hasParticipants ? 'opacity-50 cursor-not-allowed border-line/50 bg-surface/50' : 
                            isSelected ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:border-brand/30'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand text-brand-ink' : 'bg-white/5 text-ink-muted'}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="type-subtitle mb-0.5">{meta.label}</h4>
                            <p className="type-caption text-ink-muted">{meta.description}</p>
                            {meta.example && (
                              <p className="type-caption text-ink-muted mt-1 opacity-70">Ex: {meta.example}</p>
                            )}
                          </div>
                          
                          {hasParticipants && (
                             <div className="absolute right-3 top-3" title="Não pode mudar o tipo de uma atividade com participantes.">
                               <AlertTriangle className="w-4 h-4 text-accent" />
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
"""
content = content.replace('{/* STEP 2: DADOS BÁSICOS */}', step1_code + '\n              {/* STEP 2: DADOS BÁSICOS */}')

# 6. Dynamic labels
content = re.sub(r'placeholder="Ex: Funcional na Praia"([^>]*>)', r'placeholder={KINDS[formData.kind as ActivityKind]?.titlePlaceholder || "Ex: Funcional na Praia"}\1', content)
content = re.sub(r'<label className="text-sm font-medium text-ink">Vagas totais</label>', r'<label className="text-sm font-medium text-ink">{KINDS[formData.kind as ActivityKind]?.capacityLabel || "Vagas totais"}</label>', content)
content = re.sub(r'placeholder="Ex: Traga sua pr[oó]pria raquete, [aá]gua e protetor solar."([^>]*>)', r'placeholder={KINDS[formData.kind as ActivityKind]?.descriptionPlaceholder}\1', content)

# 7. Hide templates if not class
content = content.replace("Object.entries(TEMPLATES).map", "formData.kind === 'class' && Object.entries(TEMPLATES).map")

# 8. Scarcity warning
content = content.replace("Turmas exclusivas geram escassez e esgotam rápido.", "Poucas vagas costumam esgotar rápido.")
content = content.replace("{formData.max_participants <= 5 && (", "{formData.max_participants <= 5 && formData.kind === 'class' && (")

with open('src/components/forms/SessionForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

