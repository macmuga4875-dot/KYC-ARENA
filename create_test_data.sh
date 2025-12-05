#!/bin/bash

BASE_URL="http://localhost:5000"
USERS_CREATED=0
ACCOUNTS_CREATED=0

echo "==============================================="
echo "Creating 20 users..."
echo "==============================================="

# Create 20 users
for i in {1..20}; do
  USERNAME="user$i"
  PASSWORD="password$i"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
  
  if echo "$RESPONSE" | grep -q "user"; then
    echo "✓ User $i created: $USERNAME"
    USERS_CREATED=$((USERS_CREATED + 1))
  else
    echo "✗ User $i failed: $RESPONSE"
  fi
  
  sleep 0.1
done

echo ""
echo "==============================================="
echo "Users Created: $USERS_CREATED"
echo "==============================================="
echo ""

# First, get a session as admin or create admin
echo "Setting up admin session..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpass"}')

echo "Admin setup response: $ADMIN_RESPONSE"

# Get cookies for admin session
COOKIE_JAR=$(mktemp)

# Try admin login
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpass"}' > /dev/null

echo ""
echo "==============================================="
echo "Creating 20 exchanges..."
echo "==============================================="

# Create 20 exchanges
for i in {1..20}; do
  EXCHANGE_NAME="Exchange$i"
  PRICE=$((i * 100))
  
  RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/exchanges" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$EXCHANGE_NAME\",\"priceUsdt\":\"$PRICE.00\"}")
  
  if echo "$RESPONSE" | grep -q "id"; then
    echo "✓ Exchange $i created: $EXCHANGE_NAME"
  else
    echo "✗ Exchange $i failed"
  fi
  
  sleep 0.1
done

echo ""
echo "==============================================="
echo "Creating 20 accounts per user..."
echo "==============================================="

# For each user, create 20 accounts
for user_idx in {1..20}; do
  USERNAME="user$user_idx"
  PASSWORD="password$user_idx"
  USER_COOKIE_JAR=$(mktemp)
  
  # Login as this user
  curl -s -c "$USER_COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" > /dev/null
  
  # Approve user (using admin cookie)
  USER_ID=$user_idx
  curl -s -b "$COOKIE_JAR" -X PATCH "$BASE_URL/api/users/$USER_ID/approve" \
    -H 'Content-Type: application/json' > /dev/null 2>&1
  
  sleep 0.2
  
  # Create 20 accounts for this user
  for acc_idx in {1..20}; do
    EMAIL="user$user_idx.account$acc_idx@example.com"
    PASSWORD_HASH="pass_hash_$user_idx$acc_idx"
    EXCHANGE="Exchange$acc_idx"
    
    RESPONSE=$(curl -s -b "$USER_COOKIE_JAR" -X POST "$BASE_URL/api/submissions" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"passwordHash\":\"$PASSWORD_HASH\",\"exchange\":\"$EXCHANGE\",\"status\":\"pending\"}")
    
    if echo "$RESPONSE" | grep -q "id"; then
      ACCOUNTS_CREATED=$((ACCOUNTS_CREATED + 1))
      if [ $((acc_idx % 5)) -eq 0 ]; then
        echo "✓ User $user_idx: Created accounts 1-$acc_idx/20"
      fi
    fi
    
    sleep 0.05
  done
  
  rm -f "$USER_COOKIE_JAR"
done

echo ""
echo "==============================================="
echo "SUMMARY"
echo "==============================================="
echo "Users Created: $USERS_CREATED"
echo "Accounts Created: $ACCOUNTS_CREATED (should be 400 = 20 users × 20 accounts)"
echo "==============================================="

rm -f "$COOKIE_JAR"
