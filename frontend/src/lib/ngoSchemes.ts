// Real Telangana welfare-scheme reference PDFs, bundled in /public/ngo-schemes.
// Served as static assets — users can PREVIEW (open in a new tab) or DOWNLOAD
// them from "Understand my documents" → Sample documents. These are genuine
// 10-page documents, handy for exercising the analyzer on a real multi-page PDF.

export interface NgoScheme {
  id: string;
  name: string;
  org: string;
  description: string;
  pages: number;
  filename: string;
}

export const NGO_SCHEMES: NgoScheme[] = [
  {
    id: 'maternity',
    name: 'Maternity Benefit Scheme — Telangana',
    org: 'TB&OCWWB · LET&F (Labour) Dept.',
    description:
      'Financial assistance to registered women construction workers (and the wives/daughters of registered workers) during and after pregnancy.',
    pages: 10,
    filename: 'schemes_NGO-1.pdf',
  },
  {
    id: 'disability-aids',
    name: 'Disability Aids & Appliances — Telangana',
    org: 'TB&OCWWB · LET&F (Labour) Dept.',
    description:
      'Artificial limbs, wheelchairs, tricycles and other fabricated appliances for registered construction workers who are differently abled.',
    pages: 10,
    filename: 'schemes_NGO-2.pdf',
  },
  {
    id: 'overseas-vidya-nidhi',
    name: 'Mahatma Jyothiba Phule Overseas Vidya Nidhi',
    org: 'Telangana ePASS · BC & EBC students',
    description:
      'Overseas scholarship awards for BC/EBC students pursuing higher study abroad — eligibility, notes and the online application steps.',
    pages: 10,
    filename: 'schemes_NGO-3.pdf',
  },
];

/** Public URL for a bundled scheme PDF (honors the Vite base path). */
export function ngoSchemeUrl(s: NgoScheme): string {
  return `${import.meta.env.BASE_URL}ngo-schemes/${s.filename}`;
}
