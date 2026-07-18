import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface InfoSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  links?: { label: string; href: string }[];
}

export function InfoPage({ title, sections }: { title: string; sections: InfoSection[] }) {
  return (
    <div className="flex flex-col h-screen bg-bg font-sans">
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <Link
          href="/"
          aria-label="Retour"
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </Link>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl p-4">
            <p className="text-[14px] font-semibold text-ink mb-2">{section.title}</p>
            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className="text-[13px] text-text-2 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="flex flex-col gap-1.5 mt-0.5">
                {section.items.map((item, index) => (
                  <li key={index} className="text-[13px] text-text-2 leading-relaxed flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.links && (
              <ul className="flex flex-col gap-1.5 mt-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary font-medium underline break-words"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}