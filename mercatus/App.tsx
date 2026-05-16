import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  SafeAreaView, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  registerUser, loginUser, addResource, completeTrade, cancelTrade, deleteResource,
  getTradeHistory, getAllResources, subscribeToResources, subscribeToResource,
  calcDistance, updateUser, getUserById, getUserResources, getUserChats,
  sendMessage, getMessages, subscribeToMessages, reportUser,
  User, Resource, TradeHistory, Message,
} from './supabase';

// ─── COLORS ──────────────────────────────────────────
const C = {
  bg: '#F7F7F7', card: '#FFFFFF', border: '#EBEBEB', divider: '#F0F0F0',
  text: '#1A1A1A', textSub: '#717171', textLight: '#AAAAAA',
  green: '#00897B', greenLight: '#E8F5E9',
  red: '#FF385C', redLight: '#FFF0F3',
  yellow: '#FF8C00', yellowLight: '#FFF4E5',
  blue: '#0066FF', blueLight: '#EEF4FF',
  purple: '#7B2FF7', orange: '#F97316', white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
};

// ─── TYPES ───────────────────────────────────────────
type Lang   = 'en' | 'ua';
type Screen = 'Splash'|'Login'|'Register'|'Home'|'Map'|'Notifications'|'Create'|'Profile'|'ActiveTrade'|'MyTrade'|'UserProfile'|'Chat';
type Tab    = 'Home'|'Map'|'Chats'|'Notifications'|'Profile';

// ─── CATEGORIES ──────────────────────────────────────
const RES_EN = ['Water','Batteries','Medicine','Fuel','Food','Tools','Clothing','Hygiene','Signal','Transport','First Aid','Baby Items'];
const RES_UA = ['Вода','Батарейки','Ліки','Пальне','Їжа','Інструменти','Одяг','Гігієна','Зв\'язок','Транспорт','Перша допомога','Дитячі'];
const CHAIN  = [C.green, C.blue, C.purple, C.orange];

const CAT_ICONS: Record<string, string> = {
  'Water': 'water-outline', 'Batteries': 'battery-half-outline', 'Medicine': 'medkit-outline',
  'Fuel': 'flame-outline', 'Food': 'nutrition-outline', 'Tools': 'build-outline',
  'Clothing': 'shirt-outline', 'Hygiene': 'hand-left-outline', 'Signal': 'wifi-outline',
  'Transport': 'car-outline', 'First Aid': 'bandage-outline', 'Baby Items': 'people-outline',
};

const URG: Record<string,{color:string;bg:string;label:string;labelUa:string}> = {
  low:      { color:'#2E7D32', bg:'#E8F5E9', label:'Low',      labelUa:'Низька'   },
  medium:   { color:'#E65100', bg:'#FFF4E5', label:'Medium',   labelUa:'Середня'  },
  critical: { color:'#C62828', bg:'#FFF0F3', label:'Critical', labelUa:'Критична' },
};

