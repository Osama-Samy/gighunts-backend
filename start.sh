#!/bin/sh

# If the first argument is "migrate", run migrations before starting
if [ "$1" = "migrate" ]; then
  echo "Running migrations..."
  npm run db:migrate
  echo "Fetching all available gigs..."
  npm run db:fetch-all
  shift # Remove "migrate" from arguments
fi

# Execute the command passed to the script (e.g., npm start, npm run worker)
exec "$@"
