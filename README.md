# End-to-end and system wide integration tests for Egendata

Integration tests using Jest and end-to-end tests using Cypress.

`npm test` sets up a complete environment in docker and runs integration and end-to-end tests in that. This can be a bit slow, but you don't need to have anything running for it to work.

`npm run test-integration` runs only the integration tests using Jest, for this to work you need to have all services running locally, see below.

`npm run test-e2e` runs only the end-to-end tests using Cypress, for this to work you need to have all services running locally, see below.

## Running tests against local environment (i.e. not in docker)
Useful while developing or debugging because you can easily see console output from the services and reach them with tools such as debuggers.

1. Start required services: in `/` run `docker-compose up`
2. Start the operator: in `/operator` run `npm run dev`
3. Start the phone-app as an e2e-service*: in `/app` run `OPERATOR_URL=http://localhost:3000/api npm run e2e:watch`
4. This is enough to run the integration tests in `/e2e` with either `npm run test-integration:local` OR `npm run test-integration:local:watch` if you want to watch for changes in an interactive Jest session.
5. To run end-to-end-tests you also need the CV site: in `/examples/cv` run `npm run dev`
6. And in `/e2e` run `npm run test-e2e` OR `npm run test-e2e:open` to open an interactive Cypress window.

\* This starts the non-UI-part of the phone app as a webserver that the tests can call to perform the actions that the user would in the phone application.
