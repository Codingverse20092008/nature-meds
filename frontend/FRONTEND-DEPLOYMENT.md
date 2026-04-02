# Frontend Deployment Guide - Nature Meds

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- [Vercel account](https://vercel.com)
- GitHub repository with frontend code
- Backend deployed and running

### Step-by-Step Deployment

#### 1. Update Environment Variables
Create `.env` in frontend root:
```bash
# Development
VITE_API_BASE_URL=http://localhost:3000

# Production (after backend is deployed)
VITE_API_BASE_URL=https://naturemeds-api.onrender.com/api/v1
```

#### 2. Test Build Locally
```bash
cd frontend
npm run build
npm run preview
```

Verify:
- ✅ Login works
- ✅ AI coach works  
- ✅ Orders work
- ✅ All pages load correctly

#### 3. Deploy to Vercel

**Option A: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option B: GitHub Integration**
1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository
5. Vercel will auto-detect React + Vite
6. Click **"Deploy"**

#### 4. Add Environment Variables in Vercel
1. Go to Project Settings → Environment Variables
2. Add: `VITE_API_BASE_URL` = `https://naturemeds-api.onrender.com/api/v1`
3. Redeploy: **"Redeploy"** → **"Redeploy"**

#### 5. Verify Deployment
- **Frontend URL**: `https://naturemeds.vercel.app`
- **Health Check**: Check if pages load correctly
- **API Connection**: Test login/registration

---

## 🔗 Backend ↔ Frontend Connection

### Backend CORS Configuration
Already configured in `render.yaml`:
```yaml
- key: CORS_ORIGIN
  value: https://naturemeds.vercel.app
```

### Frontend API Configuration
In `frontend/src/lib/api.ts`:
```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  withCredentials: true, // ✅ Important for cookies
});
```

---

## 🛠️ SPA Routing Configuration

### vercel.json (Already Created)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This ensures React Router works correctly on Vercel.

---

## 🧪 Final Testing Checklist

After deployment, test these critical flows:

### Authentication Flow
- [ ] **Signup**: Create new account
- [ ] **Email Verification**: Check email inbox
- [ ] **Login**: Login with credentials
- [ ] **Logout**: Session ends properly
- [ ] **Protected Routes**: Redirect to login if not authenticated

### E-commerce Flow
- [ ] **Browse Products**: View product listings
- [ ] **Product Details**: Click on products
- [ ] **Add to Cart**: Items appear in cart
- [ ] **Cart Management**: Update quantities, remove items
- [ ] **Checkout**: Complete order (COD)
- [ ] **Order History**: View past orders
- [ ] **Order Details**: View specific order info

### AI Coach Feature
- [ ] **AI Chat**: Send messages to AI coach
- [ ] **AI Responses**: Get meaningful responses
- [ ] **Chat History**: Previous messages persist

### Admin Features
- [ ] **Admin Login**: Access admin panel
- [ ] **Product Management**: Add/edit products
- [ ] **CSV Upload**: Import products via CSV
- [ ] **Order Management**: View and update orders
- [ ] **User Management**: View all users

### Responsive Design
- [ ] **Mobile**: Test on phone viewport
- [ ] **Tablet**: Test on tablet viewport  
- [ ] **Desktop**: Test on desktop viewport

---

## 🔄 CI/CD with GitHub

### Automatic Deployments
Vercel automatically deploys when you push to `main`:
```bash
git add .
git commit -m "Update production API URL"
git push origin main
```

### Preview Deployments
Every PR gets a preview URL for testing.

---

## 📊 Performance Optimization

### Build Analysis
```bash
npm run build
# Analyze bundle size
npm run build -- --analyze
```

### Optimization Features
- ✅ **Code Splitting**: Automatic with Vite
- ✅ **Tree Shaking**: Unused code removed
- ✅ **Asset Optimization**: Images and CSS minified
- ✅ **Gzip Compression**: Enabled on Vercel

---

## 🔍 Troubleshooting

### "Cannot GET /" Error
- Ensure `vercel.json` is in frontend root
- Check SPA routing configuration

### CORS Errors
1. Verify backend `CORS_ORIGIN` includes your Vercel URL
2. Check `withCredentials: true` in frontend API config
3. Ensure backend is deployed and accessible

### API Connection Issues
1. Check `VITE_API_BASE_URL` in Vercel environment variables
2. Verify backend is running and accessible
3. Test API endpoints directly in browser

### Build Failures
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

---

## 🎯 Production URLs

After successful deployment:

| Service | URL |
|---------|-----|
| **Frontend** | `https://naturemeds.vercel.app` |
| **Backend API** | `https://naturemeds-api.onrender.com/api/v1` |
| **Health Check** | `https://naturemeds-api.onrender.com/health` |

---

## 📱 Mobile App Considerations

If planning mobile app:
- Use same API endpoints
- Authentication tokens work across platforms
- Consider React Native for native mobile experience

---

## 🚀 Next Steps

1. **Monitor**: Set up Vercel Analytics
2. **SEO**: Add meta tags and sitemap
3. **PWA**: Consider PWA capabilities
4. **Domain**: Add custom domain if needed
5. **Analytics**: Google Analytics or similar