// ─── HELPERS ─────────────────────────────────────────
function uColor(name: string): string {
  const cols = [C.green,'#1565C0','#6A1B9A',C.orange,'#AD1457','#00838F'];
  let h = 0; for (let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  return cols[Math.abs(h)%cols.length];
}
function catIcon(item: string): string { return CAT_ICONS[item] ?? 'cube-outline'; }
function pd(s:string):Date { if(!s)return new Date(); if(!s.endsWith('Z')&&!s.includes('+')&&!s.includes('-',10))return new Date(s+'Z'); return new Date(s); }
function ago(d:string,ua:boolean):string {
  const diff=Date.now()-pd(d).getTime(),m=Math.floor(diff/60000),h=Math.floor(diff/3600000),dy=Math.floor(diff/86400000);
  if(m<1)return ua?'щойно':'just now';if(m<60)return ua?`${m} хв тому`:`${m}m ago`;
  if(h<24)return ua?`${h} год тому`:`${h}h ago`;if(dy===1)return ua?'вчора':'yesterday';
  return ua?`${dy} дн тому`:`${dy}d ago`;
}
function isToday(d:string):boolean { return pd(d).toDateString()===new Date().toDateString(); }

// icon shorthand
type IcoName = React.ComponentProps<typeof Ionicons>['name'];
function Ico({n,size=20,color=C.text}:{n:IcoName;size?:number;color?:string}) {
  return <Ionicons name={n} size={size} color={color}/>;
}

type Notif={id:string;title:string;body:string;timeStr:string;read:boolean;color:string;icoName:IcoName};
function buildNotifs(history:TradeHistory[],resources:Resource[],user:User,ua:boolean):Notif[] {
  const n:Notif[]=[];
  const uniq=history.reduce((a:TradeHistory[],h)=>{if(!a.find(x=>x.partner_username===h.partner_username&&x.gave===h.gave))a.push(h);return a;},[]);
  uniq.slice(0,5).forEach(h=>n.push({id:`t-${h.id}`,title:ua?'Обмін завершено':'Trade Complete',body:ua?`${h.gave}↔${h.received} з ${h.partner_username}`:`${h.gave}↔${h.received} with ${h.partner_username}`,timeStr:h.created_at,read:pd(h.created_at).getTime()<Date.now()-3600000,color:C.green,icoName:'checkmark-circle-outline'}));
  resources.filter(r=>r.urgency==='critical'&&r.user_id!==user.id).slice(0,2).forEach(r=>n.push({id:`c-${r.id}`,title:ua?'Критичний запит':'Critical Nearby',body:ua?`${r.username} потребує ${r.need}`:`${r.username} needs ${r.need}`,timeStr:r.created_at,read:false,color:C.red,icoName:'warning-outline'}));
  const my=resources.filter(r=>r.user_id===user.id);
  resources.filter(r=>r.user_id!==user.id).slice(0,3).forEach(r=>{if(my.find(m=>m.need===r.have||m.have===r.need))n.push({id:`m-${r.id}`,title:ua?'Знайдено збіг!':'Match Found!',body:ua?`${r.username} має ${r.have}`:`${r.username} has ${r.have}`,timeStr:r.created_at,read:false,color:C.blue,icoName:'flash-outline'});});
  return n.sort((a,b)=>pd(b.timeStr).getTime()-pd(a.timeStr).getTime());
}

// ─── BOTTOM NAV ──────────────────────────────────────
function BottomNav({tab,setTab,unread,lang}:{tab:Tab;setTab:(t:Tab)=>void;unread:number;lang:Lang}) {
  const ua=lang==='ua';
  const items:{name:IcoName;activeIcon:IcoName;label:string;tab:Tab;badge?:number}[]=[
    {name:'home-outline',activeIcon:'home',label:ua?'Головна':'Home',tab:'Home'},
    {name:'map-outline',activeIcon:'map',label:ua?'Карта':'Map',tab:'Map'},
    {name:'chatbubble-outline',activeIcon:'chatbubble',label:ua?'Чати':'Chats',tab:'Chats'},
    {name:'notifications-outline',activeIcon:'notifications',label:ua?'Сповіщ.':'Alerts',tab:'Notifications',badge:unread},
    {name:'person-outline',activeIcon:'person',label:ua?'Профіль':'Profile',tab:'Profile'},
  ];
  return (
    <View style={s.nav}>
      {items.map(it=>{
        const active=tab===it.tab;
        return (
          <TouchableOpacity key={it.tab} style={s.navItem} onPress={()=>setTab(it.tab)}>
            <View style={[s.navIconBox,active&&s.navIconBoxActive]}>
              <Ionicons name={active?it.activeIcon:it.name} size={24} color={active?C.green:C.textLight}/>
              {(it.badge??0)>0&&<View style={s.navBadge}><Text style={{color:'#fff',fontSize:8,fontWeight:'700'}}>{it.badge}</Text></View>}
            </View>
            <Text style={[s.navLabel,{color:active?C.green:C.textLight}]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── SPLASH ──────────────────────────────────────────
function SplashScreen({onNext,lang,setLang}:{onNext:(s:Screen)=>void;lang:Lang;setLang:(l:Lang)=>void}) {
  return (
    <View style={[s.container,{alignItems:'center',justifyContent:'center',backgroundColor:C.white}]}>
      <View style={{flexDirection:'row',gap:10,marginBottom:60}}>
        <TouchableOpacity style={[s.langChip,lang==='en'&&s.langChipA]} onPress={()=>setLang('en')}><Text style={[s.langChipTxt,lang==='en'&&{color:C.white}]}>🇬🇧 EN</Text></TouchableOpacity>
        <TouchableOpacity style={[s.langChip,lang==='ua'&&s.langChipA]} onPress={()=>setLang('ua')}><Text style={[s.langChipTxt,lang==='ua'&&{color:C.white}]}>🇺🇦 UA</Text></TouchableOpacity>
      </View>
      <View style={s.splashLogo}><Ico n="swap-horizontal-outline" size={52} color={C.green}/></View>
      <Text style={s.splashTitle}>{lang==='ua'?'Меркатус':'Mercatus'}</Text>
      <Text style={s.splashSub}>{lang==='ua'?'Обміняй те, що маєш.\nОтримай те, що треба.':'Exchange what you have.\nGet what you need.'}</Text>
      <View style={{width:'100%',paddingHorizontal:28,gap:14,marginTop:52}}>
        <TouchableOpacity style={s.btn} onPress={()=>onNext('Login')}><Text style={s.btnTxt}>{lang==='ua'?'Увійти':'Log in'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.btnOut} onPress={()=>onNext('Register')}><Text style={s.btnOutTxt}>{lang==='ua'?'Реєстрація':'Create account'}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LOGIN ───────────────────────────────────────────
function LoginScreen({onSuccess,onBack,onRegister,lang}:{onSuccess:(u:User)=>void;onBack:()=>void;onRegister:()=>void;lang:Lang}) {
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  const ua=lang==='ua';
  async function handle(){if(!username||!password){setError(ua?'Заповніть всі поля':'Fill all fields');return;}setLoading(true);setError('');const r=await loginUser(username,password);setLoading(false);if(r.ok&&r.user)onSuccess(r.user);else setError(ua?'Невірний логін або пароль':'Wrong credentials');}
  return (
    <View style={s.container}>
      <View style={s.topBar}><TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity></View>
      <View style={{flex:1,padding:24}}>
        <Text style={s.authTitle}>{ua?'Ласкаво просимо':'Welcome back'}</Text>
        <Text style={[s.authSub,{marginBottom:36}]}>{ua?'Увійдіть до акаунту':'Log in to your account'}</Text>
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>{ua?'Імʼя':'Username'}</Text><TextInput style={s.field} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={C.textLight} placeholder={ua?'Введіть імʼя':'Enter username'}/></View>
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>{ua?'Пароль':'Password'}</Text><TextInput style={s.field} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.textLight} placeholder="••••••"/></View>
        {error?<View style={s.errBox}><Text style={s.errTxt}>{error}</Text></View>:null}
        <TouchableOpacity style={[s.btn,{marginTop:28}]} onPress={handle} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>{ua?'Увійти':'Log in'}</Text>}</TouchableOpacity>
        <TouchableOpacity onPress={onRegister} style={{alignItems:'center',marginTop:20}}><Text style={{color:C.textSub,fontSize:14}}>{ua?'Немає акаунту? ':'No account? '}<Text style={{color:C.green,fontWeight:'600'}}>{ua?'Реєстрація':'Sign up'}</Text></Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ─── REGISTER ────────────────────────────────────────
function RegisterScreen({onSuccess,onBack,lang}:{onSuccess:(u:User)=>void;onBack:()=>void;lang:Lang}) {
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  const ua=lang==='ua';
  async function handle(){if(!username||!password||!confirm){setError(ua?'Заповніть всі поля':'Fill all fields');return;}if(password!==confirm){setError(ua?'Паролі не співпадають':'Passwords do not match');return;}if(password.length<6){setError('Min 6 chars');return;}setLoading(true);setError('');const r=await registerUser(username,password,lang);setLoading(false);if(r.ok&&r.user)onSuccess(r.user);else setError(r.error??'Error');}
  return (
    <View style={s.container}>
      <View style={s.topBar}><TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity></View>
      <View style={{flex:1,padding:24}}>
        <Text style={s.authTitle}>{ua?'Створіть акаунт':'Create account'}</Text>
        <Text style={[s.authSub,{marginBottom:36}]}>{ua?'Приєднайтесь до мережі обміну':'Join the exchange network'}</Text>
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>{ua?'Імʼя':'Username'}</Text><TextInput style={s.field} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={C.textLight} placeholder="min 3 chars"/></View>
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>{ua?'Пароль':'Password'}</Text><TextInput style={s.field} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.textLight} placeholder="min 6 chars"/></View>
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>{ua?'Підтвердіть':'Confirm'}</Text><TextInput style={s.field} value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor={C.textLight} placeholder={ua?'Повторіть':'Repeat'}/></View>
        {error?<View style={s.errBox}><Text style={s.errTxt}>{error}</Text></View>:null}
        <TouchableOpacity style={[s.btn,{marginTop:28}]} onPress={handle} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>{ua?'Зареєструватись':'Create account'}</Text>}</TouchableOpacity>
      </View>
    </View>
  );
}

// ─── RESOURCE CARD ───────────────────────────────────
function ResourceCard({r,user,myCoords,lang,onPress,onPressUser}:{r:Resource;user:User;myCoords:{lat:number;lng:number}|null;lang:Lang;onPress:()=>void;onPressUser:()=>void}) {
  const ua=lang==='ua';const u=URG[r.urgency]??URG.medium;const isOwn=r.user_id===user.id;
  const dist=myCoords&&r.lat&&r.lng?calcDistance(myCoords.lat,myCoords.lng,r.lat,r.lng):null;
  const uc=uColor(r.username);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.95}>
      {!!r.photo_url&&<Image source={{uri:r.photo_url}} style={{width:'100%',height:180,borderRadius:12,marginBottom:14}} resizeMode="cover"/>}
      <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12}}>
        <View style={[s.avatarSm,{backgroundColor:uc+'22',borderColor:uc+'44'}]}><Text style={{fontSize:12,fontWeight:'700',color:uc}}>{r.username.slice(0,2).toUpperCase()}</Text></View>
        <View style={{flex:1}}>
          <TouchableOpacity onPress={onPressUser} hitSlop={{top:8,bottom:8,left:0,right:0}}>
            <Text style={{fontSize:14,fontWeight:'700',color:isOwn?C.green:C.text}}>{r.username}{isOwn?<Text style={{color:C.green,fontSize:11}}> (you)</Text>:null}</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2}}>
            {dist&&<><Ico n="location-outline" size={12} color={C.textSub}/><Text style={{fontSize:12,color:C.textSub,marginRight:4}}>{dist}  · </Text></>}
            <Text style={{fontSize:12,color:C.textSub}}>{ago(r.created_at,ua)}</Text>
          </View>
        </View>
        <View style={[s.urgBadge,{backgroundColor:u.bg}]}><Text style={[s.urgBadgeTxt,{color:u.color}]}>{ua?u.labelUa:u.label}</Text></View>
      </View>
      <View style={s.tradeRow}>
        <View style={[s.tradeBox,{backgroundColor:C.greenLight,borderColor:'#C8E6C9',alignItems:'center'}]}>
          <Ionicons name={catIcon(r.have) as IcoName} size={24} color={C.green}/>
          <Text style={{fontSize:10,color:C.green,fontWeight:'600',marginTop:6,marginBottom:2}}>{ua?'ПРОПОНУЮ':'OFFERING'}</Text>
          <Text style={{fontSize:13,fontWeight:'700',color:C.text}}>{r.have}</Text>
        </View>
        <View style={{alignItems:'center',justifyContent:'center',paddingHorizontal:4}}><Ico n="swap-horizontal-outline" size={20} color={C.textLight}/></View>
        <View style={[s.tradeBox,{backgroundColor:C.blueLight,borderColor:'#BBDEFB',alignItems:'center'}]}>
          <Ionicons name={catIcon(r.need) as IcoName} size={24} color={C.blue}/>
          <Text style={{fontSize:10,color:C.blue,fontWeight:'600',marginTop:6,marginBottom:2}}>{ua?'ПОТРІБНО':'LOOKING FOR'}</Text>
          <Text style={{fontSize:13,fontWeight:'700',color:C.text}}>{r.need}</Text>
        </View>
      </View>
      {!!r.description&&<Text style={{color:C.textSub,fontSize:13,marginTop:12,lineHeight:19}} numberOfLines={2}>{r.description}</Text>}
    </TouchableOpacity>
  );
}

// ─── HOME ────────────────────────────────────────────
function HomeContent({onNavigate,lang,user,onSelectResource,onSelectUser,onSwitchToMap}:{onNavigate:(s:Screen)=>void;lang:Lang;user:User;onSelectResource:(r:Resource)=>void;onSelectUser:(uid:string,un:string)=>void;onSwitchToMap:()=>void}) {
  const [resources,setResources]=useState<Resource[]>([]);const [loading,setLoading]=useState(true);const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null);
  const [search,setSearch]=useState('');const [fu,setFu]=useState('');const [fc,setFc]=useState('');const [showF,setShowF]=useState(false);
  const ua=lang==='ua';const uc=uColor(user.username);
  useEffect(()=>{load();getLoc();const ch=subscribeToResources(r=>setResources(r));return()=>ch.unsubscribe();},[]);
  async function getLoc(){try{const {status}=await Location.requestForegroundPermissionsAsync();if(status!=='granted')return;const l=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCoords({lat:l.coords.latitude,lng:l.coords.longitude});}catch{}}
  async function load(){setLoading(true);setResources(await getAllResources());setLoading(false);}
  const filtered=resources.filter(r=>{const q=search.toLowerCase();return(!q||r.have.toLowerCase().includes(q)||r.need.toLowerCase().includes(q)||r.username.toLowerCase().includes(q)||(r.description??'').toLowerCase().includes(q))&&(!fu||r.urgency===fu)&&(!fc||r.have===fc||r.need===fc);});
  const af=[fu,fc].filter(Boolean).length;
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.homeHdr}>
        <View style={{flex:1}}>
          <Text style={s.greeting}>{ua?`Привіт, ${user.username}!`:`Hi, ${user.username}!`}</Text>
          <Text style={s.greetingSub}>{resources.length} {ua?'активних запитів':'listings near you'}</Text>
        </View>
        <View style={[s.avatarMd,{backgroundColor:uc+'22',borderColor:uc+'44',overflow:'hidden'}]}>
          {user.avatar_url?<Image source={{uri:user.avatar_url}} style={{width:'100%',height:'100%',borderRadius:23}}/>:<Text style={{fontSize:16,fontWeight:'700',color:uc}}>{user.username.slice(0,2).toUpperCase()}</Text>}
        </View>
      </View>

      <TouchableOpacity style={s.mapTeaser} onPress={onSwitchToMap} activeOpacity={0.9}>
        <View style={[s.mapTeaserIcon]}><Ico n="map-outline" size={22} color={C.green}/></View>
        <View style={{flex:1}}>
          <Text style={{fontSize:14,fontWeight:'600',color:C.text}}>{ua?'Переглянути на карті':'Browse on map'}</Text>
          <Text style={{fontSize:12,color:C.textSub}}>{ua?'Знайди запити поруч':'Find listings near you'}</Text>
        </View>
        <Ico n="chevron-forward" size={18} color={C.green}/>
      </TouchableOpacity>

      <View style={{paddingHorizontal:16,gap:8,marginBottom:8}}>
        <View style={s.searchBar}>
          <Ico n="search-outline" size={18} color={C.textLight}/>
          <TextInput style={{flex:1,color:C.text,fontSize:14}} value={search} onChangeText={setSearch} placeholder={ua?'Пошук запитів...':'Search listings...'} placeholderTextColor={C.textLight}/>
          {search.length>0&&<TouchableOpacity onPress={()=>setSearch('')}><Ico n="close" size={18} color={C.textLight}/></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          <TouchableOpacity style={[s.filterChip,showF&&{backgroundColor:C.green,borderColor:C.green}]} onPress={()=>setShowF(!showF)}>
            <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Ico n="options-outline" size={14} color={showF?C.white:C.textSub}/><Text style={[s.filterChipTxt,showF&&{color:C.white}]}>{ua?'Фільтри':'Filters'}{af>0?` (${af})`:''}</Text></View>
          </TouchableOpacity>
          {(['low','medium','critical'] as const).map(u=>{const urg=URG[u];const a=fu===u;return<TouchableOpacity key={u} style={[s.filterChip,a&&{backgroundColor:urg.color,borderColor:urg.color}]} onPress={()=>setFu(a?'':u)}><Text style={[s.filterChipTxt,a&&{color:C.white}]}>{ua?urg.labelUa:urg.label}</Text></TouchableOpacity>;})}
        </ScrollView>
      </View>

      {showF&&(
        <View style={{paddingHorizontal:16,marginBottom:10}}>
          <Text style={[s.secLbl,{marginBottom:8}]}>{ua?'Категорія':'Category'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
            {['',...RES_EN].map((cat,i)=>{const a=fc===cat;const label=cat===''?(ua?'Всі':'All'):(ua?RES_UA[i-1]:cat);return(
              <TouchableOpacity key={cat} onPress={()=>setFc(cat)} style={[s.catChip,a&&{backgroundColor:C.green,borderColor:C.green}]}>
                {cat===''?<Ico n="apps-outline" size={14} color={a?C.white:C.textSub}/>:<Ionicons name={catIcon(cat) as IcoName} size={14} color={a?C.white:C.textSub}/>}
                <Text style={[s.catChipTxt,a&&{color:C.white}]}>{label}</Text>
              </TouchableOpacity>
            );})}
          </ScrollView>
          {af>0&&<TouchableOpacity onPress={()=>{setFu('');setFc('');}} style={{marginTop:8,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4}}><Ico n="close-circle-outline" size={14} color={C.red}/><Text style={{color:C.red,fontSize:13,fontWeight:'500'}}>{ua?'Скинути':'Clear filters'}</Text></TouchableOpacity>}
        </View>
      )}

      <View style={{paddingHorizontal:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <Text style={s.secLbl}>{ua?'Активні запити':'Active listings'}</Text>
        <Text style={{color:C.textLight,fontSize:12}}>{filtered.length}{resources.length!==filtered.length?` / ${resources.length}`:''}</Text>
      </View>

      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:12}}>
        {loading?<View style={{paddingTop:60,alignItems:'center',gap:12}}><ActivityIndicator color={C.green} size="large"/><Text style={{color:C.textSub}}>{ua?'Завантаження...':'Loading...'}</Text></View>
        :filtered.length===0?<View style={{paddingTop:60,alignItems:'center',gap:12}}><Ionicons name={search||af>0?'search-outline':'mail-open-outline'} size={52} color={C.textLight}/><Text style={{color:C.text,fontSize:17,fontWeight:'600'}}>{search||af>0?(ua?'Нічого не знайдено':'Nothing found'):(ua?'Запитів поки немає':'No listings yet')}</Text><Text style={{color:C.textSub,textAlign:'center'}}>{search||af>0?(ua?'Спробуйте інший запит':'Try different search'):(ua?'Натисніть + щоб додати':'Tap + to add first')}</Text></View>
        :filtered.map(r=>(
          <ResourceCard key={r.id} r={r} user={user} myCoords={coords} lang={lang}
            onPress={()=>{onSelectResource(r);onNavigate(r.user_id===user.id?'MyTrade':'ActiveTrade');}}
            onPressUser={()=>{if(r.user_id!==user.id)onSelectUser(r.user_id,r.username);}}/>
        ))}
        <View style={{height:80}}/>
      </ScrollView>
      <TouchableOpacity style={s.fab} onPress={()=>onNavigate('Create')} activeOpacity={0.9}><Ico n="add" size={30} color={C.white}/></TouchableOpacity>
    </View>
  );
}

// ─── MAP ─────────────────────────────────────────────
const lightMap=[{featureType:'water',elementType:'geometry',stylers:[{color:'#C8E6EF'}]},{featureType:'landscape',elementType:'geometry',stylers:[{color:'#F5F5F0'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#FFFFFF'}]},{featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#E0E0E0'}]},{elementType:'labels.text.fill',stylers:[{color:'#555555'}]}];

function MapContent({onNavigate,lang,user,onSelectResource,onSelectUser}:{onNavigate:(s:Screen)=>void;lang:Lang;user:User;onSelectResource:(r:Resource)=>void;onSelectUser:(uid:string,un:string)=>void}) {
  const ua=lang==='ua';const [resources,setResources]=useState<Resource[]>([]);const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null);const [selected,setSelected]=useState<Resource|null>(null);const [loading,setLoading]=useState(true);const mapRef=useRef<MapView>(null);
  useEffect(()=>{getLoc();getAllResources().then(r=>{setResources(r);setLoading(false);});const ch=subscribeToResources(r=>setResources(r));return()=>ch.unsubscribe();},[]);
  async function getLoc(){try{const {status}=await Location.requestForegroundPermissionsAsync();if(status!=='granted')return;const l=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCoords({lat:l.coords.latitude,lng:l.coords.longitude});}catch{}}
  if(loading||!coords)return<View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.green} size="large"/></View>;
  const wc=resources.filter(r=>r.lat&&r.lng);
  return (
    <View style={{flex:1}}>
      <MapView ref={mapRef} style={{flex:1}} provider={PROVIDER_DEFAULT} initialRegion={{latitude:coords.lat,longitude:coords.lng,latitudeDelta:0.02,longitudeDelta:0.02}} customMapStyle={lightMap} showsUserLocation showsMyLocationButton={false}>
        <Circle center={{latitude:coords.lat,longitude:coords.lng}} radius={2500} strokeColor={C.green+'44'} fillColor={C.green+'11'} strokeWidth={1.5}/>
        {wc.map(r=>{const isOwn=r.user_id===user.id;const u=URG[r.urgency]??URG.medium;
          return(<Marker key={r.id} coordinate={{latitude:r.lat!,longitude:r.lng!}} onPress={()=>setSelected(r)}>
            <View style={[s.mapPin,{backgroundColor:isOwn?C.green:u.color}]}><Ionicons name={catIcon(r.have) as IcoName} size={16} color="#fff"/></View>
          </Marker>);
        })}
      </MapView>
      <View style={s.mapHdr}>
        <View style={{flex:1}}><Text style={{color:C.text,fontSize:15,fontWeight:'700'}}>{ua?'Карта ресурсів':'Resource Map'}</Text><Text style={{color:C.textSub,fontSize:12}}>{wc.length} {ua?'на карті':'on map'}</Text></View>
        <TouchableOpacity style={s.mapCircleBtn} onPress={()=>mapRef.current?.animateToRegion({latitude:coords.lat,longitude:coords.lng,latitudeDelta:0.01,longitudeDelta:0.01},500)}><Ico n="locate-outline" size={20} color={C.green}/></TouchableOpacity>
      </View>
      <View style={s.mapLegend}>
        {[{c:'#2E7D32',l:ua?'Низька':'Low'},{c:'#E65100',l:ua?'Середня':'Medium'},{c:'#C62828',l:ua?'Критична':'Critical'},{c:C.green,l:ua?'Мій':'Mine'}].map((it,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:10,height:10,borderRadius:5,backgroundColor:it.c}}/><Text style={{color:C.textSub,fontSize:11}}>{it.l}</Text></View>
        ))}
      </View>
      {selected&&(
        <View style={s.mapPopup}>
          <TouchableOpacity style={s.mapPopupClose} onPress={()=>setSelected(null)}><Ico n="close" size={20} color={C.textSub}/></TouchableOpacity>
          {!!selected.photo_url&&<Image source={{uri:selected.photo_url}} style={{width:'100%',height:110,borderRadius:12,marginBottom:12}} resizeMode="cover"/>}
          <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10}}>
            <View style={[s.avatarSm,{backgroundColor:uColor(selected.username)+'22'}]}><Text style={{fontSize:12,fontWeight:'700',color:uColor(selected.username)}}>{selected.username.slice(0,2).toUpperCase()}</Text></View>
            <View style={{flex:1}}>
              <TouchableOpacity onPress={()=>{if(selected.user_id!==user.id){setSelected(null);onSelectUser(selected.user_id,selected.username);}}}><Text style={{color:C.text,fontSize:14,fontWeight:'600'}}>{selected.username}</Text></TouchableOpacity>
              {coords&&selected.lat&&selected.lng&&<View style={{flexDirection:'row',alignItems:'center',gap:3}}><Ico n="location-outline" size={12} color={C.green}/><Text style={{color:C.green,fontSize:12}}>{calcDistance(coords.lat,coords.lng,selected.lat,selected.lng)}</Text></View>}
            </View>
            <View style={[s.urgBadge,{backgroundColor:(URG[selected.urgency]??URG.medium).bg}]}><Text style={[s.urgBadgeTxt,{color:(URG[selected.urgency]??URG.medium).color}]}>{ua?(URG[selected.urgency]??URG.medium).labelUa:(URG[selected.urgency]??URG.medium).label}</Text></View>
          </View>
          <View style={s.tradeRow}>
            <View style={[s.tradeBox,{backgroundColor:C.greenLight,borderColor:'#C8E6C9',alignItems:'center'}]}><Ionicons name={catIcon(selected.have) as IcoName} size={20} color={C.green}/><Text style={{fontSize:10,color:C.green,fontWeight:'600',marginTop:4}}>{ua?'ПРОПОНУЮ':'OFFERING'}</Text><Text style={{fontSize:12,fontWeight:'700',color:C.text,marginTop:2}}>{selected.have}</Text></View>
            <View style={{alignItems:'center',justifyContent:'center',paddingHorizontal:4}}><Ico n="swap-horizontal-outline" size={18} color={C.textLight}/></View>
            <View style={[s.tradeBox,{backgroundColor:C.blueLight,borderColor:'#BBDEFB',alignItems:'center'}]}><Ionicons name={catIcon(selected.need) as IcoName} size={20} color={C.blue}/><Text style={{fontSize:10,color:C.blue,fontWeight:'600',marginTop:4}}>{ua?'ПОТРІБНО':'LOOKING FOR'}</Text><Text style={{fontSize:12,fontWeight:'700',color:C.text,marginTop:2}}>{selected.need}</Text></View>
          </View>
          <TouchableOpacity style={[s.btn,{marginTop:14}]} onPress={()=>{onSelectResource(selected);setSelected(null);onNavigate(selected.user_id===user.id?'MyTrade':'ActiveTrade');}}>
            <Text style={s.btnTxt}>{selected.user_id===user.id?(ua?'Переглянути':'View'):(ua?'Обмінятись':'Trade')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── NOTIFICATIONS ───────────────────────────────────
function NotificationsContent({lang,user}:{lang:Lang;user:User}) {
  const ua=lang==='ua';const [notifs,setNotifs]=useState<Notif[]>([]);const [loading,setLoading]=useState(true);const [ra,setRa]=useState(false);
  useEffect(()=>{(async()=>{setLoading(true);const [h,r]=await Promise.all([getTradeHistory(user.id),getAllResources()]);setNotifs(buildNotifs(h,r,user,ua));setLoading(false);})();},[]);
  const disp=ra?notifs.map(n=>({...n,read:true})):notifs;const unread=disp.filter(n=>!n.read).length;const todayN=disp.filter(n=>isToday(n.timeStr));const oldN=disp.filter(n=>!isToday(n.timeStr));
  function rn(n:Notif){return(
    <View key={n.id} style={[s.notifCard,!n.read&&{borderLeftWidth:3,borderLeftColor:n.color}]}>
      <View style={[s.notifIconBox,{backgroundColor:n.color+'22'}]}><Ionicons name={n.icoName} size={22} color={n.color}/>{!n.read&&<View style={[s.unreadDot,{backgroundColor:n.color}]}/>}</View>
      <View style={{flex:1,gap:3}}><Text style={{fontSize:14,fontWeight:n.read?'500':'700',color:C.text}}>{n.title}</Text><Text style={{fontSize:13,color:C.textSub,lineHeight:18}} numberOfLines={2}>{n.body}</Text><Text style={{fontSize:11,color:C.textLight}}>{ago(n.timeStr,ua)}</Text></View>
    </View>
  );}
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.screenHdr}><Text style={s.screenTitle}>{ua?'Сповіщення':'Notifications'}</Text>{unread>0&&<TouchableOpacity onPress={()=>setRa(true)}><Text style={{color:C.green,fontSize:13,fontWeight:'600'}}>{ua?'Прочитати всі':'Mark all read'}</Text></TouchableOpacity>}</View>
      {loading?<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.green} size="large"/></View>
      :notifs.length===0?<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><Ico n="notifications-outline" size={52} color={C.textLight}/><Text style={{color:C.text,fontSize:17,fontWeight:'600'}}>{ua?'Поки тихо':'All quiet'}</Text></View>
      :(
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:4}}>
          {unread>0&&<View style={{flexDirection:'row',marginBottom:12}}><View style={[s.chip,{backgroundColor:C.green+'22',borderColor:C.green+'44'}]}><Text style={{color:C.green,fontSize:12,fontWeight:'600'}}>{unread} {ua?'нових':'new'}</Text></View></View>}
          {todayN.length>0&&<><Text style={s.notifSec}>{ua?'СЬОГОДНІ':'TODAY'}</Text>{todayN.map(rn)}</>}
          {oldN.length>0&&<><Text style={[s.notifSec,{marginTop:16}]}>{ua?'РАНІШЕ':'EARLIER'}</Text>{oldN.map(rn)}</>}
          <View style={{height:20}}/>
        </ScrollView>
      )}
    </View>
  );
}

