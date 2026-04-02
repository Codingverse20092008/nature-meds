import { useEffect } from 'react';

export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | Nature Meds`;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', description);
    }
  }, [description, title]);
}
