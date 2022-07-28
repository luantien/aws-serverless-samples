# Sample Application Web Client

This is a sample product store web client named "Serverless Application".

This project was generated with [Free PrimeNG Template - Sakai](https://github.com/primefaces/sakai-ng).

This project used Angular version 13.3.x.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Deploy to AWS

-   Build client app

```bash
npm install
npm run build
```

-   Install the dependencies for deployment package

```bash
cd deployment
npm install
```

-   Create `.env` file based on `.env.sample`
-   Provision resouces in AWS

```bash
cdk deploy --profile $AWS_PROFILE
```

-   Deploy script from `../dist` folder to AWS

```bash
bash deploy.sh
```
