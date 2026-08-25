import { useCallback, useState } from "react";
import { z } from "zod";
import { useAuth } from "@shared/hooks/useAuth";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/lib/passwordStrength";
import { authRedirectUrl } from "@shared/lib/authOrigin";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";

export const SIGNUP_STEPS = ["Your email", "Create a password", "About you"];

export type SignUpStep = 1 | 2 | 3;

export type SignUpValues = {
  email: string;
  password: string;
  confirm: string;
  fullName: string;
  businessName: string;
};

export type SignUpFieldErrors = Partial<Record<keyof SignUpValues, string>>;

const EMPTY: SignUpValues = {
  email: "",
  password: "",
  confirm: "",
  fullName: "",
  businessName: "",
};

const emailStep = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

const passwordStep = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

// Both fields are optional: an empty business name must never block account
// creation, it only costs the user a pre-filled directory form later.
const profileStep = z.object({
  fullName: z.string().trim().max(80, "Keep this under 80 characters"),
  businessName: z.string().trim().max(120, "Keep this under 120 characters"),
});

const STEP_SCHEMAS = { 1: emailStep, 2: passwordStep, 3: profileStep } as const;

function issuesToErrors(error: z.ZodError): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof SignUpValues;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

interface Options {
  /** Sanitised post-signup destination, echoed into the confirmation email link. */
  next: string;
  /** Called with the address once Supabase asks for email confirmation. */
  onConfirmationRequired: (email: string) => void;
  /** Called when signUp returns a live session (project has confirmation off). */
  onSessionCreated: () => void;
}

/**
 * State machine behind the three-screen signup.
 *
 * Two deliberate choices:
 *
 * 1. **Nothing is sent to Supabase before step 3.** Steps 1 and 2 are pure
 *    client-side validation, so a half-finished wizard never creates an account
 *    and never burns the per-address email rate limit.
 * 2. **State is memory-only.** No sessionStorage: a password typed into a
 *    wizard should not outlive the tab, and a refresh restarting signup is a
 *    smaller cost than a password sitting in web storage.
 */
export function useSignUpWizard({ next, onConfirmationRequired, onSessionCreated }: Options) {
  const { signUp } = useAuth();

  const [step, setStep] = useState<SignUpStep>(1);
  const [values, setValues] = useState<SignUpValues>(EMPTY);
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  // Drives the "Sign in instead" shortcut — the one auth error with an obvious
  // next action, which a generic alert box can't offer.
  const [duplicate, setDuplicate] = useState(false);

  const setValue = useCallback((field: keyof SignUpValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear only this field's error — leave the others so the user still sees
    // what else needs fixing.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }, []);

  const back = useCallback(() => {
    setErrors({});
    setFormError(null);
    setStep((s) => (s > 1 ? ((s - 1) as SignUpStep) : s));
  }, []);

  const submitAccount = useCallback(async () => {
    setBusy(true);
    try {
      const redirect = authRedirectUrl(`/auth?next=${encodeURIComponent(next)}`);
      const { error, confirmationRequired } = await signUp(
        values.email.trim(),
        values.password,
        {
          emailRedirectTo: redirect,
          metadata: {
            full_name: values.fullName.trim(),
            business_name: values.businessName.trim(),
          },
        }
      );

      if (error) {
        const mapped = mapAuthError(error);
        setDuplicate(mapped === mapAuthError({ code: "user_already_exists" }));
        setFormError(mapped);
        return;
      }
      if (confirmationRequired) {
        onConfirmationRequired(values.email.trim());
        return;
      }
      onSessionCreated();
    } finally {
      setBusy(false);
    }
  }, [next, onConfirmationRequired, onSessionCreated, signUp, values]);

  /** Validates the current step, then advances — or, on step 3, submits. */
  const submitStep = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setFormError(null);
      setDuplicate(false);

      const parsed = STEP_SCHEMAS[step].safeParse(values);
      if (!parsed.success) {
        setErrors(issuesToErrors(parsed.error));
        return;
      }
      setErrors({});

      if (step < 3) {
        setStep((s) => (s + 1) as SignUpStep);
        return;
      }
      await submitAccount();
    },
    [step, submitAccount, values]
  );

  return {
    step,
    values,
    errors,
    formError,
    duplicate,
    busy,
    setValue,
    submitStep,
    back,
    setFormError,
  };
}
