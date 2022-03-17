# Webstudio Designer

Webstudio Designer is a NoCode Visual Tool inspired by Webflow. It is the place where you can build your site or app visually.

## Installation

1. Install [Node.js](https://nodejs.dev/learn/how-to-install-nodejs)
2. Install [Yarn](https://yarnpkg.com/) `npm i -g yarn`
3. Install [MongoDB](https://www.mongodb.com/) or use [Atlas](https://www.mongodb.com/atlas/database) (recommended)
4. Clone this repository `git clone git@github.com:webstudio-is/webstudio-designer.git`
5. Connect to the [database](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/mongodb/connect-your-database-typescript-mongodb): add a database URL to the env variables by creating an .env file in the root of the project and adding there `DATABASE_URL="mongodb+srv://user:password@host"`
6. Run `yarn`
7. Run `yarn dev` - URL will be logged

## Deployment to Vercel

1. [import your Git repository](https://vercel.com/new) into Vercel, and it will be deployed.
2. Add DATABASE_URL to env variables
3. Redeploy

If you'd like to avoid using a Git repository, you can also deploy the directory by running [Vercel CLI](https://vercel.com/cli):

```sh
npm i -g vercel
vercel
```

It is generally recommended to use a Git repository, because future commits will then automatically be deployed by Vercel, through its [Git Integration](https://vercel.com/docs/concepts/git).
