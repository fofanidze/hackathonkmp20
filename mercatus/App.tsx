import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { colors } from './src/theme/colors';
import type { Lang, Screen } from './src/types/navigation';
import { User, Resource } from './supabase';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { MainTabs } from './src/screens/MainTabs';
import { CreateScreen } from './src/screens/CreateScreen';
import { MyTradeScreen } from './src/screens/MyTradeScreen';
import { ActiveTradeScreen } from './src/screens/ActiveTradeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { UserProfileScreen } from './src/screens/UserProfileScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Splash');
  const [lang, setLang] = useState<Lang>('en');
  const [user, setUser] = useState<User | null>(null);
  const [selRes, setSelRes] = useState<Resource | null>(null);
  const [profUid, setProfUid] = useState('');
  const [profUname, setProfUname] = useState('');

  function handleLogin(u: User) {
    setUser(u);
    setScreen('Home');
  }

  function handleLogout() {
    setUser(null);
    setScreen('Splash');
  }

  function handleUserUpdate(u: User) {
    setUser(u);
  }

  function handleSelectUser(uid: string, un: string) {
    setProfUid(uid);
    setProfUname(un);
    setScreen('UserProfile');
  }

  const isMainTab = ['Home', 'Map', 'Notifications', 'Profile', 'Chats'].includes(screen);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar style="dark" />
      {screen === 'Splash' && (
        <SplashScreen onNext={setScreen as (s: Screen) => void} lang={lang} setLang={setLang} />
      )}
      {screen === 'Login' && (
        <LoginScreen
          onSuccess={handleLogin}
          onBack={() => setScreen('Splash')}
          onRegister={() => setScreen('Register')}
          lang={lang}
        />
      )}
      {screen === 'Register' && (
        <RegisterScreen onSuccess={handleLogin} onBack={() => setScreen('Login')} lang={lang} />
      )}
      {isMainTab && user && (
        <MainTabs
          lang={lang}
          setLang={setLang}
          user={user}
          onLogout={handleLogout}
          onNavigate={setScreen as (s: Screen) => void}
          onSelectResource={setSelRes as (r: Resource) => void}
          onSelectUser={handleSelectUser}
          onUserUpdate={handleUserUpdate}
        />
      )}
      {screen === 'Create' && user && (
        <CreateScreen
          onBack={() => setScreen('Home')}
          lang={lang}
          user={user}
          onPublished={(r) => {
            setSelRes(r);
            setScreen('MyTrade');
          }}
        />
      )}
      {screen === 'MyTrade' && user && (
        <MyTradeScreen onBack={() => setScreen('Home')} lang={lang} user={user} resource={selRes} />
      )}
      {screen === 'ActiveTrade' && user && (
        <ActiveTradeScreen
          onBack={() => setScreen('Home')}
          lang={lang}
          user={user}
          resource={selRes}
          onViewProfile={handleSelectUser}
          onOpenChat={() => {
            if (selRes) setScreen('Chat');
          }}
        />
      )}
      {screen === 'Chat' && user && selRes && (
        <ChatScreen
          onBack={() => setScreen('Home')}
          onGoToTrade={() => {
            if (selRes) setScreen(selRes.user_id === user.id ? 'MyTrade' : 'ActiveTrade');
          }}
          lang={lang}
          user={user}
          resource={selRes}
        />
      )}
      {screen === 'UserProfile' && (
        <UserProfileScreen
          onBack={() => setScreen('Home')}
          lang={lang}
          userId={profUid}
          username={profUname}
        />
      )}
    </SafeAreaView>
  );
}
