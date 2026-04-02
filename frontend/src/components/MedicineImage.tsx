import { Pill } from 'lucide-react';
import { useState } from 'react';

export function MedicineImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[linear-gradient(135deg,rgba(25,125,255,0.16),rgba(22,166,121,0.16))] text-brand-600 ${className ?? ''}`}
      >
        <Pill size={32} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-surface-50 ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition duration-500 ${loaded ? 'scale-100 blur-0' : 'scale-105 blur-md'}`}
      />
    </div>
  );
}