// ─── PROFILE ─────────────────────────────────────────
function ProfileContent({lang,setLang,user,onLogout,onUserUpdate}:{lang:Lang;setLang:(l:Lang)=>void;user:User;onLogout:()=>void;onUserUpdate:(u:User)=>void}) {
  const ua=lang==='ua';const [history,setHistory]=useState<TradeHistory[]>([]);const [loadH,setLoadH]=useState(true);const [editing,setEditing]=useState(false);const [newName,setNewName]=useState(user.username);const [avatarUri,setAvatarUri]=useState<string|null>(null);const [avatarB64,setAvatarB64]=useState<string|null>(null);const [saving,setSaving]=useState(false);const [editErr,setEditErr]=useState('');const [reportTgt,setReportTgt]=useState<{username:string;userId:string}|null>(null);
  const uc=uColor(user.username);const curAvatar=avatarUri||user.avatar_url;
  useEffect(()=>{getTradeHistory(user.id).then(h=>{setHistory(h);setLoadH(false);});},[]);
  async function pickAvatar(){const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted)return;const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'] as any,allowsEditing:true,aspect:[1,1],quality:0.3,base64:true});if(!r.canceled&&r.assets[0]){setAvatarUri(r.assets[0].uri);setAvatarB64(r.assets[0].base64??null);}}
  async function save(){const t=newName.trim();if(t.length<3){setEditErr(ua?'Мінімум 3 символи':'Min 3 chars');return;}setSaving(true);setEditErr('');const upd:{username?:string;avatar_url?:string}={};if(t!==user.username)upd.username=t;if(avatarB64)upd.avatar_url=`data:image/jpeg;base64,${avatarB64}`;if(!Object.keys(upd).length){setEditing(false);setSaving(false);return;}const r=await updateUser(user.id,upd);setSaving(false);if(r.ok&&r.user){onUserUpdate(r.user);setEditing(false);setAvatarB64(null);}else setEditErr(r.error??'Error');}
  function cancelEdit(){setEditing(false);setNewName(user.username);setAvatarUri(null);setAvatarB64(null);setEditErr('');}
  const tc=history.length;const lvl=tc===0?1:tc<5?2:tc<15?3:4;const lvlName=(ua?['','Новачок','Трейдер','Досвідчений','Майстер']:['','Newcomer','Trader','Experienced','Master'])[lvl];const nextAt=[0,5,15,30,Infinity][lvl];const prog=nextAt===Infinity?1:Math.min(tc/nextAt,1);
  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{paddingBottom:40}}>
      <View style={s.profileHero}>
        <TouchableOpacity onPress={editing?pickAvatar:undefined} activeOpacity={editing?0.7:1}>
          <View style={[s.avatarLg,{backgroundColor:uc+'22',borderColor:editing?C.green:uc+'55',overflow:'hidden'}]}>
            {curAvatar?<Image source={{uri:curAvatar}} style={{width:'100%',height:'100%'}}/>:<Text style={{fontSize:36,fontWeight:'800',color:uc}}>{user.username.slice(0,2).toUpperCase()}</Text>}
          </View>
          {editing&&<View style={s.avatarEditOverlay}><Ico n="camera-outline" size={16} color="#fff"/></View>}
        </TouchableOpacity>
        {editing?(
          <View style={{width:'100%',gap:12,paddingHorizontal:24}}>
            <TextInput style={[s.field,{textAlign:'center',fontSize:17,fontWeight:'600'}]} value={newName} onChangeText={setNewName} autoCapitalize="none" maxLength={20}/>
            {editErr?<Text style={{color:C.red,fontSize:13,textAlign:'center'}}>{editErr}</Text>:null}
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity style={[s.btnOut,{flex:1,paddingVertical:12}]} onPress={cancelEdit}><Text style={[s.btnOutTxt,{fontSize:14}]}>{ua?'Скасувати':'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btn,{flex:1,paddingVertical:12}]} onPress={save} disabled={saving}>{saving?<ActivityIndicator color="#fff"/>:<Text style={[s.btnTxt,{fontSize:14}]}>{ua?'Зберегти':'Save'}</Text>}</TouchableOpacity>
            </View>
          </View>
        ):(
          <View style={{alignItems:'center',gap:6}}>
            <Text style={{fontSize:22,fontWeight:'700',color:C.text}}>{user.username}</Text>
            <View style={[s.chip,{backgroundColor:uc+'22',borderColor:uc+'44'}]}><Text style={{color:uc,fontSize:12,fontWeight:'600'}}>Lvl {lvl} · {lvlName}</Text></View>
            <Text style={{color:C.textLight,fontSize:12}}>{ua?'Учасник з':'Member since'} {user.created_at?.split('T')[0]}</Text>
            <TouchableOpacity style={[s.chip,{marginTop:4,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:4}]} onPress={()=>setEditing(true)}>
              <Ico n="pencil-outline" size={13} color={C.textSub}/>
              <Text style={{color:C.textSub,fontSize:12}}>{ua?'Редагувати профіль':'Edit profile'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        {[{l:ua?'Угод':'Trades',v:String(tc),c:C.green},{l:ua?'Рівень':'Level',v:String(lvl),c:uc},{l:ua?'Репутація':'Reputation',v:String(user.reputation+tc*5),c:C.blue}].map((st,i)=>(
          <View key={i} style={s.statCard}><Text style={{fontSize:26,fontWeight:'800',color:st.c}}>{st.v}</Text><Text style={{fontSize:12,color:C.textSub,marginTop:2}}>{st.l}</Text></View>
        ))}
      </View>

      {nextAt!==Infinity&&(
        <View style={[s.sectionCard,{marginHorizontal:16,marginBottom:12}]}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}><Text style={{color:C.textSub,fontSize:13}}>{ua?'Прогрес до рівня':'Progress to level'} {lvl+1}</Text><Text style={{color:uc,fontSize:13,fontWeight:'600'}}>{tc} / {nextAt}</Text></View>
          <View style={{height:6,backgroundColor:C.border,borderRadius:3}}><View style={{height:6,backgroundColor:uc,borderRadius:3,width:`${Math.round(prog*100)}%` as any}}/></View>
        </View>
      )}

      <View style={[s.sectionCard,{marginHorizontal:16,marginBottom:12}]}>
        <Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Мова':'Language'}</Text>
        <View style={{flexDirection:'row',gap:10}}>
          <TouchableOpacity style={[s.langChip,{flex:1,justifyContent:'center'},lang==='en'&&s.langChipA]} onPress={()=>setLang('en')}><Text style={[s.langChipTxt,{textAlign:'center'},lang==='en'&&{color:C.white}]}>🇬🇧 English</Text></TouchableOpacity>
          <TouchableOpacity style={[s.langChip,{flex:1,justifyContent:'center'},lang==='ua'&&s.langChipA]} onPress={()=>setLang('ua')}><Text style={[s.langChipTxt,{textAlign:'center'},lang==='ua'&&{color:C.white}]}>🇺🇦 Українська</Text></TouchableOpacity>
        </View>
      </View>

      <View style={{paddingHorizontal:16}}>
        <Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Історія угод':'Trade history'}</Text>
        {loadH?<ActivityIndicator color={C.green}/>:history.length===0?(
          <View style={[s.sectionCard,{alignItems:'center',paddingVertical:32}]}><Ico n="mail-open-outline" size={44} color={C.textLight}/><Text style={{color:C.text,fontSize:15,fontWeight:'600',marginTop:10}}>{ua?'Угод ще немає':'No trades yet'}</Text></View>
        ):history.map((h,i)=>(
          <View key={h.id} style={[s.sectionCard,{marginBottom:10}]}>
            <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:CHAIN[i%4]+'22',alignItems:'center',justifyContent:'center'}}><Ionicons name={catIcon(h.gave) as IcoName} size={22} color={CHAIN[i%4]}/></View>
              <View style={{flex:1}}><Text style={{color:C.text,fontSize:14,fontWeight:'600'}}>{h.gave} → {h.received}</Text><Text style={{color:C.textSub,fontSize:12,marginTop:2}}>{ua?'з':'with'} {h.partner_username} · {ago(h.created_at,ua)}</Text></View>
              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                <View style={[s.chip,{backgroundColor:C.greenLight,borderColor:'#C8E6C9',flexDirection:'row',alignItems:'center',gap:3}]}><Ico n="checkmark" size={12} color={C.green}/><Text style={{color:C.green,fontSize:12,fontWeight:'600'}}>+5</Text></View>
                <TouchableOpacity style={{width:32,height:32,borderRadius:8,backgroundColor:C.redLight,alignItems:'center',justifyContent:'center'}} onPress={()=>setReportTgt({username:h.partner_username,userId:h.user_id})}><Ico n="warning-outline" size={16} color={C.red}/></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {reportTgt&&<ReportModal visible={!!reportTgt} onClose={()=>setReportTgt(null)} lang={lang} reporter={user} reportedUsername={reportTgt.username} reportedUserId={reportTgt.userId}/>}

      <TouchableOpacity style={[s.btnOut,{marginHorizontal:16,marginTop:20,borderColor:C.red,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}]} onPress={onLogout}>
        <Ico n="log-out-outline" size={18} color={C.red}/>
        <Text style={[s.btnOutTxt,{color:C.red}]}>{ua?'Вийти з акаунту':'Log out'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── USER PROFILE ────────────────────────────────────
function UserProfileScreen({onBack,lang,userId,username}:{onBack:()=>void;lang:Lang;userId:string;username:string}) {
  const ua=lang==='ua';const uc=uColor(username);const [pu,setPu]=useState<User|null>(null);const [res,setRes]=useState<Resource[]>([]);const [hist,setHist]=useState<TradeHistory[]>([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{setLoading(true);const [u,r,h]=await Promise.all([getUserById(userId),getUserResources(userId),getTradeHistory(userId)]);setPu(u);setRes(r);setHist(h);setLoading(false);})();},[userId]);
  const tc=hist.length;const lvl=tc===0?1:tc<5?2:tc<15?3:4;const lvlName=(ua?['','Новачок','Трейдер','Досвідчений','Майстер']:['','Newcomer','Trader','Experienced','Master'])[lvl];
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.topBar}><TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity></View>
      {loading?<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.green} size="large"/></View>:(
        <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:40}}>
          <View style={s.profileHero}>
            <View style={[s.avatarLg,{backgroundColor:uc+'22',borderColor:uc+'55',overflow:'hidden'}]}>
              {pu?.avatar_url?<Image source={{uri:pu.avatar_url}} style={{width:'100%',height:'100%'}}/>:<Text style={{fontSize:36,fontWeight:'800',color:uc}}>{username.slice(0,2).toUpperCase()}</Text>}
            </View>
            <Text style={{fontSize:22,fontWeight:'700',color:C.text}}>{username}</Text>
            <View style={[s.chip,{backgroundColor:uc+'22',borderColor:uc+'44'}]}><Text style={{color:uc,fontSize:12,fontWeight:'600'}}>Lvl {lvl} · {lvlName}</Text></View>
            {pu&&<Text style={{color:C.textLight,fontSize:12}}>{ua?'Учасник з':'Member since'} {pu.created_at?.split('T')[0]}</Text>}
          </View>
          <View style={s.statsRow}>
            {[{l:ua?'Угод':'Trades',v:String(tc),c:C.green},{l:ua?'Репутація':'Rep',v:String((pu?.reputation??0)+tc*5),c:uc},{l:ua?'Запитів':'Listings',v:String(res.length),c:C.blue}].map((st,i)=>(
              <View key={i} style={s.statCard}><Text style={{fontSize:26,fontWeight:'800',color:st.c}}>{st.v}</Text><Text style={{fontSize:12,color:C.textSub,marginTop:2}}>{st.l}</Text></View>
            ))}
          </View>
          <View style={{paddingHorizontal:16}}>
            <Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Активні пропозиції':'Active listings'} ({res.length})</Text>
            {res.length===0?<View style={[s.sectionCard,{alignItems:'center',paddingVertical:28}]}><Text style={{color:C.textSub}}>{ua?'Немає активних запитів':'No active listings'}</Text></View>:res.map(r=>(
              <View key={r.id} style={[s.sectionCard,{marginBottom:12}]}>
                {!!r.photo_url&&<Image source={{uri:r.photo_url}} style={{width:'100%',height:130,borderRadius:10,marginBottom:12}} resizeMode="cover"/>}
                <View style={s.tradeRow}>
                  <View style={[s.tradeBox,{backgroundColor:C.greenLight,borderColor:'#C8E6C9',alignItems:'center'}]}><Ionicons name={catIcon(r.have) as IcoName} size={20} color={C.green}/><Text style={{fontSize:10,color:C.green,fontWeight:'600',marginTop:4}}>{ua?'МАЄ':'HAS'}</Text><Text style={{fontSize:12,fontWeight:'700',color:C.text,marginTop:2}}>{r.have}</Text></View>
                  <View style={{alignItems:'center',justifyContent:'center',paddingHorizontal:4}}><Ico n="swap-horizontal-outline" size={16} color={C.textLight}/></View>
                  <View style={[s.tradeBox,{backgroundColor:C.blueLight,borderColor:'#BBDEFB',alignItems:'center'}]}><Ionicons name={catIcon(r.need) as IcoName} size={20} color={C.blue}/><Text style={{fontSize:10,color:C.blue,fontWeight:'600',marginTop:4}}>{ua?'ХОЧЕ':'WANTS'}</Text><Text style={{fontSize:12,fontWeight:'700',color:C.text,marginTop:2}}>{r.need}</Text></View>
                </View>
                {!!r.description&&<Text style={{color:C.textSub,fontSize:13,marginTop:10}} numberOfLines={2}>{r.description}</Text>}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── CHATS LIST ──────────────────────────────────────
function ChatsListContent({lang,user,onOpenChat}:{lang:Lang;user:User;onOpenChat:(r:Resource)=>void}) {
  const ua=lang==='ua';type CR=Resource&{last_message:Message};const [chats,setChats]=useState<CR[]>([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{load();const iv=setInterval(load,5000);return()=>clearInterval(iv);},[]);
  async function load(){const d=await getUserChats(user.id);setChats(d as CR[]);setLoading(false);}
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.screenHdr}><Text style={s.screenTitle}>{ua?'Чати':'Chats'}</Text></View>
      {loading?<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.green} size="large"/></View>
      :chats.length===0?<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:14,paddingHorizontal:40}}><Ico n="chatbubbles-outline" size={56} color={C.textLight}/><Text style={{color:C.text,fontSize:18,fontWeight:'700',textAlign:'center'}}>{ua?'Чатів ще немає':'No chats yet'}</Text><Text style={{color:C.textSub,fontSize:14,textAlign:'center',lineHeight:22}}>{ua?'Відкрийте трейд і напишіть повідомлення':'Open any trade and send a message'}</Text></View>
      :(
        <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
          {chats.map(chat=>{const isOwn=chat.user_id===user.id;const otherName=isOwn?(chat.buyer_username??(ua?'Очікую покупця':'Awaiting buyer')):chat.username;const oc=uColor(otherName);const u=URG[chat.urgency]??URG.medium;
            return(
              <TouchableOpacity key={chat.id} style={s.chatRow} onPress={()=>onOpenChat(chat)} activeOpacity={0.85}>
                <View style={[s.avatarMd,{backgroundColor:oc+'22',borderColor:oc+'44'}]}><Text style={{fontSize:14,fontWeight:'700',color:oc}}>{otherName.slice(0,2).toUpperCase()}</Text></View>
                <View style={{flex:1,gap:3}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                    <Text style={{color:C.text,fontSize:15,fontWeight:'700',flex:1}} numberOfLines={1}>{otherName}</Text>
                    <Text style={{color:C.textLight,fontSize:11}}>{ago(chat.last_message.created_at,ua)}</Text>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                    <Ionicons name={catIcon(chat.have) as IcoName} size={13} color={C.textSub}/>
                    <Text style={{color:C.textSub,fontSize:12}}>{chat.have}</Text>
                    <Ico n="swap-horizontal-outline" size={13} color={C.textLight}/>
                    <Ionicons name={catIcon(chat.need) as IcoName} size={13} color={C.textSub}/>
                    <Text style={{color:C.textSub,fontSize:12}}>{chat.need}</Text>
                  </View>
                  <Text style={{color:chat.last_message.sender_id===user.id?C.green:C.textSub,fontSize:13}} numberOfLines={1}>{chat.last_message.sender_id===user.id?(ua?'Ви: ':'You: '):`${chat.last_message.sender_username}: `}{chat.last_message.text}</Text>
                </View>
                <View style={{alignItems:'center',gap:4}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:chat.active?C.green:'#CCC'}}/><View style={[s.urgBadge,{backgroundColor:u.bg}]}><Text style={[s.urgBadgeTxt,{color:u.color,fontSize:9}]}>{ua?u.labelUa:u.label}</Text></View></View>
              </TouchableOpacity>
            );
          })}
          <View style={{height:20}}/>
        </ScrollView>
      )}
    </View>
  );
}

// ─── CANCEL TRADE MODAL ──────────────────────────────
const CANCEL_REASONS_UA=['Не зʼявився','Відмовився','Інший товар','Спроба обману','Небезпека','Інша причина'];
const CANCEL_REASONS_EN=['Didn\'t show up','Refused deal','Wrong item','Scam attempt','Felt unsafe','Other'];
const CANCEL_IDS=['noshow','refused','wrongitem','scam','unsafe','other'];
const CANCEL_ICONS:IcoName[]=['glasses-outline','ban-outline','cube-outline','skull-outline','warning-outline','help-circle-outline'];

function CancelTradeModal({visible,onClose,onConfirmed,lang,user,resource,otherUserId}:{visible:boolean;onClose:()=>void;onConfirmed:()=>void;lang:Lang;user:User;resource:Resource;otherUserId:string}) {
  const [sel,setSel]=useState('');const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);const ua=lang==='ua';
  async function confirm(){if(!sel)return;setLoading(true);await cancelTrade(resource,sel,otherUserId);setLoading(false);setDone(true);setTimeout(()=>{onConfirmed();setDone(false);setSel('');},1600);}
  const reasons=CANCEL_IDS.map((id,i)=>({id,icon:CANCEL_ICONS[i],l:ua?CANCEL_REASONS_UA[i]:CANCEL_REASONS_EN[i]}));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{flex:1,backgroundColor:C.overlay,justifyContent:'flex-end'}} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.bottomSheet}>
          {done?(
            <View style={{alignItems:'center',paddingVertical:32,gap:12}}><Ico n="checkmark-circle-outline" size={52} color={C.green}/><Text style={{color:C.text,fontSize:18,fontWeight:'700'}}>{ua?'Угоду скасовано':'Deal cancelled'}</Text><Text style={{color:C.textSub,fontSize:14}}>{ua?'Репутацію знижено на 15':'Reputation -15'}</Text></View>
          ):(
            <>
              <View style={s.sheetHandle}/>
              <Text style={s.sheetTitle}>{ua?'Скасувати угоду':'Cancel Deal'}</Text>
              <Text style={[s.sheetSub,{marginBottom:20}]}>{ua?'Оберіть причину':'Select a reason'}</Text>
              {reasons.map(r=>(
                <TouchableOpacity key={r.id} onPress={()=>setSel(r.id)} style={[s.reasonRow,sel===r.id&&{backgroundColor:C.redLight,borderColor:C.red}]}>
                  <Ionicons name={r.icon} size={22} color={sel===r.id?C.red:C.textSub}/>
                  <Text style={{color:sel===r.id?C.red:C.text,fontSize:15,flex:1,fontWeight:sel===r.id?'600':'400'}}>{r.l}</Text>
                  {sel===r.id&&<Ico n="checkmark" size={18} color={C.red}/>}
                </TouchableOpacity>
              ))}
              <View style={{backgroundColor:'#FFF4E5',borderRadius:12,padding:14,marginTop:8,marginBottom:4,flexDirection:'row',alignItems:'flex-start',gap:8}}><Ico n="warning-outline" size={16} color={C.yellow}/><Text style={{color:C.yellow,fontSize:13,lineHeight:19,flex:1}}>{ua?'Репутація іншої сторони -15. Незворотна дія.':'Other party reputation -15. Cannot be undone.'}</Text></View>
              <TouchableOpacity style={[s.btn,{marginTop:12,backgroundColor:sel?C.red:C.border}]} onPress={confirm} disabled={!sel||loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={[s.btnTxt,{color:sel?'#fff':C.textLight}]}>{ua?'Скасувати угоду':'Cancel Deal'}</Text>}</TouchableOpacity>
              <TouchableOpacity style={[s.btnOut,{marginTop:10}]} onPress={onClose}><Text style={s.btnOutTxt}>{ua?'Назад':'Go back'}</Text></TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── REPORT MODAL ────────────────────────────────────
const REPORT_IDS=['scam','noshow','wrongitem','rude','fake'];
const REPORT_LABELS_UA=['Обманув','Не зʼявився','Інший товар','Грубість','Фейк'];
const REPORT_LABELS_EN=['Scam','No show','Wrong item','Rude','Fake profile'];
const REPORT_ICONS:IcoName[]=['skull-outline','glasses-outline','cube-outline','alert-circle-outline','person-outline'];

function ReportModal({visible,onClose,lang,reporter,reportedUsername,reportedUserId,resourceId}:{visible:boolean;onClose:()=>void;lang:Lang;reporter:User;reportedUsername:string;reportedUserId:string;resourceId?:string}) {
  const [sel,setSel]=useState('');const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);const ua=lang==='ua';
  async function submit(){if(!sel)return;setLoading(true);await reportUser(reporter.id,reportedUserId,reportedUsername,resourceId,sel);setLoading(false);setDone(true);setTimeout(()=>{onClose();setDone(false);setSel('');},1800);}
  const reasons=REPORT_IDS.map((id,i)=>({id,icon:REPORT_ICONS[i],l:ua?REPORT_LABELS_UA[i]:REPORT_LABELS_EN[i]}));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{flex:1,backgroundColor:C.overlay,justifyContent:'flex-end'}} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.bottomSheet}>
          {done?(
            <View style={{alignItems:'center',paddingVertical:32,gap:12}}><Ico n="checkmark-circle-outline" size={52} color={C.green}/><Text style={{color:C.text,fontSize:18,fontWeight:'700'}}>{ua?'Скаргу надіслано':'Report submitted'}</Text></View>
          ):(
            <>
              <View style={s.sheetHandle}/>
              <Text style={s.sheetTitle}>{ua?'Поскаржитись на':'Report'} @{reportedUsername}</Text>
              <Text style={[s.sheetSub,{marginBottom:20}]}>{ua?'Оберіть причину':'Select a reason'}</Text>
              {reasons.map(r=>(
                <TouchableOpacity key={r.id} onPress={()=>setSel(r.id)} style={[s.reasonRow,sel===r.id&&{backgroundColor:C.redLight,borderColor:C.red}]}>
                  <Ionicons name={r.icon} size={22} color={sel===r.id?C.red:C.textSub}/>
                  <Text style={{color:sel===r.id?C.red:C.text,fontSize:15,flex:1,fontWeight:sel===r.id?'600':'400'}}>{r.l}</Text>
                  {sel===r.id&&<Ico n="checkmark" size={18} color={C.red}/>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.btn,{marginTop:16,backgroundColor:sel?C.red:C.border}]} onPress={submit} disabled={!sel||loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={[s.btnTxt,{color:sel?'#fff':C.textLight}]}>{ua?'Надіслати':'Submit Report'}</Text>}</TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── CHAT SCREEN ─────────────────────────────────────
function ChatScreen({onBack,onGoToTrade,lang,user,resource}:{onBack:()=>void;onGoToTrade:()=>void;lang:Lang;user:User;resource:Resource}) {
  const [msgs,setMsgs]=useState<Message[]>([]);const [text,setText]=useState('');const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);
  const scrollRef=useRef<ScrollView>(null);const ua=lang==='ua';const isOwn=resource.user_id===user.id;const otherName=isOwn?(resource.buyer_username??(ua?'Покупець':'Buyer')):resource.username;const oc=uColor(otherName);
  useEffect(()=>{loadMsgs();const sub=subscribeToMessages(resource.id,(m:Message[])=>{setMsgs(prev=>{if(JSON.stringify(prev.map(x=>x.id))!==JSON.stringify(m.map(x=>x.id))){setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),80);return m;}return prev;});});return()=>sub.unsubscribe();},[resource.id]);
  async function loadMsgs(){const m=await getMessages(resource.id);setMsgs(m);setLoading(false);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:false}),150);}
  async function send(){const t=text.trim();if(!t||sending)return;setSending(true);setText('');const r=await sendMessage(resource.id,user.id,user.username,t);if(r.ok){const m=await getMessages(resource.id);setMsgs(m);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),80);}else{setText(t);Alert.alert(ua?'Помилка':'Error',r.error??'Error');}setSending(false);}
  const tpls=ua?['Де зустрічаємось? 📍','Скільки маєте?','Коли зможете?','Домовились! ✅']:['Where to meet? 📍','How much?','When free?','Deal! ✅'];
  return (
    <View style={{flex:1,backgroundColor:C.white}}>
      <View style={s.chatHdr}>
        <TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity>
        <View style={[s.avatarSm,{backgroundColor:oc+'22',borderColor:oc+'44'}]}><Text style={{fontSize:12,fontWeight:'700',color:oc}}>{otherName.slice(0,2).toUpperCase()}</Text></View>
        <View style={{flex:1}}>
          <Text style={{color:C.text,fontSize:15,fontWeight:'700'}}>{otherName}</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name={catIcon(resource.have) as IcoName} size={12} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12}}>{resource.have}</Text><Ico n="swap-horizontal-outline" size={12} color={C.textLight}/><Ionicons name={catIcon(resource.need) as IcoName} size={12} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12}}>{resource.need}</Text></View>
        </View>
        <TouchableOpacity style={s.circleBtn} onPress={onGoToTrade}><Ico n="clipboard-outline" size={18}/></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:44,flexGrow:0,borderBottomWidth:1,borderBottomColor:C.border}} contentContainerStyle={{paddingHorizontal:12,gap:8,alignItems:'center'}}>
        {tpls.map(t=><TouchableOpacity key={t} onPress={()=>setText(t)} style={s.qrChip}><Text style={{color:C.textSub,fontSize:12}}>{t}</Text></TouchableOpacity>)}
      </ScrollView>
      {loading?<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={C.green} size="large"/></View>:(
        <ScrollView ref={scrollRef} style={{flex:1}} contentContainerStyle={{padding:16,gap:4}} keyboardShouldPersistTaps="handled">
          {msgs.length===0&&<View style={{alignItems:'center',paddingTop:48,gap:10}}><Ico n="chatbubbles-outline" size={48} color={C.textLight}/><Text style={{color:C.text,fontSize:16,fontWeight:'600'}}>{ua?'Почніть переговори':'Start negotiating'}</Text><Text style={{color:C.textSub,fontSize:13,textAlign:'center',paddingHorizontal:32,lineHeight:20}}>{ua?'Домовтесь про місце та деталі':'Agree on location and details'}</Text></View>}
          {msgs.map((msg,i)=>{
            const isMe=msg.sender_id===user.id;const mc=uColor(msg.sender_username);const prev=i>0?msgs[i-1]:null;const showAv=!prev||prev.sender_id!==msg.sender_id;const showTime=!prev||new Date(msg.created_at).getTime()-new Date(prev.created_at).getTime()>120000;
            return(
              <View key={msg.id}>
                {showTime&&<Text style={{color:C.textLight,fontSize:11,textAlign:'center',marginVertical:10}}>{ago(msg.created_at,ua)}</Text>}
                <View style={{flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:8,marginTop:showAv?8:2}}>
                  {showAv?<View style={{width:28,height:28,borderRadius:9,backgroundColor:mc+'22',borderWidth:1,borderColor:mc+'44',alignItems:'center',justifyContent:'center',flexShrink:0}}><Text style={{fontSize:9,fontWeight:'800',color:mc}}>{msg.sender_username.slice(0,2).toUpperCase()}</Text></View>:<View style={{width:28,flexShrink:0}}/>}
                  <View style={{maxWidth:'74%',backgroundColor:isMe?C.green:C.bg,borderRadius:18,borderBottomRightRadius:isMe?4:18,borderBottomLeftRadius:isMe?18:4,paddingHorizontal:14,paddingVertical:10,borderWidth:1,borderColor:isMe?C.green:C.border}}>
                    {showAv&&!isMe&&<Text style={{color:mc,fontSize:11,fontWeight:'700',marginBottom:3}}>{msg.sender_username}</Text>}
                    <Text style={{color:isMe?C.white:C.text,fontSize:15,lineHeight:22}}>{msg.text}</Text>
                    <Text style={{color:isMe?'rgba(255,255,255,0.6)':C.textLight,fontSize:10,marginTop:3,alignSelf:'flex-end'}}>{new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{height:6}}/>
        </ScrollView>
      )}
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.chatInputRow}>
          <TextInput style={s.chatField} value={text} onChangeText={setText} placeholder={ua?'Написати...':'Message...'} placeholderTextColor={C.textLight} multiline maxLength={500}/>
          <TouchableOpacity style={[s.sendBtn,{backgroundColor:text.trim()?C.green:C.border}]} onPress={send} disabled={!text.trim()||sending}>
            {sending?<ActivityIndicator color="#fff" size="small"/>:<Ico n="send-outline" size={18} color={C.white}/>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── QR SCANNER ──────────────────────────────────────
function QRScannerScreen({onScanned,onCancel,lang}:{onScanned:(d:string)=>void;onCancel:()=>void;lang:Lang}) {
  const [scanned,setScanned]=useState(false);const ua=lang==='ua';
  function handle({data}:{data:string}){if(scanned)return;setScanned(true);onScanned(data);}
  return (
    <View style={{flex:1,backgroundColor:'#000'}}>
      <View style={[s.topBar,{backgroundColor:'transparent',borderBottomWidth:0}]}><TouchableOpacity style={[s.circleBtn,{backgroundColor:'rgba(255,255,255,0.2)',borderColor:'transparent'}]} onPress={onCancel}><Ico n="arrow-back" size={20} color="#fff"/></TouchableOpacity><View style={{flex:1,marginLeft:8}}><Text style={{color:'#fff',fontSize:16,fontWeight:'700'}}>{ua?'Сканувати QR':'Scan QR'}</Text><Text style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>{ua?'Наведіть на QR продавця':'Point at seller QR'}</Text></View></View>
      <View style={{flex:1}}>
        <CameraView style={{flex:1}} facing="back" onBarcodeScanned={scanned?undefined:handle} barcodeScannerSettings={{barcodeTypes:['qr']}}/>
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <View style={{width:240,height:240,borderWidth:3,borderColor:C.green,borderRadius:20}}/>
          <View style={{backgroundColor:'rgba(0,0,0,0.6)',paddingHorizontal:20,paddingVertical:10,borderRadius:20,marginTop:20}}><Text style={{color:'#fff',fontSize:13,textAlign:'center'}}>{ua?'Наведіть на QR код продавця':'Point at seller\'s QR code'}</Text></View>
        </View>
      </View>
      <View style={{padding:24,paddingBottom:40}}><TouchableOpacity style={[s.btnOut,{borderColor:'rgba(255,255,255,0.4)'}]} onPress={onCancel}><Text style={[s.btnOutTxt,{color:'#fff'}]}>{ua?'Скасувати':'Cancel'}</Text></TouchableOpacity></View>
    </View>
  );
}

// ─── MY TRADE ────────────────────────────────────────
function MyTradeScreen({onBack,lang,user,resource}:{onBack:()=>void;lang:Lang;user:User;resource:Resource|null}) {
  const ua=lang==='ua';const [confirmed,setConfirmed]=useState(false);const [buyerUsername,setBuyerUsername]=useState<string|null>(null);const [showCancel,setShowCancel]=useState(false);const [cancelled,setCancelled]=useState(false);const [deleting,setDeleting]=useState(false);
  const tradeId=`MERCATUS-${user.id.slice(0,8)}-${resource?.id?.slice(0,8)??'trade'}`;
  useEffect(()=>{if(!resource?.id||confirmed)return;const sub=subscribeToResource(resource.id,r=>{if(r&&!r.active&&r.buyer_username){setBuyerUsername(r.buyer_username);setConfirmed(true);}});return()=>sub.unsubscribe();},[resource?.id]);
  async function handleDelete(){Alert.alert(ua?'Видалити заявку?':'Delete listing?',ua?'Заявка більше не буде видна.':'This listing will no longer be visible.',[{text:ua?'Ні':'No',style:'cancel'},{text:ua?'Так, видалити':'Yes, delete',style:'destructive',onPress:async()=>{if(!resource)return;setDeleting(true);await deleteResource(resource.id);setDeleting(false);onBack();}}]);}
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.topBar}><TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity><View style={{flex:1,marginLeft:8}}><Text style={s.screenTitle}>{ua?'Мій запит':'My Listing'}</Text><Text style={{color:C.textSub,fontSize:13}}>{confirmed?(ua?'Завершено':'Complete'):cancelled?(ua?'Скасовано':'Cancelled'):(ua?'Очікую покупця':'Waiting for buyer')}</Text></View></View>
      {resource&&<CancelTradeModal visible={showCancel} onClose={()=>setShowCancel(false)} onConfirmed={()=>{setShowCancel(false);setCancelled(true);}} lang={lang} user={user} resource={resource} otherUserId={resource.buyer_id??''}/>}
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:14}}>
        {!!resource?.photo_url&&<Image source={{uri:resource.photo_url}} style={{width:'100%',height:180,borderRadius:16}} resizeMode="cover"/>}
        <View style={s.sectionCard}>
          <Text style={[s.secLbl,{marginBottom:14}]}>{ua?'Мій обмін':'My Exchange'}</Text>
          {!confirmed&&!cancelled&&(
            <TouchableOpacity onPress={handleDelete} disabled={deleting} style={{position:'absolute',top:14,right:14,width:30,height:30,borderRadius:15,backgroundColor:C.redLight,borderWidth:1,borderColor:C.red+'55',alignItems:'center',justifyContent:'center',zIndex:10}}>
              {deleting?<ActivityIndicator size="small" color={C.red}/>:<Ico n="close" size={16} color={C.red}/>}
            </TouchableOpacity>
          )}
          <View style={s.tradeRow}>
            <View style={[s.tradeBox,{backgroundColor:C.greenLight,borderColor:'#C8E6C9',alignItems:'center'}]}><Ionicons name={catIcon(resource?.have??'') as IcoName} size={32} color={C.green}/><Text style={{fontSize:10,color:C.green,fontWeight:'700',marginTop:6}}>{ua?'ПРОПОНУЮ':'OFFERING'}</Text><Text style={{fontSize:14,fontWeight:'700',color:C.text,marginTop:4}}>{resource?.have}</Text></View>
            <View style={{alignItems:'center',justifyContent:'center',paddingHorizontal:6}}><Ico n="swap-horizontal-outline" size={22} color={C.textLight}/></View>
            <View style={[s.tradeBox,{backgroundColor:C.blueLight,borderColor:'#BBDEFB',alignItems:'center'}]}><Ionicons name={catIcon(resource?.need??'') as IcoName} size={32} color={C.blue}/><Text style={{fontSize:10,color:C.blue,fontWeight:'700',marginTop:6}}>{ua?'ШУКАЮ':'LOOKING FOR'}</Text><Text style={{fontSize:14,fontWeight:'700',color:C.text,marginTop:4}}>{resource?.need}</Text></View>
          </View>
          {!!resource?.description&&<Text style={{color:C.textSub,fontSize:13,marginTop:14,lineHeight:19}}>{resource.description}</Text>}
        </View>
        {!confirmed&&!cancelled&&(
          <View style={[s.sectionCard,{alignItems:'center',gap:14}]}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:C.green}}/><Text style={{color:C.green,fontSize:13,fontWeight:'500'}}>{ua?'Очікую сканування QR...':'Waiting for buyer to scan...'}</Text></View>
            <Text style={{color:C.text,fontSize:15,fontWeight:'700'}}>{ua?'Ваш QR код':'Your QR Code'}</Text>
            <Text style={{color:C.textSub,fontSize:13,textAlign:'center'}}>{ua?'Покажіть покупцю для сканування':'Show this to the buyer to scan'}</Text>
            <View style={{backgroundColor:C.white,padding:20,borderRadius:16,borderWidth:1,borderColor:C.border}}><QRCode value={tradeId} size={180} color="#1A1A1A" backgroundColor="#FFFFFF"/></View>
          </View>
        )}
        {confirmed&&<View style={s.successBanner}><Ico n="checkmark-circle-outline" size={32} color={C.white}/><View style={{flex:1}}><Text style={{fontSize:16,fontWeight:'700',color:C.white}}>{ua?'Обмін завершено!':'Trade Complete!'}</Text><Text style={{fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:2}}>{ua?`Покупець: ${buyerUsername}`:`Buyer: ${buyerUsername}`}</Text></View></View>}
        {cancelled&&<View style={[s.sectionCard,{flexDirection:'row',alignItems:'center',gap:12,borderColor:C.red+'44',borderWidth:1}]}><Ico n="ban-outline" size={28} color={C.red}/><Text style={{color:C.red,fontSize:15,fontWeight:'600',flex:1}}>{ua?'Угоду скасовано':'Deal cancelled'}</Text></View>}
        <View style={{height:20}}/>
      </ScrollView>
      <View style={s.footer}>
        {cancelled||confirmed
          ?<TouchableOpacity style={s.btn} onPress={onBack}><Text style={s.btnTxt}>{ua?'На головну':'Go Home'}</Text></TouchableOpacity>
          :<TouchableOpacity style={[s.btnOut,{borderColor:C.red,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}]} onPress={()=>setShowCancel(true)}><Ico n="ban-outline" size={16} color={C.red}/><Text style={[s.btnOutTxt,{color:C.red}]}>{ua?'Угода зірвана — скасувати':'Deal fell through — cancel'}</Text></TouchableOpacity>}
      </View>
    </View>
  );
}

