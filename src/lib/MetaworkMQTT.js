"use client";
import mqtt from 'mqtt'
import {version} from '../../package.json' // load version


//const MetworkMQTT_URL = "https://sora2.uclab.jp/menroll"; 

const MQTT_BROKER_URL = "wss://sora2.uclab.jp/mqws"; // For Nagoya-U UCLab Development

import {userUUID} from './cookie_id';

// global private variable
export var mqttclient = null;
export var idtopic = userUUID;

// 本来であれば、デバイスIDなどを設定したい。（しかしブラウザは厳しい。Cookieでやるべき）
export const connectMQTT = () => {
    if (mqttclient == null) {
        const client = new mqtt.connect(MQTT_BROKER_URL, {protocolVersion: 5}); // noLocal を指定するため Version5 で接続
        client.on("connect", () => {
            console.log("MQTT Connected", client);

            const date = new Date();
            var devType = "browser";
            if(window.location.pathname.endsWith("/viewer/")) {
                devType = "robot";
            }
            const info = {
                date: date.toLocaleString(),
                device: {
//                    browser: navigator.appName,
//                    version: navigator.appVersion,
                    agent: navigator.userAgent,
//                    platform: navigator.platform,
                    cookie: navigator.cookieEnabled
                },
                devType: devType,
                codeType: 'cobotta-pro',
                version: version,
                devId: userUUID
            }
            // this is Metawork-MQTT protocol
            client.publish('mgr/register', JSON.stringify(info)) // for other devices.// maybe retransmit each 10seconds
            client.subscribe('dev/'+userUUID, {noLocal: true}, (err, granted) => {
                if (!err) {
                    console.log('MQTT Subscribe Granted',  granted);
                } else {
                    console.error('MQTT Subscription error: ', err);
                }
            });

        });
        client.on('error', function (err) {
            console.error('MQTT Connection error: ');
        });
        mqttclient = client;
    }
    return mqttclient
}


export const subscribeMQTT = (topic) => {
    if (mqttclient == null) {
        connectMQTT();
    }
    mqttclient.subscribe(topic, {noLocal: true}, (err, granted) => {
        if (!err) {
            console.log('MQTT Subscribe topics', topic, granted);
        } else {
            console.error('MQTT Subscription error: ', err);
        }
    });
}

export const publishMQTT = (topic, msg) => {
    mqttclient.publish(topic, msg);
}