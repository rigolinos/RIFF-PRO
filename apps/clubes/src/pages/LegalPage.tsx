import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@riff/core/layout/PageContainer';
import { BRAND } from '@/brand';
import { LEGAL_VERSIONS, legalDocumentByPath } from '@riff/core/legal/documents';
import NotFound from './NotFound';

// Página pública de um documento legal (/termos, /termos-organizador, /privacidade).
const LegalPage = () => {
  const { pathname } = useLocation();
  const doc = legalDocumentByPath(pathname);
  if (!doc) return <NotFound />;

  return (
    <PageContainer title={doc.title} showBack withBottomNav={false}>
      <Helmet>
        <title>{`${doc.title} | ${BRAND.name}`}</title>
      </Helmet>
      <article className="px-6 py-6 space-y-6 pb-16">
        <p className="text-ink-muted text-sm">Versão de {LEGAL_VERSIONS[doc.id].split('-').reverse().join('/')}</p>
        <p className="text-ink leading-relaxed bg-surface border border-line rounded-2xl p-4">{doc.summary}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="type-subtitle text-ink">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-sm text-ink-muted leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </PageContainer>
  );
};

export default LegalPage;
