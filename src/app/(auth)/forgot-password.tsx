import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormError, FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import {
  useRequestPasswordReset,
  useSignOut,
  useUpdatePassword,
  useVerifyRecoveryCode,
} from '@/features/auth/hooks';
import { codeSchema, emailSchema, newPasswordSchema } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session-provider';

export default function ForgotPasswordScreen() {
  const { isRecoveringPassword } = useSession();
  const [email, setEmail] = useState<string | null>(null);

  return (
    <Screen edges={[]}>
      {/* Once the code is verified the user is signed in; don't let them back out half-way. */}
      <Stack.Screen
        options={{
          headerBackVisible: !isRecoveringPassword,
          gestureEnabled: !isRecoveringPassword,
        }}
      />
      {isRecoveringPassword ? (
        <NewPasswordStep />
      ) : email ? (
        <CodeStep email={email} onChangeEmail={() => setEmail(null)} />
      ) : (
        <EmailStep onSent={setEmail} />
      )}
    </Screen>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const request = useRequestPasswordReset();
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(({ email }) =>
    request.mutate(email, { onSuccess: () => onSent(email) }),
  );

  return (
    <>
      <Text className="text-muted-foreground">
        Enter your account email and we&apos;ll send you a 6-digit code.
      </Text>
      <FormError message={authErrorMessage(request.error)} />
      <FormField
        control={form.control}
        name="email"
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />
      <Button size="lg" onPress={onSubmit} disabled={request.isPending}>
        <Text>{request.isPending ? 'Sending…' : 'Send code'}</Text>
      </Button>
    </>
  );
}

function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const verify = useVerifyRecoveryCode();
  const resend = useRequestPasswordReset();
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = form.handleSubmit(({ code }) => verify.mutate({ email, code }));

  return (
    <>
      <Text className="text-muted-foreground">
        If an account exists for {email}, it will get a 6-digit code. It expires in 1 hour.
      </Text>
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
        <Text>{verify.isPending ? 'Verifying…' : 'Verify code'}</Text>
      </Button>
      <View className="flex-row justify-center gap-2">
        <Button
          variant="ghost"
          onPress={() => resend.mutate(email)}
          disabled={resend.isPending || resend.isSuccess}
        >
          <Text>{resend.isSuccess ? 'Code sent' : 'Send a new code'}</Text>
        </Button>
        <Button variant="ghost" onPress={onChangeEmail}>
          <Text>Change email</Text>
        </Button>
      </View>
    </>
  );
}

function NewPasswordStep() {
  const update = useUpdatePassword();
  const signOut = useSignOut();
  const form = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // On success the recovery flag clears and the root guard moves into the app.
  const onSubmit = form.handleSubmit(({ password }) => update.mutate(password));

  return (
    <>
      <Text className="text-muted-foreground">Code verified. Choose a new password.</Text>
      <FormError message={authErrorMessage(update.error ?? signOut.error)} />
      <FormField
        control={form.control}
        name="password"
        label="New password"
        hint="At least 8 characters."
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => form.setFocus('confirmPassword')}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        label="Confirm new password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button size="lg" onPress={onSubmit} disabled={update.isPending}>
        <Text>{update.isPending ? 'Saving…' : 'Save password'}</Text>
      </Button>
      <Button
        variant="ghost"
        onPress={() => signOut.mutate(undefined, { onSuccess: () => router.back() })}
        disabled={signOut.isPending}
      >
        <Text>Cancel</Text>
      </Button>
    </>
  );
}
