"use client";


function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

//const id= generateUUID();



function getOrSetUUID() {
    const cookieName = "sip3m_uuid";
    
    // Cookieを取得する関数
    function getCookie(name) {
        const cookies = document.cookie.split("; ");
        for (let cookie of cookies) {
            let [key, value] = cookie.split("=");
            if (key === name) {
                return value;
            }
        }
        return null;
    }

    // Cookieに保存する関数
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + "; path=/" + expires;
    }

    if (!window.name){// Tab毎にユニークなIDを生成
        window.name = Math.random().toString(36).slice(2,9);
    }

    // UUIDを取得または新規生成
    let uuid = getCookie(cookieName);
    if (!uuid) {
        uuid = generateUUID(); // crypto.randomUUID();
        setCookie(cookieName, uuid, 365); // 1年間保存
    }
    let name = window.name;
    if(window.location.pathname.endsWith("/viewer/")) {
        name = name+ "-viewer";
    }
    return uuid+"-"+name; // これで tab毎に違うIDとして使える。
}

// UUIDを取得または設定
export const userUUID = getOrSetUUID(); // これ、問題は同じブラウザだと同じIDになっちゃう
console.log("User UUID:", userUUID);