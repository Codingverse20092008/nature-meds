import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useLogin, useRegister } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';
import { useAuthStore } from '../store/authStore';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const login = useLogin();
  const register = useRegister();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? '/';
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  useDocumentMeta('Account access', 'Login or create an account to manage your pharmacy profile, cart, and orders.');

  if (token && user) {
    return <Navigate to={redirectTo === '/auth' ? '/profile' : redirectTo} replace />;
  }

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Authentication"
        title="Login or create your account"
        description="Access your profile, saved cart, and pharmacy account details securely."
      />

      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="card-shell rounded-[32px] bg-[linear-gradient(180deg,rgba(25,125,255,0.08),rgba(22,166,121,0.08))] p-8">
            <div className="mb-6 flex size-16 items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <img src="/logo.png" alt="Nature Meds" className="h-full w-auto object-cover" />
            </div>
            <h3 className="font-[var(--font-display)] text-3xl font-semibold text-ink-900">Your pharmacy account in one place.</h3>
            <p className="mt-4 text-sm leading-7 text-ink-600">
              Sign in to keep your cart, profile, and pharmacy preferences available across refreshes.
            </p>
            <div className="mt-8 space-y-4">
              {['Saved login session', 'Cart stays linked to your account', 'Quick access to profile details'].map((item) => (
                <div key={item} className="rounded-[24px] bg-white/75 px-4 py-4 text-sm font-medium text-ink-800">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="card-shell rounded-[32px] p-8">
            <div className="mb-6 inline-flex rounded-full bg-surface-50 p-1">
              <button type="button" onClick={() => setMode('login')} className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-brand-600 shadow-soft' : 'text-ink-500'}`}>
                Login
              </button>
              <button type="button" onClick={() => setMode('signup')} className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-brand-600 shadow-soft' : 'text-ink-500'}`}>
                Sign up
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  if (mode === 'login') {
                    await login.mutateAsync({
                      email: form.email,
                      password: form.password,
                    });
                    toast.success('Logged in successfully');
                  } else {
                    if (form.password !== form.confirmPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    await register.mutateAsync({
                      firstName: form.firstName,
                      lastName: form.lastName,
                      email: form.email,
                      password: form.password,
                    });
                    toast.success('Account created. Verification email sent.');
                  }

                  navigate(redirectTo);
                } catch (error: unknown) {
                  const message =
                    error && typeof error === 'object' && 'response' in error
                      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                      : 'Authentication failed';
                  toast.error(message ?? 'Authentication failed');
                }
              }}
            >
              {mode === 'signup' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={<UserRound size={16} />} label="First name" placeholder="Alex" value={form.firstName} onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))} />
                  <Field icon={<UserRound size={16} />} label="Last name" placeholder="Morgan" value={form.lastName} onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))} />
                </div>
              )}
              <Field icon={<Mail size={16} />} label="Email address" placeholder="alex@example.com" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
              <Field icon={<LockKeyhole size={16} />} label="Password" placeholder="Enter your password" type="password" value={form.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} />
              {mode === 'signup' && <Field icon={<LockKeyhole size={16} />} label="Confirm password" placeholder="Confirm password" type="password" value={form.confirmPassword} onChange={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))} />}

              <button type="submit" className="btn-primary mt-2 w-full" disabled={login.isPending || register.isPending}>
                {login.isPending || register.isPending ? 'Please wait...' : mode === 'login' ? 'Login securely' : 'Create account'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  icon,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/85 px-4 py-3 shadow-[0_10px_24px_rgba(17,36,60,0.06)]">
        <span className="text-brand-500">{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
      </div>
    </label>
  );
}
