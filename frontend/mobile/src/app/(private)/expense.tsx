import { Redirect } from 'expo-router';

export default function ExpenseRoute() {
  return <Redirect href="/records?type=expense" />;
}