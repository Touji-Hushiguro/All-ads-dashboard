import { signIn } from '@/auth';

export default function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Ad Dashboard</h1>
        <p className="text-sm text-gray-500 mb-6">
          社内向け広告パフォーマンス管理画面
        </p>

        <SignInButton searchParams={searchParams} />

        <p className="text-xs text-gray-400 mt-6 text-center">
          3well.co.jp アカウントでログインしてください
        </p>
      </div>
    </div>
  );
}

async function SignInButton({
  searchParams,
}: {
  readonly searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? '/';
  const error = params.error;

  return (
    <form
      action={async () => {
        'use server';
        await signIn('google', { redirectTo: callbackUrl });
      }}
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error === 'AccessDenied'
            ? 'アクセスが拒否されました。許可されたドメインのGoogleアカウントでログインしてください。'
            : 'ログインに失敗しました。もう一度お試しください。'}
        </div>
      )}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5
                   bg-white border border-gray-300 rounded-md shadow-sm
                   hover:bg-gray-50 transition-colors font-medium text-gray-700"
      >
        <GoogleIcon />
        <span>Googleでログイン</span>
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