// ─── ACTIVE TRADE ────────────────────────────────────
function ActiveTradeScreen({onBack,lang,user,resource,onViewProfile,onOpenChat}:{onBack:()=>void;lang:Lang;user:User;resource:Resource|null;onViewProfile:(uid:string,un:string)=>void;onOpenChat:()=>void}) {
  const ua=lang==='ua';const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null);const [confirmed,setConfirmed]=useState(false);const [showScanner,setShowScanner]=useState(false);const [loading,setLoading]=useState(false);const [showReport,setShowReport]=useState(false);const [showCancel,setShowCancel]=useState(false);const [cancelled,setCancelled]=useState(false);const [permission,requestPermission]=useCameraPermissions();
  const dist=coords&&resource?.lat&&resource?.lng?calcDistance(coords.lat,coords.lng,resource.lat,resource.lng):null;
  useEffect(()=>{(async()=>{try{const {status}=await Location.requestForegroundPermissionsAsync();if(status!=='granted')return;const l=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCoords({lat:l.coords.latitude,lng:l.coords.longitude});}catch{}})();},[]);
  async function scan(){if(!permission?.granted){const r=await requestPermission();if(!r.granted){Alert.alert(ua?'Потрібен дозвіл':'Permission needed');return;}}setShowScanner(true);}
  async function handleScanned(data:string){setShowScanner(false);if(!data.startsWith('MERCATUS-')){Alert.alert(ua?'Невірний QR':'Invalid QR');return;}if(!resource)return;setLoading(true);const ok=await completeTrade(resource,user.id,user.username);setLoading(false);if(ok)setConfirmed(true);else Alert.alert(ua?'Помилка':'Error',ua?'Спробуйте ще раз':'Try again');}
  if(showScanner)return<QRScannerScreen onScanned={handleScanned} onCancel={()=>setShowScanner(false)} lang={lang}/>;
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity>
        <View style={{flex:1,marginLeft:8}}><Text style={s.screenTitle}>{ua?'Угода':'Trade'}</Text><Text style={{color:C.textSub,fontSize:13}}>{confirmed?(ua?'Завершено':'Done'):cancelled?(ua?'Скасовано':'Cancelled'):(ua?'В процесі':'In progress')}</Text></View>
        <TouchableOpacity style={[s.circleBtn,{borderColor:C.green+'44',marginRight:8}]} onPress={onOpenChat}><Ico n="chatbubble-outline" size={18} color={C.green}/></TouchableOpacity>
        {resource&&<TouchableOpacity style={[s.circleBtn,{borderColor:C.blue+'44'}]} onPress={()=>onViewProfile(resource.user_id,resource.username)}><Ico n="person-outline" size={18} color={C.blue}/></TouchableOpacity>}
      </View>
      {resource&&<CancelTradeModal visible={showCancel} onClose={()=>setShowCancel(false)} onConfirmed={()=>{setShowCancel(false);setCancelled(true);}} lang={lang} user={user} resource={resource} otherUserId={resource.user_id}/>}
      {resource&&<ReportModal visible={showReport} onClose={()=>setShowReport(false)} lang={lang} reporter={user} reportedUsername={resource.username} reportedUserId={resource.user_id} resourceId={resource.id}/>}
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:14}}>
        <View style={s.sectionCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:0}}>
            <View style={{flex:1,alignItems:'center',gap:8}}>
              <View style={[s.avatarMd,{backgroundColor:uColor(user.username)+'22',borderColor:uColor(user.username)+'55'}]}><Text style={{fontSize:16,fontWeight:'700',color:uColor(user.username)}}>{user.username.slice(0,2).toUpperCase()}</Text></View>
              <Text style={{color:C.text,fontSize:13,fontWeight:'600',textAlign:'center'}}>{ua?'Ви':'You'}</Text>
              <View style={{alignItems:'center'}}><Ionicons name={catIcon(resource?.need??'') as IcoName} size={20} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12,marginTop:2}}>{resource?.need}</Text></View>
            </View>
            <View style={{paddingHorizontal:12}}><Ico n="swap-horizontal-outline" size={24} color={C.textLight}/></View>
            <TouchableOpacity style={{flex:1,alignItems:'center',gap:8}} onPress={()=>resource&&onViewProfile(resource.user_id,resource.username)}>
              <View style={[s.avatarMd,{backgroundColor:uColor(resource?.username??'')+'22',borderColor:uColor(resource?.username??'')+'55'}]}><Text style={{fontSize:16,fontWeight:'700',color:uColor(resource?.username??'')}}>{(resource?.username??'??').slice(0,2).toUpperCase()}</Text></View>
              <Text style={{color:C.text,fontSize:13,fontWeight:'600',textAlign:'center'}}>{resource?.username}</Text>
              <View style={{alignItems:'center'}}><Ionicons name={catIcon(resource?.have??'') as IcoName} size={20} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12,marginTop:2}}>{resource?.have}</Text></View>
            </TouchableOpacity>
          </View>
        </View>
        {!!resource?.photo_url&&<View style={s.sectionCard}><Text style={[s.secLbl,{marginBottom:10}]}>{ua?'Фото товару':'Item Photo'}</Text><Image source={{uri:resource.photo_url}} style={{width:'100%',height:200,borderRadius:12}} resizeMode="cover"/></View>}
        {!!resource?.description&&<View style={s.sectionCard}><Text style={[s.secLbl,{marginBottom:6}]}>{ua?'Опис':'Description'}</Text><Text style={{color:C.textSub,fontSize:14,lineHeight:20}}>{resource.description}</Text></View>}
        <View style={s.sectionCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <View style={{width:44,height:44,borderRadius:12,backgroundColor:C.greenLight,alignItems:'center',justifyContent:'center'}}><Ico n="location-outline" size={22} color={C.green}/></View>
            <View style={{flex:1}}><Text style={{color:C.text,fontSize:14,fontWeight:'600'}}>{ua?'Локація продавця':'Seller location'}</Text><Text style={{color:C.textSub,fontSize:13,marginTop:2}} numberOfLines={2}>{resource?.address??(ua?'Не вказано':'Not specified')}</Text>{dist&&<View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}><Ico n="walk-outline" size={16} color={C.green}/><Text style={{color:C.green,fontSize:14,fontWeight:'700'}}>{dist} {ua?'від вас':'away'}</Text></View>}</View>
          </View>
        </View>
        {confirmed&&<View style={{gap:10}}><View style={s.successBanner}><Ico n="checkmark-circle-outline" size={32} color={C.white}/><View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'700',color:C.white}}>{ua?'Обмін підтверджено!':'Trade Confirmed!'}</Text></View></View><TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:12,borderWidth:1,borderColor:C.red+'44',backgroundColor:C.redLight}} onPress={()=>setShowReport(true)}><Ico n="warning-outline" size={14} color={C.red}/><Text style={{color:C.red,fontSize:13,fontWeight:'600'}}>{ua?'Щось пішло не так? Поскаржитись':'Something wrong? Report'}</Text></TouchableOpacity></View>}
        {cancelled&&<View style={[s.sectionCard,{flexDirection:'row',alignItems:'center',gap:12,borderColor:C.red+'44',borderWidth:1}]}><Ico n="ban-outline" size={28} color={C.red}/><Text style={{color:C.red,fontSize:15,fontWeight:'600',flex:1}}>{ua?'Угоду скасовано':'Deal cancelled'}</Text></View>}
        <View style={{height:20}}/>
      </ScrollView>
      <View style={s.footer}>
        {cancelled?<TouchableOpacity style={s.btn} onPress={onBack}><Text style={s.btnTxt}>{ua?'На головну':'Go Home'}</Text></TouchableOpacity>
        :confirmed?<TouchableOpacity style={s.btn} onPress={onBack}><Text style={s.btnTxt}>{ua?'На головну':'Go Home'}</Text></TouchableOpacity>
        :<>
          <TouchableOpacity style={[s.btn,{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}]} onPress={scan} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<><Ico n="qr-code-outline" size={20} color={C.white}/><Text style={s.btnTxt}>{ua?'Сканувати QR продавця':'Scan Seller QR'}</Text></>}</TouchableOpacity>
          <TouchableOpacity style={{alignItems:'center',paddingVertical:10,flexDirection:'row',justifyContent:'center',gap:6}} onPress={()=>setShowCancel(true)}><Ico n="ban-outline" size={14} color={C.red}/><Text style={{color:C.red,fontSize:13,fontWeight:'500'}}>{ua?'Угода зірвана — скасувати':'Deal fell through — cancel'}</Text></TouchableOpacity>
        </>}
      </View>
    </View>
  );
}

