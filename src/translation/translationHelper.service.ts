import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { I18nPath, I18nTranslations } from '../generated/i18n.generated';

@Injectable()
export class TranslationHelperService {
  private readonly supportedLanguages = ['ka', 'en'] as const;

  constructor(private readonly i18n: I18nService) {}

  translate(key: I18nPath, args: Record<string, any> = {}): string {
    return this.i18n.t(key, { args });
  }

  withNamespace(namespace: keyof I18nTranslations) {
    return (key: any, args: Record<string, any> = {}): string => {
      return this.i18n.t(`${namespace}.${key}` as I18nPath, { args });
    };
  }

  getErrorMsg(
    key: keyof I18nTranslations['error'],
    args: Record<string, any> = {},
  ) {
    return this.withNamespace('error')(key, args);
  }

  getUserServiceMsg(
    key: keyof I18nTranslations['userService'],
    args: Record<string, any> = {},
  ) {
    return this.withNamespace('userService')(key, args);
  }

  get currentLanguage(): 'ka' | 'en' {
    const i18nContext = I18nContext.current();
    const lang = i18nContext?.lang ?? 'ka';

    if (this.isSupportedLanguage(lang)) {
      return lang;
    }

    throw new Error(`Unsupported language: ${lang}`);
  }

  private isSupportedLanguage(lang: string): lang is 'ka' | 'en' {
    return this.supportedLanguages.includes(lang as 'ka' | 'en');
  }
}
