import { auth } from '@/auth';
import { NextResponse, type NextRequest } from 'next/server';

// 認証無効モード（ローカル開発用）
// 環境変数 AUTH_DISABLED=true または Google認証設定が無い場合にスキップ
const AUTH_DISABLED =
  process.env.AUTH_DISABLED === 'true' ||
  !process.env.AUTH_GOOGLE_ID ||
  !process.env.AUTH_SECRET;

export default AUTH_DISABLED
  ? function noAuth(_req: NextRequest) {
      return NextResponse.next();
    }
  : auth((req) => {
      const { pathname } = req.nextUrl;

      // 除外パス: 認証関連・静的ファイル・サインイン画面
      const isAuthPath =
        pathname.startsWith('/api/auth') || pathname === '/signin';
      if (isAuthPath) return NextResponse.next();

      // 未認証ならサインイン画面へ
      if (!req.auth) {
        const url = new URL('/signin', req.nextUrl);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    });

export const config = {
  // 次のパスには middleware を適用しない
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
