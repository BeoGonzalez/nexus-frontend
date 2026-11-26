#!/usr/bin/env bash
# Sincroniza las variables y secrets del pipeline devsecops-frontend con la cuenta AWS actual
# (la sesión del Learner Lab en ~/.aws/credentials). Ejecutar cada vez que se reinicia el lab.
# Requiere: aws CLI y gh CLI autenticado (gh auth login).
set -euo pipefail

REPO="${REPO:-BeoGonzalez/nexus-frontend}"
PROFILE="${AWS_PROFILE:-default}"
REGION="$(aws configure get region --profile "$PROFILE" || echo us-east-1)"
ACCOUNT_ID="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
ECR_REPO="${ECR_REPOSITORY_FRONTEND:-nexus-frontend}"

aws ecr describe-repositories --profile "$PROFILE" --region "$REGION" \
  --repository-names "$ECR_REPO" >/dev/null

echo "Cuenta $ACCOUNT_ID · región $REGION · ECR $ECR_REPO → $REPO"

gh variable set AWS_ACCOUNT_ID          --repo "$REPO" --body "$ACCOUNT_ID"
gh variable set AWS_REGION              --repo "$REPO" --body "$REGION"
gh variable set NEXT_PUBLIC_AWS_REGION  --repo "$REPO" --body "$REGION"
gh variable set ECR_REPOSITORY_FRONTEND --repo "$REPO" --body "$ECR_REPO"

# Credenciales temporales: se pasan por stdin, nunca se imprimen.
for key in aws_access_key_id aws_secret_access_key aws_session_token; do
  aws configure get "$key" --profile "$PROFILE" \
    | gh secret set "$(echo "$key" | tr '[:lower:]' '[:upper:]')" --repo "$REPO"
done

echo "Listo. Las credenciales del lab caducan (~4 h): vuelve a ejecutar tras cada reinicio."
