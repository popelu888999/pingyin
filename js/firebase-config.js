// 《拼音大冒险》— Firebase 初始化（compat SDK，无需构建工具）

const firebaseConfig = {
  apiKey: "AIzaSyDrjuySjgHCQRT8_EKGXWqEZ8A_KHdgyeo",
  authDomain: "pingyin-adventure.firebaseapp.com",
  projectId: "pingyin-adventure",
  storageBucket: "pingyin-adventure.firebasestorage.app",
  messagingSenderId: "364365732690",
  appId: "1:364365732690:web:8f024d931603d9b9b5f88b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// 启用 Firestore 离线持久化（断网也能用）
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('[Firebase] 多标签页打开，离线持久化仅在一个标签页生效');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] 当前浏览器不支持离线持久化');
  }
});

console.log('[Firebase] 初始化完成');