// ─── CREATE ──────────────────────────────────────────
function CreateScreen({onBack,lang,user,onPublished}:{onBack:()=>void;lang:Lang;user:User;onPublished:(r:Resource)=>void}) {
  const [have,setHave]=useState(0);const [need,setNeed]=useState(1);const [urgency,setUrgency]=useState('medium');const [desc,setDesc]=useState('');const [photoUri,setPhotoUri]=useState<string|null>(null);const [photoB64,setPhotoB64]=useState<string|null>(null);const [loading,setLoading]=useState(false);const [success,setSuccess]=useState(false);
  const ua=lang==='ua';const cats=ua?RES_UA:RES_EN;
  async function pickPhoto(){const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted){Alert.alert(ua?'Потрібен дозвіл':'Permission needed');return;}const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'] as any,allowsEditing:true,aspect:[4,3],quality:0.4,base64:true});if(!r.canceled&&r.assets[0]){setPhotoUri(r.assets[0].uri);setPhotoB64(r.assets[0].base64??null);}}
  async function takePhoto(){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted){Alert.alert(ua?'Потрібен дозвіл':'Permission needed');return;}const r=await ImagePicker.launchCameraAsync({allowsEditing:true,aspect:[4,3],quality:0.4,base64:true});if(!r.canceled&&r.assets[0]){setPhotoUri(r.assets[0].uri);setPhotoB64(r.assets[0].base64??null);}}
  async function handle(){setLoading(true);let lat:number|undefined,lng:number|undefined,address:string|undefined;try{const {status}=await Location.requestForegroundPermissionsAsync();if(status==='granted'){const l=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});lat=l.coords.latitude;lng=l.coords.longitude;const g=await Location.reverseGeocodeAsync({latitude:lat,longitude:lng});if(g[0])address=[g[0].street,g[0].district,g[0].city].filter(Boolean).join(', ');}}catch{}const photoUrl=photoB64?`data:image/jpeg;base64,${photoB64}`:undefined;const created=await addResource(user.id,user.username,RES_EN[have],RES_EN[need],urgency,lat,lng,address,desc.trim()||undefined,photoUrl);setLoading(false);if(!created){Alert.alert(ua?'Помилка':'Error',ua?'Не вдалось опублікувати':'Failed to publish');return;}setSuccess(true);setTimeout(()=>onPublished(created),1200);}
  const urgLvls=[{id:'low',l:ua?'Низька':'Low',desc:ua?'Не терміново':'Not urgent',c:'#2E7D32',bg:'#E8F5E9'},{id:'medium',l:ua?'Середня':'Medium',desc:ua?'Бажано скоро':'Preferably soon',c:'#E65100',bg:'#FFF4E5'},{id:'critical',l:ua?'Критична':'Critical',desc:ua?'Дуже терміново':'Urgent',c:'#C62828',bg:'#FFF0F3'}];
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.topBar}><TouchableOpacity style={s.circleBtn} onPress={onBack}><Ico n="arrow-back" size={20}/></TouchableOpacity><View style={{flex:1,marginLeft:8}}><Text style={s.screenTitle}>{ua?'Новий запит':'New listing'}</Text><Text style={{color:C.textSub,fontSize:13}}>{ua?'Заповніть деталі обміну':'Fill in your exchange details'}</Text></View></View>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{padding:16,gap:20}}>
        <View><Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Що у вас є?':'What are you offering?'}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {cats.map((cat,i)=>(
              <TouchableOpacity key={i} style={[s.catBtn,have===i&&{borderColor:C.green,backgroundColor:C.greenLight}]} onPress={()=>setHave(i)}>
                <Ionicons name={catIcon(RES_EN[i]) as IcoName} size={26} color={have===i?C.green:C.textSub}/>
                <Text style={{fontSize:11,color:have===i?C.green:C.textSub,textAlign:'center',fontWeight:have===i?'700':'500',marginTop:4}}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View><Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Що вам потрібно?':'What are you looking for?'}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {cats.map((cat,i)=>(
              <TouchableOpacity key={i} style={[s.catBtn,need===i&&{borderColor:C.blue,backgroundColor:C.blueLight}]} onPress={()=>setNeed(i)}>
                <Ionicons name={catIcon(RES_EN[i]) as IcoName} size={26} color={need===i?C.blue:C.textSub}/>
                <Text style={{fontSize:11,color:need===i?C.blue:C.textSub,textAlign:'center',fontWeight:need===i?'700':'500',marginTop:4}}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View><Text style={[s.secLbl,{marginBottom:12}]}>{ua?'Терміновість':'Urgency'}</Text>
          <View style={{gap:10}}>
            {urgLvls.map(u=>(
              <TouchableOpacity key={u.id} style={[s.urgRow,urgency===u.id&&{borderColor:u.c,backgroundColor:u.bg}]} onPress={()=>setUrgency(u.id)}>
                <View style={{flex:1}}><Text style={{color:urgency===u.id?u.c:C.text,fontSize:15,fontWeight:urgency===u.id?'700':'500'}}>{u.l}</Text><Text style={{color:C.textSub,fontSize:12,marginTop:2}}>{u.desc}</Text></View>
                <View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:urgency===u.id?u.c:C.border,backgroundColor:urgency===u.id?u.c:'transparent',alignItems:'center',justifyContent:'center'}}>{urgency===u.id&&<Ico n="checkmark" size={14} color="#fff"/>}</View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View><Text style={[s.secLbl,{marginBottom:8}]}>{ua?'Опис (необов\'язково)':'Description (optional)'}</Text><TextInput style={[s.field,{height:90,textAlignVertical:'top',paddingTop:14}]} value={desc} onChangeText={setDesc} placeholder={ua?'Деталі, кількість, умови...':'Details, quantity, terms...'} placeholderTextColor={C.textLight} multiline maxLength={300}/><Text style={{color:C.textLight,fontSize:11,marginTop:4,textAlign:'right'}}>{desc.length}/300</Text></View>
        <View><Text style={[s.secLbl,{marginBottom:8}]}>{ua?'Фото (необов\'язково)':'Photo (optional)'}</Text>
          {photoUri?(
            <View><Image source={{uri:photoUri}} style={{width:'100%',height:180,borderRadius:14,marginBottom:10}} resizeMode="cover"/>
              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity style={[s.btnOut,{flex:1,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}]} onPress={pickPhoto}><Ico n="image-outline" size={16} color={C.text}/><Text style={[s.btnOutTxt,{fontSize:13}]}>{ua?'Замінити':'Replace'}</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btnOut,{flex:1,paddingVertical:12,borderColor:C.red,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}]} onPress={()=>{setPhotoUri(null);setPhotoB64(null);}}><Ico n="close" size={16} color={C.red}/><Text style={[s.btnOutTxt,{fontSize:13,color:C.red}]}>{ua?'Видалити':'Remove'}</Text></TouchableOpacity>
              </View>
            </View>
          ):(
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}><Ico n="image-outline" size={28} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12,fontWeight:'500',marginTop:6}}>{ua?'Галерея':'Gallery'}</Text></TouchableOpacity>
              <TouchableOpacity style={s.photoBtn} onPress={takePhoto}><Ico n="camera-outline" size={28} color={C.textSub}/><Text style={{color:C.textSub,fontSize:12,fontWeight:'500',marginTop:6}}>{ua?'Камера':'Camera'}</Text></TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{height:20}}/>
      </ScrollView>
      <View style={s.footer}>{success?<View style={[s.btn,{backgroundColor:'#2E7D32',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}]}><Ico n="checkmark-circle-outline" size={20} color={C.white}/><Text style={s.btnTxt}>{ua?'Опубліковано!':'Published!'}</Text></View>:<TouchableOpacity style={s.btn} onPress={handle} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>{ua?'Опублікувати':'Publish listing'}</Text>}</TouchableOpacity>}</View>
    </View>
  );
}

