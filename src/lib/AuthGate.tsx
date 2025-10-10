"use client";
// /components/AuthGate.tsx
import React, { PropsWithChildren, useEffect } from "react";
import { useAuth } from "../context/auth";
import { usePathname, useRouter , useSearchParams} from "next/navigation";
import { connectMQTT, mqttclient, idtopic, subscribeMQTT, publishMQTT, codeType } from '../lib/MetaworkMQTT'

import { logEnebular } from "./logEnebular";
import { userUUID } from './cookie_id';

// should run on client!
const ALLOW_LIST = (process.env.NEXT_PUBLIC_ALLOW_METAWORK_BROWSERS || "").split(',')

type AuthGateProps = PropsWithChildren<{
  noauth?: boolean;  
}>;

export default function AuthGate({ noauth, children }: AuthGateProps) {
  const user = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const metaworkType = searchParams.get("type") || ""; // ?id=123 → "123"

  // Enabular に post したい
  //  logEnebular(pathName,'login','',

  const [loaded, set_loaded] = React.useState(false);// ログイン時の状態遷移対応

  useEffect(() => {
    if (user === null ) {
      // 未ログイン → /login へ
//      const next = encodeURIComponent(pathname || "/");
      router.replace("/");

    } else {

      //    console.log('AuthGate user:', user, userUUID);
      const now = new Date();
      if (user !== undefined && user.user != null) {
        const location = process.env.NEXT_BASE_PATH+pathname+metaworkType; // BASE_PATH もログに含める（Jaka か、わかるように）さらにタイプも。
        console.log("AuthGate:User:", user);

        if (ALLOW_LIST.some((prefix)=> userUUID.startsWith(prefix)) || noauth){
          console.log("Allowed browser:",userUUID, noauth);
          console.log("AuthGate:Log", location, 'login', user.user.kid, user.user.id, 'Login to ' + location, now.toLocaleString() + ":" + userUUID)
          logEnebular(location, 'login', user.user.kid, user.user.id, 'Login to ' + location, now.toLocaleString() + " " + userUUID)
          // MQTT にもタイプ残したいよね。。。
          const userString = user.user.kid+"@"+location
          const mq = connectMQTT(null, userString);

        }else{
          logEnebular(location, 'wrong_terminal', user.user.kid, user.user.id, 'Login to ' + location, now.toLocaleString() + " " + userUUID+" no registration failed!")
            // 無許可のブラウザは PIN入力に戻る（なので、使えないｗ
           window.location.href = "https://"+ window.location.host+"/nonuser"          
        }

      } else {
        console.log("AuthGate: under working...",user);
        set_loaded(user.loading)
        if (loaded){
          if (user.user === null && !noauth){
            window.location.href = "https://" + window.location.host+"/nonuser"
          }
        }

      }

      
    }

  }, [user, router, pathname]);

  if (user === undefined) {
    // 取得中
    return (
      <div className="p-6 text-center">
        <span className="animate-pulse">Checking session…</span>
      </div>
    );
  }

  if (user === null) {
    // リダイレクト中は何も描画しない
    return null;
  }


  // ログイン済み
  return <>{children}</>;
}
// このコンポーネントは、ユーザーがログインしているかどうかを確認し、
// ログインしていない場合はログインページにリダイレクトします。
// ログイン状態が不明な場合は、ローディング状態を表示します。
