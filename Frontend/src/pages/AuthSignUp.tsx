import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { sanitizeNext } from "@shared/lib/routes";
import { SEO } from "@shared/components/common/SEO";
import { Button } from "@shared/components/ui/button";
import { AuthShell } from "@/components/common/AuthShell";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";
import { StepEmail } from "@/components/auth/signup/StepEmail";
import { StepPassword } from "@/components/auth/signup/StepPassword";
import { StepProfile } from "@/components/auth/signup/StepProfile";
import { SIGNUP_STEPS, useSignUpWizard } from "@/components/auth/signup/useSignUpWizard";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import { useCallbackError } from "@/lib/authCallbackError";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";

/**
 * Three-screen signup: email → password → name/business.
 *
 * Sign-in lives at /auth and owns the MFA challenge; this page only ever deals
 * with brand-new accounts, so it never needs to think about second factors.
 */
const AuthSignUp = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get("next"));

  const { user, loading, signInWithGoogle, resendConfirmation } = useAuth();
  const callbackError = useCallbackError();
  const { cooldown, start: startCooldown } = useResendCooldown();

  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [panelError, setPanelError] = useState<FriendlyError | null>(null);

  const onConfirmationRequired = useCallback(
    (email: string) => {
      // No success toast: nothing has been confirmed yet.
      setConfirmEmail(email);
      startCooldown();
    },
    [startCooldown]
  );

  const onSessionCreated = useCallback(() => {
    toast.success("Account created.");
    // The redirect effect below fires once the session lands.
  }, []);

  const wizard = useSignUpWizard({ next, onConfirmationRequired, onSessionCreated });

  // A visitor who already has a session has no business on a signup form.
  // Unlike /auth this ignores MFA: a brand-new signup can't have a factor, and
  // an existing aal1 session belongs on /auth to finish its challenge.
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, navigate, next]);

  const signInHref = `/auth?next=${encodeURIComponent(next)}`;

  const handleGoogle = async () => {
    wizard.setFormError(null);
    setGoogleBusy(true);
    const { error } = await signInWithGoogle(next);
    if (error) {
      wizard.setFormError(mapAuthError(error));
      setGoogleBusy(false);
    }
    // On success the browser navigates away; leave the button busy.
  };

  const handleResend = async () => {
    if (!confirmEmail || cooldown > 0) return;
    setPanelError(null);
    const { error } = await resendConfirmation(confirmEmail);
    if (error) {
      setPanelError(mapAuthError(error));
      return;
    }
    toast.success("Confirmation email resent.");
    startCooldown();
  };

  if (confirmEmail) {
    return (
      <>
        <SEO title="Confirm your email" noindex />
        <AuthShell illustration="mail-sent">
          <CheckEmailPanel
            title="Confirm your email"
            description="We sent a confirmation link to"
            email={confirmEmail}
            error={panelError}
            cooldown={cooldown}
            onResend={handleResend}
            secondaryLabel="Use a different email"
            onSecondary={() => {
              setConfirmEmail(null);
              setPanelError(null);
            }}
          />
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Create your account"
        description="Join Cresciva — one credible profile and real funding leads for African SME founders."
      />
      <AuthShell>
        <StepIndicator current={wizard.step} steps={SIGNUP_STEPS} />

        {wizard.step > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 gap-1 text-muted-foreground"
            onClick={wizard.back}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        )}

        <AuthAlert error={wizard.formError ?? callbackError} />

        {wizard.duplicate && (
          <p className="mb-4 text-sm">
            <Link to={signInHref} className="font-semibold text-navy hover:underline">
              Sign in instead
            </Link>{" "}
            <span className="text-muted-foreground">
              — or reset your password if you've forgotten it.
            </span>
          </p>
        )}

        {wizard.step === 1 && (
          <StepEmail
            email={wizard.values.email}
            error={wizard.errors.email}
            onChange={(v) => wizard.setValue("email", v)}
            onSubmit={wizard.submitStep}
            onGoogle={handleGoogle}
            googleBusy={googleBusy}
            signInHref={signInHref}
          />
        )}

        {wizard.step === 2 && (
          <StepPassword
            email={wizard.values.email}
            password={wizard.values.password}
            confirm={wizard.values.confirm}
            errors={{ password: wizard.errors.password, confirm: wizard.errors.confirm }}
            onChange={wizard.setValue}
            onSubmit={wizard.submitStep}
          />
        )}

        {wizard.step === 3 && (
          <StepProfile
            fullName={wizard.values.fullName}
            businessName={wizard.values.businessName}
            errors={{
              fullName: wizard.errors.fullName,
              businessName: wizard.errors.businessName,
            }}
            busy={wizard.busy}
            onChange={wizard.setValue}
            onSubmit={wizard.submitStep}
          />
        )}
      </AuthShell>
    </>
  );
};

export default AuthSignUp;
