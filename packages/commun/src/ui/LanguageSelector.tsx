'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type AppLocale } from '../i18n/config';
import { commonStorage } from '../storage';

const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: 'Français',
};

export function LanguageSelector() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000`;
    void commonStorage.set(LOCALE_STORAGE_KEY, next);
    startTransition(() => router.refresh());
  }

  return (
    <label className="rt-field" aria-label={t('language.select')}>
      <span>{t('language.select')}</span>
      <select
        className="rt-select"
        value={locale}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
