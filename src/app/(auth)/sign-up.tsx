import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormError, FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import { useResendSignUpCode, useSignUp, useVerifySignUpCode } from '@/features/auth/hooks';
import { codeSchema, signUpSchema } from '@/features/auth/schemas';

export default function SignUpScreen() {
  // Set when the project requires email confirmation: we then ask for the emailed code.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  return (
    <Screen edges={[]}>
      {pendingEmail ? (
        <ConfirmCodeStep email={pendingEmail} />
      ) : (
        <DetailsStep onNeedsCode={setPendingEmail} />
      )}
    </Screen>
  );
}

function DetailsStep({ onNeedsCode }: { onNeedsCode: (email: string) => void }) {
  const signUp = useSignUp();
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) =>
    signUp.mutate(values, {
      onSuccess: ({ needsConfirmation }) => {
        // Without confirmation a session exists now and the root guard moves to onboarding.
        if (needsConfirmation) onNeedsCode(values.email);
      },
    }),
  );

  return (
    <>
      <FormError message={authErrorMessage(signUp.error)} />
      <FormField
        control={form.control}
        name="email"
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => form.setFocus('password')}
      />
      <FormField
        control={form.control}
        name="password"
        label="Password"
        hint="At least 8 characters."
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => form.setFocus('confirmPassword')}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        label="Confirm password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button size="lg" onPress={onSubmit} disabled={signUp.isPending}>
        <Text>{signUp.isPending ? 'Creating account…' : 'Create account'}</Text>
      </Button>
    </>
  );
}

function ConfirmCodeStep({ email }: { email: string }) {
  const verify = useVerifySignUpCode();
  const resend = useResendSignUpCode();
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = form.handleSubmit(({ code }) => verify.mutate({ email, code }));

  return (
    <>
      <View className="gap-1">
        <Text variant="large">Check your email</Text>
        <Text className="text-muted-foreground">
          We sent a 6-digit code to {email}. Enter it to finish creating your account.
        </Text>
      </View>
      <FormError message={authErrorMessage(verify.error ?? resend.error)} />
      <FormField
        control={form.control}
        name="code"
        label="Code"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button size="lg" onPress={onSubmit} disabled={verify.isPending}>
        <Text>{verify.isPending ? 'Verifying…' : 'Verify'}</Text>
      </Button>
      <Button
        variant="ghost"
        onPress={() => resend.mutate(email)}
        disabled={resend.isPending || resend.isSuccess}
      >
        <Text>{resend.isSuccess ? 'Code sent' : 'Send a new code'}</Text>
      </Button>
    </>
  );
}
