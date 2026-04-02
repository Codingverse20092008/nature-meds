import { PageHeader } from '../components/PageHeader';
import { useDocumentMeta } from '../lib/meta';

export function PrivacyPolicyPage() {
  useDocumentMeta('Privacy policy', 'Understand how Nature Meds handles account and platform data.');

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Privacy policy"
        title="Your data and privacy"
        description="This page explains what data Nature Meds collects, how it is used, and how we protect it while providing pharmacy services in India."
      />

      <div className="card-shell rounded-[30px] space-y-8 text-sm leading-7 text-ink-600">
        <section>
          <h2 className="text-lg font-semibold text-ink-900">Data we collect</h2>
          <p className="mt-2">
            We may collect your name, email address, phone number, alternative phone number, delivery address, city, state, PIN code, order history, and account activity.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">How we use your data</h2>
          <p className="mt-2">
            Your information is used to create your account, process medicine orders, arrange delivery, manage checkout, send order and verification emails, and support customer service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Data protection</h2>
          <p className="mt-2">
            We use authentication, access controls, and secure backend services to protect account and order data. Administrative tools are restricted to authorized users only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Third-party services</h2>
          <p className="mt-2">
            We may use third-party providers for email delivery, hosting, database infrastructure, and future payment processing. These services only receive the data needed to perform their role.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Medical disclaimer</h2>
          <p className="mt-2">We do not provide medical advice. Consult a doctor for proper treatment.</p>
        </section>
      </div>
    </div>
  );
}
