#!/usr/bin/env bash
# Equivalente em Linux/macOS do new-signing-certificate.ps1: gera o certificado autoassinado
# de assinatura do agente. Rode UMA vez; não gere outro a cada tag.
#
# Uso: ./new-signing-certificate.sh <diretorio-de-saida>
# A senha do PFX é pedida no terminal (ou vem de AGENT_SIGNING_PASSWORD, para automação).
set -euo pipefail

out="${1:?Uso: $0 <diretorio-de-saida>}"
mkdir -p "$out"
umask 077

pfx="$out/acerola-agent-signing.pfx"
[ -e "$pfx" ] && { echo "Já existe uma chave neste diretório. Não substitua o certificado das máquinas." >&2; exit 1; }

password="${AGENT_SIGNING_PASSWORD:-}"
if [ -z "$password" ]; then
  read -r -s -p "Senha da chave de assinatura: " password; echo
  read -r -s -p "Repita a senha: " again; echo
  [ "$password" = "$again" ] || { echo "As senhas não conferem." >&2; exit 1; }
fi
[ -n "$password" ] || { echo "A senha não pode ser vazia." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cat > "$work/ext.cnf" <<'EOF'
[req]
distinguished_name = dn
x509_extensions = ext
prompt = no
[dn]
CN = Acerola Agent
[ext]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = codeSigning
subjectKeyIdentifier = hash
EOF

openssl req -x509 -newkey rsa:3072 -sha256 -days 1825 -nodes \
  -keyout "$work/key.pem" -out "$work/cert.pem" -config "$work/ext.cnf" 2>/dev/null

openssl x509 -in "$work/cert.pem" -outform DER -out "$out/publisher.cer"

# 3DES/SHA1 só na embalagem do PFX: o Import-PfxCertificate do runner Windows lê sem problema.
# A assinatura continua RSA 3072 + SHA256.
AGENT_PFX_PASSWORD="$password" openssl pkcs12 -export \
  -inkey "$work/key.pem" -in "$work/cert.pem" -name "Acerola Agent" -out "$pfx" \
  -passout env:AGENT_PFX_PASSWORD \
  -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1

echo "Gerado em $out:"
echo "  acerola-agent-signing.pfx  (privado: só cofre e Secrets do GitHub)"
echo "  publisher.cer            (público: o que vai para as máquinas)"
echo "Fingerprint SHA256: $(openssl x509 -inform DER -in "$out/publisher.cer" -noout -fingerprint -sha256 | cut -d= -f2)"
echo
echo "Cadastre no GitHub:"
echo "  base64 -w0 '$pfx' | gh secret set AGENT_SIGNING_PFX_BASE64 -R vinicius-gpl/acerola-ticket"
echo "  gh secret set AGENT_SIGNING_PASSWORD -R vinicius-gpl/acerola-ticket"