// ─── MAIN TABS ───────────────────────────────────────
function MainTabs({lang,setLang,user,onLogout,onNavigate,onSelectResource,onSelectUser,onUserUpdate}:{lang:Lang;setLang:(l:Lang)=>void;user:User;onLogout:()=>void;onNavigate:(s:Screen)=>void;onSelectResource:(r:Resource)=>void;onSelectUser:(uid:string,un:string)=>void;onUserUpdate:(u:User)=>void}) {
  const [tab,setTab]=useState<Tab>('Home');const [unread,setUnread]=useState(0);
  useEffect(()=>{const ch=subscribeToResources(r=>setUnread(r.filter(x=>x.urgency==='critical'&&x.user_id!==user.id).length));getAllResources().then(r=>setUnread(r.filter(x=>x.urgency==='critical'&&x.user_id!==user.id).length));return()=>ch.unsubscribe();},[]);
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={{flex:1}}>
        {tab==='Home'         &&<HomeContent onNavigate={onNavigate} lang={lang} user={user} onSelectResource={onSelectResource} onSelectUser={onSelectUser} onSwitchToMap={()=>setTab('Map')}/>}
        {tab==='Map'          &&<MapContent onNavigate={onNavigate} lang={lang} user={user} onSelectResource={onSelectResource} onSelectUser={onSelectUser}/>}
        {tab==='Chats'        &&<ChatsListContent lang={lang} user={user} onOpenChat={r=>{onSelectResource(r);onNavigate('Chat');}}/>}
        {tab==='Notifications'&&<NotificationsContent lang={lang} user={user}/>}
        {tab==='Profile'      &&<ProfileContent lang={lang} setLang={setLang} user={user} onLogout={onLogout} onUserUpdate={onUserUpdate}/>}
      </View>
      <BottomNav tab={tab} setTab={setTab} unread={unread} lang={lang}/>
    </View>
  );
}

