import { Mail, Phone } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useDocumentMeta } from '../lib/meta';

export function ContactPage() {
  useDocumentMeta('Contact us', 'Reach Nature Meds support for account or pharmacy platform help.');

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Contact"
        title="We are here to help"
        description="Reach our support team for account, order, or platform assistance."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-shell rounded-[30px]">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Mail size={18} />
          </div>
          <h2 className="text-xl font-semibold text-ink-900">Email support</h2>
          <p className="mt-3 text-sm leading-6 text-ink-600">For platform help, account support, or general questions, contact us at support@naturemeds.com.</p>
        </div>
        <div className="card-shell rounded-[30px]">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Phone size={18} />
          </div>
          <h2 className="text-xl font-semibold text-ink-900">Phone support</h2>
          <p className="mt-3 text-sm leading-6 text-ink-600">Call our customer support line at +91 1800 000 000 during business hours for help with orders and account issues.</p>
        </div>
      </div>
    </div>
  );
}
