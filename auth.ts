import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * 許可ドメイン（社内）
 * 環境変数 ALLOWED_EMAIL_DOMAINS でカンマ区切り指定可能
 * 例: "3well.co.jp,partner.co.jp"
 */
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? '3well.co.jp')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? '';
      const domain = email.split('@')[1] ?? '';
      return ALLOWED_DOMAINS.includes(domain);
    },
  },
  pages: {
    signIn: '/signin',
  },
});
