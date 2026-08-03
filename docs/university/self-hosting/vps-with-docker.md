# ▶️ VPS with Docker

## Webstudio CLI Docker Deployment on a VPS (Step by Step)

This guide explains how to build a Webstudio project locally using the Docker template and deploy it on an Ubuntu VPS using Docker, Nginx as a reverse proxy, and Let’s Encrypt SSL.

***

### 1. Build the Website Locally

On your local machine, inside your Webstudio project:

```bash
webstudio build --template docker
```

This generates a Docker-ready build that runs a Node.js server (React Router) inside a container.

You should end up with a folder containing at least:

* `Dockerfile`
* `package.json`
* `build/`

***

### 2. Prepare the VPS (Ubuntu)

Connect to your VPS via SSH:

```bash
ssh user@VPS_IP
```

Update the system:

```bash
sudo apt update && sudo apt upgrade -y
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable docker
sudo systemctl start docker
```

(Optional) Allow running Docker without sudo:

```bash
sudo usermod -aG docker $USER
logout
```

Reconnect via SSH.

***

### 3. Upload the Build to the VPS

From your local machine:

```bash
scp -r ./example-site user@VPS_IP:/home/user/example-site
```

On the VPS:

```bash
cd ~/example-site
```

***

### 4. Build the Docker Image on the VPS

```bash
docker build -t webstudio-site .
```

***

### 5. Run the Webstudio Container

The Webstudio Docker template runs a Node.js server on port **3000**.

```bash
docker run -d \
  --name webstudio \
  -p 3000:3000 \
  --restart unless-stopped \
  webstudio-site
```

Verify locally on the VPS:

```bash
curl http://localhost:3000
```

If HTML is returned, the container works correctly.

***

### 6. Install Nginx on the VPS

Nginx will act as a reverse proxy and handle ports 80 and 443.

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

***

### 7. Configure Nginx Reverse Proxy

Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/example-site
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name example-site.tld;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/example-site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test in the browser:

```
http://example-site.tld
```

***

### 8. Install Let’s Encrypt SSL (Certbot)

Install Certbot and the Nginx plugin:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request the SSL certificate:

```bash
sudo certbot --nginx -d example-site.tld
```

Choose the option to redirect HTTP to HTTPS.

***

### 9. Verify SSL and Auto-Renewal

Access the site:

```
https://example-site.tld
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

***

### 10. Updating the Website

When you need to update the site:

1.  Rebuild locally:

    ```bash
    webstudio build --template docker
    ```
2. Upload the updated files to the VPS
3.  Rebuild and restart the container:

    ```bash
    docker stop webstudio
    docker rm webstudio
    docker build -t webstudio-site .
    docker run -d -p 3000:3000 --restart unless-stopped webstudio-site
    ```

***

### Final Architecture

* Webstudio runs as a Node.js app inside Docker (port 3000)
* Nginx listens on ports 80 and 443
* Nginx proxies requests to Docker
* Let’s Encrypt provides SSL

This setup is simple, stable, and production-ready.

## Related

- [CLI](../cli.md) – Export and build your project using the command line
- [Digital Ocean with Coolify](./digital-ocean-coolify.md) – Simplified Docker deployment using Coolify
- [Hetzner with Coolify](./hetzner-coolify.md) – Deploy to Hetzner using Coolify
- [AWS with Flightcontrol](./flightcontrol.md) – Deploy to AWS using Flightcontrol
- [Publishing and custom domains](../foundations/publishing-and-custom-domains.md) – Set up custom domains for your site