// ─── APP ─────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState<Screen>('Splash');const [lang,setLang]=useState<Lang>('en');const [user,setUser]=useState<User|null>(null);const [selRes,setSelRes]=useState<Resource|null>(null);const [profUid,setProfUid]=useState('');const [profUname,setProfUname]=useState('');
  function handleLogin(u:User){setUser(u);setScreen('Home');}
  function handleLogout(){setUser(null);setScreen('Splash');}
  function handleUserUpdate(u:User){setUser(u);}
  function handleSelectUser(uid:string,un:string){setProfUid(uid);setProfUname(un);setScreen('UserProfile');}
  const isMainTab=['Home','Map','Notifications','Profile','Chats'].includes(screen);
  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.white}}>
      <StatusBar style="dark"/>
      {screen==='Splash'      &&<SplashScreen onNext={setScreen as (s:Screen)=>void} lang={lang} setLang={setLang}/>}
      {screen==='Login'       &&<LoginScreen onSuccess={handleLogin} onBack={()=>setScreen('Splash')} onRegister={()=>setScreen('Register')} lang={lang}/>}
      {screen==='Register'    &&<RegisterScreen onSuccess={handleLogin} onBack={()=>setScreen('Login')} lang={lang}/>}
      {isMainTab&&user        &&<MainTabs lang={lang} setLang={setLang} user={user} onLogout={handleLogout} onNavigate={setScreen as (s:Screen)=>void} onSelectResource={setSelRes as (r:Resource)=>void} onSelectUser={handleSelectUser} onUserUpdate={handleUserUpdate}/>}
      {screen==='Create'      &&user&&<CreateScreen onBack={()=>setScreen('Home')} lang={lang} user={user} onPublished={r=>{setSelRes(r);setScreen('MyTrade');}}/>}
      {screen==='MyTrade'     &&user&&<MyTradeScreen onBack={()=>setScreen('Home')} lang={lang} user={user} resource={selRes}/>}
      {screen==='ActiveTrade' &&user&&<ActiveTradeScreen onBack={()=>setScreen('Home')} lang={lang} user={user} resource={selRes} onViewProfile={handleSelectUser} onOpenChat={()=>{if(selRes)setScreen('Chat');}}/>}
      {screen==='Chat'        &&user&&selRes&&<ChatScreen onBack={()=>setScreen('Home')} onGoToTrade={()=>{if(selRes)setScreen(selRes.user_id===user.id?'MyTrade':'ActiveTrade');}} lang={lang} user={user} resource={selRes}/>}
      {screen==='UserProfile' &&<UserProfileScreen onBack={()=>setScreen('Home')} lang={lang} userId={profUid} username={profUname}/>}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────
