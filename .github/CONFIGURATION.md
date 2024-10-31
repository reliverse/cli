# Configuration

**First thing first, refer to the [`.env.example`](.env.example) file as the guide. Simply copy data from it to a new `.env` file.**

*The instructions below may be outdated, so please double-check them! We will fully update this README.md with the Relivator 1.3.0 release.*

🎉 Everything is optional in `.env` file starting from Relivator 1.2.6! You can deploy Relivator without a .env file! But ensure you verify what's necessary. Though the application will run without certain variables, missing ones may deactivate specific features.

Ensure that default values are defined for essential environment variables. Never store secrets in the `.env.example` file. For newcomers or repo cloners, use `.env.example` as a template to create the `.env` file, ensuring it's never committed. Update the schema in `/src/env.js` when adding new variables.

Further [information about environment variables is available here](https://nextjs.org/docs/app/building-the-application/configuring/environment-variables).

*A cleaner and improved version of this section is coming soon. Stay tuned!*

In the 1.1.0 Relivator release, the `.env.example` file was greatly simplified and will be streamlined even further in upcoming versions. We aim to ensure that unspecified values will simply deactivate related functionality without halting app compilation.
