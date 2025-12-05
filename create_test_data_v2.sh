#!/bin/bash

BASE_URL="http://localhost:5000"

# Create temporary cookie jar files
ADMIN_COOKIES=$(mktemp)
trap "rm -f $ADMIN_COOKIES /tmp/user_cookies_*" EXIT

echo "==============================================="
echo "Step 1: Create admin user"
echo "==============================================="

# Create admin (will have id=23 approximately)
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"adminuser","password":"adminpass123"}')

echo "Admin created: $ADMIN_RESPONSE"

# Login as admin and save cookies
curl -s -c "$ADMIN_COOKIES" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"adminuser","password":"adminpass123"}' > /dev/null

# Update admin role in database (direct SQL approach - requires psql)
echo ""
echo "==============================================="
echo "Step 2: Set admin role in database"
echo "==============================================="

# Set the admin user to admin role (assuming admin is id=23, or we can find it)
ADMIN_ID=$(sudo -u postgres psql -d myapp -t -c "SELECT id FROM users WHERE username='adminuser' LIMIT 1;" 2>/dev/null | xargs)
if [ ! -z "$ADMIN_ID" ]; then
  sudo -u postgres psql -d myapp -c "UPDATE users SET role='admin' WHERE id=$ADMIN_ID;" 2>/dev/null
  echo "✓ Admin role set for user ID $ADMIN_ID"
else
  echo "Could not determine admin user ID"
fi

sleep 1

echo ""
echo "==============================================="
echo "Step 3: Create 20 exchanges"
echo "==============================================="

for i in {1..20}; do
  EXCHANGE_NAME="Binance"
  PRICE=$((i * 100))
  
  RESPONSE=$(curl -s -b "$ADMIN_COOKIES" -X POST "$BASE_URL/api/exchanges" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$EXCHANGE_NAME\",\"priceUsdt\":\"$PRICE.00\"}")
  
  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✓ Exchange $i created"
  else
    echo "✗ Exchange $i failed: $RESPONSE"
  fi
  
  sleep 0.1
done

echo ""
echo "==============================================="
echo "Step 4: Approve all 20 users"
echo "==============================================="

for i in {1..20}; do
  # Users are IDs 1-20
  RESPONSE=$(curl -s -b "$ADMIN_COOKIES" -X PATCH "$BASE_URL/api/users/$i/approve" \
    -H 'Content-Type: application/json')
  
  if echo "$RESPONSE" | grep -q '"isApproved"'; then
    echo "✓ User $i approved"
  else
    echo "✗ User $i approval failed"
  fi
  
  sleep 0.05
done

echo ""
echo "==============================================="
echo "Step 5: Create 20 accounts per user"
echo "==============================================="

TOTAL_ACCOUNTS=0

for user_idx in {1..20}; do
  USERNAME="user$user_idx"
  PASSWORD="password$user_idx"
  USER_COOKIES=$(mktemp)
  
  # Login as this user
  curl -s -c "$USER_COOKIES" -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" > /dev/null
  
  # Create 20 accounts for this user
  for acc_idx in {1..20}; do
    EMAIL="user$user_idx.account$acc_idx@example.com"
    PASSWORD_HASH="pass_$user_idx$acc_idx"
    EXCHANGE="Binance"
    
    RESPONSE=$(curl -s -b "$USER_COOKIES" -X POST "$BASE_URL/api/submissions" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"passwordHash\":\"$PASSWORD_HASH\",\"exchange\":\"$EXCHANGE\"}")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
      TOTAL_ACCOUNTS=$((TOTAL_ACCOUNTS + 1))
    fi
    
    sleep 0.02
  done
  
  if [ $((user_idx % 5)) -eq 0 ]; then
    echo "✓ User $user_idx: Created 20 accounts (Total: $TOTAL_ACCOUNTS)"
  fi
  
  rm -f "$USER_COOKIES"
done

echo ""
echo "==============================================="
echo "SUMMARY"
echo "==============================================="
echo "Users: 20 (IDs 1-20)"
echo "Exchanges: 20"
echo "Total Accounts: $TOTAL_ACCOUNTS (should be 400 = 20 × 20)"
echo "==============================================="
echo ""
echo "Opening app at http://localhost:5173"
