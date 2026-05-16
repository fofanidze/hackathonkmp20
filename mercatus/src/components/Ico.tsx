import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import type { IcoName } from '../types/navigation';

type Props = {
  n: IcoName;
  size?: number;
  color?: string;
};

export function Ico({ n, size = 20, color = colors.text }: Props) {
  return <Ionicons name={n} size={size} color={color} />;
}
