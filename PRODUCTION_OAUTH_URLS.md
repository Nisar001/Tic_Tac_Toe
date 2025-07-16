# 🎯 Final OAuth Redirect URLs - Copy & Paste Ready

## 🔗 Your Deployed URLs
- **Frontend**: https://tictactoenisar.netlify.app
- **Backend**: https://tic-tac-toe-uf5h.onrender.com

---

## 🔑 Google OAuth Configuration

### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Click on your OAuth 2.0 Client ID

### **Authorized JavaScript origins:**
```
https://tictactoenisar.netlify.app
https://tic-tac-toe-uf5h.onrender.com
http://localhost:3000
```

### **Authorized redirect URIs:**
```
https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback
http://localhost:5000/api/auth/social/google/callback
```

---

## 📘 Facebook OAuth Configuration

### Facebook Developer Console Setup:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to "Facebook Login" > "Settings"

### **Valid OAuth Redirect URIs:**
```
https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback
http://localhost:5000/api/auth/social/facebook/callback
```

### **Valid App Domains:**
```
tictactoenisar.netlify.app
tic-tac-toe-uf5h.onrender.com
```

### **Site URL:**
```
https://tictactoenisar.netlify.app
```

---

## 🔄 How It Works

1. **User clicks social login** → Frontend redirects to backend
2. **Backend handles OAuth** → User authenticates with Google/Facebook
3. **OAuth provider returns to backend** → Backend processes tokens
4. **Backend redirects to frontend** → With auth tokens in URL
5. **Frontend handles callback** → Stores tokens and logs user in

---

## ✅ Quick Copy-Paste Summary

### For Google OAuth Console:
**JavaScript Origins:**
- `https://tictactoenisar.netlify.app`
- `https://tic-tac-toe-uf5h.onrender.com`

**Redirect URIs:**
- `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback`

### For Facebook OAuth Console:
**Valid OAuth Redirect URIs:**
- `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback`

**App Domains:**
- `tictactoenisar.netlify.app`

**Site URL:**
- `https://tictactoenisar.netlify.app`
