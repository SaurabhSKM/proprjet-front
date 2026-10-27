#!/bin/bash

# Script de diagnostic pour problèmes SSL/npm

echo "🔍 NPM SSL/TLS Diagnostic"
echo "=========================="
echo ""

echo "1️⃣ Configuration npm actuelle:"
npm config list | grep -E "registry|strict-ssl|fetch"
echo ""

echo "2️⃣ Connectivité registry:"
echo "  Testing https://registry.npmjs.org/..."
curl -I https://registry.npmjs.org/ 2>&1 | head -3
echo ""

echo "  Testing https://registry.npmmirror.com/..."
curl -I https://registry.npmmirror.com/ 2>&1 | head -3
echo ""

echo "3️⃣ Certificats SSL/TLS:"
echo "  OpenSSL version:"
openssl version
echo ""

echo "  CA certificates:"
if [ -f /etc/ssl/certs/ca-certificates.crt ]; then
  echo "  ✅ /etc/ssl/certs/ca-certificates.crt found"
  wc -l /etc/ssl/certs/ca-certificates.crt | awk '{print "  📊 Total certificates: " $1}'
else
  echo "  ❌ /etc/ssl/certs/ca-certificates.crt NOT FOUND"
fi
echo ""

echo "4️⃣ Node.js et npm:"
echo "  Node version: $(node --version)"
echo "  npm version: $(npm --version)"
echo ""

echo "5️⃣ Test de téléchargement:"
echo "  Attempting: npm view npm version"
npm view npm version 2>&1 | head -5
echo ""

echo "6️⃣ Configuration .npmrc:"
if [ -f .npmrc ]; then
  echo "  ✅ .npmrc found:"
  cat .npmrc
else
  echo "  ⚠️ No .npmrc file"
fi
echo ""

echo "=========================================="
echo "Si vous voyez des erreurs EPROTO:"
echo "  1. Vérifier /etc/ssl/certs/ca-certificates.crt"
echo "  2. Essayer: npm config set strict-ssl false"
echo "  3. Essayer mirror: npm config set registry https://registry.npmmirror.com/"
echo "=========================================="
