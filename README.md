Cobotta Pro の IK で MQTT 経由で Joint 情報を送るコード

```
pnpm install 
pnpm dev-https
```

で https 経由で動作します。

Chrome ブラウザで動かすには、WebXR のプラグイン（Immersive Web Emulator)が必要です。
https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik?hl=ja

また、MQTTの設定などが static に書いてあるので修正が必要です。

MQTT 側で動作するマネージャもプロトタイプを作りました

https://github.com/nkawa/MetaworkMQTT

（なお sora2.uclab.jp であれば、すでに MetaworkMQTT が入れてあるので、入れなくても動作するはず）



