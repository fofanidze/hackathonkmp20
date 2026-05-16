import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type Lang = 'en' | 'ua';
export type Screen =
  | 'Splash'
  | 'Login'
  | 'Register'
  | 'Home'
  | 'Map'
  | 'Notifications'
  | 'Create'
  | 'Profile'
  | 'ActiveTrade'
  | 'MyTrade'
  | 'UserProfile'
  | 'Chat';
export type Tab = 'Home' | 'Map' | 'Chats' | 'Notifications' | 'Profile';

export type IcoName = ComponentProps<typeof Ionicons>['name'];

export type Notif = {
  id: string;
  title: string;
  body: string;
  timeStr: string;
  read: boolean;
  color: string;
  icoName: IcoName;
};
