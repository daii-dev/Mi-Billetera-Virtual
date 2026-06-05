import { ImageSourcePropType } from 'react-native';

type OnboardingPage = {
  title: string;
  description: string;
  image: ImageSourcePropType;
};
export const onboardingPages = [
  {
    title: 'Controla tus finanzas',
    description: 'Registra tus ingresos y gastos de manera fácil y segura',
    image: require('../../../assets/carrusel1.png'),
  },
  {
    title: 'Configura tu balance',
    description: 'Ingresa tu saldo inicial y comienza con el control de tu dinero',
    image: require('../../../assets/carrusel2.png'),
  },
  {
    title: 'Crea tus propias categorías',
    description: 'Organiza tus ingresos y gastos con categorías personalizadas según tus necesidades',
    image: require('../../../assets/carrusel3.png'),
  },
  {
    title: 'Alcanza tus metas',
    description: 'Define objetivos de ahorro y sigue tu progreso',
    image: require('../../../assets/carrusel4.png'),
  },
];