import { Redirect } from 'expo-router';

// Root layout handles role-based routing; this is a fallback redirect.
export default function Index() {
  return <Redirect href="/(auth)/landing" />;
}
