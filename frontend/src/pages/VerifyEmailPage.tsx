import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useVerifyEmail } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();

  useDocumentMeta('Verify email', 'Confirm your email address for your Nature Meds account.');

  useEffect(() => {
    if (!token) {
      return;
    }

    verifyEmail.mutate(token, {
      onSuccess: (response) => {
        toast.success(response.message);
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : 'Could not verify email';
        toast.error(message ?? 'Could not verify email');
      },
    });
  }, [token, verifyEmail]);

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="Email verification"
        title="Verify your email address"
        description="We are confirming your Nature Meds account so you can continue shopping with confidence."
      />

      <div className="card-shell mx-auto max-w-2xl rounded-[32px] px-8 py-12 text-center">
        {!token ? (
          <>
            <p className="text-lg font-semibold text-red-600">Verification link is missing a token.</p>
            <Link to="/auth" className="btn-secondary mt-6">
              Back to login
            </Link>
          </>
        ) : verifyEmail.isPending ? (
          <p className="text-lg font-semibold text-ink-900">Verifying your email...</p>
        ) : verifyEmail.isSuccess ? (
          <>
            <p className="text-lg font-semibold text-mint-600">Email verified successfully</p>
            <Link to="/profile" className="btn-primary mt-6">
              Go to profile
            </Link>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-red-600">This verification link is invalid or expired.</p>
            <Link to="/auth" className="btn-secondary mt-6">
              Return to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
