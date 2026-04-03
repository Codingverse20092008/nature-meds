import { motion } from 'framer-motion';
import { LockKeyhole, Mail, MapPin, Phone, Save, UserRound } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader';
import { useAuthUser, useChangePassword, useUpdateProfile } from '../lib/queries';
import { useDocumentMeta } from '../lib/meta';

export function ProfilePage() {
  const profileQuery = useAuthUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: 'mahafuzalamkhan25@gmail.com',
    phone: '8515020851',
    alternatePhone: '7501842551',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useDocumentMeta('My profile', 'Manage your Nature Meds account details, contact information, and password.');

  useEffect(() => {
    if (profileQuery.data) {
      setProfileForm({
        firstName: profileQuery.data.firstName ?? '',
        lastName: profileQuery.data.lastName ?? '',
        email: profileQuery.data.email ?? 'mahafuzalamkhan25@gmail.com',
        phone: profileQuery.data.phone ?? '8515020851',
        alternatePhone: profileQuery.data.alternatePhone ?? '7501842551',
        address: profileQuery.data.address ?? '',
        city: profileQuery.data.city ?? '',
        state: profileQuery.data.state ?? '',
        zipCode: profileQuery.data.zipCode ?? '',
      });
    }
  }, [profileQuery.data]);

  return (
    <div className="section-shell">
      <PageHeader
        eyebrow="My profile"
        title="Manage your account details"
        description="Keep your name, phone, address, and password up to date for a smooth pharmacy ordering experience."
      />

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-shell rounded-[32px]">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-ink-900">Profile information</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">Update your contact and delivery details here.</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await updateProfile.mutateAsync({
                  firstName: profileForm.firstName,
                  lastName: profileForm.lastName,
                  phone: profileForm.phone,
                  alternatePhone: profileForm.alternatePhone,
                  address: profileForm.address,
                  city: profileForm.city,
                  state: profileForm.state,
                  zipCode: profileForm.zipCode,
                });
                toast.success('Profile updated successfully');
              } catch (error: unknown) {
                const message =
                  error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Could not update profile';
                toast.error(message ?? 'Could not update profile');
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={profileForm.firstName} onChange={(value) => setProfileForm((current) => ({ ...current, firstName: value }))} icon={<UserRound size={16} />} />
              <Field label="Last name" value={profileForm.lastName} onChange={(value) => setProfileForm((current) => ({ ...current, lastName: value }))} icon={<UserRound size={16} />} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={profileForm.email} onChange={() => {}} icon={<Mail size={16} />} readOnly />
              <Field label="Phone" value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} icon={<Phone size={16} />} />
            </div>
            <Field label="Alternative phone number" value={profileForm.alternatePhone} onChange={(value) => setProfileForm((current) => ({ ...current, alternatePhone: value }))} icon={<Phone size={16} />} />
            <Field label="Address" value={profileForm.address} onChange={(value) => setProfileForm((current) => ({ ...current, address: value }))} icon={<MapPin size={16} />} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" value={profileForm.city} onChange={(value) => setProfileForm((current) => ({ ...current, city: value }))} icon={<MapPin size={16} />} />
              <Field label="State" value={profileForm.state} onChange={(value) => setProfileForm((current) => ({ ...current, state: value }))} icon={<MapPin size={16} />} />
              <Field label="ZIP code" value={profileForm.zipCode} onChange={(value) => setProfileForm((current) => ({ ...current, zipCode: value }))} icon={<MapPin size={16} />} />
            </div>

            <button type="submit" className="btn-primary mt-2" disabled={updateProfile.isPending || profileQuery.isLoading}>
              <Save size={16} />
              {updateProfile.isPending ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">
          <div className="card-shell rounded-[32px]">
            <h2 className="text-2xl font-semibold text-ink-900">Change password</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">Use a strong password to keep your account secure.</p>

            <form
              className="mt-6 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  toast.error('New passwords do not match');
                  return;
                }

                try {
                  await changePassword.mutateAsync({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                  });
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  toast.success('Password updated successfully');
                } catch (error: unknown) {
                  const message =
                    error && typeof error === 'object' && 'response' in error
                      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                      : 'Could not update password';
                  toast.error(message ?? 'Could not update password');
                }
              }}
            >
              <Field label="Current password" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} icon={<LockKeyhole size={16} />} />
              <Field label="New password" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} icon={<LockKeyhole size={16} />} />
              <Field label="Confirm new password" type="password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} icon={<LockKeyhole size={16} />} />

              <button type="submit" className="btn-secondary w-full" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          </div>


        </motion.section>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/85 px-4 py-3 shadow-[0_10px_24px_rgba(17,36,60,0.06)]">
        <span className="text-brand-500">{icon}</span>
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none read-only:text-ink-500"
        />
      </div>
    </label>
  );
}
