import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormError, FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import { useSignIn } from '@/features/auth/hooks';
import { signInSchema } from '@/features/auth/schemas';

export default function SignInScreen() {
  const signIn = useSignIn();
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  // On success the session changes and the root guard moves on; nothing to do here.
  const onSubmit = form.handleSubmit((values) => signIn.mutate(values));

  return (
    <Screen className="flex-grow justify-center">
      <View className="gap-1 pb-4">
        <Text variant="h3">Fitness Tracker</Text>
        <Text className="text-muted-foreground">Sign in to log workouts, meals and water.</Text>
      </View>

      <FormError message={authErrorMessage(signIn.error)} />

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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Button size="lg" onPress={onSubmit} disabled={signIn.isPending}>
        <Text>{signIn.isPending ? 'Signing in…' : 'Sign in'}</Text>
      </Button>

      <Link href="/forgot-password" asChild>
        <Button variant="link">
          <Text>Forgot password?</Text>
        </Button>
      </Link>

      <View className="flex-row items-center justify-center">
        <Text className="text-muted-foreground">New here?</Text>
        <Link href="/sign-up" asChild>
          <Button variant="link">
            <Text>Create an account</Text>
          </Button>
        </Link>
      </View>
    </Screen>
  );
}
