import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";

export interface InfoSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  links?: { label: string; href: string }[];
}

/** Page de texte : une section par panneau de verre. */
export function InfoPage({ title, sections }: { title: string; sections: InfoSection[] }) {
  return (
    <PageShell title={title}>
      {sections.map((section) => (
        <GlassPanel as="section" key={section.title} className="flex flex-col gap-2 p-5">
          <h2 className="[font:var(--uf-time)]">{section.title}</h2>
          {section.paragraphs?.map((paragraph, index) => (
            <p key={index} className="[font:var(--uf-body)] font-medium text-uf-ink-2">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 [font:var(--uf-body)] font-medium text-uf-ink-2">
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
          {section.links && (
            <ul className="flex flex-col">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center [font:var(--uf-body)] break-words underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      ))}
    </PageShell>
  );
}
