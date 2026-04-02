import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="section-shell pb-8">
      <div className="glass-panel rounded-[28px] px-6 py-8 text-sm text-ink-500">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-[var(--font-display)] text-2xl font-semibold text-ink-900">Nature Meds</p>
            <p className="mt-3 max-w-md leading-7">Trusted online pharmacy platform</p>
            <p className="mt-4 max-w-xl text-xs leading-6 text-ink-500">
              We do not provide medical advice. Consult a doctor for proper treatment.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold text-ink-900">Quick links</p>
              <div className="space-y-2">
                <Link to="/" className="block transition hover:text-brand-600">Home</Link>
                <Link to="/products" className="block transition hover:text-brand-600">Shop</Link>
                <Link to="/contact" className="block transition hover:text-brand-600">Contact</Link>
                <Link to="/privacy-policy" className="block transition hover:text-brand-600">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-ink-900">Notice</p>
              <p className="leading-7">
                Product information is provided for general shopping guidance only. Always verify treatment decisions with a qualified doctor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
