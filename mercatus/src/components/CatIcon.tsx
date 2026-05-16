import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { catIcon } from '../utils/categories';
import type { IcoName } from '../types/navigation';

type Props = {
  item: string;
  size?: number;
  color?: string;
};

export function CatIcon({ item, size = 24, color }: Props) {
  return <Ionicons name={catIcon(item) as IcoName} size={size} color={color} />;
}
