#!/bin/bash
EXIT_CODE=0
wait_for_seconds=60

cleanup() {
  docker-compose down
  echo 'Docker containers are down'
  exit "$EXIT_CODE"
}

trap cleanup INT TERM

waitfor() {
  echo "Waiting for $1 to get ready..."

  while true; do
    STATUS_CODE=$(curl -sL -w "%{http_code}" -I "$1" -o /dev/null)
    printf .
    if [ "$STATUS_CODE" = "200" ]; then
      echo
      return 0
    fi
    ((i++))
    sleep 1
    if [[ i -eq wait_for_seconds ]]; then
      >&2 echo "ERROR: $1 is not up after $wait_for_seconds seconds"
      exit 2
    fi
  done
}

echo '**** Running script for e2e & integration tests ****'
export DC_U=$(id -u)
export DC_G=$(id -g)

if type ip &>/dev/null; then
  export HOST_IP="$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')"
elif type ipconfig &>/dev/null; then
  export HOST_IP="$(ipconfig getifaddr en0)"
elif [ -z "$HOST_IP" ]; then
  >&2 echo "ERROR: HOST_IP environment variable is required"
  exit 8
fi

operator=""
cv=""
app=""

while [ $# -ne 0 ]; do
  case "$1" in
    "operator") operator="-f ./docker-overrides/operator.yml"; shift 1;;
    "cv") cv="-f ./docker-overrides/example-cv.yml"; shift 1;;
    "app") app="-f ./docker-overrides/app.yml"; shift 1;;
    *) >&2 echo "ERROR: $1 is invalid override"; exit 8;;
  esac
done

# Tear down containers and start up again
docker-compose down
docker-compose -f docker-compose.yml $operator $cv $app up -d
echo 'Docker containers are up'

echo 'Sleep 3 seconds'
sleep 3

# Wait for operator, app-server and CV
waitfor http://localhost:3000/health
waitfor http://localhost:1338/health
waitfor http://localhost:4000/health

# Run e2e tests for /examples
echo 'Running e2e tests for /examples'
CYPRESS_baseUrl=http://localhost:4000 CYPRESS_APP_SERVER_URL=http://localhost:1338 npm run test-e2e
EXIT_CODE=$?

# Run integration tests
echo 'Running integration tests'
DOCKER=true OPERATOR_PGPORT=5435 OPERATOR_URL=http://localhost:3000 APP_SERVER_URL=http://localhost:1338 npm run test-integration
if [ $EXIT_CODE = 0 ]; then
  EXIT_CODE=$?
fi

cleanup