const s=StyleSheet.create({
  container:{flex:1,backgroundColor:C.white},
  topBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:16,paddingBottom:12,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border},
  screenHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:20,paddingBottom:14,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border},
  screenTitle:{fontSize:22,fontWeight:'700',color:C.text},
  footer:{padding:20,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.white,gap:10},
  btn:{backgroundColor:C.green,borderRadius:14,paddingVertical:16,alignItems:'center'},
  btnTxt:{fontSize:16,fontWeight:'700',color:C.white},
  btnOut:{borderWidth:1.5,borderColor:C.border,borderRadius:14,paddingVertical:16,alignItems:'center',backgroundColor:C.white},
  btnOutTxt:{fontSize:16,fontWeight:'600',color:C.text},
  circleBtn:{width:40,height:40,borderRadius:20,backgroundColor:C.bg,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  fab:{position:'absolute',bottom:20,right:20,width:56,height:56,borderRadius:28,backgroundColor:C.green,alignItems:'center',justifyContent:'center',shadowColor:C.green,shadowOffset:{width:0,height:4},shadowOpacity:0.4,shadowRadius:8,elevation:8},
  nav:{flexDirection:'row',justifyContent:'space-around',backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,paddingTop:10,paddingBottom:24},
  navItem:{alignItems:'center',gap:4,flex:1},
  navIconBox:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  navIconBoxActive:{backgroundColor:C.greenLight},
  navLabel:{fontSize:11,fontWeight:'500'},
  navBadge:{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:8,backgroundColor:C.red,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.white},
  splashLogo:{width:110,height:110,backgroundColor:C.greenLight,borderRadius:30,alignItems:'center',justifyContent:'center',marginBottom:28,borderWidth:2,borderColor:C.green+'44'},
  splashTitle:{fontSize:42,fontWeight:'800',color:C.text,letterSpacing:-1,marginBottom:12},
  splashSub:{fontSize:16,color:C.textSub,textAlign:'center',lineHeight:24,paddingHorizontal:20},
  langChip:{paddingHorizontal:16,paddingVertical:10,borderRadius:24,borderWidth:1.5,borderColor:C.border,backgroundColor:C.white},
  langChipA:{backgroundColor:C.green,borderColor:C.green},
  langChipTxt:{fontSize:14,fontWeight:'600',color:C.textSub},
  authTitle:{fontSize:28,fontWeight:'800',color:C.text,marginBottom:8},
  authSub:{fontSize:15,color:C.textSub},
  fieldWrap:{gap:8,marginBottom:16},
  fieldLabel:{fontSize:13,fontWeight:'600',color:C.text},
  field:{backgroundColor:C.bg,borderWidth:1.5,borderColor:C.border,borderRadius:12,padding:16,fontSize:15,color:C.text},
  errBox:{backgroundColor:C.redLight,borderRadius:10,padding:12,borderWidth:1,borderColor:C.red+'44'},
  errTxt:{color:C.red,fontSize:13,fontWeight:'500'},
  homeHdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingTop:20,paddingBottom:14,backgroundColor:C.white,gap:12},
  greeting:{fontSize:20,fontWeight:'800',color:C.text},
  greetingSub:{fontSize:13,color:C.textSub,marginTop:2},
  mapTeaser:{marginHorizontal:16,marginBottom:14,backgroundColor:C.white,borderRadius:14,padding:16,borderWidth:1.5,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:12},
  mapTeaserIcon:{width:44,height:44,borderRadius:12,backgroundColor:C.greenLight,alignItems:'center',justifyContent:'center'},
  searchBar:{flexDirection:'row',alignItems:'center',backgroundColor:C.white,borderRadius:14,borderWidth:1.5,borderColor:C.border,paddingHorizontal:14,gap:10,paddingVertical:4},
  filterChip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:C.border,backgroundColor:C.white},
  filterChipTxt:{fontSize:13,fontWeight:'500',color:C.textSub},
  catChip:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:C.border,backgroundColor:C.white},
  catChipTxt:{fontSize:12,fontWeight:'500',color:C.textSub},
  chip:{paddingHorizontal:10,paddingVertical:5,borderRadius:20,borderWidth:1,borderColor:C.border},
  secLbl:{fontSize:13,fontWeight:'700',color:C.text,letterSpacing:0.3},
  card:{backgroundColor:C.white,borderRadius:16,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:12,elevation:3},
  sectionCard:{backgroundColor:C.white,borderRadius:16,padding:16,borderWidth:1,borderColor:C.border},
  tradeRow:{flexDirection:'row',gap:8},
  tradeBox:{flex:1,borderRadius:12,borderWidth:1.5,padding:12},
  urgBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  urgBadgeTxt:{fontSize:11,fontWeight:'700'},
  avatarSm:{width:36,height:36,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center',flexShrink:0},
  avatarMd:{width:46,height:46,borderRadius:14,borderWidth:1.5,alignItems:'center',justifyContent:'center',flexShrink:0},
  avatarLg:{width:96,height:96,borderRadius:24,borderWidth:2.5,alignItems:'center',justifyContent:'center'},
  avatarEditOverlay:{position:'absolute',bottom:0,left:0,right:0,height:28,backgroundColor:C.green,borderBottomLeftRadius:24,borderBottomRightRadius:24,alignItems:'center',justifyContent:'center'},
  profileHero:{alignItems:'center',gap:12,paddingTop:24,paddingBottom:24,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border},
  statsRow:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:C.border,backgroundColor:C.white},
  statCard:{flex:1,alignItems:'center',paddingVertical:20,borderRightWidth:1,borderRightColor:C.border},
  emptyBox:{alignItems:'center',paddingVertical:60},
  mapPin:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.2,shadowRadius:4,elevation:4},
  mapHdr:{position:'absolute',top:0,left:0,right:0,flexDirection:'row',alignItems:'center',gap:12,padding:16,backgroundColor:'rgba(255,255,255,0.95)'},
  mapCircleBtn:{width:42,height:42,backgroundColor:C.white,borderRadius:21,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  mapLegend:{position:'absolute',bottom:16,left:16,backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:12,gap:7,borderWidth:1,borderColor:C.border},
  mapPopup:{position:'absolute',bottom:16,left:16,right:16,backgroundColor:C.white,borderRadius:20,padding:18,borderWidth:1,borderColor:C.border,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.15,shadowRadius:12,elevation:8},
  mapPopupClose:{position:'absolute',top:14,right:14,width:28,height:28,alignItems:'center',justifyContent:'center'},
  notifCard:{flexDirection:'row',gap:12,backgroundColor:C.white,borderRadius:14,padding:14,marginBottom:8,borderWidth:1,borderColor:C.border},
  notifIconBox:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',flexShrink:0},
  unreadDot:{position:'absolute',top:-3,right:-3,width:10,height:10,borderRadius:5,borderWidth:2,borderColor:C.white},
  notifSec:{fontSize:11,fontWeight:'700',color:C.textLight,letterSpacing:1.5,marginBottom:10,marginTop:4},
  chatRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:C.divider,backgroundColor:C.white},
  chatHdr:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:14,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border},
  chatInputRow:{flexDirection:'row',gap:10,padding:14,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.white,alignItems:'flex-end'},
  chatField:{flex:1,backgroundColor:C.bg,borderRadius:22,paddingHorizontal:16,paddingVertical:10,fontSize:15,color:C.text,maxHeight:110,minHeight:44,borderWidth:1,borderColor:C.border},
  sendBtn:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',marginBottom:1},
  qrChip:{backgroundColor:C.bg,borderWidth:1,borderColor:C.border,borderRadius:20,paddingHorizontal:12,paddingVertical:6},
  bottomSheet:{backgroundColor:C.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,gap:10,paddingBottom:36},
  sheetHandle:{width:40,height:4,borderRadius:2,backgroundColor:C.border,alignSelf:'center',marginBottom:16},
  sheetTitle:{fontSize:20,fontWeight:'700',color:C.text},
  sheetSub:{fontSize:14,color:C.textSub},
  reasonRow:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:14,borderWidth:1.5,borderColor:C.border},
  successBanner:{backgroundColor:C.green,borderRadius:16,padding:20,flexDirection:'row',alignItems:'center',gap:14},
  catBtn:{width:'30%',aspectRatio:1,backgroundColor:C.white,borderRadius:14,borderWidth:1.5,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  urgRow:{flexDirection:'row',alignItems:'center',padding:16,borderRadius:14,borderWidth:1.5,borderColor:C.border,backgroundColor:C.white},
  photoBtn:{flex:1,backgroundColor:C.white,borderRadius:14,borderWidth:1.5,borderColor:C.border,borderStyle:'dashed',alignItems:'center',justifyContent:'center',paddingVertical:28},
});