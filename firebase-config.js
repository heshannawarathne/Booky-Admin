// js/firebase-config.js ඇතුළේ

var firebaseConfig = {
    apiKey: "AIzaSyB26tawJ3La7cSldcfP6ldyfZNf2HdFafc",
    authDomain: "bookyapp-bef0e.firebaseapp.com",
    databaseURL: "https://bookyapp-bef0e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bookyapp-bef0e",
    storageBucket: "bookyapp-bef0e.firebasestorage.app",
    messagingSenderId: "145154911764",
    appId: "1:145154911764:web:2be47f7c68f39d85df4101",
    measurementId: "G-4GH90XM7P7"
};

// Firebase initialize කරනවා
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
// මෙතන 'var' පාවිච්චි කරන්න අනිවාර්යයෙන්ම
var db = firebase.firestore(); 
console.log("Firebase Initialized and DB is ready!");