#!/bin/bash
echo "Supabase stopping"
supabase stop
echo "Kill possible docker containers residuals"
docker rm -f $(docker ps -a -q --filter "name=supabase_.*_CRM_template")
echo "Restarting supabase"
supabase start