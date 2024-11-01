# Payment Providers

## Stripe

*The instructions below may be outdated, so please double-check them! We will fully update this README.md with the Relivator 1.3.0 release.*

Refer to the [`.env.example`](.env.example) file as the guide for where and how to get all the important environment variable keys for Stripe, including webhooks for both localhost and deployment.

Locally, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run the command `bun stripe:listen` to initiate the Stripe webhook listener. This action connects Stripe to the account and generates a webhook key, which you can then set as an environment variable in Stripe's settings.

When testing Stripe, you can use its test data: `4242424242424242` | `12/34` | `567` | `Random Name` | `Random Country`.

Please refer to the [src/app/api/webhooks/stripe/route.ts](src/app/api/webhooks/stripe/route.ts) file for more details on how Stripe works in the app. You can also visit the [official Stripe repository](https://github.com/stripe/stripe-node#readme), where you'll find a lot of useful information.

The Stripe webhook API route does not need to be invoked explicitly within the application, such as after a user selects a subscription plan or makes a purchase. Webhooks operate independently of user actions on the frontend and serve as a means for Stripe to relay events directly to the server.

When an event occurs on Stripe's end, such as a successful payment, Stripe generates an event object. This object is then automatically sent to the endpoint you've specified, either in the Stripe Dashboard or, for testing purposes, in the `package.json` via the Stripe CLI. Finally, the server's API route receives the event and processes it accordingly.

For example, when a user selects a subscription plan, you would typically first use Stripe's API to create either a `Payment Intent` or `Setup Intent` object. This action can be executed either on the client-side or the server-side. The frontend then confirms the payment using Stripe.js, thereby completing the payment or subscription setup process.

The webhook is automatically triggered based on these events. There's no need to manually "call" the webhook route; Stripe manages this for you according to the settings in the Stripe Dashboard or in the `package.json` for local testing.

After deploying the app, don't forget to specify the webhook URL in the Stripe Dashboard. Navigate to the Webhooks section and enter the following URL: `https://thedomain.com/api/webhooks/stripe`.

In summary, there's no need to specify the path to the Stripe API route where the user selects a subscription plan. The webhook mechanism operates independently and is triggered automatically by Stripe.
