"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getmusa.app";

export default function GoogleSignInButton({
  label = "Continuar con Google",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      console.error("No credential provided");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credentialResponse.credential,
    });

    if (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      return;
    }

    // Redirect or refresh upon successful login
    router.push("/auth/callback");
  };

  const handleError = () => {
    console.error("Google login failed");
    setLoading(false);
  };

  if (!GOOGLE_CLIENT_ID) {
    // Fallback: If no Client ID is provided, show the old button that uses Supabase's redirect.
    // This ensures the app doesn't crash if the env var is missing during setup.
    return <LegacyGoogleSignInButton />;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="w-full flex justify-center [&>div]:w-full [&>div>div]:!w-full [&>div>div>div]:!w-full">
        {/* We use a container with styles to try to make the Google button full width if possible */}
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          theme="outline"
          size="large"
          text="continue_with"
          shape="pill"
          width="100%"
        />
      </div>
      {loading && (
        <div className="flex justify-center mt-2">
          <div className="w-4 h-4 border border-on-surface border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

// Legacy button for fallback if Client ID is not set yet
function LegacyGoogleSignInButton({
  label = "Continuar con Google",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${APP_URL}/auth/callback`,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className="w-full h-11 bg-surface border border-border rounded-full flex items-center justify-center gap-2.5 font-ui font-medium text-[14px] text-on-surface hover:bg-surface-container-high transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {loading ? (
        <div className="w-4 h-4 border border-on-surface border-t-transparent rounded-full animate-spin" />
      ) : (
        <GoogleLogo />
      )}
      {label}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
