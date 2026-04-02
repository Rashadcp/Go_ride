# EC2 Backend Deployment

This project can run the backend on a single EC2 instance with Docker Compose, while MongoDB stays on Atlas and Redis runs in Docker on the instance.

## 1. Prepare the server

Use Ubuntu 24.04 or 22.04 and open these security group ports:

- `22` for SSH
- `5001` if you want to expose the API directly
- `80` and `443` if you plan to put Nginx in front of the API

Install Docker and the Compose plugin:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Log out and back in after adding your user to the `docker` group.

## 2. Copy the project and configure env

Clone the repo onto the instance, then create the production env file:

```bash
cd /path/to/go-ride-2
cp backend/.env.production.example backend/.env.production
```

Fill in the values inside `backend/.env.production`.

Important values:

- `MONGO_URI` should point to your MongoDB Atlas cluster
- `FRONTEND_URL` should be your deployed frontend URL
- `ALLOWED_ORIGINS` can contain multiple comma-separated origins
- `GOOGLE_CALLBACK_URL` should use your EC2 API domain or public host
- `REDIS_URL` can stay `redis://redis:6379` for the bundled Redis container

## 3. Start the backend

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Health check:

```bash
curl http://localhost:5001/health
```

## 4. Point the frontend to EC2

Your frontend should call:

```text
http://<ec2-public-ip>:5001
```

or, preferably, your API domain if you place Nginx and TLS in front of the instance.

## 5. Recommended next step

For production, place Nginx in front of the backend and terminate HTTPS there. That lets you:

- expose `443` instead of `5001`
- keep Google OAuth callback URLs stable
- use a proper `https://api.your-domain.com` origin
