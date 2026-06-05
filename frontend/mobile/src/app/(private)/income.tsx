import { Redirect } from 'expo-router';

export default function IncomeRoute() {
  return <Redirect href="/records?type=income" />;
}