# SafeWorld Crime Map - GitHub Pages Deployment

This project is deployed on GitHub Pages and requires some setup for the Google Maps API key.

## For GitHub Pages Deployment

### Option 1: Public API Key with Domain Restrictions (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new API key or use your existing one
3. Add your GitHub Pages domain to the **HTTP referrers** restrictions:
   - `https://yourusername.github.io/*`
   - `https://yourusername.github.io/GoogleMapHackathon/*`
4. Create `config.js` from `config.template.js` and add your restricted API key
5. **Important**: Remove `config.js` from `.gitignore` for GitHub Pages (it's safe now because it's domain-restricted)

### Option 2: Environment Variables with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Create config.js
      run: |
        cat > config.js << EOF
        const CONFIG = {
          GOOGLE_MAPS_API_KEY: '${{ secrets.GOOGLE_MAPS_API_KEY }}'
        };
        // ... rest of config template
        EOF
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## Local Development

1. Copy `config.template.js` to `config.js`
2. Add your Google Maps API key to `config.js`
3. Make sure `config.js` is in `.gitignore` for security

## Current Issue Resolution

Your maps don't load on GitHub Pages because:
- ✅ `config.js` is in `.gitignore` (good for security)
- ❌ GitHub Pages can't access `config.js` (causes the loading issue)

**Solution**: Use Option 1 above with domain-restricted API key.
