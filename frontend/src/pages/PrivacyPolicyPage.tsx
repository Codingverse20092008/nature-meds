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
          <h2 className="text-lg font-semibold text-ink-900">Return & Refund Policy</h2>
          <p className="mt-2 leading-relaxed">
            Due to the sensitive nature of pharmaceutical products, returns are strictly regulated to ensure patient safety and product efficacy.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-600">
            <li>
              <span className="font-semibold text-ink-800">Eligibility:</span> Returns are only accepted for products that are damaged, expired, or incorrect at the time of delivery.
            </li>
            <li>
              <span className="font-semibold text-ink-800">Timeline:</span> You must request a return within <span className="font-bold underline">48 hours</span> of receiving the order.
            </li>
            <li>
              <span className="font-semibold text-ink-800">Packaging:</span> Medicines must be returned in their original, unopened, and sealed packaging. Opened or partially consumed medicines cannot be returned.
            </li>
            <li>
              <span className="font-semibold text-ink-800">Refrigerated Items:</span> Cold-chain products (e.g., Insulin, Vaccines) are strictly <span className="font-bold text-red-600">Non-Returnable</span> once they leave our temperature-controlled facility.
            </li>
            <li>
              <span className="font-semibold text-ink-800">Verification:</span> We reserve the right to verify the product condition and batch number before approving any refund or replacement.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Medical disclaimer</h2>
          <p className="mt-2 italic opacity-80">We do not provide medical advice. Consult a qualified doctor for proper diagnosis and treatment.</p>
        </section>
      </div>
    </div>
  );
}
