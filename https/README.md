# Admin only

Based on this article https://dev.to/istarkov/fast-and-easy-way-to-setup-web-developer-certificates-450e

```bash
sudo rm -rf /tmp/certbot/
sudo rm -rf /tmp/letsencrypt/

mkdir -p /tmp/certbot/
mkdir -p /tmp/letsencrypt/

infisical login
infisical init

CLOUDFLARE_API_KEY=$(infisical secrets get WSTD_DEV-CLOUDFLARE_ZONE_TOKEN --path='/CLI' --env=staging --plain)

cat > /tmp/certbot/cloudflare.ini <<-DOCKERFILE
  dns_cloudflare_api_token = ${CLOUDFLARE_API_KEY}
DOCKERFILE

docker run -it --rm --name certbot  \
-v "/tmp/letsencrypt/data:/etc/letsencrypt" \
-v "/tmp/certbot:/local/certbot" \
certbot/dns-cloudflare certonly \
--dns-cloudflare \
--dns-cloudflare-credentials /local/certbot/cloudflare.ini \
--agree-tos \
--noninteractive \
-m istarkov@gmail.com \
-d wstd.dev \
-d '*.wstd.dev'

sudo chown -R $USER:$(id -g) /tmp/letsencrypt

cp /tmp/letsencrypt/data/live/wstd.dev/fullchain.pem ./https/fullchain.pem
cp /tmp/letsencrypt/data/live/wstd.dev/privkey.pem ./https/privkey.pem
```
