## Local development

```bash
npm install
npm run dev
```

The frontend expects `NEXT_PUBLIC_API_URL` to point to the backend API root, for example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## Deploy on Vercel

Set these environment variables in Vercel:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_AWS_BUCKET_NAME=go-ride
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_S3_HOSTNAME=go-ride.s3.ap-south-1.amazonaws.com
```

Use [frontend/.env.production.example](/c:/Users/rasha/OneDrive/Documents/go%20ride%202/frontend/.env.production.example) as the template.

Important:

- Vercel serves the frontend over HTTPS.
- Because of that, `NEXT_PUBLIC_API_URL` should also be HTTPS.
- A Vercel site calling `http://13.201.72.125` directly will usually be blocked by the browser as mixed content.

Recommended production setup:

- frontend on Vercel
- backend on EC2 behind Nginx
- domain like `https://api.your-domain.com`

After setting the variables, deploy with Vercel by importing the `frontend` directory as the project root.
