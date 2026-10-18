#!/bin/sh
set -e
cd /app
npm install @supabase/supabase-js --workspace @recruitment/backend
npm install -D @types/multer --workspace @recruitment/backend
echo INSTALL_OK
